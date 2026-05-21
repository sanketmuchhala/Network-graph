import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Globe from 'react-globe.gl';
import * as topojson from 'topojson-client';

/* ── community colours ───────────────────────────────────── */
const COMM = ['#f97316','#22c55e','#eab308','#a855f7','#ec4899','#06b6d4','#84cc16','#f43f5e'];

function airportColor(code, { showHeatmap, trafficLoad, communities, selectedAirport, degreeCentrality }) {
  if (selectedAirport?.code === code) return '#ffffff';
  if (showHeatmap && trafficLoad) {
    const t = trafficLoad.get(code);
    if (t?.level === 'critical') return '#ef4444';
    if (t?.level === 'high')     return '#f97316';
    if (t?.level === 'medium')   return '#eab308';
    if (t)                       return '#22c55e';
  }
  if (communities) {
    const id = communities.get(code);
    if (id !== undefined) return COMM[id % COMM.length];
  }
  return (degreeCentrality?.get(code) || 0) > 50 ? '#f97316' : '#22c55e';
}

/* ═══════════════════════════════════════════════════════════
   GlobeMap — react-globe.gl (Three.js WebGL)
   War-watch aesthetic: dark sphere, green atmosphere, olive land
   ═══════════════════════════════════════════════════════════ */
export default function GlobeMap({
  airports = [], routes = [],
  highlightedPath, removedHub,
  degreeCentrality, showHeatmap,
  onAirportClick, selectedAirport,
  communities, trafficLoad,
}) {
  const wrapRef = useRef(null);

  /* Use state (not ref) for globe element so effects re-run when Globe mounts */
  const [globeEl, setGlobeEl]   = useState(null);
  const [dims,    setDims]      = useState({ w: 800, h: 600 });
  const [countries, setCountries] = useState([]);
  const [tooltip, setTooltip]   = useState(null);
  const [tipPos,  setTipPos]    = useState({ x: 0, y: 0 });

  /* ── Responsive container size ─────────────────────────── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (w > 0 && h > 0) setDims({ w, h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── World atlas (country polygons) ────────────────────── */
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(w => setCountries(topojson.feature(w, w.objects.countries).features))
      .catch(() => {});
  }, []);

  /* ── Configure globe after it mounts (state-based ref is reliable) ── */
  useEffect(() => {
    if (!globeEl) return;

    /* Three.js needs a tick to finish initialising its renderer */
    const t = setTimeout(() => {
      /* Dark navy sphere — war-watch ocean colour */
      try {
        const mat = globeEl.globeMaterial();
        mat.color.set('#040c1a');
        mat.emissive.set('#000510');
        mat.emissiveIntensity = 0.05;
        mat.shininess = 6;
      } catch (_) {}

      /* Start centred on North America */
      try { globeEl.pointOfView({ lat: 38, lng: -96, altitude: 1.8 }, 0); } catch (_) {}

      /* OrbitControls: inertia (dampingFactor) + slow auto-rotate */
      try {
        const ctrl = globeEl.controls();
        ctrl.autoRotate      = true;
        ctrl.autoRotateSpeed = 0.4;
        ctrl.enableDamping   = true;
        ctrl.dampingFactor   = 0.08;
        ctrl.minDistance     = 101;
        ctrl.maxDistance     = 700;
      } catch (_) {}
    }, 50);

    return () => clearTimeout(t);
  }, [globeEl]);

  /* ── Airport point data ────────────────────────────────── */
  const maxDeg = useMemo(
    () => Math.max(...Array.from(degreeCentrality?.values() || [1]), 1),
    [degreeCentrality]
  );

  const ctx = { showHeatmap, trafficLoad, communities, selectedAirport, degreeCentrality };

  const pointsData = useMemo(() => airports
    .filter(a => a.code !== removedHub)
    .map(a => {
      const deg   = degreeCentrality?.get(a.code) || 0;
      const isHub = deg > 50;
      const isSel = selectedAirport?.code === a.code;
      return {
        ...a,
        lng:    a.lon,
        color:  airportColor(a.code, ctx),
        radius: isSel ? 0.65 : isHub ? 0.48 : Math.max(0.15, 0.15 + (deg / maxDeg) * 0.3),
      };
    }), // eslint-disable-next-line
    [airports, removedHub, degreeCentrality, showHeatmap, trafficLoad, communities, selectedAirport, maxDeg]
  );

  /* ── Arc data (routes + highlighted path) ──────────────── */
  const arcsData = useMemo(() => {
    const aMap = new Map(airports.map(a => [a.code, a]));
    const out  = [];

    /* Highlighted path — animated flowing dash */
    if (highlightedPath?.length > 1) {
      for (let i = 0; i < highlightedPath.length - 1; i++) {
        const s = aMap.get(highlightedPath[i]);
        const t = aMap.get(highlightedPath[i + 1]);
        if (s && t) out.push({
          sLat: s.lat, sLng: s.lon, eLat: t.lat, eLng: t.lon,
          color:    ['rgba(74,222,128,0)', 'rgba(74,222,128,0.95)', 'rgba(74,222,128,0)'],
          stroke:   2.0, altitude: 0.10, dash: 0.4, gap: 0.2, anim: 2000,
        });
      }
    }

    /* Selected airport — orange connected routes */
    if (selectedAirport) {
      routes
        .filter(r => r.source === selectedAirport.code || r.target === selectedAirport.code)
        .forEach(r => {
          const s = aMap.get(r.source), t = aMap.get(r.target);
          if (s && t) out.push({
            sLat: s.lat, sLng: s.lon, eLat: t.lat, eLng: t.lon,
            color:    ['rgba(249,115,22,0)', 'rgba(249,115,22,0.85)', 'rgba(249,115,22,0)'],
            stroke:   1.0, altitude: 0.05, dash: 1, gap: 0, anim: 0,
          });
        });
      return out;
    }

    /* Background network — sampled, faint green */
    routes
      .filter((_, i) => i % 5 === 0)
      .filter(r => r.source !== removedHub && r.target !== removedHub)
      .forEach(r => {
        const s = aMap.get(r.source), t = aMap.get(r.target);
        if (s && t) out.push({
          sLat: s.lat, sLng: s.lon, eLat: t.lat, eLng: t.lon,
          color:    ['rgba(34,197,94,0)', 'rgba(34,197,94,0.20)', 'rgba(34,197,94,0)'],
          stroke:   0.3, altitude: 0.04, dash: 1, gap: 0, anim: 0,
        });
      });

    return out;
  }, [airports, routes, highlightedPath, selectedAirport, removedHub]);

  /* ── Tooltip position tracking ─────────────────────────── */
  const handleMouseMove = useCallback((e) => {
    if (tooltip) setTipPos({ x: e.clientX, y: e.clientY });
  }, [tooltip]);

  const handleHover = useCallback((pt, _prev, event) => {
    setTooltip(pt || null);
    if (pt && event) setTipPos({ x: event.clientX, y: event.clientY });
  }, []);

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMouseMove}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#020508', overflow: 'hidden' }}
    >
      <Globe
        ref={setGlobeEl}
        width={dims.w}
        height={dims.h}

        /* Transparent bg — wrapper sets #020508 */
        backgroundColor="rgba(0,0,0,0)"

        /* Atmosphere — war-watch green glow */
        showAtmosphere={true}
        atmosphereColor="#22c55e"
        atmosphereAltitude={0.14}

        /* Globe texture — null = use custom material colour set in useEffect */
        globeImageUrl={null}

        /* Country polygons */
        polygonsData={countries}
        polygonGeoJsonGeometry={d => d.geometry}
        polygonCapColor={() => 'rgba(14,26,16,0.92)'}
        polygonSideColor={() => 'rgba(5,12,8,0.5)'}
        polygonStrokeColor={() => 'rgba(34,197,94,0.16)'}
        polygonAltitude={0.003}

        /* Airport dots */
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius="radius"
        pointAltitude={0.008}
        pointResolution={8}
        pointLabel=""
        onPointClick={pt => onAirportClick?.(pt)}
        onPointHover={handleHover}

        /* Route arcs */
        arcsData={arcsData}
        arcStartLat="sLat"
        arcStartLng="sLng"
        arcEndLat="eLat"
        arcEndLng="eLng"
        arcColor="color"
        arcAltitude="altitude"
        arcStroke="stroke"
        arcDashLength="dash"
        arcDashGap="gap"
        arcDashAnimateTime="anim"
      />

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="globe-tooltip"
          style={{ position: 'fixed', left: tipPos.x + 16, top: tipPos.y - 40, pointerEvents: 'none', zIndex: 9999 }}
        >
          <div className="globe-tooltip-code">{tooltip.code} — {tooltip.city}</div>
          <div className="globe-tooltip-name">{tooltip.name}</div>
          <div className="globe-tooltip-connections">
            <span className="globe-tooltip-dot" />
            {degreeCentrality?.get(tooltip.code) || 0} connections
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="globe-hint">
        <span>Drag to rotate</span>
        <span className="globe-hint-sep" />
        <span>Scroll to zoom</span>
        <span className="globe-hint-sep" />
        <span>Click for details</span>
      </div>
    </div>
  );
}
