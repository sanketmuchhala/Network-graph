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

// Community Detection using Louvain-like algorithm (simplified greedy modularity optimization)
export function detectCommunities(graph) {
  const nodes = Array.from(graph.keys());
  const communities = new Map();

  // Initialize: each node in its own community
  nodes.forEach((node, idx) => {
    communities.set(node, idx);
  });

  let totalEdges = 0;
  nodes.forEach(node => {
    totalEdges += graph.get(node).length;
  });
  totalEdges /= 2; // Each edge counted twice

  let improved = true;
  let iterations = 0;
  const maxIterations = 10;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // For each node, try moving to neighbor's community if it improves modularity
    for (const node of nodes) {
      const currentCommunity = communities.get(node);
      const neighbors = graph.get(node) || [];

      // Count connections to each neighboring community
      const communityConnections = new Map();
      neighbors.forEach(({ node: neighbor }) => {
        const neighborCommunity = communities.get(neighbor);
        communityConnections.set(
          neighborCommunity,
          (communityConnections.get(neighborCommunity) || 0) + 1
        );
      });

      // Find best community (most connections)
      let bestCommunity = currentCommunity;
      let maxConnections = communityConnections.get(currentCommunity) || 0;

      for (const [community, connections] of communityConnections) {
        if (connections > maxConnections) {
          maxConnections = connections;
          bestCommunity = community;
        }
      }

      // Move to best community if different
      if (bestCommunity !== currentCommunity) {
        communities.set(node, bestCommunity);
        improved = true;
      }
    }
  }

  // Renumber communities to be sequential
  const uniqueCommunities = new Set(communities.values());
  const communityMap = new Map();
  let communityId = 0;
  uniqueCommunities.forEach(oldId => {
    communityMap.set(oldId, communityId++);
  });

  const finalCommunities = new Map();
  communities.forEach((oldId, node) => {
    finalCommunities.set(node, communityMap.get(oldId));
  });

  return finalCommunities;
}

// Calculate betweenness centrality (simplified - sample based for performance)
export function calculateBetweennessCentrality(graph, sampleSize = 30) {
  const betweenness = new Map();
  const nodes = Array.from(graph.keys());

  // Initialize all nodes with 0
  nodes.forEach(node => {
    betweenness.set(node, 0);
  });

  // Sample random source nodes for performance
  const sampleNodes = nodes
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(sampleSize, nodes.length));

  // For each sampled source, find shortest paths to all targets
  sampleNodes.forEach(source => {
    const stack = [];
    const paths = new Map();
    const distance = new Map();
    const sigma = new Map();

    nodes.forEach(node => {
      paths.set(node, []);
      distance.set(node, -1);
      sigma.set(node, 0);
    });

    distance.set(source, 0);
    sigma.set(source, 1);

    const queue = [source];

    while (queue.length > 0) {
      const node = queue.shift();
      stack.push(node);

      const neighbors = graph.get(node) || [];
      neighbors.forEach(({ node: neighbor }) => {
        if (distance.get(neighbor) < 0) {
          queue.push(neighbor);
          distance.set(neighbor, distance.get(node) + 1);
        }

        if (distance.get(neighbor) === distance.get(node) + 1) {
          sigma.set(neighbor, sigma.get(neighbor) + sigma.get(node));
          paths.get(neighbor).push(node);
        }
      });
    }

    // Accumulation
    const delta = new Map();
    nodes.forEach(node => delta.set(node, 0));

    while (stack.length > 0) {
      const w = stack.pop();
      const predecessors = paths.get(w);

      predecessors.forEach(v => {
        delta.set(v, delta.get(v) + (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w)));
      });

      if (w !== source) {
        betweenness.set(w, betweenness.get(w) + delta.get(w));
      }
    }
  });

  // Normalize by sample size
  betweenness.forEach((value, node) => {
    betweenness.set(node, value / sampleSize);
  });

  return betweenness;
}

