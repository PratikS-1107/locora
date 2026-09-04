import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Navigation, Sparkles, CheckCircle2, Star, ExternalLink, Car, ImageOff, Heart } from 'lucide-react';

const ExperienceCard = ({
  experience,
  onAddToItinerary,
  onToggleWishlist,
  isAdded = false,
  isWishlisted = false,
  availableTimeLabel = 'Flexible'
}) => {
  const [imgError, setImgError] = useState(false);

  const title = experience.name || experience.title || 'Local Place';
  const category = experience.category || 'Local';
  const description = experience.description || 'Authentic place or experience near your location.';
  const duration = experience.duration_minutes ? `${experience.duration_minutes} min` : (experience.duration || '60 min');
  const travelTime = experience.estimated_travel_minutes ? `~${experience.estimated_travel_minutes} min` : null;

  const distance = typeof experience.location === 'object' && experience.location?.distance_km !== undefined
    ? `${experience.location.distance_km} km away`
    : (experience.distance || 'Near location');

  const locationAddress = typeof experience.location === 'object'
    ? (experience.location.name || 'Local Area')
    : (experience.location || 'Local Area');

  const whyItFits = experience.why_it_fits || experience.whyItFits || experience.reason || `Fits your ${availableTimeLabel}`;

  // Google Ratings & Review Count (NO FABRICATION)
  const rating = experience.rating !== null && experience.rating !== undefined ? Number(experience.rating).toFixed(1) : null;
  const reviewCount = experience.reviewCount !== null && experience.reviewCount !== undefined && experience.reviewCount > 0
    ? `(${experience.reviewCount.toLocaleString()} reviews)`
    : '';

  // Google Maps URL with exact place_id
  const placeId = experience.placeId || experience.id;
  const mapsUrl = experience.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}&query_place_id=${placeId}`;

  // Real Google Place Photo
  const rawImage = experience.image || experience.photoUrl;
  const hasValidPhoto = Boolean(rawImage && !imgError);

  // Real Google Price Level
  const priceLevel = experience.priceLevel;
  let priceDisplay = experience.priceDisplay || 'Price unavailable';
  if (priceLevel === 0) priceDisplay = 'Free Entry';
  else if (priceLevel === 1) priceDisplay = 'Budget ($)';
  else if (priceLevel === 2) priceDisplay = 'Moderate ($$)';
  else if (priceLevel === 3) priceDisplay = 'Premium ($$$)';
  else if (priceLevel === 4) priceDisplay = 'Luxury ($$$$)';
  else if (experience.estimated_cost && Number(experience.estimated_cost) > 0) {
    priceDisplay = `Est. Budget: ₹${Number(experience.estimated_cost).toLocaleString()}`;
  }

  useEffect(() => {
    setImgError(false);
  }, [experience.id, experience.placeId, rawImage]);

  return (
    <div
      className="glass-panel"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Image Banner / Neutral Placeholder */}
      <div style={{ height: '190px', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-surface)' }}>
        {hasValidPhoto ? (
          <img
            src={rawImage}
            alt={title}
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(21, 29, 48, 0.95) 0%, rgba(10, 14, 24, 0.98) 100%)',
            gap: '8px',
            color: 'var(--text-muted)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-subtle)'
            }}>
              <ImageOff size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
            <span style={{ fontSize: '0.725rem', fontWeight: 600, letterSpacing: '0.04em' }}>Photo Unavailable</span>
          </div>
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8, 11, 17, 0.88) 0%, transparent 60%)', pointerEvents: 'none' }} />

        {/* Category Badge */}
        <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
          <span className="badge badge-purple" style={{ backdropFilter: 'blur(10px)', fontSize: '0.725rem' }}>
            <Sparkles size={11} /> {category}
          </span>
        </div>

        {/* Google Rating Badge */}
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          {rating !== null ? (
            <span style={{
              backgroundColor: 'rgba(8, 11, 17, 0.85)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              color: '#fbbf24',
              fontSize: '0.725rem',
              fontWeight: 700,
              padding: '3px 7px',
              borderRadius: 'var(--radius-sm)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Star size={11} fill="#fbbf24" style={{ color: '#fbbf24' }} />
              <span>★ {rating} {reviewCount}</span>
            </span>
          ) : (
            <span style={{
              backgroundColor: 'rgba(8, 11, 17, 0.85)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: '0.725rem',
              fontWeight: 500,
              padding: '3px 7px',
              borderRadius: 'var(--radius-sm)',
              backdropFilter: 'blur(10px)'
            }}>
              Rating unavailable
            </span>
          )}
        </div>

        {/* Why it fits Tag */}
        <div style={{ position: 'absolute', bottom: '10px', left: '12px', right: '12px' }}>
          <span className="badge badge-emerald" style={{ backdropFilter: 'blur(10px)', fontSize: '0.725rem', fontWeight: 600 }}>
            ✓ {whyItFits}
          </span>
        </div>
      </div>

      {/* Details Area */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {title}
          </h3>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {description}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={12} style={{ color: 'var(--primary)' }} />
              <span>Duration: <strong style={{ color: 'var(--text-secondary)' }}>{duration}</strong></span>
            </div>

            {travelTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Car size={12} style={{ color: 'var(--accent-cyan)' }} />
                <span>Travel: <strong style={{ color: 'var(--text-secondary)' }}>{travelTime}</strong></span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Navigation size={12} style={{ color: 'var(--text-muted)' }} />
              <span>📍 {distance}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', gridColumn: 'span 2' }}>
              <MapPin size={12} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{locationAddress}</span>
            </div>
          </div>
        </div>

        {/* Pricing, Google Maps Link & Add Action */}
        <div style={{
          paddingTop: '14px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pricing / Level</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: priceDisplay === 'Free Entry' ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
              {priceDisplay}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '7px 10px', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="View exact place on Google Maps"
            >
              <span>Maps</span>
              <ExternalLink size={11} />
            </a>

            {onToggleWishlist && (
              <button
                onClick={() => onToggleWishlist(experience)}
                className="btn btn-secondary"
                style={{
                  padding: '7px 10px',
                  fontSize: '0.775rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: isWishlisted ? '#f43f5e' : 'var(--text-secondary)',
                  borderColor: isWishlisted ? 'rgba(244, 63, 94, 0.4)' : undefined
                }}
                title={isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
              >
                <Heart size={13} fill={isWishlisted ? '#f43f5e' : 'transparent'} />
                <span>{isWishlisted ? 'Saved' : 'Wishlist'}</span>
              </button>
            )}

            <button
              onClick={() => onAddToItinerary && onAddToItinerary(experience)}
              disabled={isAdded}
              className={isAdded ? 'btn btn-secondary' : 'btn btn-primary'}
              style={{ padding: '7px 13px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              {isAdded ? (
                <>
                  <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} />
                  <span>Added</span>
                </>
              ) : (
                <span>+ Add to Trip</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExperienceCard;
