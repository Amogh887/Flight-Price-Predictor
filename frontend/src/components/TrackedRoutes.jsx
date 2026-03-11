import { useState, useEffect } from 'react';
import { getTrackedRoutes, getPriceHistory, getPrediction, untrackRoute } from '../api';
import PriceChart from './PriceChart';
import PredictionPanel from './PredictionPanel';
import EventsOverlay from './EventsOverlay';

export default function TrackedRoutes() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const data = await getTrackedRoutes();
      setRoutes(data.routes || []);
    } catch (err) {
      console.error('Failed to load routes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoute = async (route) => {
    setSelectedRoute(route);
    setPrediction(null);
    
    try {
      const data = await getPriceHistory(route.id);
      setHistoryData(data);
    } catch (err) {
      console.error('Failed to load history:', err);
      setHistoryData(null);
    }
  };

  const handlePredict = async (routeId) => {
    setPredictionLoading(true);
    try {
      const data = await getPrediction(routeId);
      setPrediction(data.prediction);
      setEvents(data.events || []);
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleUntrack = async (routeId) => {
    try {
      await untrackRoute(routeId);
      setRoutes(prev => prev.filter(r => r.id !== routeId));
      if (selectedRoute?.id === routeId) {
        setSelectedRoute(null);
        setHistoryData(null);
        setPrediction(null);
      }
    } catch (err) {
      console.error('Failed to untrack:', err);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <span className="loading-text">Loading tracked routes...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="results-header">
        <h2>📍 Tracked Routes</h2>
        <span className="results-count">{routes.length} route{routes.length !== 1 ? 's' : ''} tracked</span>
      </div>

      {routes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛫</div>
          <h3>No routes tracked yet</h3>
          <p>Search for a flight and click "Track Route" to start monitoring price changes.</p>
        </div>
      ) : (
        <>
          <div className="routes-table-wrapper">
            <table className="routes-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Departure</th>
                  <th>Class</th>
                  <th>Latest Price</th>
                  <th>Snapshots</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {routes.map(route => (
                  <tr
                    key={route.id}
                    style={{
                      cursor: 'pointer',
                      background: selectedRoute?.id === route.id
                        ? 'rgba(51, 129, 255, 0.06)'
                        : undefined,
                    }}
                    onClick={() => handleSelectRoute(route)}
                  >
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {route.origin}
                      </span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>→</span>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {route.destination}
                      </span>
                    </td>
                    <td>{formatDate(route.departure_date)}</td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(51, 129, 255, 0.1)',
                        color: 'var(--primary-400)',
                        fontWeight: 600,
                      }}>
                        {route.cabin_class}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-400)' }}>
                      {route.latest_price ? `£${parseFloat(route.latest_price).toFixed(0)}` : '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {route.snapshot_count || 0}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {route.last_scraped
                        ? new Date(route.last_scraped).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePredict(route.id);
                          }}
                        >
                          🤖 Predict
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUntrack(route.id);
                          }}
                          style={{ color: 'var(--danger-400)' }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedRoute && historyData && (
            <PriceChart
              history={historyData.history}
              stats={historyData.stats}
              events={events}
            />
          )}

          <PredictionPanel prediction={prediction} loading={predictionLoading} />

          {events.length > 0 && <EventsOverlay events={events} />}
        </>
      )}
    </div>
  );
}
