import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserTrips } from '../services/api';
import ConversationalDiscovery from '../components/ConversationalDiscovery';
import { MessageCircle, MapPin, Compass } from 'lucide-react';

const ConversationalDiscoveryPage = () => {
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState(null);

  useEffect(() => {
    const loadActiveTrip = async () => {
      if (user?.id) {
        try {
          const { data: trips } = await getUserTrips(user.id);
          const today = new Date().toISOString().split('T')[0];
          const active = (trips || []).find(
            t => !t.is_wishlist && t.start_date && t.end_date && today >= t.start_date && today <= t.end_date
          );
          if (active) {
            setActiveTrip(active);
          }
        } catch (_) {}
      }
    };
    loadActiveTrip();
  }, [user?.id]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#070a10',
        color: '#ffffff',
        overflowX: 'hidden'
      }}
    >
      {/* 1. CINEMATIC DARK BACKGROUND WITH SUBTLE OVERLAYS */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        <img
          src="/discover-fuji.jpg"
          alt="Backdrop"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 35%',
            filter: 'brightness(0.35) contrast(1.15) saturate(1.1)',
            transform: 'scale(1.04)'
          }}
          onError={(e) => {
            e.currentTarget.src = '/community-bg.jpg';
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 165, 233, 0.12) 0%, rgba(7, 10, 16, 0.85) 60%, rgba(7, 10, 16, 0.98) 100%)'
          }}
        />
      </div>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '1160px',
          margin: '0 auto',
          padding: 'calc(var(--header-height) + 24px) 24px 60px 24px'
        }}
      >
        {/* Editorial Page Header */}
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 14px',
              borderRadius: '9999px',
              background: 'rgba(14, 165, 233, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              color: '#38bdf8',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}
          >
            <span>AI Travel Companion</span>
          </div>

          <h1
            className="serif-title"
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
              fontWeight: 700,
              margin: '0 0 10px 0',
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.15
            }}
          >
            Conversational Discovery
          </h1>

          <p
            style={{
              color: 'rgba(226, 232, 240, 0.75)',
              fontSize: '0.95rem',
              margin: '0 auto',
              maxWidth: '680px',
              lineHeight: 1.55
            }}
          >
            Discover verified local spots and activities fitting your schedule. Share your location, remaining free hours, or budget, and Locora will tailor recommendations for you.
          </p>
        </div>

        {/* 3. CHAT INTERFACE EMBEDDED IN A GLASS PANEL */}
        <div
          style={{
            height: 'clamp(620px, 75vh, 820px)',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            background: 'rgba(14, 20, 34, 0.78)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}
        >
          <ConversationalDiscovery
            activeTrip={activeTrip}
            initialLocation={activeTrip ? { city: activeTrip.destination } : null}
          />
        </div>
      </div>
    </div>
  );
};

export default ConversationalDiscoveryPage;
