import { useState, useCallback } from 'react';
import { searchFlights, searchLocations } from '../api';

export default function SearchForm({ onResults, onLoading }) {
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    cabinClass: 'ECONOMY',
    adults: '1',
  });
  const [suggestions, setSuggestions] = useState({ origin: [], destination: [] });
  const [activeSuggest, setActiveSuggest] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationSearch = useCallback(async (field, keyword) => {
    if (keyword.length < 2) {
      setSuggestions(prev => ({ ...prev, [field]: [] }));
      return;
    }
    try {
      const data = await searchLocations(keyword);
      setSuggestions(prev => ({ ...prev, [field]: data.locations || [] }));
      setActiveSuggest(field);
    } catch {
      // Silently fail for autocomplete
    }
  }, []);

  const selectLocation = (field, location) => {
    setForm(prev => ({ ...prev, [field]: location.iataCode }));
    setSuggestions(prev => ({ ...prev, [field]: [] }));
    setActiveSuggest(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.origin || !form.destination || !form.departureDate) return;

    onLoading(true);
    try {
      const data = await searchFlights({
        origin: form.origin,
        destination: form.destination,
        departureDate: form.departureDate,
        returnDate: form.returnDate || undefined,
        adults: form.adults,
        cabinClass: form.cabinClass,
      });
      onResults(data, form);
    } catch (err) {
      onResults({ error: err.message }, form);
    } finally {
      onLoading(false);
    }
  };

  // Get tomorrow's date for min date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="search-section">
      <div className="search-card">
        <form className="search-form" onSubmit={handleSubmit}>
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label" htmlFor="origin">From</label>
            <input
              id="origin"
              className="form-input"
              name="origin"
              value={form.origin}
              onChange={(e) => {
                handleChange(e);
                handleLocationSearch('origin', e.target.value);
              }}
              onBlur={() => setTimeout(() => setActiveSuggest(null), 200)}
              placeholder="LHR, JFK..."
              autoComplete="off"
            />
            {activeSuggest === 'origin' && suggestions.origin.length > 0 && (
              <SuggestionList
                items={suggestions.origin}
                onSelect={(loc) => selectLocation('origin', loc)}
              />
            )}
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label" htmlFor="destination">To</label>
            <input
              id="destination"
              className="form-input"
              name="destination"
              value={form.destination}
              onChange={(e) => {
                handleChange(e);
                handleLocationSearch('destination', e.target.value);
              }}
              onBlur={() => setTimeout(() => setActiveSuggest(null), 200)}
              placeholder="BCN, SIN..."
              autoComplete="off"
            />
            {activeSuggest === 'destination' && suggestions.destination.length > 0 && (
              <SuggestionList
                items={suggestions.destination}
                onSelect={(loc) => selectLocation('destination', loc)}
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="departureDate">Departure</label>
            <input
              id="departureDate"
              className="form-input"
              type="date"
              name="departureDate"
              value={form.departureDate}
              onChange={handleChange}
              min={minDate}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cabinClass">Class</label>
            <select
              id="cabinClass"
              className="form-input form-select"
              name="cabinClass"
              value={form.cabinClass}
              onChange={handleChange}
            >
              <option value="ECONOMY">Economy</option>
              <option value="PREMIUM_ECONOMY">Premium Economy</option>
              <option value="BUSINESS">Business</option>
              <option value="FIRST">First</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!form.origin || !form.destination || !form.departureDate}
            id="search-flights-btn"
          >
            ✈️ Search
          </button>
        </form>
      </div>
    </div>
  );
}

function SuggestionList({ items, onSelect }) {
  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 50,
      marginTop: '4px',
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-xl)',
      maxHeight: '240px',
      overflowY: 'auto',
    }}>
      {items.map((loc, i) => (
        <div
          key={`${loc.iataCode}-${i}`}
          onClick={() => onSelect(loc)}
          style={{
            padding: '10px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'background 150ms',
            borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(51, 129, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{loc.iataCode}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '8px' }}>
              {loc.name || loc.cityName}
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {loc.countryCode}
          </span>
        </div>
      ))}
    </div>
  );
}
