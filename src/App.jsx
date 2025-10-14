import React, { useState, useEffect, useMemo } from 'react';
import NetworkMap from './components/NetworkMap';
import StatsPanel from './components/StatsPanel';
import PathFinder from './components/PathFinder';
import HubDisruptor from './components/HubDisruptor';
import InfoModal from './components/InfoModal';
import { generateNetworkData } from './utils/dataGenerator';
import {
  buildGraph,
  findShortestPath,
  calculateAllPairsShortestPaths,
  calculateAverageDegreesOfSeparation,
  calculatePathLengthDistribution,
  calculateDegreeCentrality,
  calculateClusteringCoefficient,
  simulateHubDisruption,
  getTopHubs
} from './utils/graphAlgorithms';
import './App.css';

function App() {
  const [theme, setTheme] = useState('dark');
  const [networkData, setNetworkData] = useState(null);
  const [currentPath, setCurrentPath] = useState(null);
  const [removedHub, setRemovedHub] = useState(null);
  const [disruptionResult, setDisruptionResult] = useState(null);
  const [infoTopic, setInfoTopic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [airportConnections, setAirportConnections] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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

    console.timeEnd('Graph Metrics Calculation');
    console.log('Graph metrics computed!');

    return {
      graph,
      allPairsDistances,
      avgDegrees,
      pathDistribution,
      degreeCentrality,
      clusteringCoefficient,
      topHubs
    };
  }, [networkData]);

  const handleReset = () => {
    setCurrentPath(null);
    setRemovedHub(null);
    setDisruptionResult(null);
    setSelectedAirport(null);
    setAirportConnections(null);
  };

  const handleFindPath = (sourceCode, targetCode) => {
    if (!graphMetrics) return;
    const path = findShortestPath(graphMetrics.graph, sourceCode, targetCode);
    setCurrentPath(path);
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
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
        state: targetAirport?.state || ''
      };
    });

    connectionDetails.sort((a, b) => a.city.localeCompare(b.city));

    console.log('Setting selected airport and connections');
    setSelectedAirport(airport);
    setAirportConnections(connectionDetails);
    setCurrentPath(null);
  };

  if (isLoading || !networkData || !graphMetrics) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <h2>Loading US Airport Network</h2>
        <p>{!networkData ? 'Generating airport data...' : 'Computing network metrics...'}</p>
        <p style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.5rem' }}>
          120 airports • 1,500 routes
        </p>
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
          <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      <div className="app-layout-new">
        <div className="map-container-large">
          <NetworkMap
            key="usa-map"
            airports={networkData.airports}
            routes={networkData.routes}
            highlightedPath={currentPath}
            removedHub={removedHub}
            degreeCentrality={graphMetrics.degreeCentrality}
            theme={theme}
            mapCenter={networkData.center}
            mapZoom={4}
            showHeatmap={showHeatmap}
            onAirportClick={handleAirportClick}
            selectedAirport={selectedAirport}
          />
        </div>

        <div className="controls-sidebar">
          <PathFinder
            airports={networkData.airports}
            onFindPath={handleFindPath}
            currentPath={currentPath}
          />

          <StatsPanel
            avgDegreesOfSeparation={graphMetrics.avgDegrees}
            topHubs={graphMetrics.topHubs}
            airports={networkData.airports}
            onShowInfo={handleShowInfo}
          />

          <HubDisruptor
            topHubs={graphMetrics.topHubs}
            airports={networkData.airports}
            onDisruptHub={handleDisruptHub}
            disruptionResult={disruptionResult}
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

          <div className="connectivity-score">
            <div className="score-label">Connectivity Score</div>
            <div className="score-value">{airportConnections.length}</div>
            <div className="score-subtitle">Direct Connections</div>
          </div>

          <div className="connections-list-header">
            <h4>All Connections ({airportConnections.length})</h4>
          </div>

          <div className="connections-list">
            {airportConnections.map(conn => (
              <div key={conn.code} className="connection-item">
                <div className="connection-main">
                  <span className="connection-code">{conn.code}</span>
                  <span className="connection-city">{conn.city}, {conn.state}</span>
                </div>
              </div>
            ))}
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
