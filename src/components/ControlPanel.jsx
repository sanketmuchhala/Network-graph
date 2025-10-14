import React from 'react';

const ControlPanel = ({ airlines, selectedAirline, onAirlineChange, onReset }) => {
  return (
    <div className="control-panel">
      <h2>Network Controls</h2>

      <div className="control-section">
        <h3>Filter by Airline</h3>
        <div className="airline-filters">
          <button
            className={`airline-btn ${!selectedAirline ? 'active' : ''}`}
            onClick={() => onAirlineChange(null)}
          >
            All Airlines
          </button>
          {airlines.map(airline => (
            <button
              key={airline.id}
              className={`airline-btn ${selectedAirline === airline.id ? 'active' : ''}`}
              onClick={() => onAirlineChange(airline.id)}
              style={{
                borderLeftColor: airline.color,
                backgroundColor: selectedAirline === airline.id ? `${airline.color}20` : 'transparent'
              }}
            >
              <span className="airline-code">{airline.id}</span>
              <span className="airline-name">{airline.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="control-section">
        <h3>How to Use</h3>
        <ul className="instructions">
          <li><strong>Scroll</strong> to zoom in/out</li>
          <li><strong>Drag</strong> to pan the map</li>
          <li><strong>Hover</strong> over airports for details</li>
          <li><strong>Click</strong> airline buttons to filter</li>
        </ul>
      </div>

      {selectedAirline && (
        <button className="reset-btn" onClick={onReset}>
          Reset View
        </button>
      )}
    </div>
  );
};

export default ControlPanel;
