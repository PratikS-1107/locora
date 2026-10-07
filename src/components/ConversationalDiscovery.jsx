import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Send,
  MapPin,
  Clock,
  Coins,
  Compass,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Plus,
  Heart,
  User,
  Trash2,
  Check,
  MessageCircle,
  Lock
} from 'lucide-react';
import {
  sendConversationalDiscoveryMessage,
  sanitizeDestination,
  getCurrentLocation,
  resolveLocationName,
  toggleSaveWishlistItem,
  getSavedWishlistIds,
  addRecommendationToItinerary
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import RecommendationCard from './RecommendationCard';

const STARTER_PROMPTS = [
  "I have 2 hours left, ₹800, and I'm near Colaba. Where should I go?",
  "Recommend cultural spots in Kyoto for 3 hours with ₹1500 budget.",
  "What are some authentic local food places near Panaji, Goa?",
  "Find scenic nature spots within 1 hour visit time."
];

const INITIAL_CONVERSATION_STATE = {
  location: {},
  destination: null,
  availableMinutes: null,
  budget: null,
  currency: 'INR',
  category: null,
  preferences: []
};

const ConversationalDiscovery = ({
  initialLocation = null,
  activeTrip = null,
  onAddToTrip = null
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! Tell me what you're looking for, your available time, budget, or destination, and I'll find places that fit your schedule.",
      recommendations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationState, setConversationState] = useState(INITIAL_CONVERSATION_STATE);
  const [coords, setCoords] = useState(initialLocation?.coords || (initialLocation?.latitude ? initialLocation : null));
  const [locationName, setLocationName] = useState(initialLocation?.city || activeTrip?.destination || 'Current Location');
  const [isLocating, setIsLocating] = useState(false);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [addedRecIds, setAddedRecIds] = useState([]);
  const [toastMsg, setToastMsg] = useState('');

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load wishlist IDs
  useEffect(() => {
    const loadWishlist = async () => {
      if (user?.id) {
        try {
          const res = await getSavedWishlistIds(user.id);
          setWishlistIds(res.data || []);
        } catch (_) {}
      } else {
        setWishlistIds([]);
      }
    };
    loadWishlist();
  }, [user?.id]);

  // Initial GPS detection if needed
  useEffect(() => {
    if (!coords && !initialLocation?.city && !activeTrip?.destination) {
      handleDetectGps();
    }
  }, []);

  const handleDetectGps = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentLocation();
      setCoords({ latitude: pos.latitude, longitude: pos.longitude });
      const nameData = await resolveLocationName(pos.latitude, pos.longitude);
      const label = nameData.city || nameData.formatted || `${pos.latitude.toFixed(2)}°, ${pos.longitude.toFixed(2)}°`;
      setLocationName(label);
    } catch (_) {
      // Keep default location
    } finally {
      setIsLocating(false);
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const response = await sendConversationalDiscoveryMessage({
        message: text,
        history: historyPayload,
        location: coords ? {
          latitude: coords.latitude,
          longitude: coords.longitude,
          city: locationName
        } : { city: locationName },
        activeTrip: activeTrip ? {
          id: activeTrip.id,
          destination: activeTrip.destination || activeTrip.name,
          budget: activeTrip.budget
        } : null,
        conversationState
      });

      if (response.conversationState) {
        setConversationState(response.conversationState);
      }

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.reply || 'Here are some places fitting your request.',
        recommendations: response.recommendations || [],
        isRefusal: response.isRefusal || false,
        extractedIntent: response.extractedIntent || null,
        conversationState: response.conversationState || conversationState,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          sender: 'assistant',
          text: "I'm having trouble retrieving recommendations right now. Please try again in a moment.",
          recommendations: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearChat = () => {
    setConversationState(INITIAL_CONVERSATION_STATE);
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Chat cleared. What travel destinations or activities would you like to explore?",
        recommendations: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleAddRecToItinerary = async (rec) => {
    if (onAddToTrip) {
      onAddToTrip(rec);
      setAddedRecIds(prev => [...prev, rec.placeId || rec.id]);
      showToast(`Added "${rec.name}" to trip schedule.`);
      return;
    }

    if (!user?.id) {
      showToast('Please log in to add places to your itinerary.');
      return;
    }

    if (activeTrip?.id) {
      try {
        await addRecommendationToItinerary(rec, activeTrip.id);
        setAddedRecIds(prev => [...prev, rec.placeId || rec.id]);
        showToast(`Added "${rec.name}" to your active trip.`);
      } catch (err) {
        showToast('Unable to add activity right now.');
      }
    } else {
      showToast('Select an active trip in My Trips to add places to your itinerary.');
    }
  };

  const handleToggleWishlist = async (rec) => {
    if (!user?.id) {
      showToast('Please log in to save items to your wishlist.');
      return;
    }
    const recId = rec.placeId || rec.id;
    try {
      const res = await toggleSaveWishlistItem(rec, user.id);
      if (res.error) {
        showToast('Unable to update wishlist.');
      } else {
        const isSaved = res.action === 'added';
        setWishlistIds(prev => isSaved ? [...prev, recId] : prev.filter(id => id !== recId));
        showToast(isSaved ? `Saved "${rec.name}" to Wishlist!` : `Removed "${rec.name}" from Wishlist`);
      }
    } catch (_) {
      showToast('Could not update wishlist.');
    }
  };

  const hasActiveContext = Boolean(
    conversationState.destination ||
    conversationState.category ||
    conversationState.availableMinutes ||
    conversationState.budget !== null
  );

  if (!user) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        minHeight: '380px'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          border: '1px solid rgba(56, 189, 248, 0.25)'
        }}>
          <Lock size={26} style={{ color: '#38bdf8' }} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
          Sign in to use Locora Assistant
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 24px 0', maxWidth: '340px', lineHeight: 1.5 }}>
          Locora Assistant connects with your active journey, preferences, and schedule to recommend authentic places.
        </p>
        <button
          onClick={() => navigate('/login', { state: { from: location.pathname } })}
          className="btn btn-primary"
          style={{ padding: '10px 24px', fontSize: '0.875rem', fontWeight: 600, borderRadius: '8px' }}
        >
          Sign In to Continue
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '620px',
        maxHeight: '850px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 100,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--accent-emerald)',
          borderRadius: '8px',
          padding: '10px 18px',
          boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#ffffff',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <Check size={16} style={{ color: 'var(--accent-emerald)' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'var(--primary-subtle)',
              border: '1px solid var(--primary-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}
          >
            <MessageCircle size={20} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Locora Assistant  
            </h3>
          </div>
        </div>

        {/* Right context pill & Clear button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)'
            }}
          >
            <MapPin size={13} style={{ color: 'var(--primary)' }} />
            <span>{isLocating ? 'Locating...' : locationName}</span>
          </div>

          <button
            onClick={handleClearChat}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s ease'
            }}
            title="Clear Chat & Context"
            aria-label="Clear Chat and Reset Context"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Active Context Memory Chips */}
      {hasActiveContext && (
        <div
          style={{
            padding: '8px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Active context:
          </span>
          {sanitizeDestination(conversationState.destination) && (
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <MapPin size={11} /> {sanitizeDestination(conversationState.destination)}
            </span>
          )}
          {conversationState.availableMinutes && (
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={11} /> {Math.floor(conversationState.availableMinutes / 60)}h {conversationState.availableMinutes % 60 ? `${conversationState.availableMinutes % 60}m` : ''}
            </span>
          )}
          {conversationState.budget !== null && (
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              ₹{conversationState.budget}
            </span>
          )}
          {conversationState.category && (
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Compass size={11} /> {conversationState.category}
            </span>
          )}
        </div>
      )}

      {/* Message Stream Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              {/* Message Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '6px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}
              >
                <span>{isUser ? 'You' : 'Locora Assistant'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                style={{
                  maxWidth: isUser ? '80%' : '88%',
                  padding: '14px 18px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: isUser
                    ? 'var(--primary)'
                    : msg.isRefusal
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'var(--bg-surface-elevated)',
                  border: `1px solid ${
                    isUser
                      ? 'transparent'
                      : msg.isRefusal
                      ? 'rgba(239, 68, 68, 0.25)'
                      : 'var(--border-subtle)'
                  }`,
                  color: isUser ? '#ffffff' : msg.isRefusal ? '#fca5a5' : 'var(--text-primary)',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  boxShadow: 'var(--shadow-sm)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {msg.text}
              </div>

              {/* Verified Place Recommendation Cards Grid */}
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div
                  style={{
                    marginTop: '16px',
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '16px'
                  }}
                >
                  {msg.recommendations.map((rec) => (
                    <RecommendationCard
                      key={rec.placeId || rec.id}
                      recommendation={rec}
                      onAddToItinerary={handleAddRecToItinerary}
                      onToggleWishlist={handleToggleWishlist}
                      isAdded={addedRecIds.includes(rec.placeId || rec.id)}
                      isInWishlist={wishlistIds.includes(rec.placeId || rec.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Locora Assistant
            </div>
            <div
              style={{
                padding: '12px 18px',
                borderRadius: '16px 16px 16px 4px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem'
              }}
            >
              <div
                style={{
                  width: '15px',
                  height: '15px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderTopColor: 'var(--primary)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
              <span>Finding verified places...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Starter Suggestions Chips */}
      {messages.length <= 2 && !isLoading && !hasActiveContext && (
        <div
          style={{
            padding: '0 24px 14px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          {STARTER_PROMPTS.map((promptText, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(promptText)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {promptText}
            </button>
          ))}
        </div>
      )}

      {/* Input Form Bar */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Ask for travel recommendations (e.g., '2 hours near Colaba with ₹800 budget')..."
          disabled={isLoading}
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 18px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color 0.18s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isLoading}
          className="btn btn-primary"
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            opacity: !inputMessage.trim() || isLoading ? 0.5 : 1,
            cursor: !inputMessage.trim() || isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          <span>Send</span>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

export default ConversationalDiscovery;
