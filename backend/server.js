import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import searchRoutes from './routes/search.js';
import historyRoutes from './routes/history.js';
import predictRoutes from './routes/predict.js';
import alertRoutes from './routes/alerts.js';

// Import jobs
import priceScraper from './jobs/priceScraper.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Routes
app.use('/api/search', searchRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/predict', predictRoutes);
app.use('/api/alerts', alertRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Manual scrape trigger (dev only)
app.post('/api/scrape', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  try {
    const result = await priceScraper.scrapeAll();
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ✈️  Flight Price Predictor API
  ────────────────────────────
  🚀 Server running on http://localhost:${PORT}
  📡 API base: http://localhost:${PORT}/api
  🔍 Health: http://localhost:${PORT}/api/health
  ────────────────────────────
  `);

  // Start the daily price scraper
  priceScraper.start();
});

export default app;
