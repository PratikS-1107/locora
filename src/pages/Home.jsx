import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bookmark,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
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
import { DepthCard } from '../components/reactbits/DepthCard';
import { MaskedHeading } from '../components/reactbits/MaskedHeading';

// Curated destination stories matching the editorial screenshot aesthetic
const EDITORIAL_DESTINATIONS = [
  {
    id: 'dest-douro-vineyards',
    title: 'Douro Terraced Pathways',
    name: 'Douro Terraced Pathways',
    eyebrow: 'WALK THE ANCIENT RIVER RIDGES',
    heroHeadline: 'WHISPERING\nVINES\n& STONE\nHORIZONS',
    heroDescription: 'Follow handmade granite terraces carved into sun-drenched valley cliffs. Harvest seasonal olives with family vintners, listen to old river ballads, and find stillness along centuries of untamed hillside paths.',
    category: 'SLOW TRAILS & VINEYARDS',
    destination: 'Porto Region, Portugal',
    country: 'Portugal',
    country_code: 'PT',
    cover_image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1400&q=85',
    duration: '5 Days',
    days_count: 5,
    budget: 42000,
    currency: 'EUR',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Arrival in Porto & Douro Valley Train Ride',
        activities: [
          { start_time: '10:00 AM', title: 'Historic Linha do Douro Scenic Rail', location: 'Porto São Bento to Pinhão', estimated_cost: 25, description: 'Ride along emerald waters through UNESCO terraced slopes.', category: 'Sightseeing' },
          { start_time: '04:00 PM', title: 'Check-in at Hillside Quinta Estate', location: 'Pinhão', estimated_cost: 0, description: 'Settle into vineyard estate quarters overlooking the river.', category: 'Culture' },
          { start_time: '07:30 PM', title: 'Estate Wine Tasting & Farm Dinner', location: 'Quinta do Bomfim', estimated_cost: 65, description: 'Seasonal Portuguese dining paired with aged vintage ports.', category: 'Food' }
        ]
      },
      {
        day: 2,
        title: 'Ancient Granite Ridge Trail & Olive Groves',
        activities: [
          { start_time: '08:30 AM', title: 'Passadiços do Douro Ridge Walk', location: 'Vale de Mendiz', estimated_cost: 0, description: 'Hike ancient dry-stone walled footpaths high above the river.', category: 'Nature' },
          { start_time: '01:00 PM', title: 'Rustic Picnic under Shaded Carob Trees', location: 'Casal de Loivos', estimated_cost: 30, description: 'Fresh sourdough, Serra da Estrela cheese, and harvested olives.', category: 'Food' }
        ]
      },
      {
        day: 3,
        title: 'Traditional Rabelo Boat Voyage to Tua',
        activities: [
          { start_time: '09:30 AM', title: 'Wooden Rabelo River Navigation', location: 'Pinhão Jetty', estimated_cost: 40, description: 'Glide along untamed canyon narrows toward Tua gorge.', category: 'Adventure' }
        ]
      }
    ]
  },
  {
    id: 'dest-himalayan-valley',
    title: 'Himalayan Valley Sanctuaries',
    name: 'Himalayan Valley Sanctuaries',
    eyebrow: 'SACRED CIRQUES & PRAYER CLIFFS',
    heroHeadline: 'SACRED\nPEAKS\n& MISTED\nSHRINES',
    heroDescription: 'Traverse glacial meadows dotted with rhododendrons and ancient Tibetan monasteries. Share hot butter tea with high-altitude yak herders and witness golden sunrise across eternal snow peaks.',
    category: 'ALPINE HERITAGE',
    destination: 'Langtang Valley, Nepal',
    country: 'Nepal',
    country_code: 'NP',
    cover_image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=85',
    duration: '7 Days',
    days_count: 7,
    budget: 35000,
    currency: 'NPR',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Syabrubesi to Lama Hotel River Trail',
        activities: [
          { start_time: '07:30 AM', title: 'Langtang Khola River Crossing', location: 'Syabrubesi', estimated_cost: 0, description: 'Suspension bridge walk into pristine oak and bamboo canopy.', category: 'Nature' },
          { start_time: '02:00 PM', title: 'Lama Hotel Wilderness Teahouse Rest', location: 'Lama Hotel', estimated_cost: 15, description: 'Warm ginger lemon tea and rest in tranquil river gorge.', category: 'Culture' }
        ]
      },
      {
        day: 2,
        title: 'Mundu to Kyanjin Gompa Sacred Sanctuary',
        activities: [
          { start_time: '08:00 AM', title: 'Langtang Valley Ascent & Mani Walls', location: 'Mundu', estimated_cost: 0, description: 'Pass sacred carved prayer stones with views of Langtang Lirung.', category: 'Culture' }
        ]
      }
    ]
  },
  {
    id: 'dest-andean-cloudforest',
    title: 'Andean Cloud Forest Trails',
    name: 'Andean Cloud Forest Trails',
    eyebrow: 'MISTED INCA STEPS & SACRED RIDGEWAYS',
    heroHeadline: 'ANDEAN\nRIDGES\n& CLOUD\nFORESTS',
    heroDescription: 'Climb emerald terraced peaks wrapped in morning mist. Discover hidden orchids, cascading mountain torrents, and forgotten stone citadels preserved high in the Peruvian Andes.',
    category: 'HERITAGE TRAILS',
    destination: 'Sacred Valley, Peru',
    country: 'Peru',
    country_code: 'PE',
    cover_image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1400&q=85',
    duration: '6 Days',
    days_count: 6,
    budget: 48000,
    currency: 'PEN',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Pisac Ruins & Sacred Valley Artisan Market',
        activities: [
          { start_time: '09:00 AM', title: 'Pisac Cliffside Sun Temple Exploration', location: 'Pisac', estimated_cost: 30, description: 'Panoramic views across sacred agricultural terraces.', category: 'Culture' }
        ]
      }
    ]
  },
  {
    id: 'rmt-kyoto-7d',
    title: 'Kyoto Machiya & Ancient Shrines',
    name: 'Kyoto Machiya & Ancient Shrines',
    eyebrow: 'BAMBOO SANCTUARIES & GEISHA LANES',
    heroHeadline: 'SILENT\nGROVES\n& GOLDEN\nPAVILIONS',
    heroDescription: 'Immerse in morning bamboo tranquility, historic geisha districts, moss-carpeted Zen gardens, and evening multi-course kaiseki dining by lantern light.',
    category: 'CULTURAL SANCTUARY',
    destination: 'Kyoto & Osaka, Japan',
    country: 'Japan',
    country_code: 'JP',
    cover_image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=85',
    duration: '7 Days',
    days_count: 7,
    budget: 68500,
    currency: 'INR',
    is_ready_made: true,
    days: [
      {
        day: 1,
        title: 'Arrival in Kyoto & Gion Twilight Walk',
        activities: [
          { start_time: '02:00 PM', title: 'Check-in at Machiya Townhouse', location: 'Higashiyama, Kyoto', estimated_cost: 0, description: 'Settle into authentic wooden townhouse quarters.', category: 'Sightseeing' },
          { start_time: '05:30 PM', title: 'Gion Lantern-Lit Alleyways Stroll', location: 'Gion District', estimated_cost: 0, description: 'Guided evening walk through historic teahouse lanes.', category: 'Culture' }
        ]
      }
    ]
  }
];

