import { Router } from 'express';
import { query } from '../db/pool.js';
import geminiService from '../services/gemini.js';
import eventsService from '../services/events.js';

const router = Router();

/**
 * POST /api/predict/:routeId
 * Get AI prediction for a tracked route
 */
router.post('/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;

    // Get route info
    const { rows: [route] } = await query(
      'SELECT * FROM tracked_routes WHERE id = $1',
      [routeId]
    );

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Get price history
    const { rows: snapshots } = await query(
      `SELECT observed_at, min_price FROM price_snapshots 
       WHERE tracked_route_id = $1 ORDER BY observed_at ASC`,
      [routeId]
    );

    const priceHistory = snapshots.map(s => ({
      date: s.observed_at.toISOString().split('T')[0],
      price: parseFloat(s.min_price),
    }));

    // Get relevant events
    const events = await eventsService.getEventsForDate(
      route.departure_date.toISOString().split('T')[0],
      route.origin,
      route.destination
    );

    // Get prediction from Gemini
    const prediction = await geminiService.getPrediction({
      priceHistory,
      routeInfo: {
        origin: route.origin,
        destination: route.destination,
        departureDate: route.departure_date.toISOString().split('T')[0],
        cabinClass: route.cabin_class,
      },
      events,
      priceAnalysis: null, // Can add Amadeus analysis here if desired
    });

    // Store prediction
    await query(
      `INSERT INTO predictions 
        (tracked_route_id, predicted_best_date, predicted_price, confidence, 
         recommendation, reasoning, price_zone, factors)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        routeId,
        prediction.predicted_best_date,
        prediction.predicted_price,
        prediction.confidence,
        prediction.recommendation,
        prediction.reasoning,
        prediction.price_zone,
        JSON.stringify(prediction.factors),
      ]
    );

    res.json({
      prediction,
      route: {
        origin: route.origin,
        destination: route.destination,
        departureDate: route.departure_date,
      },
      events,
      dataPointsUsed: priceHistory.length,
    });
  } catch (err) {
    console.error('Prediction error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/predict/:routeId/history
 * Get past predictions for a route
 */
router.get('/:routeId/history', async (req, res) => {
  try {
    const { routeId } = req.params;

    const { rows } = await query(
      `SELECT * FROM predictions 
       WHERE tracked_route_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [routeId]
    );

    res.json({ predictions: rows });
  } catch (err) {
    console.error('Prediction history error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/predict/quick
 * Quick prediction without tracking (uses current search data only)
 */
router.post('/quick', async (req, res) => {
  try {
    const { origin, destination, departureDate, cabinClass } = req.body;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        error: 'Missing required fields: origin, destination, departureDate',
      });
    }

    // Get events
    const events = await eventsService.getEventsForDate(
      departureDate,
      origin.toUpperCase(),
      destination.toUpperCase()
    );

    // Get prediction from Gemini (no history — relies on general patterns)
    const prediction = await geminiService.getPrediction({
      priceHistory: [],
      routeInfo: {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departureDate,
        cabinClass: cabinClass?.toUpperCase() || 'ECONOMY',
      },
      events,
      priceAnalysis: null,
    });

    // Also get quick insights
    const insights = await geminiService.getInsights({
      routeInfo: {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departureDate,
      },
      priceHistory: [],
      events,
    });

    res.json({
      prediction,
      insights,
      events,
      warning: 'Quick prediction — no historical data. Track this route for more accurate predictions.',
    });
  } catch (err) {
    console.error('Quick prediction error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/predict/events
 * Get events around a date
 */
router.get('/events', async (req, res) => {
  try {
    const { date, origin, destination, window = 14 } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Missing required parameter: date' });
    }

    const events = await eventsService.getEventsForDate(
      date,
      origin?.toUpperCase(),
      destination?.toUpperCase(),
      parseInt(window)
    );

    res.json({ events });
  } catch (err) {
    console.error('Events error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
