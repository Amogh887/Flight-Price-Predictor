import dotenv from 'dotenv';

dotenv.config();

class EventsService {
  constructor() {
    // Public holidays by country (hardcoded baseline — can be extended with API)
    this.holidays = {
      GB: [
        { name: "New Year's Day", month: 1, day: 1, impact: 'HIGH' },
        { name: 'Good Friday', month: 4, day: 18, impact: 'HIGH' },   // 2025 approximate
        { name: 'Easter Monday', month: 4, day: 21, impact: 'HIGH' },
        { name: 'Early May Bank Holiday', month: 5, day: 5, impact: 'MEDIUM' },
        { name: 'Spring Bank Holiday', month: 5, day: 26, impact: 'MEDIUM' },
        { name: 'Summer Bank Holiday', month: 8, day: 25, impact: 'HIGH' },
        { name: 'Christmas Day', month: 12, day: 25, impact: 'HIGH' },
        { name: 'Boxing Day', month: 12, day: 26, impact: 'HIGH' },
      ],
      US: [
        { name: "New Year's Day", month: 1, day: 1, impact: 'HIGH' },
        { name: "Martin Luther King Jr. Day", month: 1, day: 20, impact: 'MEDIUM' },
        { name: "Presidents' Day", month: 2, day: 17, impact: 'MEDIUM' },
        { name: 'Memorial Day', month: 5, day: 26, impact: 'HIGH' },
        { name: 'Independence Day', month: 7, day: 4, impact: 'HIGH' },
        { name: 'Labor Day', month: 9, day: 1, impact: 'HIGH' },
        { name: 'Thanksgiving', month: 11, day: 27, impact: 'HIGH' },
        { name: 'Christmas Day', month: 12, day: 25, impact: 'HIGH' },
      ],
    };

    // School break periods (approximate, UK-centric)
    this.schoolBreaks = [
      { name: 'February Half Term', startMonth: 2, startDay: 17, endMonth: 2, endDay: 21, impact: 'HIGH' },
      { name: 'Easter Holidays', startMonth: 4, startDay: 7, endMonth: 4, endDay: 21, impact: 'HIGH' },
      { name: 'May Half Term', startMonth: 5, startDay: 26, endMonth: 5, endDay: 30, impact: 'HIGH' },
      { name: 'Summer Holidays', startMonth: 7, startDay: 21, endMonth: 9, endDay: 1, impact: 'HIGH' },
      { name: 'October Half Term', startMonth: 10, startDay: 27, endMonth: 10, endDay: 31, impact: 'MEDIUM' },
      { name: 'Christmas Holidays', startMonth: 12, startDay: 20, endMonth: 1, endDay: 3, impact: 'HIGH' },
    ];
  }

  /**
   * Get events relevant to a date range
   * @param {string} departureDate - YYYY-MM-DD
   * @param {string} [origin] - Origin IATA code (for country detection)
   * @param {string} [destination] - Destination IATA code
   * @param {number} [windowDays=14] - Days before/after to check
   */
  async getEventsForDate(departureDate, origin, destination, windowDays = 14) {
    const targetDate = new Date(departureDate);
    const startWindow = new Date(targetDate);
    startWindow.setDate(startWindow.getDate() - windowDays);
    const endWindow = new Date(targetDate);
    endWindow.setDate(endWindow.getDate() + windowDays);

    const events = [];

    // Check holidays for relevant countries
    const countries = this._getCountries(origin, destination);
    for (const country of countries) {
      const countryHolidays = this.holidays[country] || [];
      for (const holiday of countryHolidays) {
        const year = targetDate.getFullYear();
        const holidayDate = new Date(year, holiday.month - 1, holiday.day);
        
        if (holidayDate >= startWindow && holidayDate <= endWindow) {
          events.push({
            name: holiday.name,
            event_type: 'HOLIDAY',
            start_date: holidayDate.toISOString().split('T')[0],
            end_date: null,
            country,
            impact: holiday.impact,
            description: `Public holiday in ${country}`,
          });
        }
      }
    }

    // Check school breaks
    const year = targetDate.getFullYear();
    for (const sb of this.schoolBreaks) {
      const sbStart = new Date(year, sb.startMonth - 1, sb.startDay);
      let sbEnd = new Date(year, sb.endMonth - 1, sb.endDay);
      // Handle cross-year breaks (Christmas)
      if (sb.endMonth < sb.startMonth) {
        sbEnd = new Date(year + 1, sb.endMonth - 1, sb.endDay);
      }

      if (sbEnd >= startWindow && sbStart <= endWindow) {
        events.push({
          name: sb.name,
          event_type: 'SCHOOL_BREAK',
          start_date: sbStart.toISOString().split('T')[0],
          end_date: sbEnd.toISOString().split('T')[0],
          country: 'GB',
          impact: sb.impact,
          description: 'UK school break period — expect higher demand',
        });
      }
    }

    // Sort by date
    events.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    return events;
  }

  /**
   * Try to get public holidays from an external API (Nager.Date)
   */
  async fetchPublicHolidays(countryCode, year) {
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map(h => ({
        name: h.localName || h.name,
        event_type: 'HOLIDAY',
        start_date: h.date,
        end_date: null,
        country: countryCode,
        impact: h.global ? 'HIGH' : 'MEDIUM',
        description: h.name,
        source: 'nager.date',
      }));
    } catch (err) {
      console.warn(`Failed to fetch holidays for ${countryCode}:`, err.message);
      return [];
    }
  }

  /**
   * Map IATA airport codes to country codes (simplified)
   */
  _getCountries(origin, destination) {
    const airportCountryMap = {
      'LHR': 'GB', 'LGW': 'GB', 'STN': 'GB', 'MAN': 'GB', 'EDI': 'GB', 'BHX': 'GB',
      'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'SFO': 'US', 'ATL': 'US', 'MIA': 'US',
      'DFW': 'US', 'DEN': 'US', 'SEA': 'US', 'BOS': 'US', 'EWR': 'US',
      'CDG': 'FR', 'ORY': 'FR',
      'FRA': 'DE', 'MUC': 'DE',
      'AMS': 'NL', 'BCN': 'ES', 'MAD': 'ES',
      'FCO': 'IT', 'MXP': 'IT',
      'DXB': 'AE', 'SIN': 'SG', 'HKG': 'HK', 'NRT': 'JP', 'HND': 'JP',
      'SYD': 'AU', 'MEL': 'AU',
      'YYZ': 'CA', 'YVR': 'CA',
    };

    const countries = new Set();
    if (origin && airportCountryMap[origin]) countries.add(airportCountryMap[origin]);
    if (destination && airportCountryMap[destination]) countries.add(airportCountryMap[destination]);
    
    // Default to GB + US if we can't determine
    if (countries.size === 0) {
      countries.add('GB');
      countries.add('US');
    }

    return [...countries];
  }
}

export default new EventsService();
