import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

/* ── community palette ───────────────────────────────────── */
const COMMUNITY_COLORS = [
  '#E91E63', '#3B82F6', '#22c55e', '#EAB308',
  '#A855F7', '#F97316', '#22d3ee', '#84CC16',
];

function getAirportColor(code, { showHeatmap, trafficLoad, communities, selectedAirport, degreeCentrality }) {
  if (selectedAirport?.code === code) return '#f59e0b';
  if (showHeatmap && trafficLoad) {
    const t = trafficLoad.get(code);
    if (t?.level === 'critical') return '#f43f5e';
    if (t?.level === 'high')     return '#f97316';
    if (t?.level === 'medium')   return '#f59e0b';
    if (t)                       return '#10b981';
  }
  if (communities) {
    const id = communities.get(code);
    if (id !== undefined) return COMMUNITY_COLORS[id % COMMUNITY_COLORS.length];
  }
  return (degreeCentrality?.get(code) || 0) > 50 ? '#f43f5e' : '#22d3ee';
}

/* ═══════════════════════════════════════════════════════════
   GlobeMap — D3 canvas orthographic globe
   Zoom: scroll wheel / pinch  |  Rotate: drag  |  Click: select
   ═══════════════════════════════════════════════════════════ */
const GlobeMap = ({
  airports = [],
  routes = [],
  highlightedPath,
  removedHub,
  degreeCentrality,
  showHeatmap,
  onAirportClick,
  selectedAirport,
  communities,
  trafficLoad,
}) => {
  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  /* All mutable render state — never triggers re-render */
  const S = useRef({
    /* view */
    rotation:    [96, -38, 0],
    zoomFactor:  1.0,
    targetZoom:  1.0,
    /* interaction */
    isDragging:        false,
    lastPointer:       null,
    pinchDist:         null,
    pinchZoomStart:    null,
    autoRotate:        true,
    idleTimer:         null,
    /* data */
    worldGeo:          null,
    stars:             [],
    animId:            null,
    hits:              [],
    /* props snapshot */
    airports:          [],
    routes:            [],
    highlightedPath:   null,
    removedHub:        null,
    degreeCentrality:  null,
    showHeatmap:       false,
    selectedAirport:   null,
    communities:       null,
    trafficLoad:       null,
    onAirportClick:    null,
  }).current;

  /* Sync props into S on every render */
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
    if (W === 0 || H === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(W * dpr);
    const ph = Math.round(H * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width  = pw;
      canvas.height = ph;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const baseRadius = Math.min(W, H) * 0.44;
    const radius = baseRadius * S.zoomFactor;
    const cx = W / 2;
    const cy = H / 2;

    const projection = d3.geoOrthographic()
      .scale(radius)
      .translate([cx, cy])
      .rotate(S.rotation)
      .clipAngle(90);

    const path = d3.geoPath(projection, ctx);

    /* ① Stars — rendered in screen space, fixed behind globe */
    for (const s of S.stars) {
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.c;
      ctx.fill();
    }

    /* ② Deep outer atmosphere */
    const outerAtmo = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.35);
    outerAtmo.addColorStop(0,   'rgba(34,211,238,0.07)');
    outerAtmo.addColorStop(0.4, 'rgba(20,100,180,0.04)');
    outerAtmo.addColorStop(1,   'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
    ctx.fillStyle = outerAtmo;
    ctx.fill();

    /* ③ Ocean — deep space blue with radial highlight */
    ctx.beginPath();
    path({ type: 'Sphere' });
    const ocean = ctx.createRadialGradient(
      cx - radius * 0.28, cy - radius * 0.28, radius * 0.04,
      cx + radius * 0.1,  cy + radius * 0.1,  radius * 1.05
    );
    ocean.addColorStop(0,   '#183060');
    ocean.addColorStop(0.3, '#0d2040');
    ocean.addColorStop(0.7, '#081528');
    ocean.addColorStop(1,   '#040d18');
    ctx.fillStyle = ocean;
    ctx.fill();

    /* ④ Specular highlight — simulates sunlight on top-left */
    ctx.save();
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.clip();
    const spec = ctx.createRadialGradient(
      cx - radius * 0.35, cy - radius * 0.35, 0,
      cx - radius * 0.1,  cy - radius * 0.1,  radius * 0.65
    );
    spec.addColorStop(0, 'rgba(180,220,255,0.10)');
    spec.addColorStop(1, 'transparent');
    ctx.fillStyle = spec;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();

    /* ⑤ Graticule */
    const step = S.zoomFactor > 2.5 ? 10 : 20;
    const graticule = d3.geoGraticule().step([step, step])();
    ctx.beginPath();
    path(graticule);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 0.45;
    ctx.stroke();

    /* ⑥ Countries */
    if (S.worldGeo) {
      ctx.beginPath();
      path(S.worldGeo);
      ctx.fillStyle   = 'rgba(16,30,58,0.92)';
      ctx.fill();
      const borderOpacity = Math.min(0.25, 0.10 + (S.zoomFactor - 1) * 0.05);
      ctx.strokeStyle = `rgba(34,211,238,${borderOpacity})`;
      ctx.lineWidth   = 0.4;
      ctx.stroke();
    }

    /* ⑦ Globe rim glow */
    ctx.beginPath();
    path({ type: 'Sphere' });
    const rimGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    rimGrad.addColorStop(0,   'rgba(34,211,238,0.4)');
    rimGrad.addColorStop(0.5, 'rgba(34,211,238,0.2)');
    rimGrad.addColorStop(1,   'rgba(34,211,238,0.35)');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    /* ⑧ Routes */
    const airportMap = new Map(S.airports.map(a => [a.code, a]));
    const maxDeg     = Math.max(...Array.from(S.degreeCentrality?.values() || [1]), 1);
    const visCenter  = [-S.rotation[0], -S.rotation[1]];

    let filteredRoutes = S.routes;
    if (S.removedHub) {
      filteredRoutes = filteredRoutes.filter(r => r.source !== S.removedHub && r.target !== S.removedHub);
    }
    if (S.selectedAirport) {
      filteredRoutes = filteredRoutes.filter(
        r => r.source === S.selectedAirport.code || r.target === S.selectedAirport.code
      );
    }
    /* show more routes when zoomed in */
    const sampleStep = S.selectedAirport ? 1 : Math.max(1, Math.round(5 / Math.sqrt(S.zoomFactor)));
    const sampledRoutes = filteredRoutes.filter((_, i) => i % sampleStep === 0);

    if (!S.showHeatmap) {
      ctx.save();
      for (const route of sampledRoutes) {
        const src = airportMap.get(route.source);
        const tgt = airportMap.get(route.target);
        if (!src || !tgt) continue;

        const isAmbered = S.selectedAirport &&
          (route.source === S.selectedAirport.code || route.target === S.selectedAirport.code);

        ctx.beginPath();
        path({ type: 'LineString', coordinates: [[src.lon, src.lat], [tgt.lon, tgt.lat]] });
        if (isAmbered) {
          ctx.strokeStyle = 'rgba(245,158,11,0.75)';
          ctx.lineWidth   = 1.5;
        } else {
          ctx.strokeStyle = 'rgba(34,211,238,0.14)';
          ctx.lineWidth   = 0.7;
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ⑨ Highlighted shortest path (pulsing emerald) */
    if (S.highlightedPath && S.highlightedPath.length > 1) {
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 500);
      ctx.save();
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur  = 12 * pulse;
      for (let i = 0; i < S.highlightedPath.length - 1; i++) {
        const src = airportMap.get(S.highlightedPath[i]);
        const tgt = airportMap.get(S.highlightedPath[i + 1]);
        if (!src || !tgt) continue;
        ctx.beginPath();
        path({ type: 'LineString', coordinates: [[src.lon, src.lat], [tgt.lon, tgt.lat]] });
        ctx.strokeStyle = `rgba(16,185,129,${pulse})`;
        ctx.lineWidth   = 2.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ⑩ Airports */
    const newHits = [];
    for (const airport of S.airports) {
      if (airport.code === S.removedHub) continue;
      const dist = d3.geoDistance([airport.lon, airport.lat], visCenter);
      if (dist > Math.PI / 2 + 0.08) continue;

      const projected = projection([airport.lon, airport.lat]);
      if (!projected) continue;
      const [px, py] = projected;

      const deg        = S.degreeCentrality?.get(airport.code) || 0;
      const isHub      = deg > 50;
      const isSelected = S.selectedAirport?.code === airport.code;
      /* dots stay ~constant screen size regardless of zoom */
      const baseR  = Math.max(2, Math.min(9, 2.5 + (deg / maxDeg) * 7.5));
      const r      = isSelected ? baseR + 2.5 : baseR;
      const opacity = S.showHeatmap ? Math.max(0.45, deg / maxDeg) : 0.92;
      const color   = getAirportColor(airport.code, S);

      /* halo */
      if (isHub || isSelected) {
        const haloR = r + (isSelected ? 8 : 5);
        const halo  = ctx.createRadialGradient(px, py, r * 0.4, px, py, haloR);
        halo.addColorStop(0, color + '55');
        halo.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(px, py, haloR, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();
      }

      /* dot */
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.globalAlpha = opacity;
      ctx.fillStyle   = color;
      ctx.fill();
      ctx.globalAlpha = 1;

      /* selected ring */
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(px, py, r + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }

      newHits.push({ airport, x: px, y: py, r: Math.max(r + 2, 8) });
    }
    S.hits = newHits;
  };

  /* ── animation loop ─────────────────────────────────────── */
  useEffect(() => {
    /* one-time star field — seeded to canvas-ratio coords */
    S.stars = Array.from({ length: 260 }, () => {
      const r = Math.random();
      return {
        x: Math.random(),
        y: Math.random(),
        r: r * r * 1.5 + 0.2,
        c: `rgba(${200 + Math.floor(Math.random()*55)},${220 + Math.floor(Math.random()*35)},255,${(Math.random() * 0.55 + 0.08).toFixed(2)})`,
      };
    });

    const loop = () => {
      /* smooth zoom lerp */
      S.zoomFactor += (S.targetZoom - S.zoomFactor) * 0.1;

      /* auto-rotate when idle */
      if (S.autoRotate && !S.isDragging) {
        S.rotation = [S.rotation[0] + 0.035, S.rotation[1], S.rotation[2]];
      }
      draw();
      S.animId = requestAnimationFrame(loop);
    };
    S.animId = requestAnimationFrame(loop);
    return () => { if (S.animId) cancelAnimationFrame(S.animId); };
  }, []); // eslint-disable-line

  /* ── world atlas fetch ──────────────────────────────────── */
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(world => { S.worldGeo = topojson.feature(world, world.objects.countries); })
      .catch(() => {});
  }, []); // eslint-disable-line

  /* ── pointer + zoom interaction ─────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cssPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const src  = e.touches ? e.touches[0] : e;
      return [src.clientX - rect.left, src.clientY - rect.top];
    };

    const hitTest = (x, y) => {
      let best = null, bestD = Infinity;
      for (const h of S.hits) {
        const d = Math.hypot(h.x - x, h.y - y);
        if (d < h.r + 5 && d < bestD) { bestD = d; best = h; }
      }
      return best;
    };

    const resetIdle = () => {
      clearTimeout(S.idleTimer);
      S.idleTimer = setTimeout(() => { S.autoRotate = true; }, 5000);
    };

    /* ── scroll wheel zoom ── */
    const onWheel = (e) => {
      e.preventDefault();
      S.autoRotate = false;
      const delta = e.deltaY < 0 ? 1.10 : 0.91;
      S.targetZoom = Math.max(0.55, Math.min(9, S.targetZoom * delta));
      resetIdle();
    };

    /* ── mouse down ── */
    const onDown = (e) => {
      e.preventDefault();
      S.isDragging  = true;
      S.autoRotate  = false;
      S.lastPointer = cssPos(e);
      clearTimeout(S.idleTimer);
    };

    /* ── mouse move / hover ── */
    const onMove = (e) => {
      /* pinch — handled separately via touch */
      if (e.touches?.length === 2) return;

      const pos = cssPos(e);
      if (S.isDragging && S.lastPointer) {
        const dx = pos[0] - S.lastPointer[0];
        const dy = pos[1] - S.lastPointer[1];
        /* drag sensitivity scales down as you zoom in */
        const sens = 0.28 / Math.sqrt(S.zoomFactor);
        S.rotation = [
          S.rotation[0] + dx * sens,
          Math.max(-85, Math.min(85, S.rotation[1] - dy * sens)),
          S.rotation[2],
        ];
        S.lastPointer = pos;
        setTooltip(null);
      } else if (!S.isDragging) {
        const hit = hitTest(pos[0], pos[1]);
        if (hit) {
          canvas.style.cursor = 'pointer';
          setTooltip({ x: hit.x, y: hit.y, airport: hit.airport, degree: S.degreeCentrality?.get(hit.airport.code) || 0 });
        } else {
          canvas.style.cursor = 'grab';
          setTooltip(null);
        }
      }
    };

    /* ── mouse up / click ── */
    const onUp = (e) => {
      if (!S.isDragging) return;
      const pos   = cssPos(e.changedTouches ? { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY } : e);
      const moved = S.lastPointer ? Math.hypot(pos[0] - S.lastPointer[0], pos[1] - S.lastPointer[1]) : 0;
      S.isDragging  = false;
      S.lastPointer = null;
      if (moved < 6) {
        const hit = hitTest(pos[0], pos[1]);
        if (hit) { S.onAirportClick?.(hit.airport); setTooltip(null); }
      }
      resetIdle();
    };

    const onLeave = () => { S.isDragging = false; S.lastPointer = null; setTooltip(null); };

    /* ── pinch zoom (touch) ── */
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        S.pinchDist      = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        S.pinchZoomStart = S.targetZoom;
        S.isDragging     = false;
      } else {
        onDown(e);
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && S.pinchDist !== null) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        S.targetZoom = Math.max(0.55, Math.min(9, S.pinchZoomStart * (d / S.pinchDist)));
        S.autoRotate = false;
      } else {
        onMove(e);
      }
    };

    const onTouchEnd = (e) => {
      S.pinchDist = null;
      onUp(e);
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('wheel',       onWheel,      { passive: false });
    canvas.addEventListener('mousedown',   onDown);
    canvas.addEventListener('mousemove',   onMove);
    canvas.addEventListener('mouseup',     onUp);
    canvas.addEventListener('mouseleave',  onLeave);
    canvas.addEventListener('touchstart',  onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',   onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',    onTouchEnd);

    return () => {
      canvas.removeEventListener('wheel',      onWheel);
      canvas.removeEventListener('mousedown',  onDown);
      canvas.removeEventListener('mousemove',  onMove);
      canvas.removeEventListener('mouseup',    onUp);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
  }, []); // eslint-disable-line

  /* ── JSX ────────────────────────────────────────────────── */
  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#04060f', overflow: 'hidden' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* Controls hint */}
      <div className="globe-hint">
        <span>Drag to rotate</span>
        <span className="globe-hint-sep" />
        <span>Scroll to zoom</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="globe-tooltip"
          style={{
            position:      'absolute',
            left:          tooltip.x + 18,
            top:           tooltip.y,
            transform:     'translateY(-50%)',
            pointerEvents: 'none',
          }}
        >
          <div className="globe-tooltip-code">
            {tooltip.airport.code} — {tooltip.airport.city}
          </div>
          <div className="globe-tooltip-name">{tooltip.airport.name}</div>
          <div className="globe-tooltip-connections">
            <span className="globe-tooltip-dot" />
            {tooltip.degree} connections
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobeMap;
