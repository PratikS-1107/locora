import React, { useState } from 'react';
import { MapPin, Star, Heart, CameraOff } from 'lucide-react';

const ExploreCard = ({
  item,
  isSaved = false,
  onSaveToggle,
  onCardClick
}) => {
  const [imgError, setImgError] = useState(false);

  const title = item.name || item.title || 'Travel Destination';
  
  // Clean location string
  const locationStr = typeof item.location === 'object'
    ? `${item.location.city || ''}${item.location.city && item.location.country ? ', ' : ''}${item.location.country || ''}`
    : (item.address || item.location || 'Verified Destination');

  const category = item.category || 'Experience';
  const description = item.description || 'Discover remarkable culture, heritage, and local experiences.';
  
  // Honest rating (no fabricated default 4.8)
  const hasRating = typeof item.rating === 'number' && item.rating > 0;
  const ratingValue = hasRating ? item.rating : null;
  const reviewCount = item.reviewCount || null;

  // Honest pricing (no fabricated ₹800/₹1200 numbers)
  const priceText = item.priceDisplay || (item.price === 0 ? 'Free' : (item.price ? `₹${Number(item.price).toLocaleString()}` : 'Price unavailable'));
  const isFree = priceText === 'Free' || priceText === 'Free Entry' || item.price === 0;

  const hasValidImage = Boolean(!imgError && item.image);

  return (
    <div
      className="glass-panel-interactive"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        cursor: 'pointer',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)'
      }}
      onClick={() => onCardClick && onCardClick(item)}
    >
      {/* Image Cover Container */}
      <div style={{ height: '190px', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-surface)' }}>
        {hasValidImage ? (
          <>
            <img
              src={item.image}
              alt={title}
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8, 11, 17, 0.88) 0%, transparent 60%)' }} />
          </>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)',
            gap: '6px'
          }}>
            <CameraOff size={28} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              No Photo Available
            </span>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8, 11, 17, 0.65) 0%, transparent 60%)', pointerEvents: 'none' }} />
          </div>
        )}

        {/* Category Badge */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 2 }}>
          <span className="badge badge-primary" style={{ backdropFilter: 'blur(10px)', fontSize: '0.725rem', fontWeight: 600 }}>
            {category}
          </span>
        </div>

        {/* Save Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSaveToggle && onSaveToggle(item);
          }}
          className="btn"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 2,
            padding: '5px 10px',
            fontSize: '0.725rem',
            background: isSaved ? 'rgba(168, 85, 247, 0.9)' : 'rgba(8, 11, 17, 0.75)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            border: isSaved ? '1px solid #a855f7' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'transform 0.15s ease'
          }}
          title={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart size={13} style={{ fill: isSaved ? '#fff' : 'none', color: isSaved ? '#fff' : 'var(--text-secondary)' }} />
          <span>{isSaved ? 'Saved' : 'Wishlist'}</span>
        </button>

        {/* Location overlay */}
        <div style={{ position: 'absolute', bottom: '10px', left: '12px', right: '12px', zIndex: 2, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.775rem', color: 'var(--text-primary)' }}>
          <MapPin size={12} style={{ color: 'var(--accent-emerald)' }} />
          <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{locationStr}</span>
        </div>
      </div>

      {/* Card Content */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {title}
          </h3>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {description}
          </p>
        </div>

        {/* Footer Meta */}
        <div style={{
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto'
        }}>
          {hasRating ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.825rem' }}>
              <Star size={13} style={{ color: 'var(--accent-amber)', fill: 'var(--accent-amber)' }} />
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ratingValue}</span>
              {reviewCount && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({reviewCount.toLocaleString()})</span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rating unavailable</span>
          )}

          <span style={{ fontWeight: 700, color: isFree ? 'var(--accent-emerald)' : 'var(--text-primary)', fontSize: '0.85rem' }}>
            {priceText}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ExploreCard;


