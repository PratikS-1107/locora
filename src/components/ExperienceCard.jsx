import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Navigation, Sparkles, CheckCircle2, Star, ExternalLink, Car, ImageOff, Heart, Plus } from 'lucide-react';
import { formatDuration } from '../utils/formatters';

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
  const duration = formatDuration(experience.duration_minutes ?? experience.duration ?? 60);
  const travelTime = experience.estimated_travel_minutes ? `~${formatDuration(experience.estimated_travel_minutes)}` : null;

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
  const rawImage = experience.image || experience.imageUrl || experience.photoUrl;
  const hasValidPhoto = Boolean(rawImage && !imgError);

  // Real Google Price Level / Honest Structured Price
  const priceLevel = experience.priceLevel;
  const priceObj = typeof experience.price === 'object' && experience.price !== null ? experience.price : {};
  let priceDisplay = experience.priceDisplay;
  if (!priceDisplay) {
    if (priceObj.type === 'free' || priceObj.amount === 0 || priceLevel === 0) {
      priceDisplay = 'Free Entry';
    } else if (priceObj.type === 'verified' && priceObj.amount > 0) {
      priceDisplay = `₹${priceObj.amount.toLocaleString()}`;
    } else if (priceObj.type === 'varies') {
      priceDisplay = 'Price varies';
    } else if (priceLevel === 1) {
      priceDisplay = 'Budget ($)';
    } else if (priceLevel === 2) {
      priceDisplay = 'Moderate ($$)';
    } else if (priceLevel === 3) {
      priceDisplay = 'Premium ($$$)';
    } else if (priceLevel === 4) {
      priceDisplay = 'Luxury ($$$$)';
    } else if (experience.estimated_cost && Number(experience.estimated_cost) > 0) {
      priceDisplay = `Est. Budget: ₹${Number(experience.estimated_cost).toLocaleString()}`;
    } else {
      priceDisplay = 'Price unavailable';
    }
  }

  useEffect(() => {
    setImgError(false);
  }, [experience.id, experience.placeId, rawImage]);

  return (
    <div
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0d121f',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        borderRadius: '20px',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)',
        transition: 'transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
        e.currentTarget.style.boxShadow = '0 20px 45px rgba(0, 0, 0, 0.75)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
        e.currentTarget.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.6)';
      }}
    >
      {/* Image Banner / Neutral Placeholder */}
      <div style={{ height: '190px', position: 'relative', overflow: 'hidden', backgroundColor: '#141a28' }}>
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
            background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.12) 0%, rgba(13, 18, 31, 0.95) 100%)',
            gap: '8px',
            color: 'rgba(226, 232, 240, 0.6)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <ImageOff size={18} style={{ color: 'rgba(226, 232, 240, 0.6)' }} />
            </div>
            <span style={{ fontSize: '0.725rem', fontWeight: 600, letterSpacing: '0.04em' }}>Photo Unavailable</span>
          </div>
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13, 18, 31, 0.95) 0%, rgba(13, 18, 31, 0.3) 50%, transparent 100%)', pointerEvents: 'none' }} />

        {/* Category Badge */}
        <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
          <span style={{
            backgroundColor: '#8b5cf6',
            color: '#ffffff',
            fontSize: '0.725rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)'
          }}>
            <Sparkles size={11} /> {category}
          </span>
        </div>

        {/* Google Rating Badge */}
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          {rating !== null ? (
            <span style={{
              backgroundColor: 'rgba(13, 18, 31, 0.85)',
              border: '1px solid rgba(14, 165, 233, 0.35)',
              color: '#38bdf8',
              fontSize: '0.725rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Star size={11} fill="#38bdf8" style={{ color: '#38bdf8' }} />
              <span>{rating} {reviewCount}</span>
            </span>
          ) : (
            <span style={{
              backgroundColor: 'rgba(13, 18, 31, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'rgba(226, 232, 240, 0.6)',
              fontSize: '0.725rem',
              fontWeight: 500,
              padding: '3px 8px',
              borderRadius: '6px',
              backdropFilter: 'blur(10px)'
            }}>
              Rating unavailable
            </span>
          )}
        </div>

        {/* Why it fits Tag */}
        <div style={{ position: 'absolute', bottom: '10px', left: '12px', right: '12px' }}>
          <span style={{
            backgroundColor: 'rgba(6, 78, 59, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(52, 211, 153, 0.35)',
            color: '#34d399',
            fontSize: '0.725rem',
            fontWeight: 700,
            padding: '3px 9px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <CheckCircle2 size={11} style={{ color: '#34d399' }} />
            <span>{whyItFits}</span>
          </span>
        </div>
      </div>

      {/* Details Area */}
      <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff', lineHeight: 1.3, fontFamily: 'var(--font-heading)' }}>
            {title}
          </h3>

          <p style={{ fontSize: '0.825rem', color: 'rgba(226, 232, 240, 0.75)', lineHeight: 1.55, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {description}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.775rem', color: 'rgba(226, 232, 240, 0.65)', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={12} style={{ color: '#38bdf8' }} />
              <span>Duration: <strong style={{ color: '#ffffff' }}>{duration}</strong></span>
            </div>

            {travelTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Car size={12} style={{ color: '#38bdf8' }} />
                <span>Travel: <strong style={{ color: '#ffffff' }}>{travelTime}</strong></span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Navigation size={12} style={{ color: '#38bdf8' }} />
              <span>{distance}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', gridColumn: 'span 2' }}>
              <MapPin size={12} style={{ color: '#34d399', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'rgba(226, 232, 240, 0.85)' }}>{locationAddress}</span>
            </div>
          </div>
        </div>

        {/* Pricing, Google Maps Link & Add Action */}
        <div style={{
          paddingTop: '14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: '0.675rem', color: 'rgba(226, 232, 240, 0.6)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pricing / Level</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: priceDisplay === 'Free Entry' ? '#34d399' : '#ffffff' }}>
              {priceDisplay}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#ffffff',
                padding: '7px 10px',
                fontSize: '0.775rem',
                fontWeight: 600,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none'
              }}
              title="View exact place on Google Maps"
            >
              <span>Maps</span>
              <ExternalLink size={11} />
            </a>

            {onToggleWishlist && (
              <button
                onClick={() => onToggleWishlist(experience)}
                style={{
                  background: isWishlisted ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  border: isWishlisted ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.14)',
                  color: isWishlisted ? '#f43f5e' : 'rgba(248, 250, 252, 0.85)',
                  padding: '7px 10px',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
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
              style={{
                backgroundColor: isAdded ? 'rgba(255, 255, 255, 0.08)' : '#0ea5e9',
                color: '#ffffff',
                border: isAdded ? '1px solid rgba(255, 255, 255, 0.14)' : 'none',
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 800,
                borderRadius: '9999px',
                cursor: isAdded ? 'default' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: isAdded ? 'none' : '0 2px 10px rgba(14, 165, 233, 0.35)',
                transition: 'background-color 0.2s ease, transform 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isAdded) {
                  e.currentTarget.style.backgroundColor = '#0284c7';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isAdded) {
                  e.currentTarget.style.backgroundColor = '#0ea5e9';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {isAdded ? (
                <>
                  <CheckCircle2 size={14} style={{ color: '#34d399' }} />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Add to Trip</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExperienceCard;
