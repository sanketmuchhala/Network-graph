import React from 'react';

export default function AIInsights({
  communities,
  predictedRoutes,
  strategicHubs,
  trafficLoad,
  airports,
  betweenness,
  degreeCentrality,
  onShowInfo
}) {
  // Get community statistics
  const communityStats = React.useMemo(() => {
    if (!communities) return null;

    const communityCounts = new Map();
    communities.forEach(communityId => {
      communityCounts.set(communityId, (communityCounts.get(communityId) || 0) + 1);
    });

    return {
      total: communityCounts.size,
      largest: Math.max(...Array.from(communityCounts.values())),
      distribution: Array.from(communityCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    };
  }, [communities]);

  // Get critical traffic airports
  const criticalTraffic = React.useMemo(() => {
    if (!trafficLoad) return [];

    return Array.from(trafficLoad.entries())
      .filter(([_, data]) => data.level === 'critical' || data.level === 'high')
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 5)
      .map(([code, data]) => {
        const airport = airports.find(a => a.code === code);
        return {
          code,
          city: airport?.city || code,
          level: data.level,
          score: (data.score * 100).toFixed(1),
          rawData: data
        };
      });
  }, [trafficLoad, airports]);

  // Handle click on strategic hub
  const handleStrategicHubClick = (hub) => {
    const airport = airports.find(a => a.code === hub.code);
    const degree = degreeCentrality?.get(hub.code) || 0;
    const betweennessValue = betweenness?.get(hub.code) || 0;

    const maxBetweenness = Math.max(...Array.from(betweenness?.values() || [1]));
    const maxDegree = Math.max(...Array.from(degreeCentrality?.values() || [1]));

    const normalizedBetweenness = (betweennessValue / (maxBetweenness || 1) * 100).toFixed(1);
    const normalizedDegree = (degree / (maxDegree || 1) * 100).toFixed(1);

    const explanation = {
      title: `Strategic Hub Analysis: ${hub.code} - ${airport?.city || hub.code}`,
      content: `
## Algorithm: Betweenness Centrality Analysis

**What is Betweenness Centrality?**
Measures how many shortest paths between all airport pairs pass through this airport. High betweenness means the airport is a critical bridge in the network.

**Calculations for ${hub.code}:**
- **Betweenness Centrality Score:** ${betweennessValue.toFixed(2)}
- **Normalized Betweenness:** ${normalizedBetweenness}% (relative to highest)
- **Direct Connections:** ${degree} airports
- **Normalized Degree:** ${normalizedDegree}% (relative to highest hub)
- **Strategic Score:** ${hub.strategicScore.toFixed(2)}

**Why ${hub.code} is Strategic:**
- **High betweenness (${normalizedBetweenness}%)** indicates it's a critical bridge point - many flight paths naturally route through this airport
- **Moderate connectivity (${degree} connections, ${normalizedDegree}%)** means there's significant room for growth
- **Strategic ratio:** Betweenness ÷ Degree = ${hub.strategicScore.toFixed(2)} (higher is better)

**Interpretation:**
This airport sits at a critical position in the network topology. Despite having moderate direct connections, it serves as a vital bridge between different regions. Adding more routes here would significantly reduce average travel distances across the network.

**Business Impact:**
Expanding this hub could reduce connecting flights for passengers, improve network efficiency, and capture traffic currently routing through multiple hops.
      `
    };

    if (onShowInfo) {
      onShowInfo(explanation);
    }
  };

  // Handle click on predicted route
  const handleRouteClick = (route) => {
    const explanation = {
      title: `Route Prediction: ${route.source} ↔ ${route.target}`,
      content: `
## Algorithm: Link Prediction (Common Neighbors + Preferential Attachment)

**What is Link Prediction?**
ML technique that predicts likely future connections based on network structure. Combines multiple graph metrics to identify high-value potential routes.

**Calculations for ${route.source} → ${route.target}:**
- **Common Neighbors:** ${route.commonNeighbors} airports
- **Source Connections:** ${degreeCentrality?.get(route.source) || 0} routes
- **Target Connections:** ${degreeCentrality?.get(route.target) || 0} routes
- **Prediction Score:** ${route.score.toFixed(2)}

**How the Score is Calculated:**
\`\`\`
Common Neighbor Score = ${route.commonNeighbors} × 10 = ${route.commonNeighbors * 10}
Preferential Attachment = ${degreeCentrality?.get(route.source) || 0} × ${degreeCentrality?.get(route.target) || 0} = ${(degreeCentrality?.get(route.source) || 0) * (degreeCentrality?.get(route.target) || 0)}
Final Score = ${route.commonNeighbors * 10} + log(${(degreeCentrality?.get(route.source) || 0) * (degreeCentrality?.get(route.target) || 0)} + 1) = ${route.score.toFixed(2)}
\`\`\`

**Why This Route Makes Sense:**
1. **Common Neighbors (${route.commonNeighbors}):** Both airports connect to the same ${route.commonNeighbors} airports, indicating similar network roles and passenger flow patterns
2. **Preferential Attachment:** High-degree airports tend to connect to each other (hub-to-hub routes are valuable)
3. **Network Efficiency:** This route would create a shortcut, reducing connection times for passengers

**Business Case:**
- Passengers currently need to connect through one of ${route.commonNeighbors} intermediate airports
- Direct route would save 1-2 connections
- High common neighbor count suggests strong demand potential
      `
    };

    if (onShowInfo) {
      onShowInfo(explanation);
    }
  };

  // Handle click on traffic prediction
  const handleTrafficClick = (airport) => {
    const betweennessValue = betweenness?.get(airport.code) || 0;
    const degree = degreeCentrality?.get(airport.code) || 0;

    const maxBetweenness = Math.max(...Array.from(betweenness?.values() || [1]));
    const maxDegree = Math.max(...Array.from(degreeCentrality?.values() || [1]));

    const normalizedBetweenness = (betweennessValue / (maxBetweenness || 1));
    const normalizedDegree = (degree / (maxDegree || 1));

    const betweennessContribution = (normalizedBetweenness * 0.6 * 100).toFixed(1);
    const degreeContribution = (normalizedDegree * 0.4 * 100).toFixed(1);

    const explanation = {
      title: `Traffic Prediction: ${airport.code} - ${airport.city}`,
      content: `
## Algorithm: Traffic Load Prediction (Weighted Centrality Model)

**What is Traffic Prediction?**
Predicts congestion levels by combining betweenness centrality (flow through airport) and degree centrality (total connections). Uses weighted model to estimate traffic load.

**Calculations for ${airport.code}:**
- **Betweenness Centrality:** ${betweennessValue.toFixed(2)}
- **Normalized Betweenness:** ${(normalizedBetweenness * 100).toFixed(1)}%
- **Direct Connections:** ${degree} routes
- **Normalized Degree:** ${(normalizedDegree * 100).toFixed(1)}%

**Traffic Score Calculation:**
\`\`\`
Traffic Score = (Betweenness × 60%) + (Degree × 40%)
             = (${(normalizedBetweenness * 100).toFixed(1)}% × 0.6) + (${(normalizedDegree * 100).toFixed(1)}% × 0.4)
             = ${betweennessContribution}% + ${degreeContribution}%
             = ${airport.score}%
\`\`\`

**Congestion Level: ${airport.level.toUpperCase()}**
${airport.level === 'critical' ? '- **Score > 70%:** Critical congestion expected' : ''}
${airport.level === 'high' ? '- **Score 50-70%:** High traffic volume expected' : ''}
${airport.level === 'medium' ? '- **Score 30-50%:** Moderate traffic expected' : ''}
${airport.level === 'low' ? '- **Score < 30%:** Light traffic expected' : ''}

**Why ${airport.level.toUpperCase()} Traffic?**
- **Betweenness contribution (${betweennessContribution}%):** This airport is a critical routing point with many paths passing through it
- **Degree contribution (${degreeContribution}%):** Has ${degree} direct connections generating base traffic
- Combined these factors indicate ${airport.level} congestion risk

**Operational Impact:**
${airport.level === 'critical' || airport.level === 'high' ?
  '- Expect delays during peak hours\n- May need additional gates/staff\n- Consider load balancing to nearby airports\n- High revenue potential but needs infrastructure investment' :
  '- Well-balanced traffic load\n- Good operational efficiency expected\n- Room for growth without major infrastructure changes'}
      `
    };

    if (onShowInfo) {
      onShowInfo(explanation);
    }
  };

  return (
    <div className="ai-insights">
      <h3>AI-Powered Network Insights</h3>

      {/* Community Detection */}
      <div className="insight-section">
        <h4>Network Communities</h4>
        {communityStats && (
          <div className="insight-content">
            <p className="insight-summary">
              Detected <strong>{communityStats.total}</strong> regional network communities
              using connectivity-based clustering
            </p>
            <div className="insight-detail">
              <span className="label">Largest Community:</span>
              <span className="value">{communityStats.largest} airports</span>
            </div>
          </div>
        )}
      </div>

      {/* Strategic Hub Recommendations */}
      <div className="insight-section">
        <h4>Strategic Hub Opportunities</h4>
        {strategicHubs && strategicHubs.length > 0 ? (
          <div className="insight-content">
            <p className="insight-summary">
              Based on betweenness centrality analysis, these underutilized airports
              could become strategic hubs:
            </p>
            <ul className="strategic-list">
              {strategicHubs.slice(0, 5).map((hub, idx) => {
                const airport = airports.find(a => a.code === hub.code);
                return (
                  <li
                    key={hub.code}
                    onClick={() => handleStrategicHubClick(hub)}
                    className="clickable-insight"
                  >
                    <strong>{hub.code}</strong> - {airport?.city || hub.code}
                    <span className="hub-badge">High Potential</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="insight-summary">All strategic positions are currently well-utilized</p>
        )}
      </div>

      {/* Predicted Routes */}
      <div className="insight-section">
        <h4>Predicted High-Value Routes</h4>
        {predictedRoutes && predictedRoutes.length > 0 ? (
          <div className="insight-content">
            <p className="insight-summary">
              ML analysis suggests these potential routes based on network patterns:
            </p>
            <ul className="route-predictions">
              {predictedRoutes.slice(0, 5).map((route, idx) => (
                <li
                  key={`${route.source}-${route.target}`}
                  onClick={() => handleRouteClick(route)}
                  className="clickable-insight"
                >
                  <span className="route-pair">
                    {route.source} → {route.target}
                  </span>
                  <span className="route-cities">
                    {route.sourceCity} to {route.targetCity}
                  </span>
                  <span className="route-score">
                    {route.commonNeighbors} common connections
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="insight-summary">Network is well-connected, no high-priority routes identified</p>
        )}
      </div>

      {/* Traffic Prediction */}
      <div className="insight-section">
        <h4>Traffic Congestion Predictions</h4>
        {criticalTraffic.length > 0 ? (
          <div className="insight-content">
            <p className="insight-summary">
              Airports predicted to experience high traffic loads:
            </p>
            <ul className="traffic-list">
              {criticalTraffic.map((airport) => (
                <li
                  key={airport.code}
                  onClick={() => handleTrafficClick(airport)}
                  className="clickable-insight"
                >
                  <strong>{airport.code}</strong> - {airport.city}
                  <span className={`traffic-badge ${airport.level}`}>
                    {airport.level.toUpperCase()} ({airport.score}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="insight-summary">Network traffic evenly distributed</p>
        )}
      </div>

      <div className="insight-footer">
        <p>Insights generated using graph ML algorithms: Louvain community detection,
        betweenness centrality, and link prediction</p>
      </div>
    </div>
  );
}
