export default function EventsOverlay({ events }) {
  if (!events || events.length === 0) return null;

  const getEventIcon = (type) => {
    const icons = {
      'HOLIDAY': '🎄',
      'SCHOOL_BREAK': '🏫',
      'SPORTING': '⚽',
      'CONFERENCE': '🎤',
      'OTHER': '📅',
    };
    return icons[type] || '📅';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="events-section animate-in">
      <div style={{ marginBottom: '14px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>🗓 Events Near Travel Date</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Events that may affect flight prices
        </p>
      </div>
      <div className="events-list">
        {events.map((event, i) => (
          <div key={i} className="event-chip">
            <span className="event-chip-icon">{getEventIcon(event.event_type)}</span>
            <span className="event-chip-name">{event.name}</span>
            <span className="event-chip-date">
              {formatDate(event.start_date)}
              {event.end_date && event.end_date !== event.start_date
                ? ` – ${formatDate(event.end_date)}`
                : ''
              }
            </span>
            <span className={`event-impact ${(event.impact || 'medium').toLowerCase()}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
