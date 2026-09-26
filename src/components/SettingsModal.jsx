import React from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import CustomDropdown from './CustomDropdown';
import { Globe, Bell, MapPin, Sliders } from 'lucide-react';

const LANGUAGE_OPTIONS = [
  { value: 'English (US)', label: 'English (US)' },
  { value: 'English (UK)', label: 'English (UK)' },
  { value: 'French', label: 'Français' },
  { value: 'German', label: 'Deutsch' },
  { value: 'Spanish', label: 'Español' },
  { value: 'Japanese', label: '日本語' }
];

const CURRENCY_OPTIONS = [
  { value: 'INR (₹)', label: 'INR (₹)' },
  { value: 'USD ($)', label: 'USD ($)' },
  { value: 'EUR (€)', label: 'EUR (€)' },
  { value: 'GBP (£)', label: 'GBP (£)' },
  { value: 'JPY (¥)', label: 'JPY (¥)' }
];

const DISTANCE_OPTIONS = [
  { value: 'Kilometers (km)', label: 'Kilometers (km)' },
  { value: 'Miles (mi)', label: 'Miles (mi)' }
];

const PRIVACY_OPTIONS = [
  { value: 'Balanced', label: 'Balanced (Recommended)' },
  { value: 'Strict', label: 'Strict Privacy (Minimal Tracking)' },
  { value: 'Personalized', label: 'Max Personalization' }
];

const SettingsModal = () => {
  const { isSettingsOpen, closeSettings, userPreferences, updatePreferences } = useAuth();

  if (!isSettingsOpen) return null;

  const handleNotificationChange = async (key, value) => {
    updatePreferences({
      notifications: {
        ...userPreferences.notifications,
        [key]: value
      }
    });

    if (value && (key === 'tripReminders' || key === 'activityReminders') && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.warn('Notification permission error:', e);
        }
      }
    }
  };

  return (
    <Modal isOpen={isSettingsOpen} onClose={closeSettings} title="App Settings & Preferences">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Section 1: APP PREFERENCES */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Globe size={18} style={{ color: 'var(--primary)' }} />
            <h4 style={{ fontSize: '0.95rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              App Preferences
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Language</label>
              <CustomDropdown
                value={userPreferences.language}
                onChange={(val) => updatePreferences({ language: val })}
                options={LANGUAGE_OPTIONS}
                pill={false}
                fullWidth
                align="left"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Currency</label>
              <CustomDropdown
                value={userPreferences.currency}
                onChange={(val) => updatePreferences({ currency: val })}
                options={CURRENCY_OPTIONS}
                pill={false}
                fullWidth
                align="right"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '14px', marginBottom: 0 }}>
            <label className="form-label">Distance Units</label>
            <CustomDropdown
              value={userPreferences.distanceUnits}
              onChange={(val) => updatePreferences({ distanceUnits: val })}
              options={DISTANCE_OPTIONS}
              pill={false}
              fullWidth
              align="left"
            />
          </div>
        </section>

        <hr style={{ borderColor: 'var(--border-subtle)' }} />

        {/* Section 2: NOTIFICATIONS */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Bell size={18} style={{ color: 'var(--accent-cyan)' }} />
            <h4 style={{ fontSize: '0.95rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Notifications
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>Trip Reminders</span>
              <input
                type="checkbox"
                checked={userPreferences.notifications.tripReminders}
                onChange={(e) => handleNotificationChange('tripReminders', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>Activity Reminders</span>
              <input
                type="checkbox"
                checked={userPreferences.notifications.activityReminders}
                onChange={(e) => handleNotificationChange('activityReminders', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>Experience Recommendations</span>
              <input
                type="checkbox"
                checked={userPreferences.notifications.experienceRecommendations}
                onChange={(e) => handleNotificationChange('experienceRecommendations', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>Achievement Alerts</span>
              <input
                type="checkbox"
                checked={userPreferences.notifications.achievementAlerts}
                onChange={(e) => handleNotificationChange('achievementAlerts', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
            </label>
          </div>
        </section>

        <hr style={{ borderColor: 'var(--border-subtle)' }} />

        {/* Section 3: LOCATION & PRIVACY */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <MapPin size={18} style={{ color: 'var(--accent-emerald)' }} />
            <h4 style={{ fontSize: '0.95rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Location & Privacy
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>Location Access</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Required for context-aware nearby recommendations</div>
              </div>
              <input
                type="checkbox"
                checked={userPreferences.locationAccess}
                onChange={(e) => updatePreferences({ locationAccess: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-emerald)' }}
              />
            </label>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Data & Privacy Mode</label>
              <CustomDropdown
                value={userPreferences.dataPrivacy}
                onChange={(val) => updatePreferences({ dataPrivacy: val })}
                options={PRIVACY_OPTIONS}
                pill={false}
                fullWidth
                align="left"
              />
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
          <button className="btn btn-primary" onClick={closeSettings}>
            Save Preferences
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default SettingsModal;
