import React from 'react';
import { MapPin, Trash2, Edit2, Sparkles, Navigation, ArrowUp, ArrowDown, Clock, Plus } from 'lucide-react';
import { formatDuration } from '../utils/formatters';

const ActivityCard = ({
  activity = {},
  onRemove,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  isAIRecommended = false,
  onAddRecommendation
}) => {
  if (!activity) return null;

  const handleDelete = () => {
    if (onDelete) {
      onDelete(activity);
    } else if (onRemove) {
      onRemove(activity.id || activity);
    }
  };

  const formatCost = (val) => {
    const num = Number(val);
    if (!num || num === 0) return 'Free';
    return `₹${num.toLocaleString()}`;
  };

  const getCategoryBadgeStyle = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'food':
      case 'meals':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'culture':
      case 'workshop':
      case 'nightlife':
        return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
      case 'adventure':
        return { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' };
      case 'nature':
      case 'shopping':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'sightseeing':
      default:
        return { bg: 'rgba(14, 165, 233, 0.15)', text: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)' };
    }
  };

  const badgeStyle = getCategoryBadgeStyle(activity.category);

  return (
    <div
      style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderLeft: isAIRecommended ? '4px solid #a855f7' : '4px solid #0ea5e9',
        background: isAIRecommended ? 'rgba(168, 85, 247, 0.08)' : 'rgba(20, 28, 48, 0.65)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        transition: 'all 0.2s ease',
        gap: '16px',
        flexWrap: 'wrap'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '240px' }}>
        {/* Time & Duration */}
        <div
          style={{
            minWidth: '85px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '2px'
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} />
            {activity.start_time || activity.time || '10:00 AM'}
          </span>
          <span style={{ fontSize: '0.725rem', color: 'rgba(226, 232, 240, 0.55)', fontWeight: 500 }}>
            {formatDuration(activity.duration_minutes ?? activity.duration ?? 60)}
          </span>
        </div>

        {/* Activity Details */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              {activity.title}
            </h4>

            {isAIRecommended && (
              <span
                style={{
                  fontSize: '0.675rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(168, 85, 247, 0.2)',
                  color: '#c084fc',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Sparkles size={10} /> AI Match
              </span>
            )}

            {activity.category && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor: badgeStyle.bg,
                  color: badgeStyle.text,
                  border: `1px solid ${badgeStyle.border}`,
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}
              >
                {activity.category}
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '0.825rem',
              color: 'rgba(226, 232, 240, 0.75)',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ fontWeight: 700, color: activity.estimated_cost || activity.cost ? '#ffffff' : '#34d399' }}>
              {formatCost(activity.estimated_cost || activity.cost)}
            </span>

            {activity.distance && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                <Navigation size={11} />
                {activity.distance}
              </span>
            )}

            {activity.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(226, 232, 240, 0.65)' }}>
                <MapPin size={11} style={{ color: '#34d399' }} />
                {activity.location}
              </span>
            )}
          </div>

          {activity.description && (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'rgba(226, 232, 240, 0.65)',
                margin: '4px 0 0 0',
                lineHeight: 1.4
              }}
            >
              {activity.description}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isAIRecommended ? (
          <button
            onClick={() => onAddRecommendation?.(activity)}
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Plus size={13} />
            <span>Add to Itinerary</span>
          </button>
        ) : (
          <>
            {onMoveUp && !isFirst && (
              <button
                onClick={() => onMoveUp(activity)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Move Up"
              >
                <ArrowUp size={13} />
              </button>
            )}

            {onMoveDown && !isLast && (
              <button
                onClick={() => onMoveDown(activity)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Move Down"
              >
                <ArrowDown size={13} />
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(activity)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Edit Activity"
              >
                <Edit2 size={13} />
              </button>
            )}

            {(onRemove || onDelete) && (
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Remove Activity"
              >
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
