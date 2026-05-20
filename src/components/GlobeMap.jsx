import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

/* ── palette ─────────────────────────────────────────────── */
const COMMUNITY_COLORS = [
  '#f43f5e', '#3b82f6', '#22c55e', '#f59e0b',
  '#a855f7', '#f97316', '#06b6d4', '#84cc16',
];

function airportColor(code, S) {
  if (S.selectedAirport?.code === code) return '#fbbf24';
  if (S.showHeatmap && S.trafficLoad) {
    const t = S.trafficLoad.get(code);
    if (t?.level === 'critical') return '#f43f5e';
    if (t?.level === 'high')     return '#f97316';
    if (t?.level === 'medium')   return '#f59e0b';
    if (t)                       return '#10b981';
  }
  if (S.communities) {
    const id = S.communities.get(code);
    if (id !== undefined) return COMMUNITY_COLORS[id % COMMUNITY_COLORS.length];
  }
  return (S.degreeCentrality?.get(code) || 0) > 50 ? '#fb923c' : '#38bdf8';
}

/* ═══════════════════════════════════════════════════════════
   GlobeMap
   Rotate : click-drag  OR  two-finger scroll (trackpad pan)
   Zoom   : scroll-wheel  OR  pinch (ctrl+scroll / touch)
   ═══════════════════════════════════════════════════════════ */
