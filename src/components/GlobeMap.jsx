import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

/* ── Quaternion (versor) helpers ─────────────────────────────
   Correct 3-D rotation — straight drags stay straight at any tilt */
function vFromAngles([l, p, g]) {
  l *= Math.PI / 360; p *= Math.PI / 360; g *= Math.PI / 360;
  const sl = Math.sin(l), cl = Math.cos(l);
  const sp = Math.sin(p), cp = Math.cos(p);
  const sg = Math.sin(g), cg = Math.cos(g);
  return [
    cl*cp*cg + sl*sp*sg, sl*cp*cg - cl*sp*sg,
    cl*sp*cg + sl*cp*sg, cl*cp*sg - sl*sp*cg,
  ];
}
function vToAngles([a, b, c, d]) {
  return [
    Math.atan2(2*(a*b + c*d), 1 - 2*(b*b + c*c)) * 180/Math.PI,
    Math.asin(Math.max(-1, Math.min(1, 2*(a*c - d*b)))) * 180/Math.PI,
    Math.atan2(2*(a*d + b*c), 1 - 2*(c*c + d*d)) * 180/Math.PI,
  ];
}
function vMul([a1,b1,c1,d1],[a2,b2,c2,d2]) {
  return [a1*a2-b1*b2-c1*c2-d1*d2, a1*b2+b1*a2+c1*d2-d1*c2,
          a1*c2-b1*d2+c1*a2+d1*b2, a1*d2+b1*c2-c1*b2+d1*a2];
}
function vDelta(v0, v1) {
  const w = [v0[1]*v1[2]-v0[2]*v1[1], v0[2]*v1[0]-v0[0]*v1[2], v0[0]*v1[1]-v0[1]*v1[0]];
  const n = Math.sqrt(w[0]*w[0]+w[1]*w[1]+w[2]*w[2]);
  if (!n) return [1,0,0,0];
  const t = Math.atan2(n, v0[0]*v1[0]+v0[1]*v1[1]+v0[2]*v1[2]);
  const s = Math.sin(t/2)/n;
  return [Math.cos(t/2), w[0]*s, w[1]*s, w[2]*s];
}
function geoToCart([l, p]) {
  l *= Math.PI/180; p *= Math.PI/180;
  return [Math.cos(p)*Math.cos(l), Math.cos(p)*Math.sin(l), Math.sin(p)];
}
function makeProj(W, H, R, rot) {
  return d3.geoOrthographic().scale(R).translate([W/2,H/2]).rotate(rot).clipAngle(90);
}

/* ── War-watch colour palette ────────────────────────────────
   Near-black bg  |  dark-navy ocean  |  military-olive land
   Green atmosphere + rim  |  orange conflict markers        */
const COMMUNITY_COLORS = [
  '#f97316','#22c55e','#eab308','#a855f7',
  '#ec4899','#06b6d4','#84cc16','#f43f5e',
];

function airportColor(code, S) {
  if (S.selectedAirport?.code === code) return '#ffffff';
  if (S.showHeatmap && S.trafficLoad) {
    const t = S.trafficLoad.get(code);
    if (t?.level === 'critical') return '#ef4444';
    if (t?.level === 'high')     return '#f97316';
    if (t?.level === 'medium')   return '#eab308';
    if (t)                       return '#22c55e';
  }
  if (S.communities) {
    const id = S.communities.get(code);
    if (id !== undefined) return COMMUNITY_COLORS[id % COMMUNITY_COLORS.length];
  }
  /* Major hubs — orange (conflict-marker style)
     Regional    — radar green                  */
  return (S.degreeCentrality?.get(code) || 0) > 50 ? '#f97316' : '#22c55e';
}

/* ═══════════════════════════════════════════════════════════
   GlobeMap  —  war-watch aesthetic
   Drag: versor quaternion (straight drags stay straight)
   Release: inertia / momentum → natural glide
   Scroll: two-finger pan | ctrl+scroll / wheel: zoom
   ═══════════════════════════════════════════════════════════ */
