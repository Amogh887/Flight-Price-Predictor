export default function FlightCard({ offer, index }) {
  if (!offer || !offer.itineraries?.[0]) return null;

  const outbound = offer.itineraries[0];
  const firstSeg = outbound.segments[0];
  const lastSeg = outbound.segments[outbound.segments.length - 1];
  const stops = outbound.segments.length - 1;

  // Format duration (e.g., PT8H30M → 8h 30m)
  const formatDuration = (dur) => {
    if (!dur) return '';
    const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return dur;
    const h = match[1] || '0';
    const m = match[2] || '0';
    return `${h}h ${m}m`;
  };

  // Format time (e.g., 2025-04-15T08:30:00 → 08:30)
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const seatsClass = offer.numberOfBookableSeats
    ? offer.numberOfBookableSeats <= 3
      ? 'low'
      : offer.numberOfBookableSeats <= 6
      ? 'medium'
      : 'high'
    : null;

  return (
    <div
      className="flight-card animate-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flight-card-header">
        <div className="flight-route">
          <div className="flight-airport">
            <div className="flight-airport-code">{firstSeg.departure.iataCode}</div>
            <div className="flight-airport-time">{formatTime(firstSeg.departure.at)}</div>
          </div>

          <div className="flight-route-line">
            <div className="flight-route-duration">{formatDuration(outbound.duration)}</div>
            <div className="flight-route-stops">
              {stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`}
            </div>
          </div>

          <div className="flight-airport">
            <div className="flight-airport-code">{lastSeg.arrival.iataCode}</div>
            <div className="flight-airport-time">{formatTime(lastSeg.arrival.at)}</div>
          </div>
        </div>

        <div className="flight-price">
          <div className="flight-price-amount">
            £{offer.price.total.toLocaleString()}
          </div>
          <div className="flight-price-label">per person</div>
        </div>
      </div>

      <div className="flight-card-details">
        <div className="flight-carrier">
          <div className="flight-carrier-icon">
            {firstSeg.carrierCode}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{firstSeg.carrierName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {firstSeg.flightNumber}
            </div>
          </div>
        </div>

        <div className="flight-meta">
          {firstSeg.cabin && (
            <span className="flight-meta-item">
              💺 {firstSeg.cabin}
            </span>
          )}
          {seatsClass && (
            <span className={`flight-seats ${seatsClass}`}>
              {offer.numberOfBookableSeats} left
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
