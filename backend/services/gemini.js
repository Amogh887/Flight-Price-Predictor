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
    const prompt = `You are an expert flight pricing analyst. You analyze historical price trends, seasonal patterns, events, and airline pricing strategies to recommend the optimal time to buy a flight ticket.

Analyze this flight route and recommend the best time to buy:

**Route:** ${routeInfo.origin} → ${routeInfo.destination}
**Travel Date:** ${routeInfo.departureDate}
**Cabin Class:** ${routeInfo.cabinClass || 'ECONOMY'}
**Days Until Departure:** ${this._daysUntil(routeInfo.departureDate)}

**Price History (observed prices over time):**
${priceHistory.length > 0 
  ? priceHistory.map(p => `  ${p.date}: £${p.price}`).join('\n')
  : '  No historical data yet — use price analysis and general patterns.'}

**Current Price Analysis (from Amadeus):**
${priceAnalysis ? JSON.stringify(priceAnalysis, null, 2) : 'Not available'}

**Upcoming Events Near Travel Date:**
${events.length > 0 
  ? events.map(e => `  ${e.name} (${e.start_date}${e.end_date ? ' to ' + e.end_date : ''}) — Impact: ${e.impact}`).join('\n')
  : '  No major events detected'}

Your output must be ONLY a valid JSON object (no markdown, no code fences, no extra text) with these fields:
{
  "recommendation": "BUY_NOW" | "WAIT" | "PRICE_DROPPING" | "PRICE_RISING" | "LAST_CHANCE",
  "predicted_best_date": "YYYY-MM-DD",
  "predicted_price": number,
  "confidence": number (0.0 to 1.0),
  "price_zone": "LOW" | "MEDIUM" | "HIGH" | "PEAK",
  "reasoning": "string explaining your analysis",
  "factors": ["factor1", "factor2", ...],
  "summary": "One-line human-readable recommendation"
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