const CARD_WIDTH = 230;
const CARD_GAP = 18;
const CARD_STEP = CARD_WIDTH + CARD_GAP; // 248px
const REPEAT_SETS = 100; // 100 repeats for seamless continuous infinite scroll without page refresh

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Combine editorial destinations with existing pre-planned itineraries
  const destinations = useMemo(() => {
    const existing = getFeaturedItineraries();
    const map = new Map();
    EDITORIAL_DESTINATIONS.forEach(d => map.set(d.id, d));
    existing.forEach(t => {
      if (!map.has(t.id)) {
        map.set(t.id, {
          ...t,
          eyebrow: `EXPERIENCE ${t.country?.toUpperCase() || 'THE WORLD'}`,
          heroHeadline: `${(t.name || t.title || 'EXPLORE').toUpperCase().split(' ').slice(0, 4).join('\n')}`,
          heroDescription: t.description || 'Curate unforgettable multi-day routes across authentic cultural sanctuaries.',
          category: t.category || 'CURATED ITINERARY'
        });
      }
    });
    return Array.from(map.values());
  }, []);

  const totalDestinations = destinations.length;
  const initialSlideIndex = totalDestinations > 0 ? Math.floor(REPEAT_SETS / 2) * totalDestinations : 0;

  // Infinite repeating carousel items
  const carouselItems = useMemo(() => {
    if (!destinations.length) return [];
    const arr = [];
    for (let c = 0; c < REPEAT_SETS; c++) {
      destinations.forEach((item, originalIndex) => {
        arr.push({
          ...item,
          uniqueKey: `item-${c}-${item.id}`,
          originalIndex,
          trackIndex: c * totalDestinations + originalIndex
        });
      });
    }
    return arr;
  }, [destinations, totalDestinations]);

  // Continuous slideIndex (increments/decrements continuously on arrow clicks and auto-advance)
  const [slideIndex, setSlideIndex] = useState(initialSlideIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);

  const [savedIds, setSavedIds] = useState([]);
  const [selectedItineraryTrip, setSelectedItineraryTrip] = useState(null);
  const [templateToConvert, setTemplateToConvert] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Normalized index for active card and background (0 to totalDestinations - 1)
  const currentNormalizedIndex = totalDestinations > 0
    ? ((slideIndex % totalDestinations) + totalDestinations) % totalDestinations
    : 0;

  const currentItem = destinations[currentNormalizedIndex] || destinations[0] || EDITORIAL_DESTINATIONS[0];

  // Auto-play repeating carousel continuously without requiring page refresh
  useEffect(() => {
    if (isPaused || totalDestinations <= 1) return;

    const timer = setInterval(() => {
      setSlideIndex(prev => prev + 1);
    }, 3200);

    return () => clearInterval(timer);
  }, [isPaused, totalDestinations]);

  // Re-enable smooth transition if it was momentarily disabled during silent buffer centering
  useEffect(() => {
    if (!isTransitioning) {
      const frame = requestAnimationFrame(() => {
        setIsTransitioning(true);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isTransitioning]);

  // Seamless buffer recentering on transition end for perpetual continuous movement
  const handleTransitionEnd = () => {
    if (totalDestinations <= 0) return;
    if (slideIndex > (REPEAT_SETS - 15) * totalDestinations || slideIndex < 15 * totalDestinations) {
      const normalized = ((slideIndex % totalDestinations) + totalDestinations) % totalDestinations;
      const centeredIndex = Math.floor(REPEAT_SETS / 2) * totalDestinations + normalized;
      setIsTransitioning(false);
      setSlideIndex(centeredIndex);
    }
  };

  // Keyboard arrow keys navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setSlideIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft') {
        setSlideIndex(prev => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load wishlist for current user
  useEffect(() => {
    const loadWishlist = async () => {
      if (user?.id) {
        try {
          const res = await getSavedWishlistIds(user.id);
          setSavedIds(Array.isArray(res?.data) ? res.data : []);
        } catch {
          setSavedIds([]);
        }
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

  const handleToggleWishlist = async (e, trip) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!user?.id) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    try {
      const res = await toggleSaveWishlistItem(trip, user.id);
      if (res.data?.isSaved) {
        setSavedIds(prev => [...prev, trip.id]);
        showToast(`Saved "${trip.name || trip.title}" to your wishlist.`);
      } else {
        setSavedIds(prev => prev.filter(id => id !== trip.id));
        showToast(`Removed from wishlist.`);
      }
    } catch {
      showToast(`Saved to wishlist.`);
    }
  };

  // Next / Prev slide handlers - horizontally move the cards track!
  const handlePrevSlide = () => {
    setSlideIndex(prev => prev - 1);
  };

  const handleNextSlide = () => {
    setSlideIndex(prev => prev + 1);
  };

  // Card click handler: clicking any card smoothly slides that card to front and activates it
  // Clicking the already active front card opens the full itinerary modal
  const handleCardClick = (trackIdx, trip) => {
    if (trackIdx === slideIndex) {
      setSelectedItineraryTrip(trip);
    } else {
      setSlideIndex(trackIdx);
    }
  };

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
    } catch {
      showToast('Could not create trip.');
    } finally {
      setIsConverting(false);
    }
  };

  const isCurrentSaved = currentItem ? savedIds.includes(currentItem.id) : false;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#070a10',
        color: '#ffffff',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      {/* 1. DYNAMIC FULLSCREEN CARD BACKGROUND */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#070a10',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        {destinations.map((dest, i) => {
          const isCurrent = i === currentNormalizedIndex;
          return (
            <div
              key={dest.id}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: isCurrent ? 1 : 0,
                transition: 'opacity 0.75s ease-in-out',
                willChange: 'opacity'
              }}
            >
              <img
                src={dest.cover_image || dest.image}
                alt={dest.title || dest.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  filter: 'brightness(0.62) contrast(1.12)'
                }}
              />
            </div>
          );
        })}

        {/* Left-heavy cinematic dark gradient overlay for optimal readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to right, rgba(7, 10, 16, 0.95) 0%, rgba(7, 10, 16, 0.84) 38%, rgba(7, 10, 16, 0.35) 75%, rgba(7, 10, 16, 0.65) 100%)',
            pointerEvents: 'none'
          }}
        />

        {/* Top and Bottom soft vignette overlays */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(7, 10, 16, 0.75) 0%, transparent 22%, transparent 78%, rgba(7, 10, 16, 0.96) 100%)',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* 2. MAIN HERO & DESTINATION CARDS VIEWPORT */}
      <main
        className="home-page-entrance"
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '110px 48px 40px 48px',
          minHeight: 'calc(100vh - 60px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        {/* Desktop Split Row: Left Editorial Hero BESIDE Right Destination Cards */}
        <div
          className="home-hero-grid"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '36px',
            width: '100%',
            flexWrap: 'nowrap',
            paddingBottom: '24px'
          }}
        >
          {/* LEFT: EDITORIAL HERO CONTENT */}
          <div
            className="home-hero-content"
            style={{
              flex: '0 0 auto',
              width: '38%',
              maxWidth: '440px',
              minWidth: '300px',
              minHeight: '380px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              zIndex: 10
            }}
          >
            {/* Small Eyebrow with gold accent bar */}
            <div
              key={`hero-eyebrow-${currentNormalizedIndex}`}
              className="home-stagger-eyebrow"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '2px',
                  backgroundColor: '#38bdf8',
                  borderRadius: '2px'
                }}
              />
              <span
                style={{
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}
              >
                {currentItem.eyebrow}
              </span>
            </div>

            {/* Very Large Editorial Heading */}
            <h1
              key={`hero-heading-${currentNormalizedIndex}`}
              className="home-stagger-headline"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(2.5rem, 4.4vw, 4.4rem)',
                fontWeight: 900,
                lineHeight: 0.94,
                letterSpacing: '-0.025em',
                textTransform: 'uppercase',
                color: '#ffffff',
                marginBottom: '20px',
                whiteSpace: 'pre-line',
                textShadow: '0 4px 24px rgba(0, 0, 0, 0.8)',
                minHeight: '2.8em'
              }}
            >
              {currentItem.heroHeadline}
            </h1>

            {/* Short Descriptive Paragraph */}
            <p
              key={`hero-desc-${currentNormalizedIndex}`}
              className="home-stagger-desc"
              style={{
                fontSize: 'clamp(0.85rem, 1vw, 0.925rem)',
                color: 'rgba(240, 244, 248, 0.82)',
                lineHeight: 1.6,
                marginBottom: '30px',
                maxWidth: '390px',
                minHeight: '4.8em'
              }}
            >
              {currentItem.heroDescription}
            </p>

            {/* Action Buttons: Blue Icon Button + "START YOUR ADVENTURE →" */}
            <div
              className="home-stagger-actions"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              {/* Circular Blue Bookmark Wishlist Button */}
              <button
                type="button"
                onClick={(e) => handleToggleWishlist(e, currentItem)}
                title={isCurrentSaved ? 'Saved in Wishlist' : 'Save Destination to Wishlist'}
                aria-label={isCurrentSaved ? 'Remove from wishlist' : 'Save to wishlist'}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: '#0ea5e9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff',
                  boxShadow: '0 4px 20px rgba(14, 165, 233, 0.45)',
                  transition: 'transform 0.2s ease, background-color 0.2s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.backgroundColor = '#0284c7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = '#0ea5e9';
                }}
              >
                <Bookmark
                  size={19}
                  fill={isCurrentSaved ? '#ffffff' : 'currentColor'}
                  strokeWidth={2.5}
                />
              </button>

              {/* Start Your Adventure Button */}
              <button
                type="button"
                onClick={handleStartPlanning}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '13px 26px',
                  backgroundColor: 'rgba(22, 27, 34, 0.88)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: '9999px',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
                  transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(34, 42, 54, 0.95)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(22, 27, 34, 0.88)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <span>Start Your Adventure</span>
                <ArrowRight size={14} style={{ color: '#38bdf8' }} />
              </button>
            </div>
          </div>

          {/* RIGHT: DESTINATION CARDS BESIDE THE HEADINGS (SLIDING CAROUSEL TRACK) */}
          <div
            className="home-cards-carousel-container home-stagger-cards"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            style={{
              flex: '1 1 auto',
              minWidth: 0,
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* The Cards Track that visually slides horizontally continuously and infinitely */}
            <div
              className="home-cards-track"
              onTransitionEnd={handleTransitionEnd}
              style={{
                display: 'flex',
                gap: `${CARD_GAP}px`,
                transform: `translateX(-${slideIndex * CARD_STEP}px)`,
                transition: isTransitioning ? 'transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                willChange: 'transform'
              }}
            >
              {carouselItems.map((trip, idx) => {
                const isActive = idx === slideIndex;

                return (
                  <div
                    key={trip.uniqueKey}
                    style={{
                      flex: `0 0 ${CARD_WIDTH}px`,
                      width: `${CARD_WIDTH}px`,
                      height: '350px',
                      perspective: '1000px'
                    }}
                  >
                    <DepthCard
                      isActive={isActive}
                      maxTilt={6}
                      depth={10}
                      glare={true}
                      glareOpacity={0.12}
                      scaleOnHover={1.03}
                      onClick={() => handleCardClick(idx, trip)}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '16px',
                        border: isActive
                          ? '2px solid #0ea5e9'
                          : '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: isActive
                          ? '0 20px 42px rgba(0, 0, 0, 0.8), 0 0 24px rgba(14, 165, 233, 0.45)'
                          : '0 14px 32px rgba(0, 0, 0, 0.6)',
                        backgroundColor: '#0e1422',
                        cursor: 'pointer',
                        transform: isActive ? 'scale(1.02)' : 'scale(0.98)',
                        opacity: isActive ? 1 : 0.82,
                        transition: 'transform 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease, opacity 0.4s ease'
                      }}
                    >
                      {/* Destination Card Content */}
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          borderRadius: 'inherit',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          padding: '16px 14px'
                        }}
                      >
                        {/* 1. Destination Image Layer */}
                        <img
                          src={trip.cover_image || trip.image}
                          alt={trip.title || trip.name}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                            zIndex: 1
                          }}
                        />

                        {/* 2. Deep Cinematic Dark Gradient Overlay */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                              'linear-gradient(to top, rgba(7, 10, 16, 0.96) 0%, rgba(7, 10, 16, 0.68) 38%, rgba(7, 10, 16, 0.1) 68%, transparent 100%)',
                            zIndex: 2,
                            pointerEvents: 'none'
                          }}
                        />

                        {/* 3. Card Information Overlay (Category -> MaskedHeading -> Location) */}
                        <div
                          style={{
                            position: 'relative',
                            zIndex: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '6px'
                          }}
                        >
                          {/* Category Badge */}
                          <div
                            style={{
                              backgroundColor: '#0ea5e9',
                              color: '#ffffff',
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              letterSpacing: '0.07em',
                              textTransform: 'uppercase',
                              padding: '2.5px 7px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
                            }}
                          >
                            {trip.category || 'SLOW TRAVEL'}
                          </div>

                          {/* Destination Title with React Bits MaskedHeading */}
                          <div style={{ width: '100%' }}>
                            <MaskedHeading
                              text={trip.title || trip.name}
                              src={trip.cover_image || trip.image}
                              mediaType="image"
                              reveal="rise"
                              trigger="view"
                              align="left"
                              weight={800}
                              style={{
                                fontSize: '1.08rem',
                                lineHeight: 1.15
                              }}
                            />
                          </div>

                          {/* Location Pin & Destination */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.725rem',
                              color: 'rgba(255, 255, 255, 0.92)',
                              fontWeight: 500,
                              marginTop: '2px'
                            }}
                          >
                            <MapPin
                              size={12}
                              style={{ color: '#38bdf8', flexShrink: 0 }}
                            />
                            <span style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)' }}>
                              {trip.destination}
                            </span>
                          </div>
                        </div>

                      </div>
                    </DepthCard>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. PINNED BOTTOM CONTROLS & SLIDE BAR (FIXED ON RIGHT ONLY) */}
        <div
          className="home-bottom-controls home-stagger-controls"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '48px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            zIndex: 50,
            pointerEvents: 'auto'
          }}
        >
          {/* Previous / Next Arrow Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrevSlide}
              aria-label="Previous destination card"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <ChevronLeft size={15} />
            </button>

            <button
              type="button"
              onClick={handleNextSlide}
              aria-label="Next destination card"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Horizontal Progress Indicator Bar */}
          <div
            style={{
              width: '120px',
              height: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              borderRadius: '9999px',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(currentNormalizedIndex / Math.max(1, totalDestinations - 1)) * 60}%`,
                width: '40%',
                backgroundColor: '#0ea5e9',
                borderRadius: '9999px',
                transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
          </div>

          {/* Current Slide Number Counter (e.g., 01 / 04) */}
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.9rem',
              letterSpacing: '0.04em',
              userSelect: 'none'
            }}
          >
            <strong style={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>
              {(currentNormalizedIndex + 1).toString().padStart(2, '0')}
            </strong>
            <span style={{ color: 'rgba(255, 255, 255, 0.45)', marginLeft: '4px' }}>
              / {totalDestinations.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #0ea5e9',
            borderRadius: '12px',
            padding: '12px 18px',
            color: '#fff',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <CheckCircle2 size={16} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '0.85rem' }}>{toastMsg}</span>
        </div>
      )}

      {/* Shared Itinerary Modal for Trip View */}
      {selectedItineraryTrip && (
        <ViewItineraryModal
          isOpen={Boolean(selectedItineraryTrip)}
          onClose={() => setSelectedItineraryTrip(null)}
          trip={selectedItineraryTrip}
          isInWishlist={savedIds.includes(selectedItineraryTrip.id)}
          onToggleWishlist={(trip) => handleToggleWishlist({ stopPropagation: () => {} }, trip)}
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
    </div>
  );
};

export default Home;
