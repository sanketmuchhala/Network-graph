import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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
  theme,
  mapCenter,
  mapZoom,
  showHeatmap,
  onAirportClick,
  selectedAirport
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

  // Optimized color palettes for light and dark modes
  const routeColor = theme === 'dark' ? 'rgba(100, 200, 255, 0.3)' : 'rgba(50, 100, 200, 0.25)';
  const selectedRouteColor = theme === 'dark' ? '#FFB020' : '#FF6B35';
  const hubColor = theme === 'dark' ? '#FF4444' : '#E63946';
  const nodeColor = theme === 'dark' ? '#00D9FF' : '#0066CC';
  const pathColor = theme === 'dark' ? '#00FF88' : '#00CC66';

  // Tile layer - dark background for dark mode, light for light mode
  const tileLayerUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

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

        return (
          <Polyline
            key={`route-${idx}`}
            positions={[
              [source.lat, source.lon],
              [target.lat, target.lon]
            ]}
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

            return (
              <Polyline
                key={`path-${idx}`}
                positions={[
                  [source.lat, source.lon],
                  [target.lat, target.lon]
                ]}
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

        let color = isHub ? hubColor : nodeColor;
        let opacity = showHeatmap ? Math.max(0.3, (degree / maxDegree)) : 0.7;
        let weight = 2;

        if (isSelected) {
          color = selectedRouteColor;
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
              className={theme === 'dark' ? 'airport-tooltip-dark' : 'airport-tooltip-light'}
            >
              <div style={{
                fontSize: '13px',
                padding: '8px 12px',
                backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                border: `2px solid ${theme === 'dark' ? '#0969da' : '#0969da'}`,
                borderRadius: '8px',
                color: theme === 'dark' ? '#ffffff !important' : '#1f2328 !important',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                textTransform: 'none',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif'
              }}>
                <div style={{
                  fontWeight: 600,
                  marginBottom: '4px',
                  color: theme === 'dark' ? '#ffffff !important' : '#1f2328 !important',
                  textTransform: 'none'
                }}>
                  {airport.code.toUpperCase()} - {airport.city}, {airport.state || 'US'}
                </div>
                <div style={{
                  fontSize: '12px',
                  opacity: 0.8,
                  marginBottom: '2px',
                  color: theme === 'dark' ? '#e6e6e6 !important' : '#636c76 !important',
                  textTransform: 'none'
                }}>
                  {airport.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: theme === 'dark' ? '#00D9FF !important' : '#0969da !important',
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