// Predict potential new routes based on network patterns
export function predictRoutes(graph, airports, topN = 10) {
  const predictions = [];
  const existingRoutes = new Set();

  // Build set of existing routes
  graph.forEach((neighbors, source) => {
    neighbors.forEach(({ node: target }) => {
      const routeKey = [source, target].sort().join('-');
      existingRoutes.add(routeKey);
    });
  });

  const airportArray = Array.from(graph.keys());

  // For each pair of unconnected airports, calculate connection score
  for (let i = 0; i < airportArray.length; i++) {
    for (let j = i + 1; j < airportArray.length; j++) {
      const source = airportArray[i];
      const target = airportArray[j];
      const routeKey = [source, target].sort().join('-');

      if (!existingRoutes.has(routeKey)) {
        const sourceNeighbors = new Set((graph.get(source) || []).map(n => n.node));
        const targetNeighbors = new Set((graph.get(target) || []).map(n => n.node));

        // Common neighbors (Jaccard coefficient)
        let commonNeighbors = 0;
        sourceNeighbors.forEach(neighbor => {
          if (targetNeighbors.has(neighbor)) commonNeighbors++;
        });

        // Preferential attachment score
        const paScore = sourceNeighbors.size * targetNeighbors.size;

        // Combined score
        const score = commonNeighbors * 10 + Math.log(paScore + 1);

        if (score > 0) {
          const sourceAirport = airports.find(a => a.code === source);
          const targetAirport = airports.find(a => a.code === target);

          predictions.push({
            source,
            target,
            sourceCity: sourceAirport?.city || source,
            targetCity: targetAirport?.city || target,
            score: score,
            commonNeighbors
          });
        }
      }
    }
  }

  return predictions
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

// Traffic prediction heatmap (simulate congestion based on betweenness and degree)
export function predictTrafficLoad(graph, betweenness, centrality) {
  const trafficScores = new Map();
  const nodes = Array.from(graph.keys());

  // Normalize betweenness and centrality
  const maxBetweenness = Math.max(...Array.from(betweenness.values()));
  const maxCentrality = Math.max(...Array.from(centrality.values()));

  nodes.forEach(node => {
    const normalizedBetweenness = (betweenness.get(node) || 0) / (maxBetweenness || 1);
    const normalizedCentrality = (centrality.get(node) || 0) / (maxCentrality || 1);

    // Traffic score: weighted combination of betweenness (60%) and degree (40%)
    const trafficScore = normalizedBetweenness * 0.6 + normalizedCentrality * 0.4;

    let congestionLevel = 'low';
    if (trafficScore > 0.7) congestionLevel = 'critical';
    else if (trafficScore > 0.5) congestionLevel = 'high';
    else if (trafficScore > 0.3) congestionLevel = 'medium';

    trafficScores.set(node, {
      score: trafficScore,
      level: congestionLevel,
      betweennessContribution: normalizedBetweenness,
      degreeContribution: normalizedCentrality
    });
  });

  return trafficScores;
}

// Find underutilized strategic hubs (high betweenness, low degree)
export function findStrategicHubs(betweenness, centrality, topN = 5) {
  const nodes = Array.from(betweenness.keys());
  const strategicScores = [];

  const maxBetweenness = Math.max(...Array.from(betweenness.values()));
  const maxCentrality = Math.max(...Array.from(centrality.values()));

  nodes.forEach(node => {
    const normalizedBetweenness = (betweenness.get(node) || 0) / (maxBetweenness || 1);
    const normalizedCentrality = (centrality.get(node) || 0) / (maxCentrality || 1);

    // Strategic score: high betweenness but low degree (underutilized)
    // Only consider if betweenness > 0.2 and degree < 0.5 (medium connectivity)
    if (normalizedBetweenness > 0.2 && normalizedCentrality < 0.5) {
      const strategicScore = normalizedBetweenness / (normalizedCentrality + 0.1);

      strategicScores.push({
        code: node,
        strategicScore,
        betweenness: betweenness.get(node),
        degree: centrality.get(node),
        potential: 'High - Critical bridge point with room for growth'
      });
    }
  });

  return strategicScores
    .sort((a, b) => b.strategicScore - a.strategicScore)
    .slice(0, topN);
}
