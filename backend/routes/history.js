import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * GET /api/history/:routeId
 * Get price history for a tracked route
 */
router.get('/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { days = 90, limit = 500 } = req.query;

    const { rows } = await query(
      `SELECT 
        id, observed_at, min_price, max_price, avg_price, currency,
        carrier_code, carrier_name, flight_number, stops, duration, seats_remaining
       FROM price_snapshots 
       WHERE tracked_route_id = $1 
         AND observed_at >= NOW() - INTERVAL '1 day' * $2
       ORDER BY observed_at ASC
       LIMIT $3`,
      [routeId, parseInt(days), parseInt(limit)]
    );

    // Also get the route info
    const { rows: [route] } = await query(
      'SELECT * FROM tracked_routes WHERE id = $1',
      [routeId]
    );

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Calculate stats
    const prices = rows.map(r => parseFloat(r.min_price));
    const stats = prices.length > 0 ? {
      currentPrice: prices[prices.length - 1],
      lowestPrice: Math.min(...prices),
      highestPrice: Math.max(...prices),
      averagePrice: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2),
      dataPoints: prices.length,
      trend: prices.length >= 2 
        ? (prices[prices.length - 1] > prices[prices.length - 2] ? 'RISING' : 'FALLING')
        : 'INSUFFICIENT_DATA',
    } : null;

    res.json({
      route,
      stats,
      history: rows.map(r => ({
        date: r.observed_at,
        minPrice: parseFloat(r.min_price),
        maxPrice: r.max_price ? parseFloat(r.max_price) : null,
        avgPrice: r.avg_price ? parseFloat(r.avg_price) : null,
        currency: r.currency,
        carrier: r.carrier_name || r.carrier_code,
        flightNumber: r.flight_number,
        stops: r.stops,
        duration: r.duration,
        seatsRemaining: r.seats_remaining,
      })),
    });
  } catch (err) {
    console.error('Price history error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/history/track
 * Start tracking a new route
 */
router.post('/track', async (req, res) => {
  try {
    const { origin, destination, departureDate, returnDate, cabinClass, airlineFilter, adults } = req.body;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        error: 'Missing required fields: origin, destination, departureDate',
      });
    }

    // Check for duplicate
    const { rows: existing } = await query(
      `SELECT id FROM tracked_routes 
       WHERE origin = $1 AND destination = $2 AND departure_date = $3 AND is_active = true`,
      [origin.toUpperCase(), destination.toUpperCase(), departureDate]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Route already being tracked',
        routeId: existing[0].id,
      });
    }

    const { rows: [newRoute] } = await query(
      `INSERT INTO tracked_routes (origin, destination, departure_date, return_date, cabin_class, airline_filter, adults)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        origin.toUpperCase(),
        destination.toUpperCase(),
        departureDate,
        returnDate || null,
        cabinClass?.toUpperCase() || 'ECONOMY',
        airlineFilter?.toUpperCase() || null,
        parseInt(adults) || 1,
      ]
    );

    res.status(201).json({ route: newRoute });
  } catch (err) {
    console.error('Track route error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/history/routes
 * Get all tracked routes
 */
router.get('/', async (req, res) => {
  try {
    const { active = 'true' } = req.query;

    const { rows } = await query(
      `SELECT tr.*, 
        (SELECT COUNT(*) FROM price_snapshots ps WHERE ps.tracked_route_id = tr.id) as snapshot_count,
        (SELECT min_price FROM price_snapshots ps WHERE ps.tracked_route_id = tr.id ORDER BY observed_at DESC LIMIT 1) as latest_price,
        (SELECT observed_at FROM price_snapshots ps WHERE ps.tracked_route_id = tr.id ORDER BY observed_at DESC LIMIT 1) as last_scraped
       FROM tracked_routes tr
       WHERE tr.is_active = $1
       ORDER BY tr.departure_date ASC`,
      [active === 'true']
    );

    res.json({ routes: rows });
  } catch (err) {
    console.error('Get routes error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/history/track/:routeId
 * Stop tracking a route (soft delete)
 */
router.delete('/track/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;

    await query(
      'UPDATE tracked_routes SET is_active = false, updated_at = NOW() WHERE id = $1',
      [routeId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Untrack route error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
