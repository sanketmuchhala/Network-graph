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

  // Color palette (light mode only)
  const routeColor = 'rgba(50, 100, 200, 0.25)';
  const selectedRouteColor = '#FF6B35';
  const hubColor = '#E63946';
  const nodeColor = '#0066CC';
  const pathColor = '#00CC66';

  // Tile layer
  const tileLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileLayerAttribution = '&copy; OpenStreetMap contributors';

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
              className="airport-tooltip-light"
            >
              <div style={{
                fontSize: '13px',
                padding: '10px 14px',
                backgroundColor: '#ffffff',
                border: '2px solid #0969da',
                borderRadius: '8px',
                color: '#1f2328',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                textTransform: 'none',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif'
              }}>
                <div style={{
                  fontWeight: 700,
                  marginBottom: '4px',
                  color: '#1f2328',
                  textTransform: 'none',
                  fontSize: '14px'
                }}>
                  {airport.code.toUpperCase()} - {airport.city}, {airport.state || 'US'}
                </div>
                <div style={{
                  fontSize: '12px',
                  marginBottom: '2px',
                  color: '#636c76',
                  textTransform: 'none'
                }}>
                  {airport.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0969da',
                  textTransform: 'none'
                }}>
                  {degree} connections
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
