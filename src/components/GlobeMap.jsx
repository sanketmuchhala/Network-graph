import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

/* ── Quaternion (versor) helpers ─────────────────────────────
   Correct 3-D rotation composition — straight drags stay straight
   regardless of globe tilt. Raw λ/φ addition causes gimbal lock.  */
function vFromAngles([l, p, g]) {
  l *= Math.PI / 360; p *= Math.PI / 360; g *= Math.PI / 360;
  const sl = Math.sin(l), cl = Math.cos(l);
  const sp = Math.sin(p), cp = Math.cos(p);
  const sg = Math.sin(g), cg = Math.cos(g);
  return [
    cl * cp * cg + sl * sp * sg,
    sl * cp * cg - cl * sp * sg,
    cl * sp * cg + sl * cp * sg,
    cl * cp * sg - sl * sp * cg,
  ];
}

function vToAngles([a, b, c, d]) {
  return [
    Math.atan2(2 * (a * b + c * d), 1 - 2 * (b * b + c * c)) * 180 / Math.PI,
    Math.asin(Math.max(-1, Math.min(1, 2 * (a * c - d * b)))) * 180 / Math.PI,
    Math.atan2(2 * (a * d + b * c), 1 - 2 * (c * c + d * d)) * 180 / Math.PI,
  ];
}

function vMul([a1, b1, c1, d1], [a2, b2, c2, d2]) {
  return [
    a1*a2 - b1*b2 - c1*c2 - d1*d2,
    a1*b2 + b1*a2 + c1*d2 - d1*c2,
    a1*c2 - b1*d2 + c1*a2 + d1*b2,
    a1*d2 + b1*c2 - c1*b2 + d1*a2,
  ];
}

function vDelta(v0, v1) {
  const w = [v0[1]*v1[2]-v0[2]*v1[1], v0[2]*v1[0]-v0[0]*v1[2], v0[0]*v1[1]-v0[1]*v1[0]];
  const n = Math.sqrt(w[0]*w[0] + w[1]*w[1] + w[2]*w[2]);
  if (!n) return [1, 0, 0, 0];
  const t = Math.atan2(n, v0[0]*v1[0] + v0[1]*v1[1] + v0[2]*v1[2]);
  const s = Math.sin(t / 2) / n;
  return [Math.cos(t / 2), w[0]*s, w[1]*s, w[2]*s];
}

function geoToCart([l, p]) {
  l *= Math.PI / 180; p *= Math.PI / 180;
  return [Math.cos(p)*Math.cos(l), Math.cos(p)*Math.sin(l), Math.sin(p)];
}

/* Build a fresh projection from current state — used in event handlers */
function makeProj(W, H, R, rotation) {
  return d3.geoOrthographic()
    .scale(R).translate([W / 2, H / 2])
    .rotate(rotation).clipAngle(90);
}

