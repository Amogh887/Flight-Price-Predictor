import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Analyse price history and generate buy recommendation
   * @param {Object} data
   * @param {Array} data.priceHistory - Array of { date, price } snapshots
   * @param {Object} data.routeInfo - { origin, destination, departureDate, cabinClass }
   * @param {Array} data.events - Relevant events near the travel date
   * @param {Object} data.priceAnalysis - Amadeus price metrics (optional)
   */
  async getPrediction({ priceHistory, routeInfo, events, priceAnalysis }) {
    const prompt = `You are an elite Lead Flight Pricing Quantitative Analyst. Your task is to perform a multidimensional analysis of this flight route and deliver a high-accuracy buy/wait recommendation.

**YOUR OBJECTIVE:** Analyze historical price fluctuations, find the absolute best travel-buying window (Best Buy Date), and predict exactly what the price will be on that date.

### INPUT DATA FOR ANALYSIS:
**Route:** ${routeInfo.origin} → ${routeInfo.destination} (Cabin: ${routeInfo.cabinClass || 'ECONOMY'})
**Travel Departure Date:** ${routeInfo.departureDate}
**Today's Context:** ${new Date().toISOString().split('T')[0]} (${this._daysUntil(routeInfo.departureDate)} days until departure)

**Price History (Observed Snapshots):**
${priceHistory.length > 0 
  ? priceHistory.map(p => `  ${p.date}: £${p.price}`).join('\n')
  : '  NO SNAPSHOTS YET: Rely on Amadeus metrics and seasonal airline pricing benchmarks (e.g., 21-day advance booking rules).'}

**Market Benchmarks (Amadeus API Ground Truth):**
${priceAnalysis ? JSON.stringify(priceAnalysis, null, 2) : 'Market metrics not available.'}

**External Volatility Factors (Events/Holidays):**
${events.length > 0 
  ? events.map(e => `  - ${e.name}: ${e.start_date}${e.end_date ? ' to ' + e.end_date : ''} (Impact Score: ${e.impact})`).join('\n')
  : '  No major external volatility detected.'}

### YOUR ANALYTIC LOGIC:
1. **Trend Detection:** Observe the "Price History" snapshots. Is the slope increasing, decreasing, or volatile?
2. **Seasonal Window:** Use the departure date and current date to find if we are in the "Golden Booking Window" (usually 1-3 months out for international, 3-6 weeks for domestic).
3. **Event Impact:** If a high-impact event is nearby, anticipate restricted availability and rising prices.
4. **Target Calculation:** Based on historical quartiles in the Price Analysis, find the lower-bound target (£) that is realistically achievable before departure.

### OUTPUT FORMAT (STRICT JSON ONLY):
{
  "recommendation": "BUY_NOW" | "WAIT" | "PRICE_DROPPING" | "PRICE_RISING" | "LAST_CHANCE",
  "predicted_best_date": "YYYY-MM-DD (The date you expect the price to hit its absolute floor)",
  "predicted_price": number (Your predicted price in £ on the predicted_best_date),
  "confidence": number (0.0 to 1.0 based on data density),
  "price_zone": "LOW" | "MEDIUM" | "HIGH" | "PEAK" (Position relative to Amadeus quartiles),
  "reasoning": "A professional analytical breakdown of the trend, seasonal window, and event impact.",
  "factors": ["factor1", "factor2", ...],
  "summary": "One-line actionable advice"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      
      try {
        return JSON.parse(text);
      } catch {
        // If Gemini didn't return pure JSON, try to extract it
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return {
          recommendation: 'UNKNOWN',
          reasoning: text,
          confidence: 0,
          summary: 'Unable to parse prediction — see reasoning',
        };
      }
    } catch (err) {
      console.error('Gemini prediction error:', err.message);
      throw new Error(`Prediction failed: ${err.message}`);
    }
  }

  /**
   * Get a natural-language summary of a route's pricing behaviour
   */
  async getInsights({ routeInfo, priceHistory, events }) {
    try {
      const result = await this.model.generateContent(
        `Give a brief, friendly 2-3 sentence insight about flight pricing for ${routeInfo.origin} → ${routeInfo.destination} departing ${routeInfo.departureDate}. 
          
Price data points: ${priceHistory.length > 0 ? priceHistory.map(p => `£${p.price} on ${p.date}`).join(', ') : 'No history yet'}.

Relevant events: ${events.length > 0 ? events.map(e => e.name).join(', ') : 'None detected'}.

Keep it conversational and helpful. Mention if it's a good or bad time to buy.`
      );

      return result.response.text();
    } catch (err) {
      console.error('Gemini insights error:', err.message);
      return 'Unable to generate insights at this time.';
    }
  }

  _daysUntil(dateStr) {
    const target = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }
}

export default new GeminiService();