export default function GlobeMap({
  airports = [], routes = [],
  highlightedPath, removedHub,
  degreeCentrality, showHeatmap,
  onAirportClick, selectedAirport,
  communities, trafficLoad,
}) {
  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  /* single stable mutable object — never triggers re-render */
  const S = useRef({
    rotation:   [96, -38, 0],
    zoomFactor: 1.0,
    targetZoom: 1.0,
    /* drag state */
    dragging:     false,
    mouseDownPos: { x: 0, y: 0 },
    lastDragPos:  { x: 0, y: 0 },
    /* touch */
    pinchDist:    null,
    pinchStart:   null,
    /* animation */
    autoRotate:   true,
    idleTimer:    null,
    animId:       null,
    /* data */
    worldLo:      null,   // 110m
    worldHi:      null,   // 50m (lazy)
    stars:        [],
    hits:         [],
    /* props */
    airports: [], routes: [], highlightedPath: null, removedHub: null,
    degreeCentrality: null, showHeatmap: false, selectedAirport: null,
    communities: null, trafficLoad: null, onAirportClick: null,
  }).current;

  /* sync props on every render */
  S.airports         = airports;
  S.routes           = routes;
  S.highlightedPath  = highlightedPath;
  S.removedHub       = removedHub;
  S.degreeCentrality = degreeCentrality;
  S.showHeatmap      = showHeatmap;
  S.selectedAirport  = selectedAirport;
  S.communities      = communities;
  S.trafficLoad      = trafficLoad;
  S.onAirportClick   = onAirportClick;

  /* ── draw ───────────────────────────────────────────────── */
  const draw = () => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    if (!W || !H) return;

    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const baseR = Math.min(W, H) * 0.44;
    const R  = baseR * S.zoomFactor;
    const cx = W / 2, cy = H / 2;

    const proj = d3.geoOrthographic()
      .scale(R).translate([cx, cy])
      .rotate(S.rotation).clipAngle(90);
    const path = d3.geoPath(proj, ctx);

    /* ① stars */
    for (const s of S.stars) {
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.c;
      ctx.fill();
    }

    /* ② outer atmosphere */
    const atmo = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.38);
    atmo.addColorStop(0,   'rgba(56,189,248,0.09)');
    atmo.addColorStop(0.5, 'rgba(30,100,200,0.04)');
    atmo.addColorStop(1,   'transparent');
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.38, 0, Math.PI * 2);
    ctx.fillStyle = atmo; ctx.fill();

    /* ③ ocean */
    ctx.beginPath(); path({ type: 'Sphere' });
    const ocean = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.04, cx + R * 0.1, cy + R * 0.15, R * 1.05);
    ocean.addColorStop(0,   '#1a3a60');
    ocean.addColorStop(0.35,'#0e2240');
    ocean.addColorStop(0.75,'#07142a');
    ocean.addColorStop(1,   '#040c1a');
    ctx.fillStyle = ocean; ctx.fill();

    /* ④ specular highlight */
    ctx.save();
    ctx.beginPath(); path({ type: 'Sphere' }); ctx.clip();
    const spec = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, 0, cx - R * 0.15, cy - R * 0.15, R * 0.7);
    spec.addColorStop(0, 'rgba(180,220,255,0.11)');
    spec.addColorStop(1, 'transparent');
    ctx.fillStyle = spec; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    /* ⑤ graticule */
    const step = S.zoomFactor > 3 ? 5 : S.zoomFactor > 1.8 ? 10 : 20;
    ctx.beginPath(); path(d3.geoGraticule().step([step, step])());
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.4; ctx.stroke();

    /* ⑥ countries — switch to hi-res when zoomed */
    const worldGeo = (S.zoomFactor > 2 && S.worldHi) ? S.worldHi : S.worldLo;
    if (worldGeo) {
      ctx.beginPath(); path(worldGeo);
      ctx.fillStyle = 'rgba(22,38,68,0.92)'; ctx.fill();
      const bop = Math.min(0.35, 0.12 + (S.zoomFactor - 1) * 0.07);
      ctx.strokeStyle = `rgba(100,180,230,${bop})`; ctx.lineWidth = 0.5; ctx.stroke();
    }

    /* ⑦ rim glow */
    ctx.beginPath(); path({ type: 'Sphere' });
    const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    rim.addColorStop(0,   'rgba(56,189,248,0.45)');
    rim.addColorStop(0.5, 'rgba(56,189,248,0.18)');
    rim.addColorStop(1,   'rgba(56,189,248,0.38)');
    ctx.strokeStyle = rim; ctx.lineWidth = 1.5; ctx.stroke();

    /* ⑧ routes */
    const aMap   = new Map(S.airports.map(a => [a.code, a]));
    const maxDeg = Math.max(...Array.from(S.degreeCentrality?.values() || [1]), 1);
    const visC   = [-S.rotation[0], -S.rotation[1]];

    let fRoutes = S.routes;
    if (S.removedHub) fRoutes = fRoutes.filter(r => r.source !== S.removedHub && r.target !== S.removedHub);
    if (S.selectedAirport) fRoutes = fRoutes.filter(r => r.source === S.selectedAirport.code || r.target === S.selectedAirport.code);

    const step5 = S.selectedAirport ? 1 : Math.max(1, Math.round(5 / Math.sqrt(S.zoomFactor)));

    if (!S.showHeatmap) {
      ctx.save();
      fRoutes.forEach((route, i) => {
        if (i % step5 !== 0) return;
        const src = aMap.get(route.source), tgt = aMap.get(route.target);
        if (!src || !tgt) return;
        const amber = S.selectedAirport && (route.source === S.selectedAirport.code || route.target === S.selectedAirport.code);
        ctx.beginPath();
        path({ type: 'LineString', coordinates: [[src.lon, src.lat], [tgt.lon, tgt.lat]] });
        ctx.strokeStyle = amber ? 'rgba(251,191,36,0.78)' : 'rgba(56,189,248,0.14)';
        ctx.lineWidth = amber ? 1.5 : 0.7;
        ctx.stroke();
      });
      ctx.restore();
    }

    /* ⑨ highlighted path */
    if (S.highlightedPath?.length > 1) {
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 480);
      ctx.save(); ctx.shadowColor = '#10b981'; ctx.shadowBlur = 14 * pulse;
      for (let i = 0; i < S.highlightedPath.length - 1; i++) {
        const s = aMap.get(S.highlightedPath[i]), t = aMap.get(S.highlightedPath[i + 1]);
        if (!s || !t) continue;
        ctx.beginPath();
        path({ type: 'LineString', coordinates: [[s.lon, s.lat], [t.lon, t.lat]] });
        ctx.strokeStyle = `rgba(16,185,129,${pulse})`; ctx.lineWidth = 2.5; ctx.stroke();
      }
      ctx.restore();
    }

    /* ⑩ airports */
    const newHits = [];
    for (const airport of S.airports) {
      if (airport.code === S.removedHub) continue;
      const dist = d3.geoDistance([airport.lon, airport.lat], visC);
      if (dist > Math.PI / 2 + 0.08) continue;
      const px = proj([airport.lon, airport.lat]);
      if (!px) continue;
      const [x, y] = px;

      const deg      = S.degreeCentrality?.get(airport.code) || 0;
      const isHub    = deg > 50;
      const isSel    = S.selectedAirport?.code === airport.code;
      const r        = (isSel ? 3 : 0) + Math.max(2, Math.min(9, 2.5 + (deg / maxDeg) * 7));
      const opacity  = S.showHeatmap ? Math.max(0.45, deg / maxDeg) : 0.93;
      const col      = airportColor(airport.code, S);

      /* halo */
      if (isHub || isSel) {
        const hr   = r + (isSel ? 9 : 5);
        const halo = ctx.createRadialGradient(x, y, r * 0.3, x, y, hr);
        halo.addColorStop(0, col + '55'); halo.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(x, y, hr, 0, Math.PI * 2);
        ctx.fillStyle = halo; ctx.fill();
      }

      /* dot */
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.globalAlpha = opacity; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;

      /* selected ring */
      if (isSel) {
        ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();
      }

      newHits.push({ airport, x, y, r: Math.max(r + 2, 8), deg });
    }
    S.hits = newHits;

    /* ⑪ labels */
    const zoom = S.zoomFactor;
    const minDeg =
      zoom > 4.5 ? 0  :
      zoom > 3.5 ? 8  :
      zoom > 2.5 ? 20 :
      zoom > 1.8 ? 38 :
      zoom > 1.4 ? 60 :
      zoom > 1.15 ? 78 : 92;

    const fSize = Math.max(9, Math.min(13, 9 + (zoom - 1) * 2));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (const { airport, x, y, r, deg } of newHits) {
      if (deg < minDeg) continue;
      const isHub = deg > 55;
      const label = zoom > 2 ? airport.city : airport.code;
      ctx.font = `${isHub ? 700 : 600} ${fSize}px 'Sora',system-ui,sans-serif`;
      const lx = x + r + 5, ly = y;
      /* outline */
      ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(3,8,20,0.92)';
      ctx.strokeText(label, lx, ly);
      /* fill */
      ctx.fillStyle = isHub ? '#fbbf24' : 'rgba(200,228,255,0.9)';
      ctx.fillText(label, lx, ly);
    }
  };

  /* ── animation loop ─────────────────────────────────────── */
  useEffect(() => {
    /* one-time stars */
    S.stars = Array.from({ length: 260 }, () => {
      const rnd = Math.random();
      return {
        x: Math.random(), y: Math.random(),
        r: rnd * rnd * 1.6 + 0.2,
        c: `rgba(${200 + Math.floor(Math.random() * 55)},${215 + Math.floor(Math.random() * 40)},255,${(Math.random() * 0.5 + 0.08).toFixed(2)})`,
      };
    });

    const loop = () => {
      S.zoomFactor += (S.targetZoom - S.zoomFactor) * 0.1;
      if (S.autoRotate && !S.dragging) S.rotation = [S.rotation[0] + 0.03, S.rotation[1], S.rotation[2]];
      draw();
      S.animId = requestAnimationFrame(loop);
    };
    S.animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(S.animId);
  }, []); // eslint-disable-line

  /* ── world atlas ────────────────────────────────────────── */
  useEffect(() => {
    const BASE = 'https://cdn.jsdelivr.net/npm/world-atlas@2/';
    fetch(BASE + 'countries-110m.json').then(r => r.json())
      .then(w => { S.worldLo = topojson.feature(w, w.objects.countries); }).catch(() => {});
    fetch(BASE + 'countries-50m.json').then(r => r.json())
      .then(w => { S.worldHi = topojson.feature(w, w.objects.countries); }).catch(() => {});
  }, []); // eslint-disable-line

  /* ── interaction ────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resetIdle = () => {
      clearTimeout(S.idleTimer);
      S.idleTimer = setTimeout(() => { S.autoRotate = true; }, 5000);
    };

    const hitTest = (x, y) => {
      let best = null, bd = Infinity;
      for (const h of S.hits) {
        const d = Math.hypot(h.x - x, h.y - y);
        if (d < h.r + 6 && d < bd) { bd = d; best = h; }
      }
      return best;
    };

    /* ─── MOUSE DOWN (canvas) ─── */
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      S.dragging    = true;
      S.autoRotate  = false;
      S.mouseDownPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      S.lastDragPos  = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      clearTimeout(S.idleTimer);
    };

    /* ─── MOUSE MOVE (window) — captures fast trackpad drags ─── */
    const onMouseMove = (e) => {
      if (S.dragging) {
        const dx = e.clientX - S.lastDragPos.x;
        const dy = e.clientY - S.lastDragPos.y;
        const sens = 0.25 / Math.sqrt(S.zoomFactor);
        S.rotation = [
          S.rotation[0] + dx * sens,
          Math.max(-85, Math.min(85, S.rotation[1] - dy * sens)),
          S.rotation[2],
        ];
        S.lastDragPos = { x: e.clientX, y: e.clientY };
        setTooltip(null);
      } else {
        /* hover — only when not dragging */
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        /* only update if pointer is inside canvas */
        if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
          const hit = hitTest(x, y);
          if (hit) {
            canvas.style.cursor = 'pointer';
            setTooltip({ x: hit.x, y: hit.y, airport: hit.airport, degree: hit.deg });
          } else {
            canvas.style.cursor = S.dragging ? 'grabbing' : 'grab';
            setTooltip(null);
          }
        }
      }
    };

    /* ─── MOUSE UP (window) ─── */
    const onMouseUp = (e) => {
      if (!S.dragging) return;
      S.dragging = false;
      canvas.style.cursor = 'grab';
      /* click if barely moved */
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const moved = Math.hypot(x - S.mouseDownPos.x, y - S.mouseDownPos.y);
      if (moved < 6) {
        const hit = hitTest(S.mouseDownPos.x, S.mouseDownPos.y);
        if (hit) { S.onAirportClick?.(hit.airport); setTooltip(null); }
      }
      resetIdle();
    };

    /* ─── WHEEL  ─────────────────────────────────────────────
       Trackpad two-finger scroll → rotate (no ctrlKey)
       Pinch / ctrl+scroll / mouse wheel → zoom               */
    const onWheel = (e) => {
      e.preventDefault();
      S.autoRotate = false;

      if (e.ctrlKey) {
        /* pinch-to-zoom — Mac trackpad pinch fires as ctrlKey+wheel */
        const factor = e.deltaY < 0 ? 1.06 : 0.945;
        S.targetZoom = Math.max(0.45, Math.min(9, S.targetZoom * factor));
      } else if (e.deltaMode === 0 && (Math.abs(e.deltaX) > 0.5 || Math.abs(e.deltaY) > 0.5)) {
        /* trackpad two-finger pan → rotate */
        const sens = 0.18 / Math.sqrt(S.zoomFactor);
        S.rotation = [
          S.rotation[0] + e.deltaX * sens,
          Math.max(-85, Math.min(85, S.rotation[1] + e.deltaY * sens)),
          S.rotation[2],
        ];
      } else {
        /* mouse scroll wheel → zoom */
        const factor = e.deltaY < 0 ? 1.10 : 0.91;
        S.targetZoom = Math.max(0.45, Math.min(9, S.targetZoom * factor));
      }
      resetIdle();
    };

    /* ─── TOUCH (pinch + single-finger drag) ─── */
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        S.pinchDist  = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        S.pinchStart = S.targetZoom;
        S.dragging   = false;
      } else {
        const rect = canvas.getBoundingClientRect();
        S.dragging     = true;
        S.autoRotate   = false;
        S.mouseDownPos = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        S.lastDragPos  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && S.pinchDist !== null) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        S.targetZoom = Math.max(0.45, Math.min(9, S.pinchStart * (d / S.pinchDist)));
      } else if (S.dragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - S.lastDragPos.x;
        const dy = e.touches[0].clientY - S.lastDragPos.y;
        const sens = 0.25 / Math.sqrt(S.zoomFactor);
        S.rotation = [
          S.rotation[0] + dx * sens,
          Math.max(-85, Math.min(85, S.rotation[1] - dy * sens)),
          S.rotation[2],
        ];
        S.lastDragPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchEnd = (e) => {
      S.pinchDist = null;
      if (S.dragging) {
        S.dragging = false;
        const rect = canvas.getBoundingClientRect();
        const touch = e.changedTouches[0];
        const x = touch.clientX - rect.left, y = touch.clientY - rect.top;
        const moved = Math.hypot(x - S.mouseDownPos.x, y - S.mouseDownPos.y);
        if (moved < 8) {
          const hit = hitTest(x, y);
          if (hit) S.onAirportClick?.(hit.airport);
        }
        resetIdle();
      }
    };

    /* canvas-level listeners */
    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('wheel',      onWheel,      { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd);

    /* window-level listeners (capture drag even outside canvas) */
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);

    canvas.style.cursor = 'grab';

    return () => {
      canvas.removeEventListener('mousedown',  onMouseDown);
      canvas.removeEventListener('wheel',      onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
      window.removeEventListener('mousemove',  onMouseMove);
      window.removeEventListener('mouseup',    onMouseUp);
    };
  }, []); // eslint-disable-line

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%', background: '#04060f', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      <div className="globe-hint">
        <span>Drag to rotate</span>
        <span className="globe-hint-sep" />
        <span>Scroll to pan</span>
        <span className="globe-hint-sep" />
        <span>Pinch to zoom</span>
      </div>

      {tooltip && (
        <div className="globe-tooltip" style={{ position: 'absolute', left: tooltip.x + 18, top: tooltip.y, transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <div className="globe-tooltip-code">{tooltip.airport.code} — {tooltip.airport.city}</div>
          <div className="globe-tooltip-name">{tooltip.airport.name}</div>
          <div className="globe-tooltip-connections">
            <span className="globe-tooltip-dot" />
            {tooltip.degree} connections
          </div>
        </div>
      )}
    </div>
  );
}