export default function GlobeMap({
  airports=[], routes=[],
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
    zoomFactor: 1.35,
    targetZoom: 1.35,
    /* versor drag */
    dragging:    false, mouseDownXY: null,
    v0: null, q0: null, r0: null,
    /* inertia */
    velX: 0, velY: 0,
    recentMoves: [],       // [{dx,dy,t}]
    _prevClientX: 0, _prevClientY: 0,
    /* touch */
    pinchDist: null, pinchStart: null,
    /* misc */
    autoRotate: true, idleTimer: null, animId: null,
    worldLo: null, worldHi: null,
    stars: [], hits: [],
    /* props */
    airports:[], routes:[], highlightedPath:null, removedHub:null,
    degreeCentrality:null, showHeatmap:false, selectedAirport:null,
    communities:null, trafficLoad:null, onAirportClick:null,
  }).current;

  S.airports=airports; S.routes=routes; S.highlightedPath=highlightedPath;
  S.removedHub=removedHub; S.degreeCentrality=degreeCentrality;
  S.showHeatmap=showHeatmap; S.selectedAirport=selectedAirport;
  S.communities=communities; S.trafficLoad=trafficLoad; S.onAirportClick=onAirportClick;

  /* ── DRAW ───────────────────────────────────────────────── */
  const draw = () => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    if (!W || !H) return;

    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(W*dpr), ph = Math.round(H*dpr);
    if (canvas.width!==pw || canvas.height!==ph) { canvas.width=pw; canvas.height=ph; }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,H);

    const R  = Math.min(W,H) * 0.44 * S.zoomFactor;
    const cx = W/2, cy = H/2;
    const proj = makeProj(W, H, R, S.rotation);
    const path = d3.geoPath(proj, ctx);

    /* ① Stars — very subtle, slightly warm white */
    for (const s of S.stars) {
      ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
      ctx.fillStyle = s.c; ctx.fill();
    }

    /* ② Outer atmosphere — green glow (war-watch signature) */
    const atmo = ctx.createRadialGradient(cx, cy, R*0.86, cx, cy, R*1.4);
    atmo.addColorStop(0,   'rgba(34,197,94,0.13)');
    atmo.addColorStop(0.4, 'rgba(20,120,60,0.05)');
    atmo.addColorStop(1,   'transparent');
    ctx.beginPath(); ctx.arc(cx, cy, R*1.4, 0, Math.PI*2);
    ctx.fillStyle = atmo; ctx.fill();

    /* ③ Ocean — deep navy-black */
    ctx.beginPath(); path({ type:'Sphere' });
    const ocean = ctx.createRadialGradient(
      cx - R*0.28, cy - R*0.28, R*0.03,
      cx + R*0.1,  cy + R*0.15, R*1.05
    );
    ocean.addColorStop(0,    '#102038');
    ocean.addColorStop(0.3,  '#081428');
    ocean.addColorStop(0.7,  '#040c1c');
    ocean.addColorStop(1,    '#020810');
    ctx.fillStyle = ocean; ctx.fill();

    /* ④ Specular — cool light from upper-left */
    ctx.save();
    ctx.beginPath(); path({ type:'Sphere' }); ctx.clip();
    const spec = ctx.createRadialGradient(
      cx - R*0.38, cy - R*0.38, 0,
      cx - R*0.12, cy - R*0.12, R*0.72
    );
    spec.addColorStop(0, 'rgba(160,220,180,0.09)');
    spec.addColorStop(1, 'transparent');
    ctx.fillStyle = spec; ctx.fillRect(cx-R, cy-R, R*2, R*2);
    ctx.restore();

    /* ⑤ Graticule — very faint green tint */
    const gStep = S.zoomFactor > 3 ? 5 : S.zoomFactor > 1.8 ? 10 : 20;
    ctx.beginPath(); path(d3.geoGraticule().step([gStep,gStep])());
    ctx.strokeStyle = 'rgba(34,197,94,0.05)'; ctx.lineWidth = 0.4; ctx.stroke();

    /* ⑥ Countries — military olive; borders green */
    const worldGeo = (S.zoomFactor > 2 && S.worldHi) ? S.worldHi : S.worldLo;
    if (worldGeo) {
      ctx.beginPath(); path(worldGeo);
      ctx.fillStyle = 'rgba(14,24,16,0.94)'; ctx.fill();
      const bop = Math.min(0.28, 0.08 + (S.zoomFactor - 1)*0.07);
      ctx.strokeStyle = `rgba(34,197,94,${bop})`; ctx.lineWidth = 0.5; ctx.stroke();
    }

    /* ⑦ Globe rim — green glow ring */
    ctx.beginPath(); path({ type:'Sphere' });
    const rim = ctx.createLinearGradient(cx-R, cy-R, cx+R, cy+R);
    rim.addColorStop(0,   'rgba(74,222,128,0.65)');
    rim.addColorStop(0.5, 'rgba(34,197,94,0.25)');
    rim.addColorStop(1,   'rgba(74,222,128,0.55)');
    ctx.strokeStyle = rim; ctx.lineWidth = 1.5; ctx.stroke();

    /* ⑧ Routes */
    const aMap   = new Map(S.airports.map(a => [a.code, a]));
    const maxDeg = Math.max(...Array.from(S.degreeCentrality?.values() || [1]), 1);
    const visC   = [-S.rotation[0], -S.rotation[1]];

    let fRoutes = S.routes;
    if (S.removedHub) fRoutes = fRoutes.filter(r => r.source!==S.removedHub && r.target!==S.removedHub);
    if (S.selectedAirport) fRoutes = fRoutes.filter(r => r.source===S.selectedAirport.code || r.target===S.selectedAirport.code);
    const step5 = S.selectedAirport ? 1 : Math.max(1, Math.round(5/Math.sqrt(S.zoomFactor)));

    if (!S.showHeatmap) {
      ctx.save();
      fRoutes.forEach((route, i) => {
        if (i % step5 !== 0) return;
        const src = aMap.get(route.source), tgt = aMap.get(route.target);
        if (!src || !tgt) return;
        const hot = S.selectedAirport && (route.source===S.selectedAirport.code || route.target===S.selectedAirport.code);
        ctx.beginPath();
        path({ type:'LineString', coordinates:[[src.lon,src.lat],[tgt.lon,tgt.lat]] });
        ctx.strokeStyle = hot ? 'rgba(249,115,22,0.80)' : 'rgba(34,197,94,0.11)';
        ctx.lineWidth = hot ? 1.5 : 0.65;
        ctx.stroke();
      });
      ctx.restore();
    }

    /* ⑨ Highlighted path — bright green pulse */
    if (S.highlightedPath?.length > 1) {
      const pulse = 0.65 + 0.35 * Math.sin(Date.now()/480);
      ctx.save(); ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 14*pulse;
      for (let i=0; i<S.highlightedPath.length-1; i++) {
        const s=aMap.get(S.highlightedPath[i]), t=aMap.get(S.highlightedPath[i+1]);
        if (!s||!t) continue;
        ctx.beginPath();
        path({ type:'LineString', coordinates:[[s.lon,s.lat],[t.lon,t.lat]] });
        ctx.strokeStyle = `rgba(74,222,128,${pulse})`; ctx.lineWidth = 2.5; ctx.stroke();
      }
      ctx.restore();
    }

    /* ⑩ Airports */
    const newHits = [];
    for (const airport of S.airports) {
      if (airport.code === S.removedHub) continue;
      const dist = d3.geoDistance([airport.lon,airport.lat], visC);
      if (dist > Math.PI/2 + 0.08) continue;
      const px = proj([airport.lon, airport.lat]);
      if (!px) continue;
      const [x, y] = px;

      const deg   = S.degreeCentrality?.get(airport.code) || 0;
      const isHub = deg > 50;
      const isSel = S.selectedAirport?.code === airport.code;
      const r     = (isSel ? 3 : 0) + Math.max(2, Math.min(9, 2.5 + (deg/maxDeg)*7));
      const op    = S.showHeatmap ? Math.max(0.45, deg/maxDeg) : 0.93;
      const col   = airportColor(airport.code, S);

      /* halo */
      if (isHub || isSel) {
        const hr   = r + (isSel ? 9 : 5);
        const halo = ctx.createRadialGradient(x, y, r*0.3, x, y, hr);
        halo.addColorStop(0, col+'55'); halo.addColorStop(1,'transparent');
        ctx.beginPath(); ctx.arc(x, y, hr, 0, Math.PI*2);
        ctx.fillStyle = halo; ctx.fill();
      }

      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.globalAlpha = op; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;

      if (isSel) {
        ctx.beginPath(); ctx.arc(x, y, r+4, 0, Math.PI*2);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      newHits.push({ airport, x, y, r: Math.max(r+2,8), deg });
    }
    S.hits = newHits;

    /* ⑪ City labels */
    const zoom = S.zoomFactor;
    const minDeg = zoom>4.5?0 : zoom>3.5?8 : zoom>2.5?20 : zoom>1.8?38 : zoom>1.4?60 : zoom>1.15?78 : 92;
    const fSize  = Math.max(9, Math.min(13, 9 + (zoom-1)*2));
    ctx.textAlign='left'; ctx.textBaseline='middle';
    for (const {airport, x, y, r, deg} of newHits) {
      if (deg < minDeg) continue;
      const isHub = deg > 55;
      const label = zoom > 2 ? airport.city : airport.code;
      ctx.font = `${isHub?700:600} ${fSize}px 'Sora',system-ui,sans-serif`;
      ctx.lineWidth=3; ctx.lineJoin='round';
      ctx.strokeStyle='rgba(2,5,12,0.95)'; ctx.strokeText(label, x+r+5, y);
      ctx.fillStyle = isHub ? '#fbbf24' : 'rgba(134,239,172,0.92)';
      ctx.fillText(label, x+r+5, y);
    }
  };

  /* ── ANIMATION LOOP ─────────────────────────────────────── */
  useEffect(() => {
    /* Star field — more subtle, near-white */
    S.stars = Array.from({ length: 220 }, () => {
      const rnd = Math.random();
      return {
        x: Math.random(), y: Math.random(),
        r: rnd*rnd*1.4 + 0.15,
        c: `rgba(${215+Math.floor(Math.random()*40)},${220+Math.floor(Math.random()*35)},${215+Math.floor(Math.random()*40)},${(Math.random()*0.35+0.05).toFixed(2)})`,
      };
    });

    const loop = () => {
      /* smooth zoom */
      S.zoomFactor += (S.targetZoom - S.zoomFactor) * 0.1;

      /* inertia — applies after drag release, decays via friction */
      const speed = Math.sqrt(S.velX*S.velX + S.velY*S.velY);
      if (!S.dragging && speed > 0.004) {
        S.rotation = [
          S.rotation[0] + S.velX,
          Math.max(-85, Math.min(85, S.rotation[1] - S.velY)),
          S.rotation[2],
        ];
        S.velX *= 0.92;   /* friction — feels like real globe physics */
        S.velY *= 0.92;
      } else if (S.autoRotate && !S.dragging && speed <= 0.004) {
        /* slow ambient rotation when idle */
        S.rotation = [S.rotation[0] + 0.025, S.rotation[1], S.rotation[2]];
      }

      draw();
      S.animId = requestAnimationFrame(loop);
    };
    S.animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(S.animId);
  }, []); // eslint-disable-line

  /* ── WORLD ATLAS ────────────────────────────────────────── */
  useEffect(() => {
    const BASE = 'https://cdn.jsdelivr.net/npm/world-atlas@2/';
    fetch(BASE+'countries-110m.json').then(r=>r.json())
      .then(w => { S.worldLo = topojson.feature(w, w.objects.countries); }).catch(()=>{});
    fetch(BASE+'countries-50m.json').then(r=>r.json())
      .then(w => { S.worldHi = topojson.feature(w, w.objects.countries); }).catch(()=>{});
  }, []); // eslint-disable-line

  /* ── INTERACTION ────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const resetIdle = () => {
      clearTimeout(S.idleTimer);
      S.idleTimer = setTimeout(() => { S.autoRotate = true; }, 4000);
    };

    const hitTest = (x, y) => {
      let best=null, bd=Infinity;
      for (const h of S.hits) {
        const d = Math.hypot(h.x-x, h.y-y);
        if (d < h.r+6 && d < bd) { bd=d; best=h; }
      }
      return best;
    };

    /* Clamp (x,y) inside sphere so proj.invert never returns null mid-drag */
    const clamp = (x, y, W, H, R) => {
      const cx=W/2, cy=H/2;
      const dx=x-cx, dy=y-cy;
      const d = Math.sqrt(dx*dx+dy*dy);
      return d > R-1 ? [cx + dx*(R-1)/d, cy + dy*(R-1)/d] : [x, y];
    };

    const applyVersor = (sx, sy, W, H, R) => {
      const geo = makeProj(W, H, R, S.r0).invert([sx, sy]);
      if (!geo) return;
      const v1 = geoToCart(geo);
      const q1 = vMul(vDelta(S.v0, v1), S.q0);
      const a  = vToAngles(q1);
      S.rotation = [a[0], Math.max(-85, Math.min(85, a[1])), a[2]];
    };

    /* ── Mouse down ── */
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const W = wrap.clientWidth, H = wrap.clientHeight;
      const R = Math.min(W,H) * 0.44 * S.zoomFactor;
      const [sx, sy] = clamp(x, y, W, H, R);

      S.r0 = [...S.rotation];
      S.q0 = vFromAngles(S.r0);
      S.v0 = (() => { const g = makeProj(W,H,R,S.r0).invert([sx,sy]); return g ? geoToCart(g) : null; })();

      S.dragging = true; S.autoRotate = false;
      S.mouseDownXY = { x, y };
      /* inertia reset */
      S.velX = 0; S.velY = 0; S.recentMoves = [];
      S._prevClientX = e.clientX; S._prevClientY = e.clientY;
      canvas.style.cursor = 'grabbing';
      clearTimeout(S.idleTimer);
    };

    /* ── Mouse move (on window — never drops during fast swipe) ── */
    const onMouseMove = (e) => {
      if (S.dragging) {
        /* track velocity for inertia */
        const now = performance.now();
        S.recentMoves.push({
          dx: e.clientX - S._prevClientX,
          dy: e.clientY - S._prevClientY,
          t:  now,
        });
        S._prevClientX = e.clientX;
        S._prevClientY = e.clientY;
        /* keep only last 80 ms */
        const cut = now - 80;
        while (S.recentMoves.length > 0 && S.recentMoves[0].t < cut) S.recentMoves.shift();

        if (S.v0 && S.q0 && S.r0) {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left, y = e.clientY - rect.top;
          const W = wrap.clientWidth, H = wrap.clientHeight;
          const R = Math.min(W,H) * 0.44 * S.zoomFactor;
          const [sx, sy] = clamp(x, y, W, H, R);
          applyVersor(sx, sy, W, H, R);
        }
        setTooltip(null);
      } else {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        if (x<0||y<0||x>rect.width||y>rect.height) return;
        const hit = hitTest(x, y);
        canvas.style.cursor = hit ? 'pointer' : 'grab';
        setTooltip(hit ? { x:hit.x, y:hit.y, airport:hit.airport, degree:hit.deg } : null);
      }
    };

    /* ── Mouse up — launch inertia ── */
    const onMouseUp = (e) => {
      if (!S.dragging) return;
      S.dragging = false;
      canvas.style.cursor = 'grab';

      /* compute velocity from recent moves */
      if (S.recentMoves.length > 1) {
        const span = S.recentMoves[S.recentMoves.length-1].t - S.recentMoves[0].t;
        if (span > 5) {
          const tdx = S.recentMoves.reduce((a,m)=>a+m.dx, 0);
          const tdy = S.recentMoves.reduce((a,m)=>a+m.dy, 0);
          const sens = 0.28 / Math.sqrt(S.zoomFactor);
          S.velX =  (tdx / span) * 12 * sens;
          S.velY =  (tdy / span) * 12 * sens;
        }
      }
      S.recentMoves = [];

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const moved = S.mouseDownXY ? Math.hypot(x-S.mouseDownXY.x, y-S.mouseDownXY.y) : 99;
      if (moved < 6) {
        const hit = hitTest(S.mouseDownXY.x, S.mouseDownXY.y);
        if (hit) { S.onAirportClick?.(hit.airport); setTooltip(null); }
      }
      resetIdle();
    };

    /* ── Wheel ── */
    const onWheel = (e) => {
      e.preventDefault();
      S.autoRotate = false;
      if (e.ctrlKey) {
        /* Mac pinch → zoom */
        S.targetZoom = Math.max(0.45, Math.min(9, S.targetZoom * (e.deltaY<0?1.06:0.945)));
      } else if (e.deltaMode === 0) {
        /* Trackpad two-finger → rotate */
        const sens = 0.18 / Math.sqrt(S.zoomFactor);
        S.rotation = [
          S.rotation[0] + e.deltaX*sens,
          Math.max(-85, Math.min(85, S.rotation[1] + e.deltaY*sens)),
          S.rotation[2],
        ];
      } else {
        /* Mouse wheel → zoom */
        S.targetZoom = Math.max(0.45, Math.min(9, S.targetZoom * (e.deltaY<0?1.12:0.90)));
      }
      resetIdle();
    };

    /* ── Touch ── */
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        S.pinchDist  = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
        S.pinchStart = S.targetZoom;
        S.dragging   = false;
      } else if (e.touches.length === 1) {
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left, y = e.touches[0].clientY - rect.top;
        const W = wrap.clientWidth, H = wrap.clientHeight;
        const R = Math.min(W,H)*0.44*S.zoomFactor;
        const [sx,sy] = clamp(x,y,W,H,R);
        S.r0 = [...S.rotation]; S.q0 = vFromAngles(S.r0);
        S.v0 = (() => { const g=makeProj(W,H,R,S.r0).invert([sx,sy]); return g?geoToCart(g):null; })();
        S.dragging=true; S.autoRotate=false;
        S.mouseDownXY={x,y};
        S.velX=0; S.velY=0; S.recentMoves=[];
        S._prevClientX=e.touches[0].clientX; S._prevClientY=e.touches[0].clientY;
        clearTimeout(S.idleTimer);
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length===2 && S.pinchDist!==null) {
        e.preventDefault();
        const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
        S.targetZoom = Math.max(0.45, Math.min(9, S.pinchStart*(d/S.pinchDist)));
      } else if (S.dragging && e.touches.length===1 && S.v0&&S.q0&&S.r0) {
        e.preventDefault();
        const rect=canvas.getBoundingClientRect();
        const x=e.touches[0].clientX-rect.left, y=e.touches[0].clientY-rect.top;
        const W=wrap.clientWidth, H=wrap.clientHeight;
        const R=Math.min(W,H)*0.44*S.zoomFactor;
        const [sx,sy]=clamp(x,y,W,H,R);
        applyVersor(sx,sy,W,H,R);
        const now=performance.now();
        S.recentMoves.push({dx:e.touches[0].clientX-S._prevClientX,dy:e.touches[0].clientY-S._prevClientY,t:now});
        S._prevClientX=e.touches[0].clientX; S._prevClientY=e.touches[0].clientY;
      }
    };

    const onTouchEnd = (e) => {
      S.pinchDist=null;
      if (S.dragging) {
        S.dragging=false;
        if (S.recentMoves.length>1) {
          const span=S.recentMoves[S.recentMoves.length-1].t-S.recentMoves[0].t;
          if (span>5) {
            const tdx=S.recentMoves.reduce((a,m)=>a+m.dx,0);
            const tdy=S.recentMoves.reduce((a,m)=>a+m.dy,0);
            const sens=0.28/Math.sqrt(S.zoomFactor);
            S.velX=(tdx/span)*12*sens; S.velY=(tdy/span)*12*sens;
          }
        }
        S.recentMoves=[];
        const rect=canvas.getBoundingClientRect();
        const t=e.changedTouches[0];
        const x=t.clientX-rect.left, y=t.clientY-rect.top;
        const moved=S.mouseDownXY?Math.hypot(x-S.mouseDownXY.x,y-S.mouseDownXY.y):99;
        if (moved<8) { const hit=hitTest(x,y); if(hit) S.onAirportClick?.(hit.airport); }
        resetIdle();
      }
    };

    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('wheel',      onWheel,      { passive:false });
    canvas.addEventListener('touchstart', onTouchStart, { passive:false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive:false });
    canvas.addEventListener('touchend',   onTouchEnd);
    window.addEventListener('mousemove',  onMouseMove);
    window.addEventListener('mouseup',    onMouseUp);
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
    <div ref={wrapRef} style={{ position:'relative', width:'100%', height:'100%', background:'#020508', overflow:'hidden' }}>
      <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'100%' }} />

      <div className="globe-hint">
        <span>Drag to rotate</span><span className="globe-hint-sep"/>
        <span>Scroll to pan</span><span className="globe-hint-sep"/>
        <span>Pinch to zoom</span>
      </div>

      {tooltip && (
        <div className="globe-tooltip" style={{ position:'absolute', left:tooltip.x+18, top:tooltip.y, transform:'translateY(-50%)', pointerEvents:'none' }}>
          <div className="globe-tooltip-code">{tooltip.airport.code} — {tooltip.airport.city}</div>
          <div className="globe-tooltip-name">{tooltip.airport.name}</div>
          <div className="globe-tooltip-connections">
            <span className="globe-tooltip-dot"/>
            {tooltip.degree} connections
          </div>
        </div>
      )}
    </div>
  );
}
