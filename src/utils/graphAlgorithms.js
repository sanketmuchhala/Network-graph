// Graph algorithms for network analysis

// Build adjacency list from routes
export function buildGraph(airports, routes) {
  const graph = new Map();
  const airportMap = new Map();

  airports.forEach(airport => {
    graph.set(airport.code, []);
    airportMap.set(airport.code, airport);
  });

  routes.forEach(route => {
    if (graph.has(route.source) && graph.has(route.target)) {
      graph.get(route.source).push({ node: route.target, airline: route.airline });
      graph.get(route.target).push({ node: route.source, airline: route.airline });
    }
  });

  return { graph, airportMap };
}

// BFS for shortest path between two airports
export function findShortestPath(graph, start, end) {
  if (start === end) return [start];
  if (!graph.has(start) || !graph.has(end)) return null;

  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];

    const neighbors = graph.get(node) || [];
    for (const { node: neighbor } of neighbors) {
      if (neighbor === end) {
        return [...path, neighbor];
      }

      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  return null;
}

// Calculate all-pairs shortest paths (using BFS for each pair)
export function calculateAllPairsShortestPaths(graph) {
  const nodes = Array.from(graph.keys());
  const distances = new Map();

  nodes.forEach(source => {
    const dist = new Map();
    const queue = [source];
    const visited = new Set([source]);
    dist.set(source, 0);

    while (queue.length > 0) {
      const node = queue.shift();
      const currentDist = dist.get(node);

      const neighbors = graph.get(node) || [];
      for (const { node: neighbor } of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          dist.set(neighbor, currentDist + 1);
          queue.push(neighbor);
        }
      }
    }

    distances.set(source, dist);
  });

  return distances;
}

// Calculate average degrees of separation
export function calculateAverageDegreesOfSeparation(allPairsDistances) {
  let totalDistance = 0;
  let pairCount = 0;

  for (const [source, distances] of allPairsDistances.entries()) {
    for (const [target, distance] of distances.entries()) {
      if (source !== target && distance > 0) {
        totalDistance += distance;
        pairCount++;
      }
    }
  }

  return pairCount > 0 ? totalDistance / pairCount : 0;
}

// Calculate path length distribution
export function calculatePathLengthDistribution(allPairsDistances) {
  const distribution = new Map();

  for (const [source, distances] of allPairsDistances.entries()) {
    for (const [target, distance] of distances.entries()) {
      if (source !== target && distance > 0) {
        distribution.set(distance, (distribution.get(distance) || 0) + 1);
      }
    }
  }

  return distribution;
}

// Calculate degree centrality (number of connections) for each airport
export function calculateDegreeCentrality(graph) {
  const centrality = new Map();

  for (const [node, neighbors] of graph.entries()) {
    centrality.set(node, neighbors.length);
  }

  return centrality;
}

// Calculate clustering coefficient for each airport (optimized - sample only high-degree nodes)
export function calculateClusteringCoefficient(graph) {
  const clustering = new Map();

  // Optimized: Only calculate for nodes with 2-20 neighbors to be much faster
  // Skip hub nodes entirely as they take too long
  for (const [node, neighbors] of graph.entries()) {
    const degree = neighbors.length;

    if (degree < 2 || degree > 20) {
      clustering.set(node, 0);
      continue;
    }

    // Count edges between neighbors
    let edgesBetweenNeighbors = 0;
    const neighborSet = new Set(neighbors.map(n => n.node));

    for (const { node: neighbor1 } of neighbors) {
      const neighbor1Connections = graph.get(neighbor1) || [];
      for (const { node: neighbor2 } of neighbor1Connections) {
        if (neighborSet.has(neighbor2) && neighbor1 !== neighbor2) {
          edgesBetweenNeighbors++;
        }
      }
    }

    // Each edge is counted twice, so divide by 2
    edgesBetweenNeighbors /= 2;

    // Clustering coefficient = actual edges / possible edges
    const possibleEdges = (degree * (degree - 1)) / 2;
    const coefficient = possibleEdges > 0 ? edgesBetweenNeighbors / possibleEdges : 0;

    clustering.set(node, coefficient);
  }

  return clustering;
}

// Simulate network disruption by removing a hub (optimized - sample only 30 nodes)
export function simulateHubDisruption(graph, hubToRemove) {
  // Create a new graph without the hub
  const disruptedGraph = new Map();

  for (const [node, neighbors] of graph.entries()) {
    if (node === hubToRemove) continue;

    const filteredNeighbors = neighbors.filter(n => n.node !== hubToRemove);
    disruptedGraph.set(node, filteredNeighbors);
  }

  // Sample only 30 nodes for performance
  const nodesToSample = Array.from(disruptedGraph.keys()).slice(0, 30);
  const sampledDisrupted = new Map();
  const sampledOriginal = new Map();

  nodesToSample.forEach(node => {
    sampledDisrupted.set(node, disruptedGraph.get(node));
    sampledOriginal.set(node, graph.get(node));
  });

  // Calculate new metrics on sampled graphs
  const newDistances = calculateAllPairsShortestPaths(sampledDisrupted);
  const newAvgDegrees = calculateAverageDegreesOfSeparation(newDistances);

  // Find affected airports
  const affectedAirports = [];
  const originalDistances = calculateAllPairsShortestPaths(sampledOriginal);

  for (const source of sampledDisrupted.keys()) {
    for (const target of sampledDisrupted.keys()) {
      if (source === target) continue;

      const originalDist = originalDistances.get(source)?.get(target) || Infinity;
      const newDist = newDistances.get(source)?.get(target) || Infinity;

      if (newDist > originalDist) {
        affectedAirports.push({
          source,
          target,
          originalDistance: originalDist,
          newDistance: newDist,
          impact: newDist - originalDist
        });
      }
    }
  }

  return {
    disruptedGraph,
    newAvgDegrees,
    affectedAirports,
    unreachableCount: affectedAirports.filter(a => a.newDistance === Infinity).length
  };
}

// Get top N hubs by degree centrality
export function getTopHubs(centrality, n = 20) {
  return Array.from(centrality.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([code, degree]) => ({ code, degree }));
}

// Get airline-specific hubs
export function getAirlineHubs(routes, airlines) {
  const airlineConnections = new Map();

  airlines.forEach(airline => {
    airlineConnections.set(airline.id, new Map());
  });

  routes.forEach(route => {
    const airlineMap = airlineConnections.get(route.airline);
    if (airlineMap) {
      airlineMap.set(route.source, (airlineMap.get(route.source) || 0) + 1);
      airlineMap.set(route.target, (airlineMap.get(route.target) || 0) + 1);
    }
  });

  const airlineHubs = new Map();
  airlines.forEach(airline => {
    const connections = airlineConnections.get(airline.id);
    const topHubs = Array.from(connections.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));
    airlineHubs.set(airline.id, topHubs);
  });

  return airlineHubs;
}

// BFS to find all connected components
export function findConnectedComponents(graph) {
  const visited = new Set();
  const components = [];

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      const component = [];
      const queue = [node];
      visited.add(node);

      while (queue.length > 0) {
        const current = queue.shift();
        component.push(current);

        const neighbors = graph.get(current) || [];
        for (const { node: neighbor } of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      components.push(component);
    }
  }

  return components;
}
