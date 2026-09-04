import React, { useState } from 'react';
import Modal from './Modal';
import { verifyLocationCheckin } from '../services/api';
import {
  MapPin,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Award,
  Navigation,
  Loader2,
  ShieldCheck,
  Globe
} from 'lucide-react';

const CheckInModal = ({ isOpen, onClose, userId, onCheckinSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [gpsData, setGpsData] = useState(null);
  const [checkinResult, setCheckinResult] = useState(null);

  if (!isOpen) return null;

  const handleStartCheckin = () => {
    setErrorMsg('');
    setCheckinResult(null);
    setLoading(true);

    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setGpsData(coords);

        try {
          const res = await verifyLocationCheckin(userId, coords);
          if (!res.success) {
            setErrorMsg(res.error || 'Unable to verify location check-in.');
          } else {
            setCheckinResult(res);
            if (onCheckinSuccess) {
              onCheckinSuccess(res);
            }
          }
        } catch (err) {
          setErrorMsg(err.message || 'Error occurred during location verification.');
        } finally {
          setLoading(false);
        }
      },
      (geoError) => {
        setLoading(false);
        if (geoError.code === 1) {
          setErrorMsg('Location permission was denied. Please allow location access to verify physical visits.');
        } else if (geoError.code === 2) {
          setErrorMsg('Location unavailable. Please check your device GPS signal.');
        } else if (geoError.code === 3) {
          setErrorMsg('Location request timed out. Please try again.');
        } else {
          setErrorMsg('Failed to acquire GPS coordinates.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleClose = () => {
    setGpsData(null);
    setErrorMsg('');
    setCheckinResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Verify Travel Check-In"
      maxWidth="500px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* PRIVACY & EXPLANATION NOTICE */}
        {!checkinResult && (
          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}>
            <ShieldCheck size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '2px' }}>Verified Physical Presence</strong>
              Locora checks your current GPS position against verified travel landmarks and cities to unlock authentic travel achievements.
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {errorMsg && (
          <div style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            color: '#fca5a5',
            fontSize: '0.85rem',
            lineHeight: 1.5
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* SUCCESS RESULT STATE */}
        {checkinResult && (
          <div style={{
            padding: '24px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--accent-emerald)'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', color: '#fff' }}>
              Check-In Verified!
            </h3>

            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
              📍 {checkinResult.checkin?.place_name}
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {checkinResult.checkin?.city}, {checkinResult.checkin?.country}
            </div>

            {checkinResult.newUnlocks && checkinResult.newUnlocks.length > 0 ? (
              <div style={{
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#fef08a',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <Sparkles size={16} style={{ color: 'var(--accent-amber)' }} />
                <span><strong>{checkinResult.newUnlocks.length} New Achievement(s) Unlocked!</strong></span>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Visit recorded. Keep exploring to unlock more milestone badges!
              </div>
            )}
          </div>
        )}

        {/* GPS COORDINATES PREVIEW IF ACQUIRED */}
        {gpsData && !checkinResult && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            GPS Signal: {gpsData.latitude.toFixed(4)}°, {gpsData.longitude.toFixed(4)}° (Accuracy: ±{Math.round(gpsData.accuracy)}m)
          </div>
        )}

        {/* BUTTON ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={loading}
          >
            {checkinResult ? 'Done' : 'Cancel'}
          </button>

          {!checkinResult && (
            <button
              type="button"
              onClick={handleStartCheckin}
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 700 }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying GPS...</span>
                </>
              ) : (
                <>
                  <Navigation size={16} />
                  <span>Check In Now</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </Modal>
  );
};

export default CheckInModal;
