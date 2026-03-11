import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/**
 * POST /api/alerts
 * Create a price alert
 */
router.post('/', async (req, res) => {
  try {
    const { routeId, targetPrice, currency, notificationMethod, contactInfo } = req.body;

    if (!routeId || !targetPrice) {
      return res.status(400).json({
        error: 'Missing required fields: routeId, targetPrice',
      });
    }

    // Verify route exists
    const { rows: [route] } = await query(
      'SELECT id FROM tracked_routes WHERE id = $1',
      [routeId]
    );

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const { rows: [alert] } = await query(
      `INSERT INTO price_alerts (tracked_route_id, target_price, currency, notification_method, contact_info)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        routeId,
        parseFloat(targetPrice),
        currency || 'GBP',
        notificationMethod || 'email',
        contactInfo || null,
      ]
    );

    res.status(201).json({ alert });
  } catch (err) {
    console.error('Create alert error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/alerts
 * Get all alerts (optionally filter by route)
 */
router.get('/', async (req, res) => {
  try {
    const { routeId, active = 'true' } = req.query;

    let sql = `
      SELECT pa.*, tr.origin, tr.destination, tr.departure_date
      FROM price_alerts pa
      JOIN tracked_routes tr ON pa.tracked_route_id = tr.id
    `;
    const params = [];

    if (routeId) {
      params.push(routeId);
      sql += ` WHERE pa.tracked_route_id = $${params.length}`;
    }

    if (active === 'true') {
      sql += params.length > 0 ? ' AND' : ' WHERE';
      sql += ' pa.is_triggered = false';
    }

    sql += ' ORDER BY pa.created_at DESC';

    const { rows } = await query(sql, params);
    res.json({ alerts: rows });
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/alerts/:alertId
 * Delete a price alert
 */
router.delete('/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;

    await query('DELETE FROM price_alerts WHERE id = $1', [alertId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete alert error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
