import React, { useState, useEffect, useMemo } from 'react';
import GlobeMap from './components/GlobeMap';
import HiddenCityHunt from './components/HiddenCityHunt';
import StatsPanel from './components/StatsPanel';
import HubDisruptor from './components/HubDisruptor';
import InfoModal from './components/InfoModal';
import AIInsights from './components/AIInsights';
import { generateNetworkData } from './utils/dataGenerator';
import {
  buildGraph,
  calculateAllPairsShortestPaths,
  calculateAverageDegreesOfSeparation,
  calculatePathLengthDistribution,
  calculateDegreeCentrality,
  calculateClusteringCoefficient,
  simulateHubDisruption,
  getTopHubs,
  detectCommunities,
  calculateBetweennessCentrality,
  predictRoutes,
  predictTrafficLoad,
  findStrategicHubs
} from './utils/graphAlgorithms';
import {
  PASSENGER_DATA,
  AIRLINES,
  getBusynessLevel,
  getTimePeriodDescription,
  getHourlyStats
} from './utils/airportStats';
import {
  calculateDistance
} from './utils/routeCalculations';
import {
  calculateFlightDuration,
  formatDuration
} from './utils/flightDataAPI';
import './App.css';

function App() {
  const [networkData, setNetworkData] = useState(null);
  const [currentPath, setCurrentPath] = useState(null);
  const [removedHub, setRemovedHub] = useState(null);
  const [disruptionResult, setDisruptionResult] = useState(null);
  const [infoTopic, setInfoTopic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [airportConnections, setAirportConnections] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setCurrentPath(null);
    setRemovedHub(null);
    setDisruptionResult(null);
    setSelectedAirport(null);
    setAirportConnections(null);

    setTimeout(() => {
      const data = generateNetworkData();
      console.log('Generated:', data.country, data.airports.length, 'airports', data.routes.length, 'routes');
      setNetworkData(data);
      setIsLoading(false);
    }, 100);
  }, []);

  const graphMetrics = useMemo(() => {
    if (!networkData) return null;

    console.time('Graph Metrics Calculation');
    console.log('Computing graph metrics for', networkData.airports.length, 'airports...');

    const { graph } = buildGraph(networkData.airports, networkData.routes);

    // Reduced to 25 nodes for even faster calculation
    const sampleSize = Math.min(25, networkData.airports.length);
    const sampledNodes = networkData.airports
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, sampleSize)
      .map(a => a.code);

    const sampledGraph = new Map();
    sampledNodes.forEach(code => {
      sampledGraph.set(code, graph.get(code) || []);
    });

    console.time('All Pairs Shortest Paths');
    const allPairsDistances = calculateAllPairsShortestPaths(sampledGraph);
    console.timeEnd('All Pairs Shortest Paths');

    const avgDegrees = calculateAverageDegreesOfSeparation(allPairsDistances);
    const pathDistribution = calculatePathLengthDistribution(allPairsDistances);
    const degreeCentrality = calculateDegreeCentrality(graph);

    console.time('Clustering Coefficient');
    const clusteringCoefficient = calculateClusteringCoefficient(graph);
    console.timeEnd('Clustering Coefficient');

    const topHubs = getTopHubs(degreeCentrality, 20);

    // AI/ML Features
    console.time('Community Detection');
    const communities = detectCommunities(graph);
    console.timeEnd('Community Detection');

    console.time('Betweenness Centrality');
    const betweenness = calculateBetweennessCentrality(graph, 30);
    console.timeEnd('Betweenness Centrality');

    console.time('Route Predictions');
    const predictedRoutes = predictRoutes(graph, networkData.airports, 10);
    console.timeEnd('Route Predictions');

    console.time('Traffic Predictions');
    const trafficLoad = predictTrafficLoad(graph, betweenness, degreeCentrality);
    console.timeEnd('Traffic Predictions');

    console.time('Strategic Hubs');
    const strategicHubs = findStrategicHubs(betweenness, degreeCentrality, 5);
    console.timeEnd('Strategic Hubs');

    console.timeEnd('Graph Metrics Calculation');
    console.log('Graph metrics computed!');

    return {
      graph,
      allPairsDistances,
      avgDegrees,
      pathDistribution,
      degreeCentrality,
      clusteringCoefficient,
      topHubs,
      communities,
      betweenness,
      predictedRoutes,
      trafficLoad,
      strategicHubs
    };
  }, [networkData]);

  const handleReset = () => {
    setCurrentPath(null);
    setRemovedHub(null);
    setDisruptionResult(null);
    setSelectedAirport(null);
    setAirportConnections(null);
  };