/* ── community palette ───────────────────────────────────── */
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
   Rotate  : click-drag  |  two-finger trackpad scroll (pan)
   Zoom    : ctrl+scroll / pinch  |  mouse wheel
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

  const S = useRef({
    rotation:   [96, -38, 0],
    zoomFactor: 1.0,
    targetZoom: 1.0,
    /* drag state — versor-based */
    dragging:     false,
    mouseDownXY:  null,   // {x,y} canvas-relative
    v0:           null,   // cartesian of geo point at drag start
    q0:           null,   // quaternion at drag start
    r0:           null,   // rotation array at drag start
    /* touch */
    pinchDist:    null,
    pinchStart:   null,
    /* animation */
    autoRotate:   true,
    idleTimer:    null,
    animId:       null,
    /* data */
    worldLo:      null,
    worldHi:      null,
    stars:        [],
    hits:         [],
    /* props */
    airports: [], routes: [], highlightedPath: null, removedHub: null,
    degreeCentrality: null, showHeatmap: false, selectedAirport: null,
    communities: null, trafficLoad: null, onAirportClick: null,
  }).current;

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

    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (!W || !H) return;

    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const R  = Math.min(W, H) * 0.44 * S.zoomFactor;
    const cx = W / 2, cy = H / 2;
    const proj = makeProj(W, H, R, S.rotation);
    const path = d3.geoPath(proj, ctx);

    /* ① stars */
    for (const s of S.stars) {
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.c; ctx.fill();
    }

    /* ② atmosphere */
    const atmo = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.38);
    atmo.addColorStop(0,   'rgba(56,189,248,0.09)');
    atmo.addColorStop(0.5, 'rgba(30,100,200,0.04)');
    atmo.addColorStop(1,   'transparent');
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.38, 0, Math.PI * 2);
    ctx.fillStyle = atmo; ctx.fill();

    /* ③ ocean */
    ctx.beginPath(); path({ type: 'Sphere' });
    const ocean = ctx.createRadialGradient(
      cx - R * 0.3, cy - R * 0.3, R * 0.04,
      cx + R * 0.1, cy + R * 0.15, R * 1.05
    );
    ocean.addColorStop(0,    '#1a3a60');
    ocean.addColorStop(0.35, '#0e2240');
    ocean.addColorStop(0.75, '#07142a');
    ocean.addColorStop(1,    '#040c1a');
    ctx.fillStyle = ocean; ctx.fill();

    /* ④ specular */
    ctx.save();
    ctx.beginPath(); path({ type: 'Sphere' }); ctx.clip();
    const spec = ctx.createRadialGradient(
      cx - R * 0.4, cy - R * 0.4, 0,
      cx - R * 0.15, cy - R * 0.15, R * 0.7
    );
    spec.addColorStop(0, 'rgba(180,220,255,0.11)');
    spec.addColorStop(1, 'transparent');
    ctx.fillStyle = spec; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    /* ⑤ graticule */
    const gStep = S.zoomFactor > 3 ? 5 : S.zoomFactor > 1.8 ? 10 : 20;
    ctx.beginPath(); path(d3.geoGraticule().step([gStep, gStep])());
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.4; ctx.stroke();

    /* ⑥ countries */
    const worldGeo = (S.zoomFactor > 2 && S.worldHi) ? S.worldHi : S.worldLo;
    if (worldGeo) {
      ctx.beginPath(); path(worldGeo);
      ctx.fillStyle = 'rgba(22,38,68,0.92)'; ctx.fill();
      const bop = Math.min(0.35, 0.12 + (S.zoomFactor - 1) * 0.07);
      ctx.strokeStyle = `rgba(100,180,230,${bop})`; ctx.lineWidth = 0.5; ctx.stroke();
    }

    /* ⑦ rim */
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

      const deg     = S.degreeCentrality?.get(airport.code) || 0;
      const isHub   = deg > 50;
      const isSel   = S.selectedAirport?.code === airport.code;
      const r       = (isSel ? 3 : 0) + Math.max(2, Math.min(9, 2.5 + (deg / maxDeg) * 7));
      const opacity = S.showHeatmap ? Math.max(0.45, deg / maxDeg) : 0.93;
      const col     = airportColor(airport.code, S);

      if (isHub || isSel) {
        const hr   = r + (isSel ? 9 : 5);
        const halo = ctx.createRadialGradient(x, y, r * 0.3, x, y, hr);
        halo.addColorStop(0, col + '55'); halo.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(x, y, hr, 0, Math.PI * 2);
        ctx.fillStyle = halo; ctx.fill();
      }

      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.globalAlpha = opacity; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;

      if (isSel) {
        ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();
      }

      newHits.push({ airport, x, y, r: Math.max(r + 2, 8), deg });
    }
    S.hits = newHits;

    /* ⑪ labels */
    const zoom = S.zoomFactor;
    const minDeg = zoom > 4.5 ? 0 : zoom > 3.5 ? 8 : zoom > 2.5 ? 20
      : zoom > 1.8 ? 38 : zoom > 1.4 ? 60 : zoom > 1.15 ? 78 : 92;
    const fSize = Math.max(9, Math.min(13, 9 + (zoom - 1) * 2));
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';

    for (const { airport, x, y, r, deg } of newHits) {
      if (deg < minDeg) continue;
      const isHub = deg > 55;
      const label = zoom > 2 ? airport.city : airport.code;
      ctx.font = `${isHub ? 700 : 600} ${fSize}px 'Sora',system-ui,sans-serif`;
      ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(3,8,20,0.92)'; ctx.strokeText(label, x + r + 5, y);
      ctx.fillStyle = isHub ? '#fbbf24' : 'rgba(200,228,255,0.9)'; ctx.fillText(label, x + r + 5, y);
    }
  };

  /* ── animation loop ─────────────────────────────────────── */
  useEffect(() => {
    S.stars = Array.from({ length: 260 }, () => {
      const rnd = Math.random();
      return {
        x: Math.random(), y: Math.random(),
        r: rnd * rnd * 1.6 + 0.2,
        c: `rgba(${200 + Math.floor(Math.random()*55)},${215 + Math.floor(Math.random()*40)},255,${(Math.random()*0.5+0.08).toFixed(2)})`,
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

  /* ── atlas fetch ────────────────────────────────────────── */
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
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

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

    /* Returns projection matching current canvas/zoom state */
    const currentProj = () => {
      const W = wrap.clientWidth, H = wrap.clientHeight;
      const R = Math.min(W, H) * 0.44 * S.zoomFactor;
      return makeProj(W, H, R, S.rotation);
    };

    /* ── MOUSE DOWN on canvas ────────────────────────────── */
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      /* Snapshot rotation + derive versor state */
      S.r0  = [...S.rotation];
      S.q0  = vFromAngles(S.r0);
      const W = wrap.clientWidth, H = wrap.clientHeight;
      const R = Math.min(W, H) * 0.44 * S.zoomFactor;
      const startProj = makeProj(W, H, R, S.r0);
      const geo = startProj.invert([x, y]);
      S.v0  = geo ? geoToCart(geo) : null;

      S.dragging     = true;
      S.autoRotate   = false;
      S.mouseDownXY  = { x, y };
      canvas.style.cursor = 'grabbing';
      clearTimeout(S.idleTimer);
    };

    /* ── MOUSE MOVE on window (never loses capture) ──────── */
    const onMouseMove = (e) => {
      if (S.dragging) {
        const rect   = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (S.v0 && S.q0 && S.r0) {
          /* Versor drag — correct 3-D rotation, no gimbal twist */
          const W = wrap.clientWidth, H = wrap.clientHeight;
          const R = Math.min(W, H) * 0.44 * S.zoomFactor;
          /* use drag-start rotation to re-project current mouse pos */
          const tempProj = makeProj(W, H, R, S.r0);
          const geo = tempProj.invert([x, y]);
          if (geo) {
            const v1 = geoToCart(geo);
            const q1 = vMul(vDelta(S.v0, v1), S.q0);
            const angles = vToAngles(q1);
            S.rotation = [angles[0], Math.max(-85, Math.min(85, angles[1])), angles[2]];
          }
        }

        setTooltip(null);
      } else {
        /* hover — only inside canvas */
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

        const hit = hitTest(x, y);
        if (hit) {
          canvas.style.cursor = 'pointer';
          setTooltip({ x: hit.x, y: hit.y, airport: hit.airport, degree: hit.deg });
        } else {
          canvas.style.cursor = 'grab';
          setTooltip(null);
        }
      }
    };

    /* ── MOUSE UP on window ──────────────────────────────── */
    const onMouseUp = (e) => {
      if (!S.dragging) return;
      S.dragging = false;
      canvas.style.cursor = 'grab';

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const moved = S.mouseDownXY ? Math.hypot(x - S.mouseDownXY.x, y - S.mouseDownXY.y) : 99;
      if (moved < 6) {
        const hit = hitTest(S.mouseDownXY.x, S.mouseDownXY.y);
        if (hit) { S.onAirportClick?.(hit.airport); setTooltip(null); }
      }
      resetIdle();
    };

    /* ── WHEEL ───────────────────────────────────────────────
       ctrlKey → pinch-to-zoom (Mac trackpad pinch)
       else    → two-finger scroll → rotate/pan             */
    const onWheel = (e) => {
      e.preventDefault();
      S.autoRotate = false;

      if (e.ctrlKey) {
        /* Mac pinch-to-zoom fires as ctrlKey+wheel */
        const factor = e.deltaY < 0 ? 1.06 : 0.945;
        S.targetZoom = Math.max(0.45, Math.min(9, S.targetZoom * factor));
      } else if (e.deltaMode === 0) {
        /* Pixel-mode (trackpad two-finger) → pan/rotate the globe.
           Use simple delta here — each tick is tiny so no gimbal issue. */
        const sens = 0.18 / Math.sqrt(S.zoomFactor);
        const newRotation = [
          S.rotation[0] + e.deltaX * sens,
          Math.max(-85, Math.min(85, S.rotation[1] + e.deltaY * sens)),
          S.rotation[2],
        ];
        S.rotation = newRotation;
      } else {
        /* Line/page mode → discrete mouse wheel → zoom */
        const factor = e.deltaY < 0 ? 1.12 : 0.90;
        S.targetZoom = Math.max(0.45, Math.min(9, S.targetZoom * factor));
      }
      resetIdle();
    };

    /* ── TOUCH ───────────────────────────────────────────── */
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        S.pinchDist  = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        S.pinchStart = S.targetZoom;
        S.dragging   = false;
      } else if (e.touches.length === 1) {
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        S.r0  = [...S.rotation];
        S.q0  = vFromAngles(S.r0);
        const W = wrap.clientWidth, H = wrap.clientHeight;
        const R = Math.min(W, H) * 0.44 * S.zoomFactor;
        const geo = makeProj(W, H, R, S.r0).invert([x, y]);
        S.v0  = geo ? geoToCart(geo) : null;
        S.dragging    = true;
        S.autoRotate  = false;
        S.mouseDownXY = { x, y };
        clearTimeout(S.idleTimer);
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && S.pinchDist !== null) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        S.targetZoom = Math.max(0.45, Math.min(9, S.pinchStart * (d / S.pinchDist)));
      } else if (S.dragging && e.touches.length === 1 && S.v0 && S.q0 && S.r0) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        const W = wrap.clientWidth, H = wrap.clientHeight;
        const R = Math.min(W, H) * 0.44 * S.zoomFactor;
        const geo = makeProj(W, H, R, S.r0).invert([x, y]);
        if (geo) {
          const v1 = geoToCart(geo);
          const q1 = vMul(vDelta(S.v0, v1), S.q0);
          const angles = vToAngles(q1);
          S.rotation = [angles[0], Math.max(-85, Math.min(85, angles[1])), angles[2]];
        }
      }
    };

    const onTouchEnd = (e) => {
      S.pinchDist = null;
      if (S.dragging) {
        S.dragging = false;
        const rect = canvas.getBoundingClientRect();
        const t = e.changedTouches[0];
        const x = t.clientX - rect.left, y = t.clientY - rect.top;
        const moved = S.mouseDownXY ? Math.hypot(x - S.mouseDownXY.x, y - S.mouseDownXY.y) : 99;
        if (moved < 8) {
          const hit = hitTest(S.mouseDownXY.x, S.mouseDownXY.y);
          if (hit) S.onAirportClick?.(hit.airport);
        }
        resetIdle();
      }
    };

    /* canvas-level */
    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('wheel',      onWheel,      { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd);

    /* window-level — captures pointer outside canvas during drag */
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
