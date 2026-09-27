import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Navigation,
  CheckCircle2,
  Star,
  ExternalLink,
  Car,
  ImageOff,
  Heart,
  DollarSign
} from 'lucide-react';
import { formatDuration } from '../utils/formatters';

/**
 * Reusable Factual Recommendation Card
 * 
 * Displays:
 *   - Real place name
 *   - Real image (if verified) or honest neutral 'Photo Unavailable' state (NO fake/random Unsplash)
 *   - Distance & travel time
 *   - Estimated visit duration & total required time
 *   - Honest price badge ('Free Entry', 'Verified amount', 'Price varies', 'Price unavailable')
 *   - Verified rating & review count or 'Rating unavailable'
 *   - Address & category
 *   - Personalized contextual reason for fit
 *   - Direct Google Maps URL with exact place_id
 *   - Action buttons (+ Add to Trip, Save to Wishlist)
 */
const RecommendationCard = ({
  recommendation,
  onAddToItinerary,
  onToggleWishlist,
  isAdded = false,
  isWishlisted = false,
  isInWishlist = false
}) => {
  const activeWishlisted = isWishlisted || isInWishlist;
  const [imgError, setImgError] = useState(false);

  const title = recommendation.name || recommendation.title || 'Local Place';
  const category = recommendation.category || 'Local';
  const address = recommendation.address || (typeof recommendation.location === 'object' ? recommendation.location.name : recommendation.location) || 'Local Area';
  const reason = recommendation.reason || recommendation.why_it_fits || recommendation.whyVisit || 'Authentic experience near your location.';

  // Time metrics
  const visitMinutes = Number(recommendation.estimatedVisitMinutes || recommendation.duration_minutes || recommendation.durationMinutes || 60);
  const travelMinutes = Number(recommendation.travelTimeMinutes || recommendation.travelMinutes || recommendation.estimated_travel_minutes || 10);
  const totalMinutes = Number(recommendation.estimatedTotalMinutes || (travelMinutes + visitMinutes));

  const formattedVisitTime = formatDuration(visitMinutes);
  const formattedTravelTime = `~${formatDuration(travelMinutes)}`;
  const formattedTotalTime = formatDuration(totalMinutes);

  // Distance
  const distanceLabel = recommendation.distance || recommendation.distanceLabel || (recommendation.distanceKm ? `${recommendation.distanceKm} km away` : 'Nearby');

  // Honest Rating (STRICT: NO FABRICATION)
  const hasRating = recommendation.rating !== null && recommendation.rating !== undefined && Number.isFinite(Number(recommendation.rating)) && Number(recommendation.rating) > 0;
  const ratingVal = hasRating ? Number(recommendation.rating).toFixed(1) : null;
  const reviewCount = Number(recommendation.reviewCount);
  const reviewCountStr = Number.isFinite(reviewCount) && reviewCount > 0 ? `(${reviewCount.toLocaleString()})` : '';

  // Honest Price Object & Display
  const priceObj = typeof recommendation.price === 'object' && recommendation.price !== null ? recommendation.price : {};
  let priceDisplay = recommendation.priceDisplay;
  if (!priceDisplay) {
    if (priceObj.type === 'free' || priceObj.amount === 0 || recommendation.priceLevel === 0) {
      priceDisplay = 'Free Entry';
    } else if (priceObj.type === 'verified' && priceObj.amount > 0) {
      priceDisplay = `₹${priceObj.amount.toLocaleString()}`;
    } else if (priceObj.type === 'varies') {
      priceDisplay = 'Price varies';
    } else {
      priceDisplay = 'Price unavailable';
    }
  }

  const isFree = priceDisplay === 'Free Entry' || priceObj.type === 'free';

  // Photo (Strict: original photo only, no random placeholders)
  const rawPhoto = recommendation.imageUrl || recommendation.image || recommendation.photoUrl;
  const hasValidPhoto = Boolean(rawPhoto && !imgError);

  // Google Maps URL
  const placeId = recommendation.placeId || recommendation.id || '';
  const mapsUrl = recommendation.mapsUrl || recommendation.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}&query_place_id=${placeId}`;

  useEffect(() => {
    setImgError(false);
  }, [recommendation.id, recommendation.placeId, rawPhoto]);

  return (
    <div
      className="glass-panel"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)'
      }}
    >
      {/* Visual Header / Photo */}
      <div style={{ height: '185px', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-surface)' }}>
        {hasValidPhoto ? (
          <img
            src={rawPhoto}
            alt={title}
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.4s ease'
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
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-subtle)'
            }}>
              <ImageOff size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em' }}>Photo Unavailable</span>
          </div>
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8, 11, 17, 0.92) 0%, transparent 60%)', pointerEvents: 'none' }} />

        {/* Category Badge */}
        <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
          <span className="badge badge-purple" style={{ backdropFilter: 'blur(10px)', fontSize: '0.72rem', fontWeight: 600 }}>
            {category}
          </span>
        </div>

        {/* Verified Rating Badge */}
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          {hasRating ? (
            <span style={{
              backgroundColor: 'rgba(8, 11, 17, 0.88)',
              border: '1px solid rgba(251, 191, 36, 0.35)',
              color: '#fbbf24',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Star size={11} fill="#fbbf24" style={{ color: '#fbbf24' }} />
              <span>{ratingVal} {reviewCountStr}</span>
            </span>
          ) : (
            <span style={{
              backgroundColor: 'rgba(8, 11, 17, 0.88)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: '0.7rem',
              fontWeight: 500,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backdropFilter: 'blur(10px)'
            }}>
              Rating unavailable
            </span>
          )}
        </div>

        {/* Total Required Time Badge */}
        <div style={{ position: 'absolute', bottom: '10px', left: '12px' }}>
          <span style={{
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: 'var(--accent-cyan)',
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            backdropFilter: 'blur(8px)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Clock size={11} />
            <span>Total: {formattedTotalTime}</span>
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)', lineHeight: 1.35 }}>
            {title}
          </h3>

          {/* Contextual Reason Grounding */}
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '7px 10px',
            marginBottom: '12px'
          }}>
            <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--accent-emerald)', lineHeight: 1.45 }}>
              <strong>Why it fits:</strong> {reason}
            </p>
          </div>

          {/* Time & Location Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={12} style={{ color: 'var(--primary)' }} />
              <span>Visit: <strong style={{ color: 'var(--text-secondary)' }}>{formattedVisitTime}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Car size={12} style={{ color: 'var(--accent-cyan)' }} />
              <span>Travel: <strong style={{ color: 'var(--text-secondary)' }}>{formattedTravelTime}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Navigation size={12} style={{ color: 'var(--text-muted)' }} />
              <span>{distanceLabel}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <DollarSign size={12} style={{ color: isFree ? 'var(--accent-emerald)' : 'var(--text-secondary)' }} />
              <span style={{ fontWeight: 600, color: isFree ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>{priceDisplay}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', gridColumn: 'span 2', marginTop: '2px' }}>
              <MapPin size={12} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }}>
                {address}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="View exact location on Google Maps"
          >
            <span>Maps</span>
            <ExternalLink size={11} />
          </a>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {onToggleWishlist && (
              <button
                onClick={() => onToggleWishlist(recommendation)}
                className="btn btn-secondary"
                style={{
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: activeWishlisted ? '#f43f5e' : 'var(--text-secondary)',
                  borderColor: activeWishlisted ? 'rgba(244, 63, 94, 0.4)' : undefined
                }}
                title={activeWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
              >
                <Heart size={12} fill={activeWishlisted ? '#f43f5e' : 'transparent'} />
                <span>{activeWishlisted ? 'Saved' : 'Wishlist'}</span>
              </button>
            )}

            {onAddToItinerary && (
              <button
                onClick={() => onAddToItinerary(recommendation)}
                disabled={isAdded}
                className={isAdded ? 'btn btn-secondary' : 'btn btn-primary'}
                style={{ padding: '6px 12px', fontSize: '0.775rem', fontWeight: 700 }}
              >
                {isAdded ? (
                  <>
                    <CheckCircle2 size={13} style={{ color: 'var(--accent-emerald)' }} />
                    <span>Added</span>
                  </>
                ) : (
                  <span>+ Add to Trip</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;
