import React from 'react';

const StatsPanel = ({
  avgDegreesOfSeparation,
  topHubs,
  airports,
  onShowInfo
}) => {
  return (
    <div className="stats-panel">
      <h2>Network Statistics</h2>

      {/* Key Metric: Degrees of Separation */}
      <div className="stat-card highlight">
        <h3>Average Degrees of Separation</h3>
        <div className="stat-value">{avgDegreesOfSeparation.toFixed(2)}</div>
        <p className="stat-description">
          You can reach any US airport from any other in just <strong>{Math.ceil(avgDegreesOfSeparation)} flights</strong> on average
        </p>
        <button className="info-btn" onClick={() => onShowInfo('degrees')}>
          What does this mean?
        </button>
      </div>

      {/* Network Overview */}
      <div className="stat-card">
        <h3>Network Overview</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Total Airports</span>
            <span className="stat-number">{airports?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Top Hubs */}
      <div className="stat-card">
        <h3>Top 10 Major Hubs</h3>
        <button className="info-btn small" onClick={() => onShowInfo('hubs')}>
          Why are hubs important?
        </button>
        <div className="hubs-list">
          {topHubs?.slice(0, 10).map((hub, index) => {
            const airport = airports?.find(a => a.code === hub.code);
            return (
              <div key={hub.code} className="hub-item">
                <span className="hub-rank">#{index + 1}</span>
                <div className="hub-info">
                  <span className="hub-code">{hub.code}</span>
                  <span className="hub-name">{airport?.city || 'Unknown'}</span>
                </div>
                <span className="hub-connections">{hub.degree}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
