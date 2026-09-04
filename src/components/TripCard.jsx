import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Eye,
  Edit3,
  Trash2,
  Globe,
  Lock,
  Copy,
  Check,
  MoreVertical,
  Heart,
  UserCheck,
  Compass
} from 'lucide-react';

const TripCard = ({
  trip,
  onEdit,
  onDelete,
  onToggleVisibility,
  isCommunityCard = false,
  onViewTrip,
  onCopyTrip,
  onSaveTrip,
  isSaved = false
}) => {
  const navigate = useNavigate();
  const [copiedLink, setCopiedLink] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const coverUrl = trip.cover_image_url || trip.cover_image || trip.coverPhoto || null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  };

  const dateRangeDisplay = `${formatDate(trip.start_date)} — ${formatDate(trip.end_date)}`;

  const calculateStatus = () => {
    if (trip.is_wishlist) return { label: 'Wishlist', color: 'purple' };
    const today = new Date().toISOString().split('T')[0];
    if (today < trip.start_date) return { label: 'Upcoming', color: 'cyan' };
    if (today >= trip.start_date && today <= trip.end_date) return { label: 'Current', color: 'emerald' };
    return { label: 'Completed', color: 'slate' };
  };

  const status = calculateStatus();

  const handleCopyLink = (e) => {
    e.stopPropagation();
    const publicUrl = `${window.location.origin}/trip/${trip.id}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div
      className="glass-panel-interactive"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)'
      }}
    >
        {/* Cover Image */}
        <div style={{ height: '185px', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-surface)' }}>
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={trip.title || trip.name || 'Trip'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(124, 58, 237, 0.25) 50%, rgba(15, 23, 42, 0.8) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Compass size={42} style={{ color: 'rgba(255,255,255,0.15)' }} />
            </div>
          )}

          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(8, 11, 17, 0.88) 0%, transparent 60%)'
          }} />

          {/* Badges Header */}
          <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
            {!isCommunityCard && (
              <span className={`badge badge-${status.color}`} style={{ backdropFilter: 'blur(10px)', fontSize: '0.725rem' }}>
                {status.label}
              </span>
            )}

            <span
              className={`badge ${trip.is_public ? 'badge-primary' : 'badge-slate'}`}
              style={{ backdropFilter: 'blur(10px)', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Globe size={11} />
              <span>Public</span>
            </span>
          </div>

          {/* Creator Info Overlay for Community Cards */}
          {isCommunityCard && (
            <div style={{ position: 'absolute', bottom: '10px', left: '12px', right: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {trip.author_avatar ? (
                <img
                  src={trip.author_avatar}
                  alt={trip.author_name || 'Traveler'}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--primary)', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    border: '1.5px solid var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#ffffff'
                  }}
                >
                  {(trip.author_name || 'C')[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.7)' }}>Created by</div>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#ffffff' }}>{trip.author_name || 'Community Traveler'}</div>
              </div>
            </div>
          )}

          {/* Dropdown Menu for My Trips Cards */}
          {!isCommunityCard && (
            <div ref={menuRef} style={{ position: 'absolute', top: '12px', right: '12px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="btn-icon"
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: 'rgba(8, 11, 17, 0.75)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid var(--border-subtle)'
                }}
                aria-label="Trip actions"
              >
                <MoreVertical size={15} />
              </button>

              {menuOpen && (
                <div
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '165px',
                    padding: '5px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      navigate(`/trip/${trip.id}`);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', width: '100%', background: 'none', border: 'none' }}
                  >
                    <Eye size={13} style={{ color: 'var(--primary)' }} />
                    <span>View Trip</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      if (onEdit) onEdit(trip);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', color: 'var(--accent-cyan)' }}
                  >
                    <Edit3 size={13} style={{ color: 'var(--accent-cyan)' }} />
                    <span>Edit Details</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      if (onToggleVisibility) onToggleVisibility(trip);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', width: '100%', background: 'none', border: 'none' }}
                  >
                    {trip.is_public ? <Lock size={13} /> : <Globe size={13} />}
                    <span>{trip.is_public ? 'Make Private' : 'Make Public'}</span>
                  </button>

                  {trip.is_public && (
                    <button
                      onClick={handleCopyLink}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', width: '100%', background: 'none', border: 'none' }}
                    >
                      {copiedLink ? <Check size={13} style={{ color: '#34d399' }} /> : <Copy size={13} />}
                      <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  )}

                  <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '3px 0' }} />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      if (onDelete) onDelete(trip);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', color: '#fca5a5', cursor: 'pointer', textAlign: 'left', width: '100%', background: 'none', border: 'none' }}
                  >
                    <Trash2 size={13} />
                    <span>Delete Trip</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      {/* Card Content */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3
            onClick={() => onViewTrip ? onViewTrip(trip) : navigate(`/trip/${trip.id}`)}
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              marginBottom: '8px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              lineHeight: 1.3
            }}
          >
            {trip.title || trip.name}
          </h3>

          {trip.description && (
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginBottom: '14px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              "{trip.description}"
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>{trip.stops?.join(' · ') || `${trip.destinations_count || 1} Destinations`}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={14} style={{ color: 'var(--primary)' }} />
              <span>{trip.days_count || 8} Days · {trip.activities_count || 15} Activities</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '20px',
          paddingTop: '14px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          {isCommunityCard ? (
            <>
              {/* View Trip */}
              <button
                onClick={() => onViewTrip && onViewTrip(trip)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                <Eye size={14} />
                <span>View Trip</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Save Trip */}
                <button
                  onClick={() => onSaveTrip && onSaveTrip(trip)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  title="Save to Wishlist"
                >
                  <Heart size={14} style={{ fill: isSaved ? '#ef4444' : 'none', color: isSaved ? '#ef4444' : 'inherit' }} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                {/* Copy Trip */}
                <button
                  onClick={() => onCopyTrip && onCopyTrip(trip)}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  <Copy size={14} />
                  <span>Copy Trip</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate(`/trip/${trip.id}`)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.825rem' }}
              >
                <Eye size={14} />
                <span>View Itinerary</span>
              </button>

              {trip.is_public && (
                <button
                  onClick={handleCopyLink}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '0.8rem', gap: '4px' }}
                >
                  {copiedLink ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied' : 'Share'}</span>
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default TripCard;
