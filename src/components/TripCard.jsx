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
  Compass,
  Sparkles
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

  const calculateStatus = () => {
    if (trip.is_wishlist) return { label: 'Wishlist', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)' };
    const today = new Date().toISOString().split('T')[0];
    if (today < trip.start_date) return { label: 'Upcoming', color: '#38bdf8', bg: 'rgba(14, 165, 233, 0.2)' };
    if (today >= trip.start_date && today <= trip.end_date) return { label: 'Current', color: '#34d399', bg: 'rgba(52, 211, 153, 0.2)' };
    return { label: 'Completed', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)' };
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
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
        backgroundColor: 'rgba(14, 20, 34, 0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
        transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.4)';
        e.currentTarget.style.boxShadow = '0 20px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(14, 165, 233, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.45)';
      }}
    >
      {/* Cover Image Banner */}
      <div style={{ height: '200px', position: 'relative', overflow: 'hidden', backgroundColor: '#0d121f' }}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={trip.title || trip.name || 'Trip'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.4s ease'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(13, 18, 31, 0.95) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Compass size={42} style={{ color: 'rgba(255, 255, 255, 0.15)' }} />
          </div>
        )}

        {/* Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(10, 14, 24, 0.95) 0%, rgba(10, 14, 24, 0.3) 50%, transparent 100%)'
          }}
        />

        {/* Badges Header */}
        <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', gap: '8px', zIndex: 2 }}>
          {!isCommunityCard && (
            <span
              style={{
                backgroundColor: status.bg,
                border: `1px solid ${status.color}40`,
                color: status.color,
                fontSize: '0.725rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '9999px',
                backdropFilter: 'blur(10px)'
              }}
            >
              {status.label}
            </span>
          )}

          <span
            style={{
              backgroundColor: trip.is_public ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: trip.is_public ? '1px solid rgba(14, 165, 233, 0.4)' : '1px solid rgba(255, 255, 255, 0.14)',
              color: trip.is_public ? '#38bdf8' : '#cbd5e1',
              fontSize: '0.725rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '9999px',
              backdropFilter: 'blur(10px)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Globe size={11} />
            <span>Public</span>
          </span>
        </div>

        {/* Creator Info Overlay for Community Cards */}
        {isCommunityCard && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '14px',
              right: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              zIndex: 2
            }}
          >
            {trip.author_avatar ? (
              <img
                src={trip.author_avatar}
                alt={trip.author_name || 'Traveler'}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #0ea5e9',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%)',
                  border: '2px solid #0ea5e9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#ffffff'
                }}
              >
                {(trip.author_name || 'C')[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(226, 232, 240, 0.7)', fontWeight: 500 }}>
                Curated by
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                {trip.author_name || 'Community Explorer'}
              </div>
            </div>
          </div>
        )}

        {/* Dropdown Menu for My Trips Cards */}
        {!isCommunityCard && (
          <div ref={menuRef} style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(10, 14, 24, 0.75)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label="Trip actions"
            >
              <MoreVertical size={15} />
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '175px',
                  padding: '6px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  backgroundColor: 'rgba(14, 20, 34, 0.95)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65)'
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    navigate(`/trip/${trip.id}`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    color: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    fontWeight: 600
                  }}
                >
                  <Eye size={14} style={{ color: '#0ea5e9' }} />
                  <span>View Trip</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    if (onEdit) onEdit(trip);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    color: '#38bdf8',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    fontWeight: 600
                  }}
                >
                  <Edit3 size={14} />
                  <span>Edit Details</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    if (onToggleVisibility) onToggleVisibility(trip);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    color: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    fontWeight: 600
                  }}
                >
                  {trip.is_public ? <Lock size={14} /> : <Globe size={14} />}
                  <span>{trip.is_public ? 'Make Private' : 'Make Public'}</span>
                </button>

                {trip.is_public && (
                  <button
                    onClick={handleCopyLink}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.825rem',
                      color: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      fontWeight: 600
                    }}
                  >
                    {copiedLink ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                )}

                <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    if (onDelete) onDelete(trip);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    color: '#fca5a5',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    fontWeight: 600
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete Trip</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Details Content */}
      <div
        style={{
          padding: '22px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div>
          {/* Destination Badge */}
          {trip.destination && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: 'rgba(6, 78, 59, 0.65)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                color: '#34d399',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                marginBottom: '10px'
              }}
            >
              <MapPin size={12} style={{ color: '#34d399', flexShrink: 0 }} />
              <span>{trip.destination}</span>
            </div>
          )}

          {/* Trip Title */}
          <h3
            onClick={() => (onViewTrip ? onViewTrip(trip) : navigate(`/trip/${trip.id}`))}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.2rem',
              fontWeight: 800,
              marginBottom: '8px',
              color: '#ffffff',
              cursor: 'pointer',
              lineHeight: 1.3,
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
          >
            {trip.title || trip.name}
          </h3>

          {trip.description && (
            <p
              style={{
                fontSize: '0.85rem',
                color: 'rgba(226, 232, 240, 0.75)',
                lineHeight: 1.5,
                marginBottom: '14px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {trip.description}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.825rem',
              color: 'rgba(226, 232, 240, 0.65)',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={13} style={{ color: '#38bdf8' }} />
              <span>
                {trip.days_count || 5} Days · {trip.activities_count || 12} Activities
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '20px',
            paddingTop: '14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '8px'
          }}
        >
          {isCommunityCard ? (
            <>
              {/* View Trip */}
              <button
                onClick={() => onViewTrip && onViewTrip(trip)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#ffffff',
                  padding: '7px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
              >
                <Eye size={13} />
                <span>View Trip</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Save Trip */}
                <button
                  onClick={() => onSaveTrip && onSaveTrip(trip)}
                  style={{
                    background: isSaved ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                    border: isSaved ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255, 255, 255, 0.14)',
                    color: isSaved ? '#f87171' : '#ffffff',
                    padding: '7px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Save to Wishlist"
                >
                  <Heart size={13} style={{ fill: isSaved ? '#ef4444' : 'none' }} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                {/* Copy Trip */}
                <button
                  onClick={() => onCopyTrip && onCopyTrip(trip)}
                  style={{
                    backgroundColor: '#0ea5e9',
                    color: '#ffffff',
                    border: 'none',
                    padding: '7px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)',
                    transition: 'background-color 0.2s ease, transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0284c7';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0ea5e9';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Copy size={13} />
                  <span>Copy Trip</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate(`/trip/${trip.id}`)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#ffffff',
                  padding: '7px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Eye size={13} />
                <span>View Itinerary</span>
              </button>

              {trip.is_public && (
                <button
                  onClick={handleCopyLink}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#ffffff',
                    padding: '7px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {copiedLink ? <Check size={13} style={{ color: '#34d399' }} /> : <Copy size={13} />}
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
