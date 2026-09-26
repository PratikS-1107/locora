import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Send,
  MapPin,
  Clock,
  Compass,
  ArrowRight,
  ExternalLink,
  Plus,
  Heart,
  Trash2,
  Check,
  RotateCcw,
  Coins
} from 'lucide-react';
import {
  sendConversationalDiscoveryMessage,
  getCurrentLocation,
  resolveLocationName,
  toggleSaveWishlistItem,
  getSavedWishlistIds,
  addRecommendationToItinerary,
  getUserTrips
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import RecommendationCard from './RecommendationCard';

const STARTER_PROMPTS = [
  "I have 2 hours left and ₹800 near Colaba. Where should I go?",
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

const ConversationalDiscoveryModal = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
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
  const [activeTrip, setActiveTrip] = useState(null);
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState('Current Location');
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

  // Background Scroll Locking: when the chatbot is open, background page must not scroll
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Scroll to bottom when messages update or panel opens
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Load user wishlist IDs & active trip context
  useEffect(() => {
    const loadUserData = async () => {
      if (user?.id) {
        try {
          const [wishRes, tripsRes] = await Promise.all([
            getSavedWishlistIds(user.id),
            getUserTrips(user.id)
          ]);
          if (wishRes?.data) setWishlistIds(wishRes.data);
          const today = new Date().toISOString().split('T')[0];
          const active = (tripsRes?.data || []).find(
            t => !t.is_wishlist && t.start_date && t.end_date && today >= t.start_date && today <= t.end_date
          );
          if (active) {
            setActiveTrip(active);
            if (active.destination) setLocationName(active.destination);
          }
        } catch (_) {}
      }
    };
    loadUserData();
  }, [user?.id]);

  // Location detection on open if not already set
  useEffect(() => {
    if (isOpen && !coords && !activeTrip) {
      handleDetectGps();
    }
  }, [isOpen]);

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
        text: response.reply || 'Here are places fitting your request.',
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
          text: "I'm having trouble finding recommendations right now. Please try asking again in a moment.",
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
    const recId = rec.placeId || rec.id;
    if (activeTrip?.id) {
      try {
        await addRecommendationToItinerary(rec, activeTrip.id);
        setAddedRecIds(prev => [...prev, recId]);
        showToast(`Added "${rec.name}" to your active trip.`);
      } catch (err) {
        showToast('Unable to add activity right now.');
      }
    } else {
      setAddedRecIds(prev => [...prev, recId]);
      showToast(`Added "${rec.name}" to itinerary.`);
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

  return (
    <>
      {/* Floating Bottom-Right Messaging Button */}
      {!isOpen && (
        <button
          className="conv-floating-btn"
          onClick={() => setIsOpen(true)}
          title="Conversational Discovery"
          aria-label="Open Conversational Discovery"
        >
          <MessageCircle size={24} strokeWidth={2.2} />
        </button>
      )}

      {/* Subtle Backdrop */}
      {isOpen && (
        <div
          className="conv-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Compact Conversational Discovery Panel */}
      {isOpen && (
        <div
          className="conv-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="conversational-discovery-title"
        >
          {/* In-panel Action Notification Toast */}
          {toastMsg && (
            <div
              style={{
                position: 'absolute',
                top: '68px',
                left: '16px',
                right: '16px',
                zIndex: 100,
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid var(--accent-emerald)',
                borderRadius: '8px',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                boxShadow: '0 8px 20px rgba(0,0,0,0.5)'
              }}
            >
              <Check size={14} style={{ color: 'var(--accent-emerald)' }} />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}
          >
            <div>
              <h3
                id="conversational-discovery-title"
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em'
                }}
              >
                Conversational Discovery
              </h3>
              <p
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  margin: '2px 0 0 0'
                }}
              >
                Find places that fit your time and budget.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                  alignItems: 'center'
                }}
                title="Clear Chat & Context"
                aria-label="Clear Chat and Reset Context"
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <Trash2 size={16} />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s ease'
                }}
                title="Close"
                aria-label="Close"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Active Context Memory Chips (When State is retained) */}
          {hasActiveContext && (
            <div
              style={{
                padding: '8px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap',
                flexShrink: 0
              }}
            >
              <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Active context:
              </span>
              {conversationState.destination && (
                <span style={{ fontSize: '0.675rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <MapPin size={10} /> {conversationState.destination}
                </span>
              )}
              {conversationState.availableMinutes && (
                <span style={{ fontSize: '0.675rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Clock size={10} /> {Math.floor(conversationState.availableMinutes / 60)}h {conversationState.availableMinutes % 60 ? `${conversationState.availableMinutes % 60}m` : ''}
                </span>
              )}
              {conversationState.budget !== null && (
                <span style={{ fontSize: '0.675rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  ₹{conversationState.budget}
                </span>
              )}
              {conversationState.category && (
                <span style={{ fontSize: '0.675rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Compass size={10} /> {conversationState.category}
                </span>
              )}
            </div>
          )}

          {/* Chat History (Internal Scrolling) */}
          <div className="conv-messages-scroll">
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
                  {/* Sender & Timestamp */}
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      marginBottom: '4px'
                    }}
                  >
                    {isUser ? 'You' : 'Locora Assistant'} • {msg.timestamp}
                  </div>

                  {/* Message Bubble */}
                  <div
                    style={{
                      maxWidth: isUser ? '85%' : '92%',
                      padding: '12px 15px',
                      borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      backgroundColor: isUser
                        ? 'var(--primary)'
                        : msg.isRefusal
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'var(--bg-surface-elevated)',
                      color: isUser ? '#ffffff' : msg.isRefusal ? '#fca5a5' : 'var(--text-primary)',
                      border: msg.isRefusal
                        ? '1px solid rgba(239, 68, 68, 0.25)'
                        : isUser
                        ? 'none'
                        : '1px solid var(--border-subtle)',
                      fontSize: '0.86rem',
                      lineHeight: 1.55,
                      fontWeight: isUser ? 500 : 400,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Real Places Recommendation Cards */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div
                      style={{
                        marginTop: '12px',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      {msg.recommendations.map((rec) => (
                        <RecommendationCard
                          key={rec.placeId || rec.id}
                          recommendation={rec}
                          onAddToItinerary={handleAddRecToItinerary}
                          onToggleWishlist={handleToggleWishlist}
                          isAdded={addedRecIds.includes(rec.placeId || rec.id)}
                          isWishlisted={wishlistIds.includes(rec.placeId || rec.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Subtle Loading Bubble */}
            {isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Locora Assistant
                </div>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '14px 14px 14px 2px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.825rem'
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      borderTopColor: 'var(--primary)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }}
                  />
                  <span>Finding places...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Starter Suggestions */}
          {messages.length <= 2 && !isLoading && !hasActiveContext && (
            <div
              style={{
                padding: '0 16px 10px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                flexShrink: 0
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
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
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

          {/* Bottom Input Field & Send Button */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
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
              placeholder="Ask for places (time, budget, area)..."
              disabled={isLoading}
              style={{
                flex: 1,
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none'
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
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: !inputMessage.trim() || isLoading ? 0.4 : 1,
                cursor: !inputMessage.trim() || isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              <span>Send</span>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ConversationalDiscoveryModal;
