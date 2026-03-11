import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';

export default function PriceChart({ history, events, stats }) {
  const [period, setPeriod] = useState('all');

  if (!history || history.length === 0) {
    return (
      <div className="chart-section">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">📈 Price History</h3>
              <p className="chart-subtitle">Track how prices change over time</p>
            </div>
          </div>
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h3>No price data yet</h3>
            <p>Start tracking a route and check back after the daily price scraper has collected data points.</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter data by period
  const filteredData = filterByPeriod(history, period);

  // Format data for chart
  const chartData = filteredData.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    }),
    fullDate: point.date,
    price: point.minPrice,
    maxPrice: point.maxPrice,
    avgPrice: point.avgPrice,
  }));

  // Find event dates for reference lines
  const eventLines = (events || []).map(e => ({
    date: new Date(e.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    name: e.name,
    impact: e.impact,
  }));

  return (
    <div className="chart-section animate-slide-up">
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3 className="chart-title">📈 Price History</h3>
            <p className="chart-subtitle">
              {stats
                ? `£${stats.lowestPrice} – £${stats.highestPrice} range • ${stats.dataPoints} data points`
                : 'Price trend over time'
              }
            </p>
          </div>
          <div className="chart-controls">
            {['7d', '30d', '90d', 'all'].map(p => (
              <button
                key={p}
                className={`chart-period-btn ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p === 'all' ? 'All' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3381ff" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3381ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="maxGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.08)"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
              />

              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `£${v}`}
                dx={-10}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Event reference lines */}
              {eventLines.map((event, i) => (
                <ReferenceLine
                  key={i}
                  x={event.date}
                  stroke={
                    event.impact === 'HIGH' ? '#ef4444' :
                    event.impact === 'MEDIUM' ? '#f97316' : '#64748b'
                  }
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{
                    value: event.name,
                    position: 'top',
                    fill: 'var(--text-muted)',
                    fontSize: 9,
                  }}
                />
              ))}

              {/* Average price reference */}
              {stats && (
                <ReferenceLine
                  y={parseFloat(stats.averagePrice)}
                  stroke="var(--accent-400)"
                  strokeDasharray="6 3"
                  strokeOpacity={0.3}
                  label={{
                    value: `Avg: £${stats.averagePrice}`,
                    position: 'right',
                    fill: 'var(--text-muted)',
                    fontSize: 10,
                  }}
                />
              )}

              {chartData[0]?.maxPrice && (
                <Area
                  type="monotone"
                  dataKey="maxPrice"
                  stroke="rgba(249, 115, 22, 0.3)"
                  fill="url(#maxGradient)"
                  strokeWidth={1}
                  dot={false}
                />
              )}

              <Area
                type="monotone"
                dataKey="price"
                stroke="#3381ff"
                fill="url(#priceGradient)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#3381ff',
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-label">{label}</div>
      <div className="custom-tooltip-value">£{payload[0]?.value?.toLocaleString()}</div>
      {payload[1] && (
        <div className="custom-tooltip-secondary">
          Max: £{payload[1]?.value?.toLocaleString()}
        </div>
      )}
    </div>
  );
}

function filterByPeriod(data, period) {
  if (period === 'all') return data;

  const days = { '7d': 7, '30d': 30, '90d': 90 }[period] || 999;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return data.filter(d => new Date(d.date) >= cutoff);
}
