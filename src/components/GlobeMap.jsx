import React, { useRef, useEffect, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as topojson from 'topojson-client';

/* ── Community colour palette ────────────────────────────── */
const COMMUNITY_COLORS = [
  '#f97316', '#22c55e', '#eab308', '#a855f7',
  '#ec4899', '#06b6d4', '#84cc16', '#f43f5e',
];

function getColor(code, { showHeatmap, trafficLoad, communities, selectedAirport, degreeCentrality }) {
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
    if (id !== undefined) return COMMUNITY_COLORS[id % COMMUNITY_COLORS.length];
  }
  return (degreeCentrality?.get(code) || 0) > 50 ? '#f97316' : '#22c55e';
}

/* ═══════════════════════════════════════════════════════════
   GlobeMap — powered by globe.gl / Three.js WebGL
   Matches war-watch.com aesthetic:
   • Dark navy sphere  • Green atmospheric glow
   • Military olive land polygons  • Glowing route arcs
   ═══════════════════════════════════════════════════════════ */
export default function GlobeMap({
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
}) {
  const globeRef  = useRef(null);
  const wrapRef   = useRef(null);
  const [dims,     setDims]     = useState({ w: 800, h: 600 });
  const [countries, setCountries] = useState([]);
  const [tooltip,  setTooltip]  = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  /* ── Responsive sizing ─────────────────────────────────── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  /* ── Load world atlas (country polygons) ───────────────── */
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(world => {
        const features = topojson.feature(world, world.objects.countries).features;
        setCountries(features);
      })
      .catch(() => {});
  }, []);

  /* ── Configure globe after mount ──────────────────────── */
  useEffect(() => {
    if (!globeRef.current) return;

    /* Dark navy sphere — war-watch ocean colour */
    const mat = globeRef.current.globeMaterial();
    mat.color.set('#040c1a');
    mat.emissive.set('#000510');
    mat.shininess = 8;

    /* Start centred on North America */
    globeRef.current.pointOfView({ lat: 38, lng: -96, altitude: 1.8 }, 0);

    /* Controls: inertia + slow auto-rotate */
    const ctrl = globeRef.current.controls();
    ctrl.autoRotate      = true;
    ctrl.autoRotateSpeed = 0.4;
    ctrl.enableDamping   = true;
    ctrl.dampingFactor   = 0.08;
    ctrl.minDistance     = 101;
    ctrl.maxDistance     = 600;
  }, [globeRef.current]); // eslint-disable-line

  /* ── Airport point data ────────────────────────────────── */
  const maxDeg = useMemo(
    () => Math.max(...Array.from(degreeCentrality?.values() || [1]), 1),
    [degreeCentrality]
  );

  const pointsData = useMemo(() => {
    const ctx = { showHeatmap, trafficLoad, communities, selectedAirport, degreeCentrality };
    return airports
      .filter(a => a.code !== removedHub)
      .map(a => {
        const deg   = degreeCentrality?.get(a.code) || 0;
        const isHub = deg > 50;
        const isSel = selectedAirport?.code === a.code;
        return {
          ...a,
          lng:    a.lon,               // globe.gl uses lng
          color:  getColor(a.code, ctx),
          radius: isSel ? 0.6 : isHub ? 0.45 : Math.max(0.15, 0.15 + (deg / maxDeg) * 0.28),
        };
      });
  }, [airports, removedHub, degreeCentrality, showHeatmap, trafficLoad, communities, selectedAirport, maxDeg]);

  /* ── Route arc data ────────────────────────────────────── */
  const arcsData = useMemo(() => {
    const airportMap = new Map(airports.map(a => [a.code, a]));
    const arcs = [];

    /* highlighted path arcs — animated flowing dash */
    if (highlightedPath && highlightedPath.length > 1) {
      for (let i = 0; i < highlightedPath.length - 1; i++) {
        const s = airportMap.get(highlightedPath[i]);
        const t = airportMap.get(highlightedPath[i + 1]);
        if (s && t) {
          arcs.push({
            sLat: s.lat, sLng: s.lon, eLat: t.lat, eLng: t.lon,
            color:    ['rgba(74,222,128,0.0)', 'rgba(74,222,128,0.95)', 'rgba(74,222,128,0.0)'],
            stroke:   2.0,
            altitude: 0.08,
            dash:     0.4,
            gap:      0.2,
            animTime: 2000,
            layer:    'path',
          });
        }
      }
    }

    /* selected airport connection routes — orange */
    if (selectedAirport) {
      const filtered = routes.filter(
        r => r.source === selectedAirport.code || r.target === selectedAirport.code
      );
      for (const r of filtered) {
        const s = airportMap.get(r.source), t = airportMap.get(r.target);
        if (s && t) {
          arcs.push({
            sLat: s.lat, sLng: s.lon, eLat: t.lat, eLng: t.lon,
            color:    ['rgba(249,115,22,0.0)', 'rgba(249,115,22,0.80)', 'rgba(249,115,22,0.0)'],
            stroke:   1.0,
            altitude: 0.05,
            dash:     1, gap: 0, animTime: 0,
            layer:    'selected',
          });
        }
      }
      return arcs;
    }

    /* background route network — sampled, faint green */
    const sampled = routes.filter((_, i) => i % 5 === 0);
    for (const r of sampled) {
      if (r.source === removedHub || r.target === removedHub) continue;
      const s = airportMap.get(r.source), t = airportMap.get(r.target);
      if (s && t) {
        arcs.push({
          sLat: s.lat, sLng: s.lon, eLat: t.lat, eLng: t.lon,
          color:    ['rgba(34,197,94,0.0)', 'rgba(34,197,94,0.18)', 'rgba(34,197,94,0.0)'],
          stroke:   0.3,
          altitude: 0.04,
          dash:     1, gap: 0, animTime: 0,
          layer:    'bg',
        });
      }
    }

    return arcs;
  }, [airports, routes, highlightedPath, selectedAirport, removedHub]);

  /* ── Handlers ──────────────────────────────────────────── */
  const handlePointClick = (pt) => {
    onAirportClick?.(pt);
  };

  const handlePointHover = (pt, _prev, event) => {
    if (pt) {
      setTooltip(pt);
      if (event) setTooltipPos({ x: event.clientX, y: event.clientY });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseMove = (e) => {
    if (tooltip) setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#020508', overflow: 'hidden' }}
      onMouseMove={handleMouseMove}
    >
      <Globe
        ref={globeRef}
        width={dims.w}
        height={dims.h}
        /* ── Background transparent so wrapper sets colour ── */
        backgroundColor="rgba(0,0,0,0)"
        /* ── Atmosphere — war-watch green glow ── */
        showAtmosphere={true}
        atmosphereColor="#22c55e"
        atmosphereAltitude={0.14}
        /* ── Globe texture — none (material set via globeRef) ── */
        globeImageUrl={null}
        /* ── Country polygons ── */
        polygonsData={countries}
        polygonGeoJsonGeometry={d => d.geometry}
        polygonCapColor={() => 'rgba(14,26,16,0.92)'}
        polygonSideColor={() => 'rgba(5,12,8,0.6)'}
        polygonStrokeColor={() => 'rgba(34,197,94,0.16)'}
        polygonAltitude={0.003}
        /* ── Airport points ── */
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius="radius"
        pointAltitude={0.008}
        pointResolution={8}
        pointLabel=""
        onPointClick={handlePointClick}
        onPointHover={handlePointHover}
        /* ── Route arcs ── */
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
        arcDashAnimateTime="animTime"
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="globe-tooltip"
          style={{
            position:      'fixed',
            left:          tooltipPos.x + 16,
            top:           tooltipPos.y - 40,
            pointerEvents: 'none',
            zIndex:        1000,
          }}
        >
          <div className="globe-tooltip-code">{tooltip.code} — {tooltip.city}</div>
          <div className="globe-tooltip-name">{tooltip.name}</div>
          <div className="globe-tooltip-connections">
            <span className="globe-tooltip-dot" />
            {degreeCentrality?.get(tooltip.code) || 0} connections
          </div>
        </div>
      )}

      {/* Hint */}
      <div className="globe-hint">
        <span>Drag to rotate</span>
        <span className="globe-hint-sep" />
        <span>Scroll to zoom</span>
        <span className="globe-hint-sep" />
        <span>Click airport for details</span>
      </div>
    </div>
  );
}
