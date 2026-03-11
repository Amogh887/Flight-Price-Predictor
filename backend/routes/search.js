import { Router } from 'express';
import amadeusService from '../services/amadeus.js';

const router = Router();

/**
 * GET /api/search/flights
 * Search for flight offers
 */
router.get('/flights', async (req, res) => {
  try {
    const { origin, destination, departureDate, returnDate, adults, cabinClass, max } = req.query;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        error: 'Missing required parameters: origin, destination, departureDate',
      });
    }

    const offers = await amadeusService.searchFlights({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate,
      returnDate,
      adults: parseInt(adults) || 1,
      cabinClass: cabinClass?.toUpperCase() || 'ECONOMY',
      max: parseInt(max) || 10,
    });

    res.json({
      count: offers.length,
      route: { origin: origin.toUpperCase(), destination: destination.toUpperCase() },
      departureDate,
      offers,
    });
  } catch (err) {
    console.error('Search flights error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/locations
 * Search for airports/cities by keyword
 */
router.get('/locations', async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword || keyword.length < 2) {
      return res.status(400).json({ error: 'Keyword must be at least 2 characters' });
    }

    const locations = await amadeusService.searchLocations(keyword);
    res.json({ locations });
  } catch (err) {
    console.error('Location search error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/price-analysis
 * Get Amadeus price analysis for a route
 */
router.get('/price-analysis', async (req, res) => {
  try {
    const { origin, destination, departureDate, cabinClass, currency } = req.query;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        error: 'Missing required parameters: origin, destination, departureDate',
      });
    }

    const analysis = await amadeusService.getPriceAnalysis({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate,
      cabinClass,
      currency,
    });

    res.json({ analysis });
  } catch (err) {
    console.error('Price analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/search/cheapest-dates
 * Find cheapest travel dates
 */
router.get('/cheapest-dates', async (req, res) => {
  try {
    const { origin, destination, departureDate } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({
        error: 'Missing required parameters: origin, destination',
      });
    }

    const dates = await amadeusService.getCheapestDates({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate,
    });

    res.json({ dates });
  } catch (err) {
    console.error('Cheapest dates error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
