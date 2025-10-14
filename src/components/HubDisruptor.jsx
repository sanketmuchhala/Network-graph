import React, { useState } from 'react';

const HubDisruptor = ({ topHubs, airports, onDisruptHub, disruptionResult }) => {
  const [selectedHub, setSelectedHub] = useState('');

  const handleDisrupt = () => {
    if (selectedHub) {
      onDisruptHub(selectedHub);
    }
  };

  const handleReset = () => {
    setSelectedHub('');
    onDisruptHub(null);
  };

  return (
    <div className="hub-disruptor">
      <h3>Hub Disruption Simulator</h3>
      <p className="disruptor-description">
        See what happens when a major hub goes offline! This demonstrates the vulnerability
        of hub-and-spoke networks.
      </p>

      <div className="disruptor-controls">
        <label>Select a hub to shut down:</label>
        <select
          value={selectedHub}
          onChange={(e) => setSelectedHub(e.target.value)}
          className="hub-select"
        >
          <option value="">-- Choose a hub --</option>
          {topHubs?.slice(0, 15).map(hub => {
            const airport = airports?.find(a => a.code === hub.code);
            return (
              <option key={hub.code} value={hub.code}>
                {hub.code} - {airport?.city} ({hub.degree} connections)
              </option>
            );
          })}
        </select>

        <div className="disruptor-buttons">
          <button
            onClick={handleDisrupt}
            disabled={!selectedHub}
            className="disrupt-btn"
          >
            Simulate Disruption
          </button>
          {disruptionResult && (
            <button onClick={handleReset} className="reset-disruption-btn">
              Reset Network
            </button>
          )}
        </div>
      </div>

      {disruptionResult && (
        <div className="disruption-result">
          <div className="disruption-alert">
            <strong>WARNING: Hub Disrupted - {selectedHub}</strong>
          </div>

          <div className="impact-stats">
            <div className="impact-card">
              <div className="impact-label">New Avg Degrees</div>
              <div className="impact-value">{disruptionResult.newAvgDegrees.toFixed(2)}</div>
              <div className="impact-change increase">
                +{(disruptionResult.newAvgDegrees - disruptionResult.originalAvgDegrees).toFixed(2)}
              </div>
            </div>

            <div className="impact-card">
              <div className="impact-label">Affected Routes</div>
              <div className="impact-value">{disruptionResult.affectedCount}</div>
              <div className="impact-change">routes impacted</div>
            </div>

            {disruptionResult.unreachableCount > 0 && (
              <div className="impact-card critical">
                <div className="impact-label">Unreachable</div>
                <div className="impact-value">{disruptionResult.unreachableCount}</div>
                <div className="impact-change">airports disconnected</div>
              </div>
            )}
          </div>

          <div className="disruption-explanation">
            <h4>What Happened?</h4>
            <p>
              Removing <strong>{selectedHub}</strong> increased the average path length by{' '}
              <strong>{((disruptionResult.newAvgDegrees - disruptionResult.originalAvgDegrees) / disruptionResult.originalAvgDegrees * 100).toFixed(1)}%</strong>.
              This shows how critical major hubs are to network connectivity!
            </p>
            <p className="disruption-insight">
              NOTE: This is why airlines protect their hub operations so carefully – a single hub
              disruption cascades through the entire network.
            </p>
          </div>
        </div>
      )}

      <div className="info-box">
        <h4>Understanding Network Vulnerability</h4>
        <p>
          Hub-and-spoke networks are efficient but vulnerable. Major hubs concentrate
          connections, making them single points of failure. This is an example of
          <strong> preferential attachment</strong> – new routes preferentially connect to
          already well-connected airports, creating super-hubs.
        </p>
      </div>
    </div>
  );
};

export default HubDisruptor;
