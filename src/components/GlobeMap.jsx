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

  const degree = degreeCentrality?.get(code) || 0;
  return degree > 50 ? '#f43f5e' : '#22d3ee';
}

/* ═══════════════════════════════════════════════════════════
   GlobeMap — D3 canvas orthographic globe
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

  /* All mutable render state in one stable ref — never triggers re-render */
  const S = useRef({
    rotation:    [96, -38, 0],   // centered on continental US
    isDragging:  false,
    lastPointer: null,
    worldGeo:    null,           // GeoJSON FeatureCollection from CDN
    animId:      null,
    hits:        [],             // [{airport, x, y, r}] for hit-testing
    autoRotate:  true,
    idleTimer:   null,
    // props snapshot — updated on every render so animation loop stays current
    airports:         [],
    routes:           [],
    highlightedPath:  null,
    removedHub:       null,
    degreeCentrality: null,
    showHeatmap:      false,
    selectedAirport:  null,
    communities:      null,
    trafficLoad:      null,
    onAirportClick:   null,
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

  /* ── main draw function ─────────────────────────────────── */
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

    const radius = Math.min(W, H) * 0.44;
    const cx = W / 2;
    const cy = H / 2;

    const projection = d3.geoOrthographic()
      .scale(radius)
      .translate([cx, cy])
      .rotate(S.rotation)
      .clipAngle(90);

    const path = d3.geoPath(projection, ctx);

    /* 1 — Atmospheric glow (outside sphere) */
    const atmo = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.18);
    atmo.addColorStop(0,   'rgba(34,211,238,0.08)');
    atmo.addColorStop(0.5, 'rgba(34,211,238,0.03)');
    atmo.addColorStop(1,   'transparent');
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.18, 0, Math.PI * 2);
    ctx.fillStyle = atmo;
    ctx.fill();
    ctx.restore();

    /* 2 — Ocean fill */
    ctx.beginPath();
    path({ type: 'Sphere' });
    const ocean = ctx.createRadialGradient(
      cx - radius * 0.25, cy - radius * 0.25, radius * 0.05,
      cx, cy, radius
    );
    ocean.addColorStop(0,   '#122040');
    ocean.addColorStop(0.5, '#091828');
    ocean.addColorStop(1,   '#040c18');
    ctx.fillStyle = ocean;
    ctx.fill();

    /* 3 — Graticule */
    const graticule = d3.geoGraticule().step([20, 20])();
    ctx.beginPath();
    path(graticule);
    ctx.strokeStyle = 'rgba(255,255,255,0.038)';
    ctx.lineWidth   = 0.5;
    ctx.stroke();

    /* 4 — Countries */
    if (S.worldGeo) {
      ctx.beginPath();
      path(S.worldGeo);
      ctx.fillStyle   = 'rgba(14,26,52,0.88)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(34,211,238,0.12)';
      ctx.lineWidth   = 0.4;
      ctx.stroke();
    }

    /* 5 — Globe rim */
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.strokeStyle = 'rgba(34,211,238,0.28)';
    ctx.lineWidth   = 1.2;
    ctx.stroke();

    /* 6 — Routes */
    const airportMap  = new Map(S.airports.map(a => [a.code, a]));
    const maxDeg      = Math.max(...Array.from(S.degreeCentrality?.values() || [1]), 1);
    const visCenter   = [-S.rotation[0], -S.rotation[1]];

    let filteredRoutes = S.routes;
    if (S.removedHub) {
      filteredRoutes = filteredRoutes.filter(
        r => r.source !== S.removedHub && r.target !== S.removedHub
      );
    }
    if (S.selectedAirport) {
      filteredRoutes = filteredRoutes.filter(
        r => r.source === S.selectedAirport.code || r.target === S.selectedAirport.code
      );
    }
    const sampledRoutes = S.selectedAirport
      ? filteredRoutes
      : filteredRoutes.filter((_, i) => i % 5 === 0);

    if (!S.showHeatmap) {
      ctx.save();
      for (const route of sampledRoutes) {
        const src = airportMap.get(route.source);
        const tgt = airportMap.get(route.target);
        if (!src || !tgt) continue;

        const isHighlighted =
          S.selectedAirport &&
          (route.source === S.selectedAirport.code || route.target === S.selectedAirport.code);

        ctx.beginPath();
        path({ type: 'LineString', coordinates: [[src.lon, src.lat], [tgt.lon, tgt.lat]] });
        ctx.strokeStyle = isHighlighted ? 'rgba(245,158,11,0.72)' : 'rgba(34,211,238,0.13)';
        ctx.lineWidth   = isHighlighted ? 1.5 : 0.7;
        ctx.stroke();
      }
      ctx.restore();
    }

    /* 7 — Highlighted path (pulsing) */
    if (S.highlightedPath && S.highlightedPath.length > 1) {
      const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 550);
      ctx.save();
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur  = 10 * pulse;
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

    /* 8 — Airports */
    const newHits = [];
    for (const airport of S.airports) {
      if (airport.code === S.removedHub) continue;

      /* skip back-hemisphere */
      const dist = d3.geoDistance([airport.lon, airport.lat], visCenter);
      if (dist > Math.PI / 2 + 0.08) continue;

      const projected = projection([airport.lon, airport.lat]);
      if (!projected) continue;
      const [px, py] = projected;

      const deg        = S.degreeCentrality?.get(airport.code) || 0;
      const isHub      = deg > 50;
      const isSelected = S.selectedAirport?.code === airport.code;
      const baseR      = Math.max(2, Math.min(8, 2 + (deg / maxDeg) * 7));
      const r          = isSelected ? baseR + 2.5 : baseR;
      const opacity    = S.showHeatmap ? Math.max(0.4, deg / maxDeg) : 0.9;
      const color      = getAirportColor(airport.code, S);

      /* halo for hubs / selected */
      if (isHub || isSelected) {
        const haloR = r + (isSelected ? 7 : 5);
        const halo  = ctx.createRadialGradient(px, py, r * 0.5, px, py, haloR);
        halo.addColorStop(0, color + '44');
        halo.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(px, py, haloR, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();
      }

      /* main dot */
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.globalAlpha = opacity;
      ctx.fillStyle   = color;
      ctx.fill();
      ctx.globalAlpha = 1;

      /* selected ring */
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(px, py, r + 3, 0, Math.PI * 2);
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
    const loop = () => {
      if (S.autoRotate && !S.isDragging) {
        S.rotation = [S.rotation[0] + 0.04, S.rotation[1], S.rotation[2]];
      }
      draw();
      S.animId = requestAnimationFrame(loop);
    };
    S.animId = requestAnimationFrame(loop);
    return () => { if (S.animId) cancelAnimationFrame(S.animId); };
  }, []); // eslint-disable-line

  /* ── fetch world atlas from CDN ─────────────────────────── */
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(world => {
        S.worldGeo = topojson.feature(world, world.objects.countries);
      })
      .catch(() => { /* globe still works without country outlines */ });
  }, []); // eslint-disable-line

  /* ── pointer interaction ────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cssPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const src  = e.touches ? e.touches[0] : e;
      return [src.clientX - rect.left, src.clientY - rect.top];
    };

    const hitTest = (x, y) => {
      let best = null, bestDist = Infinity;
      for (const h of S.hits) {
        const d = Math.hypot(h.x - x, h.y - y);
        if (d < h.r + 5 && d < bestDist) { bestDist = d; best = h; }
      }
      return best;
    };

    const resetIdleTimer = () => {
      clearTimeout(S.idleTimer);
      S.idleTimer = setTimeout(() => { S.autoRotate = true; }, 5000);
    };

    const onDown = (e) => {
      e.preventDefault();
      S.isDragging  = true;
      S.autoRotate  = false;
      S.lastPointer = cssPos(e);
      clearTimeout(S.idleTimer);
    };

    const onMove = (e) => {
      const pos = cssPos(e);
      if (S.isDragging && S.lastPointer) {
        const [x0, y0] = S.lastPointer;
        const [x1, y1] = pos;
        S.rotation = [
          S.rotation[0] + (x1 - x0) * 0.28,
          Math.max(-85, Math.min(85, S.rotation[1] - (y1 - y0) * 0.28)),
          S.rotation[2],
        ];
        S.lastPointer = pos;
        setTooltip(null);
      } else {
        const hit = hitTest(pos[0], pos[1]);
        if (hit) {
          canvas.style.cursor = 'pointer';
          setTooltip({
            x:       hit.x,
            y:       hit.y,
            airport: hit.airport,
            degree:  S.degreeCentrality?.get(hit.airport.code) || 0,
          });
        } else {
          canvas.style.cursor = 'grab';
          setTooltip(null);
        }
      }
    };

    const onUp = (e) => {
      if (!S.isDragging) return;
      const pos  = cssPos(e.changedTouches ? { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY } : e);
      const moved = S.lastPointer ? Math.hypot(pos[0] - S.lastPointer[0], pos[1] - S.lastPointer[1]) : 0;

      S.isDragging  = false;
      S.lastPointer = null;

      if (moved < 6) {
        const hit = hitTest(pos[0], pos[1]);
        if (hit) {
          S.onAirportClick?.(hit.airport);
          setTooltip(null);
        }
      }
      resetIdleTimer();
    };

    const onLeave = () => {
      S.isDragging  = false;
      S.lastPointer = null;
      setTooltip(null);
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('mousedown',  onDown);
    canvas.addEventListener('mousemove',  onMove);
    canvas.addEventListener('mouseup',    onUp);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('touchstart', onDown,  { passive: false });
    canvas.addEventListener('touchmove',  onMove,  { passive: false });
    canvas.addEventListener('touchend',   onUp);

    return () => {
      canvas.removeEventListener('mousedown',  onDown);
      canvas.removeEventListener('mousemove',  onMove);
      canvas.removeEventListener('mouseup',    onUp);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove',  onMove);
      canvas.removeEventListener('touchend',   onUp);
    };
  }, []); // eslint-disable-line

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#04060f', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* Drag hint */}
      <div className="globe-hint">Drag to rotate</div>

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
