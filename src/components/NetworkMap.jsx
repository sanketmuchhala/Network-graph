import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getCurvedPath } from '../utils/routeCalculations';

const MapUpdater = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
};

const NetworkMap = ({
  airports,
  routes,
  highlightedPath,
  removedHub,
  degreeCentrality,
  mapCenter,
  mapZoom,
  showHeatmap,
  onAirportClick,
  selectedAirport,
  communities,
  trafficLoad
}) => {
  console.log('NetworkMap rendering:', airports?.length, 'airports', routes?.length, 'routes', 'center:', mapCenter);

  // Filter routes
  let filteredRoutes = routes || [];
  if (removedHub) {
    filteredRoutes = filteredRoutes.filter(r =>
      r.source !== removedHub && r.target !== removedHub
    );
  }

  // If an airport is selected, show only its connections
  if (selectedAirport) {
    filteredRoutes = filteredRoutes.filter(r =>
      r.source === selectedAirport.code || r.target === selectedAirport.code
    );
  }

  // Sample routes for performance (but show all if airport is selected)
  const routesToDisplay = selectedAirport ? filteredRoutes : filteredRoutes.filter((_, i) => i % 5 === 0);

  const airportMap = new Map((airports || []).map(a => [a.code, a]));
  const maxDegree = Math.max(...Array.from(degreeCentrality?.values() || [1]));

  // Community colors (vibrant palette for better visibility)
  const communityColors = [
    '#E91E63',  // Pink
    '#2196F3',  // Blue
    '#4CAF50',  // Green
    '#FFC107',  // Amber
    '#9C27B0',  // Purple
    '#FF5722',  // Deep Orange
    '#00BCD4',  // Cyan
    '#CDDC39',  // Lime
  ];

  // Get community color for an airport
  const getCommunityColor = (airportCode) => {
    if (!communities) return null;
    const communityId = communities.get(airportCode);
    if (communityId === undefined) return null;
    return communityColors[communityId % communityColors.length];
  };

  // Get traffic color for heatmap
  const getTrafficColor = (airportCode) => {
    if (!trafficLoad) return null;
    const traffic = trafficLoad.get(airportCode);
    if (!traffic) return null;

    if (traffic.level === 'critical') return '#E63946';
    if (traffic.level === 'high') return '#FF8C00';
    if (traffic.level === 'medium') return '#FFC107';
    return '#4CAF50';
  };

  // Dark mode color palette
  const routeColor = 'rgba(34, 211, 238, 0.18)';
  const selectedRouteColor = '#f59e0b';
  const hubColor = '#f43f5e';
  const nodeColor = '#22d3ee';
  const pathColor = '#10b981';

  // Dark tile layer (CartoDB Dark Matter)
  const tileLayerUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const tileLayerAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <MapContainer
      center={mapCenter || [39.8283, -98.5795]}
      zoom={mapZoom || 4}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <MapUpdater center={mapCenter} zoom={mapZoom} />

      <TileLayer
        attribution={tileLayerAttribution}
        url={tileLayerUrl}
      />

      {/* Draw routes */}
      {!showHeatmap && routesToDisplay.map((route, idx) => {
        const source = airportMap.get(route.source);
        const target = airportMap.get(route.target);
        if (!source || !target) return null;

        const isSelectedAirportRoute = selectedAirport &&
          (route.source === selectedAirport.code || route.target === selectedAirport.code);

        let color = routeColor;
        let weight = 1;
        let opacity = 0.15;

        if (isSelectedAirportRoute) {
          color = selectedRouteColor;
          weight = 3;
          opacity = 0.8;
        }

        // Get curved path coordinates
        const curvedPath = getCurvedPath(source.lat, source.lon, target.lat, target.lon);

        return (
          <Polyline
            key={`route-${idx}`}
            positions={curvedPath}
            pathOptions={{
              color: color,
              weight: weight,
              opacity: opacity
            }}
          />
        );
      })}

      {/* Draw highlighted path */}
      {highlightedPath && highlightedPath.length > 1 && (
        <>
          {highlightedPath.map((code, idx) => {
            if (idx === highlightedPath.length - 1) return null;
            const source = airportMap.get(highlightedPath[idx]);
            const target = airportMap.get(highlightedPath[idx + 1]);
            if (!source || !target) return null;

            const curvedPath = getCurvedPath(source.lat, source.lon, target.lat, target.lon);

            return (
              <Polyline
                key={`path-${idx}`}
                positions={curvedPath}
                pathOptions={{
                  color: pathColor,
                  weight: 4,
                  opacity: 1
                }}
              />
            );
          })}
        </>
      )}

      {/* Draw airport markers */}
      {(airports || []).map(airport => {
        if (airport.code === removedHub) return null;

        const degree = degreeCentrality?.get(airport.code) || 0;
        const radius = showHeatmap
          ? Math.max(5, Math.min(25, 5 + (degree / maxDegree) * 20))
          : Math.max(4, Math.min(15, 4 + (degree / maxDegree) * 10));

        const isHub = degree > 50;
        const isSelected = selectedAirport && airport.code === selectedAirport.code;

        // Determine color based on mode
        let color;
        if (isSelected) {
          color = selectedRouteColor;
        } else if (showHeatmap && trafficLoad) {
          // Heatmap mode: use traffic predictions
          color = getTrafficColor(airport.code) || (isHub ? hubColor : nodeColor);
        } else if (communities && !showHeatmap) {
          // Normal mode: use community colors
          color = getCommunityColor(airport.code) || nodeColor;
        } else {
          // Fallback: use hub/node colors
          color = isHub ? hubColor : nodeColor;
        }

        let opacity = showHeatmap ? Math.max(0.3, (degree / maxDegree)) : 0.7;
        let weight = 2;

        if (isSelected) {
          opacity = 1;
          weight = 3;
        }

        return (
          <CircleMarker
            key={airport.code}
            center={[airport.lat, airport.lon]}
            radius={isSelected ? radius + 2 : radius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: opacity,
              weight: weight,
              opacity: opacity
            }}
            eventHandlers={{
              click: () => {
                if (onAirportClick) {
                  onAirportClick(airport);
                }
              }
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -10]}
              opacity={1}
              permanent={false}
            >
              <div style={{
                padding: '9px 13px',
                backgroundColor: '#0f1728',
                border: '1px solid rgba(34, 211, 238, 0.32)',
                borderRadius: '7px',
                boxShadow: '0 8px 28px rgba(0,0,0,0.8), 0 0 16px rgba(34,211,238,0.06)',
                fontFamily: "'Sora', -apple-system, sans-serif",
                textTransform: 'none',
                minWidth: '160px',
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#f59e0b',
                  letterSpacing: '0.04em',
                  marginBottom: '3px',
                  textTransform: 'none',
                }}>
                  {airport.code} — {airport.city}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#7a90b8',
                  marginBottom: '5px',
                  textTransform: 'none',
                }}>
                  {airport.name}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <div style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#22d3ee',
                    boxShadow: '0 0 6px #22d3ee',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#22d3ee',
                    textTransform: 'none',
                  }}>
                    {degree} connections
                  </span>
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};

export default NetworkMap;
