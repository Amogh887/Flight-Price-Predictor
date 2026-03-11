export default function PredictionPanel({ prediction, loading }) {
  if (loading) {
    return (
      <div className="prediction-section">
        <div className="prediction-card">
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <span className="loading-text">🤖 Gemini is analysing price trends...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!prediction) return null;

  const getBadgeClass = (rec) => {
    const map = {
      'BUY_NOW': 'buy-now',
      'WAIT': 'wait',
      'PRICE_DROPPING': 'price-dropping',
      'PRICE_RISING': 'price-rising',
      'LAST_CHANCE': 'last-chance',
    };
    return map[rec] || 'wait';
  };

  const getRecommendationLabel = (rec) => {
    const map = {
      'BUY_NOW': '🟢 Buy Now',
      'WAIT': '🟡 Wait',
      'PRICE_DROPPING': '🔵 Price Dropping',
      'PRICE_RISING': '🔴 Price Rising',
      'LAST_CHANCE': '🔴 Last Chance',
    };
    return map[rec] || rec;
  };

  const getZoneClass = (zone) => (zone || '').toLowerCase();

  const confidencePercent = Math.round((prediction.confidence || 0) * 100);

  return (
    <div className="prediction-section animate-slide-up">
      <div className="prediction-card">
        <div className="prediction-header">
          <div className="prediction-icon">🤖</div>
          <div>
            <h3 className="prediction-title">AI Buy Recommendation</h3>
            <p className="prediction-confidence">
              {confidencePercent}% confidence • Powered by Gemini
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span className={`recommendation-badge ${getBadgeClass(prediction.recommendation)}`}>
              {getRecommendationLabel(prediction.recommendation)}
            </span>
          </div>
        </div>

        <div className="prediction-body">
          <div className="prediction-stat">
            <div className="prediction-stat-value" style={{ color: 'var(--accent-400)' }}>
              {prediction.predicted_price ? `£${prediction.predicted_price}` : '—'}
            </div>
            <div className="prediction-stat-label">Predicted Price</div>
          </div>

          <div className="prediction-stat">
            <div className="prediction-stat-value" style={{ color: 'var(--primary-400)' }}>
              {prediction.predicted_best_date
                ? new Date(prediction.predicted_best_date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })
                : '—'
              }
            </div>
            <div className="prediction-stat-label">Best Buy Date</div>
          </div>

          <div className="prediction-stat">
            <div className="prediction-stat-value">
              <span className={`price-zone ${getZoneClass(prediction.price_zone)}`}>
                {prediction.price_zone || '—'}
              </span>
            </div>
            <div className="prediction-stat-label">Current Zone</div>
          </div>

          <div className="prediction-stat">
            <div className="prediction-stat-value" style={{ color: 'var(--success-400)' }}>
              {confidencePercent}%
            </div>
            <div className="prediction-stat-label">Confidence</div>
          </div>
        </div>

        {prediction.summary && (
          <div style={{
            padding: '14px 18px',
            background: 'rgba(255, 188, 32, 0.06)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 188, 32, 0.15)',
            fontSize: '0.95rem',
            fontWeight: 500,
            color: 'var(--accent-300)',
            marginBottom: '16px',
          }}>
            💡 {prediction.summary}
          </div>
        )}

        {prediction.reasoning && (
          <div className="prediction-reasoning">
            {prediction.reasoning}
          </div>
        )}

        {prediction.factors && prediction.factors.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              marginBottom: '8px',
            }}>
              Contributing Factors
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {prediction.factors.map((factor, i) => (
                <span
                  key={i}
                  style={{
                    padding: '4px 12px',
                    background: 'rgba(51, 129, 255, 0.1)',
                    border: '1px solid rgba(51, 129, 255, 0.15)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    color: 'var(--primary-300)',
                  }}
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
