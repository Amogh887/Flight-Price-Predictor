import cron from 'node-cron';
import { query } from '../db/pool.js';
import amadeusService from '../services/amadeus.js';

class PriceScraper {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the daily price scraping cron job
   * Runs every day at 6 AM UTC
   */
  start() {
    console.log('⏰ Price scraper cron job scheduled (daily at 06:00 UTC)');

    // Run daily at 6 AM UTC
    cron.schedule('0 6 * * *', async () => {
      await this.scrapeAll();
    }, {
      timezone: 'UTC',
    });
  }

  /**
   * Manually trigger a scrape for all active routes
   */
  async scrapeAll() {
    if (this.isRunning) {
      console.log('⚠️ Scraper already running, skipping...');
      return { skipped: true };
    }

    this.isRunning = true;
    console.log(`🔍 [${new Date().toISOString()}] Starting price scrape...`);

    try {
      // Get all active tracked routes
      const { rows: routes } = await query(
        'SELECT * FROM tracked_routes WHERE is_active = true AND departure_date >= CURRENT_DATE'
      );

      console.log(`📋 Found ${routes.length} active routes to scrape`);

      let success = 0;
      let failed = 0;

      for (const route of routes) {
        try {
          await this._scrapeRoute(route);
          success++;
        } catch (err) {
          console.error(`❌ Failed to scrape route ${route.origin}-${route.destination}:`, err.message);
          failed++;
        }

        // Rate limit: wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`✅ Scrape complete: ${success} succeeded, ${failed} failed`);
      return { success, failed, total: routes.length };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Scrape a single route
   */
  async _scrapeRoute(route) {
    const offers = await amadeusService.searchFlights({
      origin: route.origin,
      destination: route.destination,
      departureDate: route.departure_date.toISOString().split('T')[0],
      returnDate: route.return_date?.toISOString().split('T')[0],
      adults: route.adults,
      cabinClass: route.cabin_class,
      max: 5,
    });

    if (!offers || offers.length === 0) {
      console.log(`  ⚪ No offers found for ${route.origin}-${route.destination}`);
      return;
    }

    // Calculate price stats from offers
    const prices = offers.map(o => o.price.total);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Get the cheapest offer details
    const cheapest = offers.find(o => o.price.total === minPrice);
    const firstSeg = cheapest?.itineraries?.[0]?.segments?.[0];

    // Store snapshot
    await query(
      `INSERT INTO price_snapshots 
        (tracked_route_id, min_price, max_price, avg_price, currency, 
         carrier_code, carrier_name, flight_number, stops, duration, 
         seats_remaining, raw_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        route.id,
        minPrice,
        maxPrice,
        avgPrice.toFixed(2),
        cheapest?.price?.currency || 'GBP',
        firstSeg?.carrierCode,
        firstSeg?.carrierName,
        firstSeg?.flightNumber,
        cheapest?.itineraries?.[0]?.segments?.length - 1 || 0,
        cheapest?.itineraries?.[0]?.duration,
        cheapest?.numberOfBookableSeats,
        JSON.stringify(offers),
      ]
    );

    console.log(`  ✅ ${route.origin}-${route.destination}: £${minPrice} (${offers.length} offers)`);

    // Check if any price alerts should fire
    await this._checkAlerts(route.id, minPrice);
  }

  /**
   * Check and trigger price alerts
   */
  async _checkAlerts(routeId, currentPrice) {
    const { rows: alerts } = await query(
      `SELECT * FROM price_alerts 
       WHERE tracked_route_id = $1 AND is_triggered = false AND target_price >= $2`,
      [routeId, currentPrice]
    );

    for (const alert of alerts) {
      await query(
        `UPDATE price_alerts SET is_triggered = true, triggered_at = NOW(), updated_at = NOW() 
         WHERE id = $1`,
        [alert.id]
      );
      console.log(`  🔔 Alert triggered! Route ${routeId} hit target £${alert.target_price} (current: £${currentPrice})`);
      // TODO: Send notification (email/push)
    }
  }
}

export default new PriceScraper();
