import React from 'react';
import { MapPin, Trash2, Edit2, Sparkles, Navigation, ArrowUp, ArrowDown } from 'lucide-react';

const ActivityCard = ({
  activity = {},
  onRemove,
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  isAIRecommended = false,
  onAddRecommendation
}) => {
  if (!activity) return null;

  const formatCost = (val) => {
    const num = Number(val);
    if (!num || num === 0) return 'Free';
    return `₹${num.toLocaleString()}`;
  };

  const getCategoryBadgeClass = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'food':
      case 'meals': return 'badge-amber';
      case 'culture': return 'badge-purple';
      case 'sightseeing': return 'badge-primary';
      case 'adventure': return 'badge-cyan';
      case 'shopping': return 'badge-emerald';
      case 'nightlife': return 'badge-purple';
      default: return 'badge-slate';
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderLeft: isAIRecommended ? '3px solid var(--accent-purple)' : '3px solid var(--primary)',
        background: isAIRecommended ? 'rgba(168, 85, 247, 0.05)' : 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        transition: 'all 0.18s ease',
        gap: '16px',
        flexWrap: 'wrap'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '240px' }}>

        {/* Time & Duration */}
        <div style={{
          minWidth: '80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '2px'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
            {activity.start_time || activity.time || '10:00 AM'}
          </span>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
            {activity.duration_minutes ? `${activity.duration_minutes} min` : (activity.duration || '60 min')}
          </span>
        </div>

        {/* Activity Details */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {activity.title}
            </h4>

            {isAIRecommended && (
              <span className="badge badge-purple" style={{ fontSize: '0.675rem' }}>
                <Sparkles size={10} /> AI Match
              </span>
            )}

            {activity.category && (
              <span className={`badge ${getCategoryBadgeClass(activity.category)}`} style={{ fontSize: '0.675rem' }}>
                {activity.category}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: activity.cost ? 'var(--text-primary)' : 'var(--accent-emerald)' }}>
              {formatCost(activity.cost)}
            </span>

            {activity.distance && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Navigation size={11} style={{ color: 'var(--accent-cyan)' }} />
                {activity.distance}
              </span>
            )}

            {activity.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={11} style={{ color: 'var(--text-muted)' }} />
                {activity.location}
              </span>
            )}
          </div>

          {activity.description && (
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '4px', margin: '4px 0 0 0', lineHeight: 1.4 }}>
              {activity.description}
            </p>
          )}
        </div>
      </div>

      {/* Reordering & Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {isAIRecommended ? (
          <button
            onClick={() => onAddRecommendation?.(activity)}
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.775rem' }}
          >
            + Add to Itinerary
          </button>
        ) : (
          <>
            {onMoveUp && !isFirst && (
              <button onClick={() => onMoveUp(activity)} className="btn-icon" style={{ width: '32px', height: '32px' }} title="Move Up">
                <ArrowUp size={13} />
              </button>
            )}

            {onMoveDown && !isLast && (
              <button onClick={() => onMoveDown(activity)} className="btn-icon" style={{ width: '32px', height: '32px' }} title="Move Down">
                <ArrowDown size={13} />
              </button>
            )}

            {onEdit && (
              <button onClick={() => onEdit(activity)} className="btn-icon" style={{ width: '32px', height: '32px' }} title="Edit Activity">
                <Edit2 size={13} />
              </button>
            )}

            {onRemove && (
              <button onClick={() => onRemove(activity.id)} className="btn-icon" style={{ width: '32px', height: '32px', color: '#fca5a5' }} title="Remove Activity">
                <Trash2 size={13} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityCard;