const handleDisruptHub = (hubCode) => {
    if (!graphMetrics || !hubCode) {
      setRemovedHub(null);
      setDisruptionResult(null);
      return;
    }

    const result = simulateHubDisruption(graphMetrics.graph, hubCode);
    setRemovedHub(hubCode);
    setDisruptionResult({
      ...result,
      originalAvgDegrees: graphMetrics.avgDegrees,
      affectedCount: result.affectedAirports.length,
      unreachableCount: result.unreachableCount
    });
    setCurrentPath(null);
    setSelectedAirport(null);
    setAirportConnections(null);
  };

  const handleShowInfo = (topic) => {
    setInfoTopic(topic);
  };

  const handleAirportClick = (airport) => {
    if (!airport || !graphMetrics) {
      setSelectedAirport(null);
      setAirportConnections(null);
      return;
    }

    console.log('Airport clicked:', airport.code);

    // Get all connections for this airport
    // Note: graph stores connections as {node: code, airline: id}
    const connections = graphMetrics.graph.get(airport.code) || [];
    console.log('Connections found:', connections.length);

    const connectionDetails = connections.map(connection => {
      // Extract the target airport code from the connection object
      const targetCode = typeof connection === 'string' ? connection : connection.node;
      const targetAirport = networkData.airports.find(a => a.code === targetCode);

      return {
        code: targetCode,
        name: targetAirport?.name || 'Unknown',
        city: targetAirport?.city || 'Unknown',
        state: targetAirport?.state || '',
        lat: targetAirport?.lat || 0,
        lon: targetAirport?.lon || 0
      };
    });

    connectionDetails.sort((a, b) => a.city.localeCompare(b.city));

    console.log('Setting selected airport and connections');
    setSelectedAirport(airport);
    setAirportConnections(connectionDetails);
    setCurrentPath(null);
    setSelectedRoute(null);
  };

  if (isLoading || !networkData || !graphMetrics) {
    return (
      <div className="loading-screen">
        <div className="loading-radar">
          <div className="radar-ring r1"></div>
          <div className="radar-ring r2"></div>
          <div className="radar-ring r3"></div>
          <div className="radar-center"></div>
        </div>
        <div className="loading-text">
          <span className="loading-title">AIRNET</span>
          <span className="loading-subtitle">US Airport Network Visualization</span>
          <div className="loading-progress">
            <div className="loading-bar"></div>
          </div>
          <p className="loading-detail">
            {!networkData ? 'Generating airport data...' : 'Computing network metrics...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>US Airport Network Visualization</h1>
        <div className="header-right">
          <button
            className={showHeatmap ? 'icon-btn active' : 'icon-btn'}
            onClick={() => setShowHeatmap(!showHeatmap)}
            title="Toggle Heatmap"
          >
            Heatmap
          </button>
        </div>
      </header>

      <div className="app-layout-new">
        <div className="map-container-large">
          <GlobeMap
            airports={networkData.airports}
            routes={networkData.routes}
            highlightedPath={currentPath}
            removedHub={removedHub}
            degreeCentrality={graphMetrics.degreeCentrality}
            showHeatmap={showHeatmap}
            onAirportClick={handleAirportClick}
            selectedAirport={selectedAirport}
            communities={graphMetrics.communities}
            trafficLoad={graphMetrics.trafficLoad}
          />
        </div>

        <div className="controls-sidebar">
          <HubDisruptor
            topHubs={graphMetrics.topHubs}
            airports={networkData.airports}
            onDisruptHub={handleDisruptHub}
            disruptionResult={disruptionResult}
          />

          <StatsPanel
            avgDegreesOfSeparation={graphMetrics.avgDegrees}
            topHubs={graphMetrics.topHubs}
            airports={networkData.airports}
            onShowInfo={handleShowInfo}
          />

          <AIInsights
            communities={graphMetrics.communities}
            predictedRoutes={graphMetrics.predictedRoutes}
            strategicHubs={graphMetrics.strategicHubs}
            trafficLoad={graphMetrics.trafficLoad}
            airports={networkData.airports}
            betweenness={graphMetrics.betweenness}
            degreeCentrality={graphMetrics.degreeCentrality}
            onShowInfo={handleShowInfo}
          />

          <HiddenCityHunt
            airports={networkData.airports}
            onDealSelect={({ path }) => {
              setCurrentPath(path);
              setSelectedAirport(null);
              setAirportConnections(null);
            }}
          />
        </div>
      </div>

      {selectedAirport && airportConnections && (
        <div className="airport-sidebar">
          <div className="airport-sidebar-header">
            <div>
              <h2>{selectedAirport.code}</h2>
              <h3>{selectedAirport.name}</h3>
              <p>{selectedAirport.city}, {selectedAirport.state}</p>
            </div>
            <button className="close-btn" onClick={() => handleAirportClick(null)} title="Close">✕</button>
          </div>

          <div className="airport-sidebar-content">
            {/* Airport Statistics */}
            {PASSENGER_DATA[selectedAirport.code] && (() => {
              const stats = PASSENGER_DATA[selectedAirport.code];
              const busyness = getBusynessLevel(stats.annual);
              const hourlyStats = getHourlyStats(stats.daily);
              const trafficData = graphMetrics.trafficLoad?.get(selectedAirport.code);

              return (
                <div className="airport-stats-section">
                  <h4 className="stats-section-title">Airport Statistics</h4>

                  {/* Busyness Indicator */}
                  <div className="busyness-indicator">
                    <div className="busyness-label">Activity Level</div>
                    <div className="busyness-bar-container">
                      <div
                        className="busyness-bar"
                        style={{
                          width: `${busyness.intensity}%`,
                          background: `linear-gradient(90deg, ${busyness.color}, ${busyness.color}dd)`
                        }}
                      />
                    </div>
                    <div className="busyness-level" style={{ color: busyness.color }}>
                      {busyness.level}
                    </div>
                  </div>

                  {/* Passenger Stats Grid */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{stats.annual.toFixed(1)}M</div>
                      <div className="stat-label">Annual Pax</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{(stats.daily / 1000).toFixed(0)}K</div>
                      <div className="stat-label">Daily Avg</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{hourlyStats.averagePerHour.toLocaleString()}</div>
                      <div className="stat-label">Per Hour</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{hourlyStats.peakHourEstimate.toLocaleString()}</div>
                      <div className="stat-label">Peak Hour</div>
                    </div>
                  </div>

                  {/* Peak Season */}
                  <div className="peak-season-info">
                    <div className="peak-season-label">Peak Travel Season</div>
                    <div className="peak-season-value">{getTimePeriodDescription(stats.peak)}</div>
                  </div>

                  {/* Main Airlines */}
                  {stats.mainAirlines && stats.mainAirlines.length > 0 && (
                    <div className="main-airlines-section">
                      <div className="airlines-label">Major Hub Airlines</div>
                      <div className="airlines-list">
                        {stats.mainAirlines.map(airlineCode => {
                          const airline = AIRLINES[airlineCode];
                          if (!airline) return null;
                          return (
                            <div key={airlineCode} className="airline-badge" style={{ borderColor: airline.color + '55' }}>
                              <img
                                src={`https://www.gstatic.com/flights/airline_logos/70px/${airlineCode}.png`}
                                alt={airline.name}
                                className="airline-logo-img"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                              <div className="airline-badge-text">
                                <span className="airline-badge-iata" style={{ color: airline.color }}>{airlineCode}</span>
                                <span className="airline-badge-name">{airline.name}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Network Congestion Prediction */}
                  {trafficData && (
                    <div className="traffic-prediction-box">
                      <div className="traffic-prediction-label">Predicted Congestion</div>
                      <div className={`traffic-prediction-badge ${trafficData.level}`}>
                        {trafficData.level.toUpperCase()}
                      </div>
                      <div className="traffic-prediction-score">
                        Network Load: {(trafficData.score * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="connectivity-score">
              <div className="score-label">Network Connectivity</div>
              <div className="score-value">{airportConnections.length}</div>
              <div className="score-subtitle">Direct Connections</div>
            </div>

            <div className="connections-list-header">
              <h4>All Connections ({airportConnections.length})</h4>
            </div>

            <div className="connections-list">
              {airportConnections.map(conn => {
                const isRouteSelected = selectedRoute &&
                  ((selectedRoute.source === selectedAirport.code && selectedRoute.target === conn.code) ||
                    (selectedRoute.target === selectedAirport.code && selectedRoute.source === conn.code));

                return (
                  <div
                    key={conn.code}
                    className={`connection-item ${isRouteSelected ? 'selected' : ''}`}
                    onClick={() => {
                      // Calculate route details
                      const distance = calculateDistance(
                        selectedAirport.lat,
                        selectedAirport.lon,
                        conn.lat,
                        conn.lon
                      );

                      // Calculate flight duration based on distance (more realistic than simple speed calculation)
                      const flightDuration = calculateFlightDuration(distance);

                      // Find all airlines operating this route
                      const routesForThisPair = networkData.routes.filter(r =>
                        (r.source === selectedAirport.code && r.target === conn.code) ||
                        (r.source === conn.code && r.target === selectedAirport.code)
                      );

                      const airlinesOnRoute = [...new Set(routesForThisPair.map(r => r.airline))];

                      setSelectedRoute({
                        source: selectedAirport.code,
                        target: conn.code,
                        sourceAirport: selectedAirport,
                        targetAirport: conn,
                        distance,
                        flightDuration,
                        airlines: airlinesOnRoute
                      });

                      // Set the current path to highlight the route on the map
                      setCurrentPath([selectedAirport.code, conn.code]);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="connection-main">
                      <span className="connection-code">{conn.code}</span>
                      <span className="connection-city">{conn.city}, {conn.state}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Route Details Section - Now integrated into the main sidebar */}
            {selectedRoute && (
              <div className="route-details-section">
                <div className="route-details-header">
                  <h4>Route Details</h4>
                </div>

                <div className="route-endpoints">
                  <div className="route-endpoint">
                    <div className="endpoint-code">{selectedRoute.source}</div>
                    <div className="endpoint-name">{selectedRoute.sourceAirport.city}</div>
                  </div>
                  <div className="route-arrow">—</div>
                  <div className="route-endpoint">
                    <div className="endpoint-code">{selectedRoute.target}</div>
                    <div className="endpoint-name">{selectedRoute.targetAirport.city}</div>
                  </div>
                </div>

                <div className="route-stats-grid">
                  <div className="route-stat-card">
                    <div className="route-stat-value">{selectedRoute.distance.toLocaleString()}</div>
                    <div className="route-stat-label">Miles</div>
                  </div>
                  <div className="route-stat-card">
                    <div className="route-stat-value">
                      {formatDuration(selectedRoute.flightDuration.hours, selectedRoute.flightDuration.minutes)}
                    </div>
                    <div className="route-stat-label">Flight Duration</div>
                  </div>
                </div>


                <div className="route-info-box">
                  <div className="route-info-label">Calculation Method</div>
                  <div className="route-info-value">
                    Based on distance with variable cruise speeds (450-550 mph) plus taxi/climb/descend time
                  </div>
                </div>

                <div className="route-info-note">
                  Flight times include realistic taxi, takeoff, climb, descend, and landing times
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {infoTopic && (
        <InfoModal
          topic={infoTopic}
          onClose={() => setInfoTopic(null)}
        />
      )}
    </div>
  );
}

export default App;
