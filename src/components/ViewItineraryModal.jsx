import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { getTripItinerary } from '../services/api';
import { Clock, MapPin, Calendar, Plus, Sparkles, X, Compass, Coins } from 'lucide-react';

const ViewItineraryModal = ({
  isOpen,
  onClose,
  trip,
  isInWishlist = false,
  onToggleWishlist,
  onCreateTrip
}) => {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !trip?.id) {
      setDays([]);
      return;
    }

    let isMounted = true;
    const fetchItinerary = async () => {
      setLoading(true);
      try {
        const { data, error } = await getTripItinerary(trip.id);
        if (isMounted) {
          if (data?.days && data.days.length > 0) {
            setDays(data.days);
          } else if (trip.days && Array.isArray(trip.days) && trip.days.length > 0) {
            setDays(trip.days);
          } else {
            setDays([]);
          }
        }
      } catch (err) {
        console.error('Error loading modal itinerary:', err);
        if (isMounted) setDays([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchItinerary();

    return () => {
      isMounted = false;
    };
  }, [isOpen, trip?.id]);

  if (!trip) return null;

  const title = trip.title || trip.name || 'Travel Itinerary';
  const destination = trip.destination || trip.location?.city || 'Destination';
  const duration = trip.duration || (days.length > 0 ? `${days.length} Days` : (trip.days_count ? `${trip.days_count} Days` : 'Multi-Day'));
  const budget = trip.budget !== null && trip.budget !== undefined && Number(trip.budget) > 0
    ? `₹${Number(trip.budget).toLocaleString()}`
    : 'Budget not set';

  const coverImage = trip.cover_image_url || trip.cover_image || null;
  const description = trip.description || 'Full day-by-day curated travel schedule with local experiences, timings, and estimated costs.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={null}
      maxWidth="780px"
    >
      <div style={{ overflow: 'hidden' }}>

        {/* Banner Cover Header */}
        <div style={{ height: '220px', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-card)' }}>
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(124, 58, 237, 0.3) 50%, rgba(15, 23, 42, 0.85) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Compass size={56} style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
          )}

          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.3) 100%)' }} />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <X size={18} />
          </button>

          {/* Trip Header Content */}
          <div style={{ position: 'absolute', bottom: '20px', left: '24px', right: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-primary" style={{ backdropFilter: 'blur(8px)' }}>
                <Compass size={12} /> {destination}
              </span>
              <span className="badge badge-purple" style={{ backdropFilter: 'blur(8px)' }}>
                <Calendar size={12} /> {duration}
              </span>
              <span className="badge badge-emerald" style={{ backdropFilter: 'blur(8px)' }}>
                <Coins size={12} /> {budget}
              </span>
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#ffffff', lineHeight: 1.2 }}>
              {title}
            </h2>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>

          {description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '24px' }}>
              {description}
            </p>
          )}

          {/* Action Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                {trip.trip_source === 'community' ? 'Community Journey' : 'Travel Itinerary'}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {days.length > 0 ? `${days.length}-Day Daily Schedule` : 'Daily Itinerary Schedule'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {onToggleWishlist && (
                <button
                  onClick={() => onToggleWishlist(trip)}
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    borderColor: isInWishlist ? 'var(--accent-purple)' : 'var(--border-subtle)',
                    color: isInWishlist ? 'var(--accent-purple)' : 'var(--text-primary)'
                  }}
                >
                  <Sparkles size={14} style={{ color: isInWishlist ? 'var(--accent-purple)' : 'inherit' }} />
                  <span>{isInWishlist ? '✓ In Wishlist' : '+ Add to Wishlist'}</span>
                </button>
              )}

              {onCreateTrip && (
                <button
                  onClick={() => {
                    onCreateTrip(trip);
                    onClose();
                  }}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  <Plus size={16} />
                  <span>Use This Itinerary</span>
                </button>
              )}
            </div>
          </div>

          {/* Day-by-Day Timeline Schedule */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading itinerary schedule...
            </div>
          ) : days.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {days.map((d, dayIdx) => {
                const dayActivities = d.activities || [];

                return (
                  <div
                    key={d.id || dayIdx}
                    className="glass-panel"
                    style={{ padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          backgroundColor: 'var(--primary)',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          DAY {d.day_number || d.day || dayIdx + 1}
                        </span>

                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {d.date || d.title || `Day ${dayIdx + 1}`}
                        </h3>
                      </div>

                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {dayActivities.length} {dayActivities.length === 1 ? 'activity' : 'activities'}
                      </span>
                    </div>

                    {dayActivities.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {dayActivities.map((act, actIdx) => (
                          <div
                            key={act.id || actIdx}
                            style={{
                              display: 'flex',
                              gap: '14px',
                              padding: '12px 14px',
                              backgroundColor: 'rgba(255, 255, 255, 0.02)',
                              borderRadius: 'var(--radius-sm)',
                              borderLeft: '3px solid var(--primary)'
                            }}
                          >
                            <div style={{ minWidth: '70px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                              {act.start_time || act.time || '10:00 AM'}
                            </div>

                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {act.title}
                                </span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: act.estimated_cost ? 'var(--text-primary)' : 'var(--accent-emerald)' }}>
                                  {Number(act.estimated_cost) > 0 ? `₹${Number(act.estimated_cost).toLocaleString()}` : 'Free'}
                                </span>
                              </div>

                              {act.description && (
                                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                                  {act.description}
                                </p>
                              )}

                              {act.location && (
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={12} style={{ color: 'var(--accent-cyan)' }} />
                                    {act.location}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                        No activities planned for this day yet.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No activities planned for this day yet.
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--bg-card)' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 20px' }}>
            Close
          </button>
          {onCreateTrip && (
            <button
              onClick={() => {
                onCreateTrip(trip);
                onClose();
              }}
              className="btn btn-primary"
              style={{ padding: '8px 22px', fontWeight: 700 }}
            >
              <Plus size={16} />
              <span>Use This Itinerary</span>
            </button>
          )}
        </div>

      </div>
    </Modal>
  );
};

export default ViewItineraryModal;
