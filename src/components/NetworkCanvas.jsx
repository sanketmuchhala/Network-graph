import React, { useRef, useEffect, useState } from 'react';

const NetworkCanvas = ({
  airports,
  routes,
  airlines,
  selectedAirline,
  highlightedPath,
  removedHub,
  onAirportHover,
  onAirportClick,
  degreeCentrality,
  theme
}) => {
  const canvasRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredAirport, setHoveredAirport] = useState(null);

  const US_BOUNDS = {
    minLat: 24.0,
    maxLat: 50.0,
    minLon: -126.0,
    maxLon: -65.0
  };

  // US State boundaries (simplified major states)
  const US_STATES = [
    // West Coast
    { name: 'CA', points: [[-124, 42], [-124, 32.5], [-114, 32.5], [-114, 35], [-120, 39], [-120, 42]] },
    { name: 'OR', points: [[-124, 42], [-124, 46], [-116.5, 46], [-116.5, 42]] },
    { name: 'WA', points: [[-124.5, 46], [-124.5, 49], [-116.5, 49], [-116.5, 46]] },
    // Mountain
    { name: 'NV', points: [[-120, 42], [-120, 39], [-114, 35], [-114, 42]] },
    { name: 'AZ', points: [[-114, 37], [-114, 32], [-109, 31.3], [-109, 37]] },
    { name: 'UT', points: [[-114, 42], [-114, 37], [-109, 37], [-109, 42]] },
    { name: 'CO', points: [[-109, 41], [-109, 37], [-102, 37], [-102, 41]] },
    // Southwest
    { name: 'NM', points: [[-109, 37], [-109, 31.3], [-103, 32], [-103, 37]] },
    { name: 'TX', points: [[-106, 32], [-106, 26], [-93.5, 29.5], [-94, 33.5], [-103, 37], [-103, 32]] },
    // Midwest
    { name: 'MN', points: [[-97, 49], [-97, 43.5], [-91, 43.5], [-91, 49]] },
    { name: 'WI', points: [[-92.9, 47], [-92.9, 42.5], [-86.8, 42.5], [-86.8, 47]] },
    { name: 'IL', points: [[-91.5, 42.5], [-91.5, 37], [-87.5, 37], [-87.5, 42.5]] },
    { name: 'MI', points: [[-90, 48], [-90, 41.7], [-82.4, 41.7], [-82.4, 48]] },
    { name: 'MO', points: [[-95.8, 40.6], [-95.8, 36], [-89.1, 36], [-89.1, 40.6]] },
    // Southeast
    { name: 'FL', points: [[-87.6, 31], [-87.6, 24.5], [-80, 24.5], [-80, 31]] },
    { name: 'GA', points: [[-85.6, 35], [-85.6, 30.4], [-80.8, 32], [-80.8, 35]] },
    { name: 'SC', points: [[-83.4, 35.2], [-83.4, 32.1], [-78.5, 32.1], [-78.5, 35.2]] },
    { name: 'NC', points: [[-84.3, 36.6], [-84.3, 33.8], [-75.5, 35], [-75.5, 36.6]] },
    { name: 'VA', points: [[-83.7, 39.5], [-83.7, 36.5], [-75.2, 37], [-75.2, 39.5]] },
    // Northeast
    { name: 'NY', points: [[-79.8, 45], [-79.8, 40.5], [-71.9, 40.5], [-71.9, 45]] },
    { name: 'PA', points: [[-80.5, 42], [-80.5, 39.7], [-74.7, 39.7], [-74.7, 42]] },
    { name: 'MA', points: [[-73.5, 42.9], [-73.5, 41.2], [-69.9, 41.2], [-69.9, 42.9]] },
    // Plains
    { name: 'KS', points: [[-102, 40], [-102, 37], [-94.6, 37], [-94.6, 40]] },
    { name: 'OK', points: [[-103, 37], [-103, 33.6], [-94.4, 33.6], [-94.4, 37]] },
    { name: 'LA', points: [[-94, 33], [-94, 29], [-89, 29], [-89, 33]] },
  ];

  const latLonToCanvas = (lat, lon, width, height) => {
    const padding = 40;
    const usableWidth = width - 2 * padding;
    const usableHeight = height - 2 * padding;

    const x = padding + ((lon - US_BOUNDS.minLon) / (US_BOUNDS.maxLon - US_BOUNDS.minLon)) * usableWidth;
    const y = padding + ((US_BOUNDS.maxLat - lat) / (US_BOUNDS.maxLat - US_BOUNDS.minLat)) * usableHeight;

    return { x, y };
  };

  const inverseTransform = (x, y) => {
    return {
      x: (x - transform.x) / transform.scale,
      y: (y - transform.y) / transform.scale
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Get theme colors
    const bgColor = theme === 'dark' ? '#000000' : '#f8f9fa';
    const mapColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const borderColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
    const routeColor = theme === 'dark' ? 'rgba(100, 150, 255, 0.08)' : 'rgba(50, 100, 200, 0.12)';
    const hubColor = theme === 'dark' ? '#ff4444' : '#dc3545';
    const nodeColor = theme === 'dark' ? '#4d94ff' : '#0066cc';

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Draw US state boundaries
    ctx.strokeStyle = mapColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    US_STATES.forEach(state => {
      ctx.beginPath();
      state.points.forEach((point, idx) => {
        const pos = latLonToCanvas(point[1], point[0], width, height);
        if (idx === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      });
      ctx.closePath();
      ctx.stroke();
    });

    // Draw outer US border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    const topLeft = latLonToCanvas(US_BOUNDS.maxLat, US_BOUNDS.minLon, width, height);
    const bottomRight = latLonToCanvas(US_BOUNDS.minLat, US_BOUNDS.maxLon, width, height);
    ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);

    // Filter routes
    let filteredRoutes = routes;
    if (selectedAirline) {
      filteredRoutes = routes.filter(r => r.airline === selectedAirline);
    }
    if (removedHub) {
      filteredRoutes = filteredRoutes.filter(r =>
        r.source !== removedHub && r.target !== removedHub
      );
    }

    // Draw routes (sample for performance - draw every 3rd route when not filtered)
    const airportMap = new Map(airports.map(a => [a.code, a]));
    const airlineMap = new Map(airlines.map(a => [a.id, a]));

    const routesToDraw = selectedAirline ? filteredRoutes : filteredRoutes.filter((_, i) => i % 3 === 0);

    routesToDraw.forEach(route => {
      const source = airportMap.get(route.source);
      const target = airportMap.get(route.target);
      if (!source || !target) return;

      const start = latLonToCanvas(source.lat, source.lon, width, height);
      const end = latLonToCanvas(target.lat, target.lon, width, height);

      const airline = airlineMap.get(route.airline);
      const color = airline ? airline.color : nodeColor;

      ctx.strokeStyle = selectedAirline ? `${color}90` : routeColor;
      ctx.lineWidth = selectedAirline ? 1.2 : 0.4;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });

    // Draw highlighted path
    if (highlightedPath && highlightedPath.length > 1) {
      const pathColor = theme === 'dark' ? '#00ff88' : '#00cc66';
      for (let i = 0; i < highlightedPath.length - 1; i++) {
        const source = airportMap.get(highlightedPath[i]);
        const target = airportMap.get(highlightedPath[i + 1]);
        if (!source || !target) continue;

        const start = latLonToCanvas(source.lat, source.lon, width, height);
        const end = latLonToCanvas(target.lat, target.lon, width, height);

        ctx.strokeStyle = pathColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = pathColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // Draw airports
    const maxDegree = Math.max(...Array.from(degreeCentrality?.values() || [1]));
    airports.forEach(airport => {
      if (airport.code === removedHub) return;

      const pos = latLonToCanvas(airport.lat, airport.lon, width, height);
      const degree = degreeCentrality?.get(airport.code) || 0;
      const radius = Math.max(2.5, Math.min(10, 2.5 + (degree / maxDegree) * 6));

      const isHub = degree > 50;
      ctx.fillStyle = isHub ? hubColor : nodeColor;
      ctx.shadowColor = isHub ? hubColor : nodeColor;
      ctx.shadowBlur = isHub ? 6 : 3;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw labels for major hubs
      if (degree > 40) {
        ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#000000';
        ctx.font = 'bold 11px Times New Roman, serif';
        ctx.textAlign = 'center';
        ctx.fillText(airport.code, pos.x, pos.y - radius - 5);
      }
    });

    ctx.restore();

    // Draw hover tooltip
    if (hoveredAirport) {
      const degree = degreeCentrality?.get(hoveredAirport.code) || 0;
      const text = `${hoveredAirport.name} (${hoveredAirport.code})`;
      const subtext = `${degree} connections`;

      ctx.font = '14px Times New Roman, serif';
      const textWidth = Math.max(ctx.measureText(text).width, ctx.measureText(subtext).width);

      const tooltipX = Math.min(hoveredAirport.screenX + 15, width - textWidth - 40);
      const tooltipY = hoveredAirport.screenY - 50;

      ctx.fillStyle = theme === 'dark' ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = theme === 'dark' ? '#4d94ff' : '#0066cc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(tooltipX, tooltipY, textWidth + 24, 56, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#000000';
      ctx.font = 'bold 14px Times New Roman, serif';
      ctx.textAlign = 'left';
      ctx.fillText(text, tooltipX + 12, tooltipY + 22);

      ctx.font = '13px Times New Roman, serif';
      ctx.fillStyle = theme === 'dark' ? '#aaaaaa' : '#666666';
      ctx.fillText(subtext, tooltipX + 12, tooltipY + 42);
    }

  }, [airports, routes, airlines, selectedAirline, transform, highlightedPath, removedHub, hoveredAirport, degreeCentrality, theme]);

  // Mouse event handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left - transform.x,
      y: e.clientY - rect.top - transform.y
    });
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: mouseX - dragStart.x,
        y: mouseY - dragStart.y
      }));
    } else {
      const { x, y } = inverseTransform(mouseX, mouseY);
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      let found = null;
      for (const airport of airports) {
        if (airport.code === removedHub) continue;
        const pos = latLonToCanvas(airport.lat, airport.lon, width, height);
        const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
        const degree = degreeCentrality?.get(airport.code) || 0;
        const maxDegree = Math.max(...Array.from(degreeCentrality?.values() || [1]));
        const radius = Math.max(2.5, Math.min(10, 2.5 + (degree / maxDegree) * 6));

        if (dist < radius + 6) {
          found = { ...airport, screenX: mouseX, screenY: mouseY };
          break;
        }
      }

      setHoveredAirport(found);
      if (onAirportHover) {
        onAirportHover(found);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredAirport(null);
    if (onAirportHover) {
      onAirportHover(null);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(5, transform.scale * delta));

    const scaleChange = newScale / transform.scale;
    setTransform(prev => ({
      x: mouseX - (mouseX - prev.x) * scaleChange,
      y: mouseY - (mouseY - prev.y) * scaleChange,
      scale: newScale
    }));
  };

  const handleClick = (e) => {
    if (onAirportClick && hoveredAirport) {
      onAirportClick(hoveredAirport);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={700}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onClick={handleClick}
      style={{
        cursor: isDragging ? 'grabbing' : (hoveredAirport ? 'pointer' : 'grab'),
        border: theme === 'dark' ? '1px solid #333' : '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: theme === 'dark' ? '#000000' : '#f8f9fa'
      }}
    />
  );
};

export default NetworkCanvas;
