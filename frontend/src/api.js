const API_BASE = 'http://localhost:3001/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.statusText}`);
    }
    
    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Cannot connect to API server. Make sure the backend is running on port 3001.');
    }
    throw err;
  }
}

// Search
export const searchFlights = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/search/flights?${query}`);
};

export const searchLocations = (keyword) =>
  request(`/search/locations?keyword=${encodeURIComponent(keyword)}`);

export const getPriceAnalysis = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/search/price-analysis?${query}`);
};

export const getCheapestDates = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/search/cheapest-dates?${query}`);
};

// History / Tracking
export const getTrackedRoutes = () => request('/history');

export const trackRoute = (data) =>
  request('/history/track', { method: 'POST', body: JSON.stringify(data) });

export const untrackRoute = (routeId) =>
  request(`/history/track/${routeId}`, { method: 'DELETE' });

export const getPriceHistory = (routeId, days = 90) =>
  request(`/history/${routeId}?days=${days}`);

// Predictions
export const getPrediction = (routeId) =>
  request(`/predict/${routeId}`, { method: 'POST' });

export const getQuickPrediction = (data) =>
  request('/predict/quick', { method: 'POST', body: JSON.stringify(data) });

export const getEvents = (params) => {
  const query = new URLSearchParams(params).toString();
  return request(`/predict/events?${query}`);
};

// Alerts
export const getAlerts = (routeId) => {
  const params = routeId ? `?routeId=${routeId}` : '';
  return request(`/alerts${params}`);
};

export const createAlert = (data) =>
  request('/alerts', { method: 'POST', body: JSON.stringify(data) });

export const deleteAlert = (alertId) =>
  request(`/alerts/${alertId}`, { method: 'DELETE' });

// Health
export const healthCheck = () => request('/health');

export default {
  searchFlights,
  searchLocations,
  getPriceAnalysis,
  getCheapestDates,
  getTrackedRoutes,
  trackRoute,
  untrackRoute,
  getPriceHistory,
  getPrediction,
  getQuickPrediction,
  getEvents,
  getAlerts,
  createAlert,
  deleteAlert,
  healthCheck,
};
