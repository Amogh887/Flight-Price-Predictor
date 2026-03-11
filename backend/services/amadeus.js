import Amadeus from 'amadeus';
import dotenv from 'dotenv';

dotenv.config();

class AmadeusService {
  constructor() {
    this.client = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET,
      hostname: process.env.NODE_ENV === 'production' ? 'production' : 'test',
    });
  }

  /**
   * Search for flight offers
   * @param {Object} params - Search parameters
   * @param {string} params.origin - Origin IATA code (e.g. 'LHR')
   * @param {string} params.destination - Destination IATA code (e.g. 'JFK')
   * @param {string} params.departureDate - Date in YYYY-MM-DD format
   * @param {string} [params.returnDate] - Return date (optional for one-way)
   * @param {number} [params.adults=1] - Number of adult passengers
   * @param {string} [params.cabinClass='ECONOMY'] - Cabin class
   * @param {number} [params.max=10] - Max results
   */
  async searchFlights({ origin, destination, departureDate, returnDate, adults = 1, cabinClass = 'ECONOMY', max = 10 }) {
    try {
      const params = {
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate,
        adults,
        travelClass: cabinClass,
        max,
        currencyCode: 'GBP',
      };

      if (returnDate) {
        params.returnDate = returnDate;
      }

      const response = await this.client.shopping.flightOffersSearch.get(params);
      return this._formatFlightOffers(response.data, response.result?.dictionaries);
    } catch (err) {
      console.error('Amadeus searchFlights error:', err.response?.statusCode, err.description);
      throw new Error(`Flight search failed: ${err.description?.[0]?.detail || err.message}`);
    }
  }

  /**
   * Get flight price analysis for a route
   */
  async getPriceAnalysis({ origin, destination, departureDate, cabinClass = 'ECONOMY', currency = 'GBP' }) {
    try {
      const response = await this.client.analytics.itineraryPriceMetrics.get({
        originIataCode: origin,
        destinationIataCode: destination,
        departureDate,
        currencyCode: currency,
        oneWay: true,
      });
      return response.data;
    } catch (err) {
      console.error('Amadeus price analysis error:', err.response?.statusCode, err.description);
      throw new Error(`Price analysis failed: ${err.description?.[0]?.detail || err.message}`);
    }
  }

  /**
   * Find cheapest travel dates for a route
   */
  async getCheapestDates({ origin, destination, departureDate, oneWay = true }) {
    try {
      const response = await this.client.shopping.flightDates.get({
        origin,
        destination,
        departureDate,
        oneWay,
      });
      return response.data;
    } catch (err) {
      console.error('Amadeus cheapest dates error:', err.response?.statusCode, err.description);
      throw new Error(`Cheapest dates lookup failed: ${err.description?.[0]?.detail || err.message}`);
    }
  }

  /**
   * Get cheapest flight destinations from an origin
   */
  async getCheapestDestinations({ origin, departureDate, oneWay = true, maxPrice }) {
    try {
      const params = { origin, departureDate, oneWay };
      if (maxPrice) params.maxPrice = maxPrice;

      const response = await this.client.shopping.flightDestinations.get(params);
      return response.data;
    } catch (err) {
      console.error('Amadeus destinations error:', err.response?.statusCode, err.description);
      throw new Error(`Destinations lookup failed: ${err.description?.[0]?.detail || err.message}`);
    }
  }

  /**
   * Look up airport/city by keyword
   */
  async searchLocations(keyword) {
    try {
      const response = await this.client.referenceData.locations.get({
        keyword,
        subType: 'CITY,AIRPORT',
        'page[limit]': 10,
      });
      return response.data.map(loc => ({
        iataCode: loc.iataCode,
        name: loc.name,
        cityName: loc.address?.cityName,
        countryCode: loc.address?.countryCode,
        type: loc.subType,
      }));
    } catch (err) {
      console.error('Amadeus location search error:', err);
      throw new Error(`Location search failed: ${err.message}`);
    }
  }

  /**
   * Format flight offers from Amadeus response into a cleaner structure
   */
  _formatFlightOffers(offers, dictionaries) {
    if (!offers || !Array.isArray(offers)) return [];

    return offers.map(offer => {
      const price = {
        total: parseFloat(offer.price.total),
        currency: offer.price.currency,
        base: parseFloat(offer.price.base || offer.price.total),
        fees: offer.price.fees?.map(f => ({ amount: parseFloat(f.amount), type: f.type })) || [],
      };

      const itineraries = offer.itineraries.map(itin => ({
        duration: itin.duration,
        segments: itin.segments.map(seg => ({
          departure: {
            iataCode: seg.departure.iataCode,
            terminal: seg.departure.terminal,
            at: seg.departure.at,
          },
          arrival: {
            iataCode: seg.arrival.iataCode,
            terminal: seg.arrival.terminal,
            at: seg.arrival.at,
          },
          carrierCode: seg.carrierCode,
          carrierName: dictionaries?.carriers?.[seg.carrierCode] || seg.carrierCode,
          flightNumber: `${seg.carrierCode}${seg.number}`,
          aircraft: dictionaries?.aircraft?.[seg.aircraft?.code] || seg.aircraft?.code,
          duration: seg.duration,
          stops: seg.numberOfStops || 0,
          cabin: offer.travelerPricings?.[0]?.fareDetailsBySegment?.find(
            fd => fd.segmentId === seg.id
          )?.cabin,
        })),
      }));

      return {
        id: offer.id,
        price,
        itineraries,
        numberOfBookableSeats: offer.numberOfBookableSeats,
        lastTicketingDate: offer.lastTicketingDate,
        source: offer.source,
      };
    });
  }
}

export default new AmadeusService();
