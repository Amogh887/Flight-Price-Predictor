import { useState, useEffect } from 'react';
import SearchForm from './components/SearchForm';
import FlightCard from './components/FlightCard';
import PriceChart from './components/PriceChart';
import PredictionPanel from './components/PredictionPanel';
import EventsOverlay from './components/EventsOverlay';
import TrackedRoutes from './components/TrackedRoutes';
import { trackRoute, getQuickPrediction, getEvents, healthCheck } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [results, setResults] = useState(null);
  const [searchParams, setSearchParams] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [apiStatus, setApiStatus] = useState('checking');
  const [trackingStatus, setTrackingStatus] = useState({});

  // Check API health on mount
  useEffect(() => {
    healthCheck()
      .then(() => setApiStatus('online'))
      .catch(() => setApiStatus('offline'));
  }, []);

  const handleResults = async (data, params) => {
    setResults(data);
    setSearchParams(params);
    setPrediction(null);
    setEvents([]);

    // Fetch events for the departure date
    if (params?.departureDate) {
      try {
        const eventsData = await getEvents({
          date: params.departureDate,
          origin: params.origin,
          destination: params.destination,
        });
        setEvents(eventsData.events || []);
      } catch {
        // Non-critical
      }
    }
  };

  const handleTrackRoute = async (params) => {
    try {
      setTrackingStatus(prev => ({ ...prev, [params.origin + params.destination]: 'tracking' }));
      await trackRoute({
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        cabinClass: params.cabinClass,
        adults: params.adults,
      });
      setTrackingStatus(prev => ({ ...prev, [params.origin + params.destination]: 'tracked' }));
    } catch (err) {
      setTrackingStatus(prev => ({ ...prev, [params.origin + params.destination]: 'error' }));
      console.error('Track failed:', err);
    }
  };

  const handleQuickPredict = async () => {
    if (!searchParams) return;
    setPredictionLoading(true);
    try {
      const data = await getQuickPrediction({
        origin: searchParams.origin,
        destination: searchParams.destination,
        departureDate: searchParams.departureDate,
        cabinClass: searchParams.cabinClass,
      });
      setPrediction(data.prediction);
      if (data.events) setEvents(data.events);
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setPredictionLoading(false);
    }
  };

  const trackKey = searchParams ? searchParams.origin + searchParams.destination : '';

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="nav glass">
        <div className="nav-inner">
          <div className="nav-brand">
            <span className="nav-brand-icon">✈️</span>
            <span>FlightPredict</span>
          </div>

          <div className="nav-links">
            <button
              className={`nav-link ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              🔍 Search
            </button>
            <button
              className={`nav-link ${activeTab === 'tracked' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracked')}
            >
              📍 Tracked
            </button>
            <button
              className={`nav-link ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              🔔 Alerts
            </button>

            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: apiStatus === 'online' ? 'var(--success-400)' : 
                          apiStatus === 'offline' ? 'var(--danger-400)' : 'var(--warning-400)',
              marginLeft: '12px',
              boxShadow: apiStatus === 'online' 
                ? '0 0 8px rgba(52, 211, 153, 0.5)' 
                : '0 0 8px rgba(248, 113, 113, 0.5)',
            }} title={`API: ${apiStatus}`} />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main">
        <div className="main-inner">
          {activeTab === 'search' && (
            <>
              {/* Hero */}
              <div className="hero">
                <div className="hero-badge">
                  <span className="hero-badge-dot" />
                  AI-Powered Flight Analysis
                </div>
                <h1>
                  Find the <span className="gradient-text">Perfect Time</span> to Buy
                </h1>
                <p>
                  Track flight prices over time, spot trends, and let AI tell you exactly 
                  when to book for the best deal.
                </p>
              </div>

              {/* Search Form */}
              <SearchForm onResults={handleResults} onLoading={setLoading} />

              {/* Loading State */}
              {loading && (
                <div className="loading-overlay">
                  <div className="loading-spinner" />
                  <span className="loading-text">Searching flights...</span>
                </div>
              )}

              {/* Results */}
              {results && !loading && (
                <>
                  {results.error ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">⚠️</div>
                      <h3>Search Error</h3>
                      <p>{results.error}</p>
                    </div>
                  ) : (
                    <>
                      {/* Action bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}>
                        <div className="results-header" style={{ marginBottom: 0 }}>
                          <h2>
                            {searchParams?.origin} → {searchParams?.destination}
                          </h2>
                          <span className="results-count" style={{ marginLeft: '12px' }}>
                            {results.count} flight{results.count !== 1 ? 's' : ''} found
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleTrackRoute(searchParams)}
                            disabled={trackingStatus[trackKey] === 'tracked'}
                          >
                            {trackingStatus[trackKey] === 'tracked' 
                              ? '✅ Tracked' 
                              : trackingStatus[trackKey] === 'tracking'
                              ? '...'
                              : '📍 Track Route'}
                          </button>
                          <button
                            className="btn btn-accent btn-sm"
                            onClick={handleQuickPredict}
                            disabled={predictionLoading}
                          >
                            🤖 AI Prediction
                          </button>
                        </div>
                      </div>

                      {/* Stats bar */}
                      {results.offers && results.offers.length > 0 && (
                        <div className="stats-bar stagger">
                          <div className="stat-card animate-in">
                            <div className="stat-label">Cheapest</div>
                            <div className="stat-value" style={{ color: 'var(--success-400)' }}>
                              £{Math.min(...results.offers.map(o => o.price.total)).toLocaleString()}
                            </div>
                          </div>
                          <div className="stat-card animate-in">
                            <div className="stat-label">Most Expensive</div>
                            <div className="stat-value" style={{ color: 'var(--danger-400)' }}>
                              £{Math.max(...results.offers.map(o => o.price.total)).toLocaleString()}
                            </div>
                          </div>
                          <div className="stat-card animate-in">
                            <div className="stat-label">Average</div>
                            <div className="stat-value" style={{ color: 'var(--accent-400)' }}>
                              £{Math.round(results.offers.reduce((a, o) => a + o.price.total, 0) / results.offers.length).toLocaleString()}
                            </div>
                          </div>
                          <div className="stat-card animate-in">
                            <div className="stat-label">Airlines</div>
                            <div className="stat-value" style={{ color: 'var(--primary-400)' }}>
                              {new Set(results.offers.map(o => o.itineraries?.[0]?.segments?.[0]?.carrierCode)).size}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Flight cards */}
                      <div className="results-grid stagger">
                        {results.offers?.map((offer, i) => (
                          <FlightCard key={offer.id || i} offer={offer} index={i} />
                        ))}
                      </div>

                      {/* Events overlay */}
                      {events.length > 0 && <EventsOverlay events={events} />}

                      {/* AI Prediction */}
                      <PredictionPanel prediction={prediction} loading={predictionLoading} />
                    </>
                  )}
                </>
              )}

              {/* Empty state when no search yet */}
              {!results && !loading && (
                <div style={{ marginTop: '40px' }}>
                  <div className="stats-bar stagger">
                    <div className="stat-card animate-in" style={{ textAlign: 'center', padding: '32px' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
                      <div className="stat-label">Step 1</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Search for your route
                      </div>
                    </div>
                    <div className="stat-card animate-in" style={{ textAlign: 'center', padding: '32px' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📍</div>
                      <div className="stat-label">Step 2</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Track routes to monitor
                      </div>
                    </div>
                    <div className="stat-card animate-in" style={{ textAlign: 'center', padding: '32px' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📈</div>
                      <div className="stat-label">Step 3</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Watch price trends build
                      </div>
                    </div>
                    <div className="stat-card animate-in" style={{ textAlign: 'center', padding: '32px' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🤖</div>
                      <div className="stat-label">Step 4</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Get AI buy recommendations
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'tracked' && <TrackedRoutes />}

          {activeTab === 'alerts' && (
            <AlertsView />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '24px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <p>
          ✈️ FlightPredict • Powered by Amadeus API + Gemini AI
        </p>
      </footer>
    </div>
  );
}

/* ==============================
   Alerts View (inline component)
   ============================== */
function AlertsView() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const { getAlerts } = await import('./api');
      const data = await getAlerts();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (alertId) => {
    try {
      const { deleteAlert } = await import('./api');
      await deleteAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <span className="loading-text">Loading alerts...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="results-header">
        <h2>🔔 Price Alerts</h2>
        <span className="results-count">{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</span>
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <h3>No alerts set</h3>
          <p>Track a route and set a target price to get notified when it drops.</p>
        </div>
      ) : (
        <div>
          {alerts.map(alert => (
            <div key={alert.id} className="alert-card">
              <div className="alert-info">
                <span className="alert-icon">
                  {alert.is_triggered ? '✅' : '🔔'}
                </span>
                <div>
                  <div className="alert-route">
                    {alert.origin} → {alert.destination}
                  </div>
                  <div className="alert-target">
                    Target: £{parseFloat(alert.target_price).toFixed(0)} •
                    Departure: {new Date(alert.departure_date).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`alert-status ${alert.is_triggered ? 'triggered' : 'active'}`}>
                  {alert.is_triggered ? 'Triggered' : 'Active'}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleDelete(alert.id)}
                  style={{ color: 'var(--danger-400)' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
