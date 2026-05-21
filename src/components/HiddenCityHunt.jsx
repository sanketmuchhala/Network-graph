import React, { useState, useRef } from 'react';

const TODAY = new Date().toISOString().slice(0, 10);

export default function HiddenCityHunt({ airports = [], onDealSelect }) {
  const [origin,      setOrigin]      = useState('');
  const [destination, setDestination] = useState('');
  const [date,        setDate]        = useState(TODAY);
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);

  /* autocomplete state */
  const [originSugg,  setOriginSugg]  = useState([]);
  const [destSugg,    setDestSugg]    = useState([]);
  const originRef = useRef(null);
  const destRef   = useRef(null);

  const suggest = (val, setter) => {
    if (!val || val.length < 1) { setter([]); return; }
    const q = val.toUpperCase();
    setter(
      airports
        .filter(a =>
          a.code.startsWith(q) ||
          a.city.toUpperCase().includes(q) ||
          a.name.toUpperCase().includes(q)
        )
        .slice(0, 6)
    );
  };

  const hunt = async () => {
    setError(null);
    setResult(null);
    setSelectedIdx(null);

    const o = origin.trim().toUpperCase();
    const d = destination.trim().toUpperCase();
    if (o.length !== 3 || d.length !== 3) {
      setError('Enter valid 3-letter IATA codes for both airports.');
      return;
    }
    if (o === d) { setError('Origin and destination must differ.'); return; }
    if (!date)   { setError('Pick a departure date.'); return; }

    setLoading(true);
    try {
      const resp = await fetch('/api/hunt', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ origin: o, destination: d, date }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.detail || `Server error ${resp.status}`);
      }
      setResult(await resp.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const selectDeal = (deal, idx) => {
    setSelectedIdx(idx);
    onDealSelect?.({
      origin:      deal.origin,
      hiddenCity:  deal.hidden_city,
      bookedDest:  deal.booked_dest,
      path:        [deal.origin, deal.hidden_city],
    });
  };

  return (
    <div className="hidden-city-hunt">
      <h3>Hidden City Hunt</h3>
      <p className="hunt-description">
        Find routes where booking a flight <em>through</em> your destination costs
        less than booking it direct — then exit at the layover.
      </p>

      {/* ── Inputs ─────────────────────────────────────── */}
      <div className="hunt-form">
        {/* Origin */}
        <div className="input-group">
          <label>From</label>
          <input
            ref={originRef}
            className="airport-input"
            value={origin}
            placeholder="e.g. IAD"
            onChange={e => { setOrigin(e.target.value); suggest(e.target.value, setOriginSugg); }}
            onBlur={() => setTimeout(() => setOriginSugg([]), 150)}
          />
          {originSugg.length > 0 && (
            <div className="autocomplete-dropdown">
              {originSugg.map(a => (
                <div key={a.code} className="autocomplete-item"
                  onMouseDown={() => { setOrigin(a.code); setOriginSugg([]); }}>
                  <span className="autocomplete-code">{a.code}</span>
                  <span className="autocomplete-name">{a.city}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Destination */}
        <div className="input-group">
          <label>To (hidden city target)</label>
          <input
            ref={destRef}
            className="airport-input"
            value={destination}
            placeholder="e.g. DEN"
            onChange={e => { setDestination(e.target.value); suggest(e.target.value, setDestSugg); }}
            onBlur={() => setTimeout(() => setDestSugg([]), 150)}
          />
          {destSugg.length > 0 && (
            <div className="autocomplete-dropdown">
              {destSugg.map(a => (
                <div key={a.code} className="autocomplete-item"
                  onMouseDown={() => { setDestination(a.code); setDestSugg([]); }}>
                  <span className="autocomplete-code">{a.code}</span>
                  <span className="autocomplete-name">{a.city}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="input-group">
          <label>Departure Date</label>
          <input
            type="date"
            className="airport-input hunt-date-input"
            value={date}
            min={TODAY}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <button
          className="find-path-btn hunt-btn"
          onClick={hunt}
          disabled={loading}
        >
          {loading ? 'Hunting...' : 'Hunt Deals'}
        </button>
      </div>

      {/* ── Error ──────────────────────────────────────── */}
      {error && <div className="hunt-error">{error}</div>}

      {/* ── Loading ────────────────────────────────────── */}
      {loading && (
        <div className="hunt-loading">
          <div className="hunt-loading-bar" />
          <p>Scanning {destination} hub connections...</p>
        </div>
      )}

      {/* ── Results ────────────────────────────────────── */}
      {result && !loading && (
        <div className="hunt-results">
          {/* Baseline */}
          <div className="hunt-baseline">
            <span className="hunt-baseline-label">Direct to {result.destination}</span>
            <span className="hunt-baseline-price">${result.baseline_price?.toFixed(2) ?? '—'}</span>
          </div>

          {result.note && (
            <div className="hunt-note">{result.note}</div>
          )}

          {result.deals?.length > 0 ? (
            <>
              <div className="hunt-deals-header">
                {result.deals.length} hidden city deal{result.deals.length > 1 ? 's' : ''} found
              </div>
              <div className="hunt-deals">
                {result.deals.map((deal, i) => (
                  <div
                    key={i}
                    className={`hunt-deal-card ${selectedIdx === i ? 'selected' : ''}`}
                    onClick={() => selectDeal(deal, i)}
                  >
                    <div className="deal-route">
                      <span className="deal-origin">{deal.origin}</span>
                      <span className="deal-arrow">→</span>
                      <span className="deal-through">{deal.booked_dest}</span>
                      <span className="deal-exit-label">exit at {deal.hidden_city}</span>
                    </div>
                    <div className="deal-meta">
                      <span className="deal-airline">{deal.airline}</span>
                    </div>
                    <div className="deal-pricing">
                      <span className="deal-price">${deal.price.toFixed(2)}</span>
                      <span className="deal-savings-badge">
                        Save ${deal.savings.toFixed(0)} ({deal.savings_pct}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            !result.note && (
              <div className="hunt-no-deals">
                No savings found for this route and date.
                Try a different date or destination.
              </div>
            )
          )}

          <div className="hunt-disclaimer">
            Hidden city ticketing may violate airline terms of service.
            This tool is for educational research only.
          </div>
        </div>
      )}
    </div>
  );
}
