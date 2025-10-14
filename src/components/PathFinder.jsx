import React, { useState } from 'react';

const PathFinder = ({ airports, onFindPath, currentPath }) => {
  const [sourceCode, setSourceCode] = useState('');
  const [targetCode, setTargetCode] = useState('');
  const [filteredSource, setFilteredSource] = useState([]);
  const [filteredTarget, setFilteredTarget] = useState([]);

  const handleSourceChange = (value) => {
    setSourceCode(value);
    if (value.length > 0) {
      const filtered = airports
        .filter(a =>
          a.code.toLowerCase().includes(value.toLowerCase()) ||
          a.city.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5);
      setFilteredSource(filtered);
    } else {
      setFilteredSource([]);
    }
  };

  const handleTargetChange = (value) => {
    setTargetCode(value);
    if (value.length > 0) {
      const filtered = airports
        .filter(a =>
          a.code.toLowerCase().includes(value.toLowerCase()) ||
          a.city.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5);
      setFilteredTarget(filtered);
    } else {
      setFilteredTarget([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const source = airports.find(a => a.code.toUpperCase() === sourceCode.toUpperCase());
    const target = airports.find(a => a.code.toUpperCase() === targetCode.toUpperCase());

    if (source && target) {
      onFindPath(source.code, target.code);
      setFilteredSource([]);
      setFilteredTarget([]);
    }
  };

  return (
    <div className="path-finder">
      <h3>Find Shortest Path</h3>
      <p className="path-description">
        Discover how many flights it takes to get from one airport to another!
      </p>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>From Airport</label>
          <input
            type="text"
            value={sourceCode}
            onChange={(e) => handleSourceChange(e.target.value)}
            placeholder="e.g., LAX or Los Angeles"
            className="airport-input"
          />
          {filteredSource.length > 0 && (
            <div className="autocomplete-dropdown">
              {filteredSource.map(airport => (
                <div
                  key={airport.code}
                  className="autocomplete-item"
                  onClick={() => {
                    setSourceCode(airport.code);
                    setFilteredSource([]);
                  }}
                >
                  <span className="autocomplete-code">{airport.code}</span>
                  <span className="autocomplete-name">{airport.city}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="input-group">
          <label>To Airport</label>
          <input
            type="text"
            value={targetCode}
            onChange={(e) => handleTargetChange(e.target.value)}
            placeholder="e.g., JFK or New York"
            className="airport-input"
          />
          {filteredTarget.length > 0 && (
            <div className="autocomplete-dropdown">
              {filteredTarget.map(airport => (
                <div
                  key={airport.code}
                  className="autocomplete-item"
                  onClick={() => {
                    setTargetCode(airport.code);
                    setFilteredTarget([]);
                  }}
                >
                  <span className="autocomplete-code">{airport.code}</span>
                  <span className="autocomplete-name">{airport.city}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="find-path-btn">
          Find Shortest Path
        </button>
      </form>

      {currentPath && (
        <div className="path-result">
          <h4>Route Found!</h4>
          <div className="path-display">
            {currentPath.map((code, index) => {
              const airport = airports.find(a => a.code === code);
              return (
                <React.Fragment key={code}>
                  <div className="path-node">
                    <span className="path-code">{code}</span>
                    <span className="path-city">{airport?.city}</span>
                  </div>
                  {index < currentPath.length - 1 && (
                    <div className="path-arrow">→</div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <p className="path-hops">
            <strong>{currentPath.length - 1}</strong> flight{currentPath.length - 1 !== 1 ? 's' : ''} required
          </p>
        </div>
      )}
    </div>
  );
};

export default PathFinder;
