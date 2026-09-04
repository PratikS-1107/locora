import React, { useState } from 'react';
import Modal from './Modal';
import AchievementCard from './AchievementCard';
import {
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  MapPin,
  Compass,
  ArrowRight,
  Info,
  Calendar,
  Layers
} from 'lucide-react';

const CountryAchievementModal = ({ isOpen, onClose, countryStat, allAchievements, onSelectAchievement }) => {
  const [tabFilter, setTabFilter] = useState('All'); // 'All', 'Unlocked', 'Locked'
  const [selectedCategory, setSelectedCategory] = useState('All');

  if (!countryStat) return null;

  const { country, countryCode, flag, totalCount, unlockedCount, unlockedPercentage } = countryStat;

  // Filter achievements for this specific country
  const countryAchievements = allAchievements.filter(a => a.countryCode === countryCode);
  const unlockedList = countryAchievements.filter(a => a.isUnlocked);
  const lockedList = countryAchievements.filter(a => !a.isUnlocked);

  // Distinct categories available in this country
  const categories = ['All', ...new Set(countryAchievements.map(a => a.category).filter(Boolean))];

  const displayedList = countryAchievements.filter(a => {
    if (tabFilter === 'Unlocked' && !a.isUnlocked) return false;
    if (tabFilter === 'Locked' && a.isUnlocked) return false;
    if (selectedCategory !== 'All' && a.category !== selectedCategory) return false;
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${flag} ${country} Passport Collection`}
      maxWidth="840px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* HERO PASSPORT HEADER */}
        <div style={{
          padding: '20px 24px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '3rem', lineHeight: 1 }}>{flag}</span>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                {country} Explorer Passport
              </h2>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {unlockedCount} of {totalCount} verified achievements unlocked
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Progress Circular / Ring Stat */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-cyan)', lineHeight: 1.1 }}>
                {unlockedPercentage}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Complete</div>
            </div>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div>
          <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.max(3, unlockedPercentage)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* FILTER BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Status Tabs */}
          <div className="tab-group" style={{ padding: '3px' }}>
            {[
              { id: 'All', label: `All (${countryAchievements.length})` },
              { id: 'Unlocked', label: `Unlocked (${unlockedList.length})` },
              { id: 'Locked', label: `Locked (${lockedList.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabFilter(tab.id)}
                className={`tab-item ${tabFilter === tab.id ? 'active' : ''}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category:</span>
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ height: '34px', padding: '0 10px', fontSize: '0.8rem', minWidth: '130px' }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ACHIEVEMENTS GRID */}
        {displayedList.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px',
            maxHeight: '480px',
            overflowY: 'auto',
            paddingRight: '6px'
          }}>
            {displayedList.map(item => (
              <AchievementCard
                key={item.id}
                achievement={item}
                onClick={() => {
                  if (onSelectAchievement) onSelectAchievement(item);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Compass size={36} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
            <div style={{ fontSize: '0.9rem' }}>No achievements match the selected filter.</div>
          </div>
        )}

      </div>
    </Modal>
  );
};

export default CountryAchievementModal;
