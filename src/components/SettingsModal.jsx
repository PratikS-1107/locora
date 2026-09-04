import React from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import { Globe, Bell, MapPin, Sliders } from 'lucide-react';

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
              <select
                className="form-select"
                value={userPreferences.language}
                onChange={(e) => updatePreferences({ language: e.target.value })}
              >
                <option value="English (US)">English (US)</option>
                <option value="English (UK)">English (UK)</option>
                <option value="French">Français</option>
                <option value="German">Deutsch</option>
                <option value="Spanish">Español</option>
                <option value="Japanese">日本語</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Currency</label>
              <select
                className="form-select"
                value={userPreferences.currency}
                onChange={(e) => updatePreferences({ currency: e.target.value })}
              >
                <option value="INR (₹)">INR (₹)</option>
                <option value="USD ($)">USD ($)</option>
                <option value="EUR (€)">EUR (€)</option>
                <option value="GBP (£)">GBP (£)</option>
                <option value="JPY (¥)">JPY (¥)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '14px', marginBottom: 0 }}>
            <label className="form-label">Distance Units</label>
            <select
              className="form-select"
              value={userPreferences.distanceUnits}
              onChange={(e) => updatePreferences({ distanceUnits: e.target.value })}
            >
              <option value="Kilometers (km)">Kilometers (km)</option>
              <option value="Miles (mi)">Miles (mi)</option>
            </select>
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
              <select
                className="form-select"
                value={userPreferences.dataPrivacy}
                onChange={(e) => updatePreferences({ dataPrivacy: e.target.value })}
              >
                <option value="Balanced">Balanced (Recommended)</option>
                <option value="Strict">Strict Privacy (Minimal Tracking)</option>
                <option value="Personalized">Max Personalization</option>
              </select>
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
