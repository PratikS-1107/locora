import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Compass,
  Landmark,
  Mountain,
  Heart,
  ArrowRight,
  Sparkles,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import {
  getFeaturedItineraries,
  getSavedWishlistIds,
  toggleSaveWishlistItem,
  createTripFromReadyMade
} from '../services/api';
import ViewItineraryModal from '../components/ViewItineraryModal';
import ConvertTemplateModal from '../components/ConvertTemplateModal';
import Logo from '../components/Logo';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredTrips, setFeaturedTrips] = useState(getFeaturedItineraries());
  const [savedIds, setSavedIds] = useState([]);
  const [selectedItineraryTrip, setSelectedItineraryTrip] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    const loadWishlist = async () => {
      if (user?.id) {
        const res = await getSavedWishlistIds(user.id);
        setSavedIds(Array.isArray(res?.data) ? res.data : []);
      } else {
        setSavedIds([]);
      }
    };
    loadWishlist();
  }, [user]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleStartPlanning = () => {
    if (!user) {
      navigate('/login', { state: { from: '/create-trip' } });
    } else {
      navigate('/create-trip');
    }
  };

  const handleExploreCommunity = () => {
    navigate('/explore');
  };

  const handleSearch = (query = searchQuery) => {
    if (query.trim()) {
      navigate(`/explore?search=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/explore');
    }
  };

  const handleCategoryClick = (category) => {
    navigate(`/explore?category=${encodeURIComponent(category)}`);
  };

  const handleToggleWishlist = async (e, trip) => {
    e.stopPropagation();
    if (!user?.id) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    const res = await toggleSaveWishlistItem(trip, user.id);
    if (res.data?.isSaved) {
      setSavedIds(prev => [...prev, trip.id]);
      showToast(`Saved "${trip.name || trip.title}" to your wishlist.`);
    } else {
      setSavedIds(prev => prev.filter(id => id !== trip.id));
      showToast(`Removed from wishlist.`);
    }
  };

  const [templateToConvert, setTemplateToConvert] = useState(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleCreateTripFromModal = (trip) => {
    if (!user) {
      navigate('/login', { state: { returnTo: '/explore' } });
      return;
    }
    setSelectedItineraryTrip(null);
    setTemplateToConvert(trip);
  };

  const handleConfirmConvertTemplate = async (templateTrip, { startDate, endDate, budget }) => {
    if (!user?.id) {
      navigate('/login', { state: { returnTo: '/explore' } });
      return;
    }
    setIsConverting(true);
    try {
      const { data: newTrip, error } = await createTripFromReadyMade(templateTrip, user.id, { startDate, endDate, budget });
      if (!error && newTrip) {
        showToast(`Created trip "${newTrip.title || newTrip.name}"!`);
        setTemplateToConvert(null);
        navigate(`/trip/${newTrip.id}`);
      } else {
        showToast('Could not create trip.');
      }
    } catch (err) {
      showToast('Could not create trip.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: '#ffffff' }}>

      {/* 1. CINEMATIC HERO SECTION */}
      <section style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '120px 24px 80px 24px',
        overflow: 'hidden'
      }}>

        {/* Full-bleed Hero Photography */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2560&q=85")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 1
        }} />

        {/* Sophisticated Vignette Dark Gradient Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(8, 11, 17, 0.42) 0%, rgba(8, 11, 17, 0.78) 65%, #080b11 100%)',
          zIndex: 2
        }} />

        {/* Centered Editorial Hero Content */}
        <div style={{
          position: 'relative',
          zIndex: 3,
          maxWidth: '820px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>

          {/* Main Editorial Headline */}
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2.9rem, 6vw, 4.6rem)',
            lineHeight: 1.08,
            fontWeight: 700,
            marginBottom: '18px',
            letterSpacing: '-0.02em',
            color: '#ffffff',
            textShadow: '0 4px 30px rgba(0, 0, 0, 0.65)'
          }}>
            Curate Your World
          </h1>

          {/* Supporting Subtitle */}
          <p style={{
            fontSize: 'clamp(0.95rem, 1.8vw, 1.075rem)',
            color: 'rgba(248, 250, 252, 0.88)',
            marginBottom: '36px',
            maxWidth: '620px',
            lineHeight: 1.65,
            fontWeight: 400,
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
          }}>
            Design deeply personal, premium travel experiences. From untamed wilderness to refined cultural capitals, orchestrate your next masterpiece.
          </p>

          {/* Premium Travel Discovery Control Bar */}
          <div style={{
            width: '100%',
            maxWidth: '680px',
            background: 'rgba(14, 20, 34, 0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '8px',
            padding: '6px 8px 6px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '28px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
            flexWrap: 'wrap'
          }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 240px' }}>
              <Search size={18} style={{ color: 'rgba(255, 255, 255, 0.5)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Where is your next chapter?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  width: '100%',
                  fontFamily: 'var(--font-body)'
                }}
              />
            </div>



          </div>

          {/* Primary Action Buttons */}
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleStartPlanning}
              style={{
                padding: '13px 30px',
                background: 'var(--accent-teal)',
                color: '#080b11',
                fontSize: '0.825rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: '6px',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 4px 16px rgba(45, 212, 191, 0.35)',
                transition: 'transform 0.2s ease, background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-teal-hover)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-teal)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Start Planning
            </button>

            <button
              onClick={handleExploreCommunity}
              style={{
                padding: '13px 26px',
                background: 'rgba(14, 20, 34, 0.65)',
                border: '1px solid var(--accent-teal)',
                color: 'var(--accent-teal)',
                fontSize: '0.825rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(8px)',
                transition: 'background 0.2s ease, transform 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(45, 212, 191, 0.12)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(14, 20, 34, 0.65)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Compass size={15} style={{ color: 'var(--accent-teal)' }} />
              <span>Explore Trips</span>
            </button>
          </div>

        </div>
      </section>

      {/* 2. TRENDING / CURATED EXPERIENCES SECTION */}
      <section style={{
        width: '100%',
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '80px 32px 100px 32px'
      }}>

        {/* Section Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '36px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Sparkles size={18} style={{ color: 'var(--accent-teal)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--accent-teal)', textTransform: 'uppercase' }}>
                Curated Multi-Day Itineraries
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2rem',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em'
            }}>
              Featured Pre-Planned Trips
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              margin: 0
            }}>
              Authentic travel routes and verified daily itineraries.
            </p>
          </div>

          <button
            onClick={() => navigate('/explore')}
            style={{
              color: 'var(--accent-teal)',
              fontSize: '0.825rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <span>View All Trips</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* 3 Tall Curated Itinerary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px'
        }}>
          {featuredTrips.map((trip) => {
            const isSaved = savedIds.includes(trip.id);
            return (
              <div
                key={trip.id}
                onClick={() => setSelectedItineraryTrip(trip)}
                style={{
                  position: 'relative',
                  height: '490px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s ease, box-shadow 0.35s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.6)';
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.4)';
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1)';
                }}
              >
                {/* Background Image with smooth zoom transition */}
                <img
                  src={trip.cover_image || trip.image}
                  alt={trip.name}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    zIndex: 1
                  }}
                />

                {/* Bottom Dark Gradient Overlay for Typography Contrast */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(8, 11, 17, 0.96) 0%, rgba(8, 11, 17, 0.65) 45%, rgba(8, 11, 17, 0.15) 75%, transparent 100%)',
                  zIndex: 2
                }} />

                {/* Top Controls: Destination / Duration Pill & Wishlist Heart */}
                <div style={{
                  position: 'relative',
                  zIndex: 3,
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{
                    background: 'rgba(8, 11, 17, 0.65)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.675rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Calendar size={11} style={{ color: 'var(--accent-teal)' }} />
                    {trip.duration}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleToggleWishlist(e, trip)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(8, 11, 17, 0.65)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: isSaved ? '#f43f5e' : 'rgba(255, 255, 255, 0.85)',
                      transition: 'transform 0.15s ease, background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
                    aria-label="Save to Wishlist"
                  >
                    <Heart
                      size={16}
                      fill={isSaved ? '#f43f5e' : 'none'}
                      strokeWidth={isSaved ? 0 : 2}
                    />
                  </button>
                </div>

                {/* Bottom Editorial Content */}
                <div style={{
                  position: 'relative',
                  zIndex: 3,
                  padding: '24px 22px'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--accent-teal)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    {trip.destination}
                  </div>

                  <h3 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.25
                  }}>
                    {trip.name}
                  </h3>

                  <p style={{
                    fontSize: '0.85rem',
                    color: 'rgba(248, 250, 252, 0.82)',
                    lineHeight: 1.55,
                    margin: '0 0 16px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {trip.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)'
                    }}>
                      {(trip.days || []).length} Curated Days
                    </span>

                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      color: 'var(--accent-teal)',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      View Itinerary <ArrowRight size={12} />
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </section>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
          backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--accent-emerald)',
          borderRadius: 'var(--radius-md)', padding: '14px 20px', color: '#fff',
          boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Shared Itinerary Modal for Trip View */}
      {selectedItineraryTrip && (
        <ViewItineraryModal
          isOpen={Boolean(selectedItineraryTrip)}
          onClose={() => setSelectedItineraryTrip(null)}
          trip={selectedItineraryTrip}
          isInWishlist={savedIds.includes(selectedItineraryTrip.id)}
          onToggleWishlist={(trip) => handleToggleWishlist({ stopPropagation: () => { } }, trip)}
          onCreateTrip={handleCreateTripFromModal}
        />
      )}

      {/* Create Trip from Template Modal */}
      <ConvertTemplateModal
        isOpen={Boolean(templateToConvert)}
        onClose={() => setTemplateToConvert(null)}
        templateTrip={templateToConvert}
        onConfirm={handleConfirmConvertTemplate}
        isSubmitting={isConverting}
      />

      {/* 3. MINIMAL PREMIUM FOOTER */}
      <footer style={{
        width: '100%',
        backgroundColor: '#080b11',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '48px 32px 60px 32px'
      }}>
        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px'
        }}>

          {/* Left: Brand & Copyright */}
          <div>
            <div style={{ marginBottom: '8px' }}>
              <Logo variant="footer" />
            </div>
            <p style={{
              fontSize: '0.825rem',
              color: 'var(--text-muted)',
              margin: 0
            }}>
              © 2026 Locora. Curating worlds for the discerning explorer.
            </p>
          </div>

          {/* Right: Editorial Footer Links */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
            flexWrap: 'wrap'
          }}>
            <span
              onClick={() => navigate('/explore')}
              style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              About Us
            </span>
            <span
              onClick={() => navigate('/community')}
              style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              Press
            </span>
            <span
              onClick={() => navigate('/explore')}
              style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              Privacy Policy
            </span>
            <span
              onClick={() => navigate('/explore')}
              style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              Terms of Service
            </span>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default Home;
