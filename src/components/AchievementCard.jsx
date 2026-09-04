import React from 'react';
import { CheckCircle2, Lock, Sparkles, MapPin, EyeOff } from 'lucide-react';

const RARITY_STYLES = {
  Common: {
    bg: 'rgba(255, 255, 255, 0.04)',
    border: 'var(--border-subtle)',
    badgeBg: 'rgba(148, 163, 184, 0.15)',
    badgeColor: '#94a3b8'
  },
  Uncommon: {
    bg: 'rgba(52, 211, 153, 0.06)',
    border: 'rgba(52, 211, 153, 0.25)',
    badgeBg: 'rgba(52, 211, 153, 0.15)',
    badgeColor: '#34d399'
  },
  Rare: {
    bg: 'rgba(56, 189, 248, 0.06)',
    border: 'rgba(56, 189, 248, 0.25)',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    badgeColor: '#38bdf8'
  },
  Epic: {
    bg: 'rgba(168, 85, 247, 0.08)',
    border: 'rgba(168, 85, 247, 0.3)',
    badgeBg: 'rgba(168, 85, 247, 0.2)',
    badgeColor: '#c084fc'
  },
  Legendary: {
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.4)',
    badgeBg: 'rgba(245, 158, 11, 0.2)',
    badgeColor: '#fbbf24',
    glow: '0 0 16px rgba(245, 158, 11, 0.2)'
  },
  Secret: {
    bg: 'rgba(236, 72, 153, 0.08)',
    border: 'rgba(236, 72, 153, 0.35)',
    badgeBg: 'rgba(236, 72, 153, 0.2)',
    badgeColor: '#f472b6',
    glow: '0 0 16px rgba(236, 72, 153, 0.2)'
  }
};

const AchievementCard = ({ achievement, onClick }) => {
  if (!achievement) return null;

  const {
    name,
    description,
    category,
    rarity = 'Common',
    icon = '🏆',
    isUnlocked = false,
    progressCurrent = 0,
    progressTotal = 1,
    unlockedAt,
    country,
    secret = false,
    secretHint
  } = achievement;

  const style = RARITY_STYLES[rarity] || RARITY_STYLES.Common;
  const progressPercent = Math.min(100, Math.round((progressCurrent / progressTotal) * 100));

  const isSecretLocked = secret && !isUnlocked;
  const displayIcon = isSecretLocked ? '🔒' : icon;
  const displayName = isSecretLocked ? 'Secret Achievement' : name;
  const displayDescription = isSecretLocked
    ? (secretHint || 'Some journeys are meant to be discovered in the wild.')
    : description;

  const formattedDate = unlockedAt
    ? (() => {
        try {
          return new Date(unlockedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (_) {
          return unlockedAt;
        }
      })()
    : null;

  return (
    <div
      onClick={onClick}
      className="glass-panel-interactive"
      style={{
        padding: '20px',
        borderRadius: 'var(--radius-md)',
        background: isUnlocked ? style.bg : 'rgba(15, 23, 42, 0.6)',
        border: `1px solid ${isUnlocked ? style.border : 'var(--border-subtle)'}`,
        boxShadow: isUnlocked && style.glow ? style.glow : 'none',
        opacity: isUnlocked ? 1 : 0.75,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.25s ease'
      }}
    >
      {/* Rarity & Category Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span
              className="badge"
              style={{
                backgroundColor: style.badgeBg,
                color: style.badgeColor,
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}
            >
              {rarity}
            </span>

            <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
              {isSecretLocked ? 'Mystery' : (category || 'Travel')}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isUnlocked ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                <CheckCircle2 size={13} /> Unlocked
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <Lock size={12} /> Locked
              </span>
            )}
          </div>
        </div>

        {/* Icon & Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '10px' }}>
          <div style={{
            fontSize: '2rem',
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: isUnlocked ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {displayIcon}
          </div>

          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
              {displayName}
            </h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {country && country !== 'Global' ? `${country} Collection` : 'Global Passport'}
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: '0.85rem', color: isSecretLocked ? 'var(--accent-cyan)' : 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0', fontStyle: isSecretLocked ? 'italic' : 'normal' }}>
          {displayDescription}
        </p>
      </div>

      {/* Progress Bar or Unlock Date */}
      <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        {isUnlocked ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Verified Milestone</span>
            {formattedDate && <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{formattedDate}</span>}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <span>Progress</span>
              <span style={{ fontWeight: 600 }}>{progressCurrent} / {progressTotal}</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6 0%, #38bdf8 100%)',
                borderRadius: '3px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default AchievementCard;
