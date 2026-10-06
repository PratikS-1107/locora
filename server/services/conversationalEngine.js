import { generateNvidiaResponse } from './nvidia.js';
import { formatHonestPrice } from './recommendationEngine.js';

/**
 * Locora Conversational Discovery Engine
 * 
 * Flow:
 *   User message
 *       ↓
 *   Deterministic Travel Parser & Multi-Turn State Merger
 *       ↓
 *   Resolve Location (destination geocoding or client GPS)
 *       ↓
 *   Google Places Real Candidates
 *       ↓
 *   Recommendation Engine Reasoning (Gemini or Deterministic)
 *       ↓
 *   Natural Conversational Response (NVIDIA optional formatter / deterministic fallback)
 */

export const DEFAULT_CONVERSATION_STATE = {
  location: {},
  destination: null,
  availableMinutes: null,
  budget: null,
  currency: 'INR',
  category: null,
  preferences: []
};

/**
 * Merge and sanitize structured state across turns.
 * Retains previously established constraints (destination, time, budget, category).
 */
const NON_DESTINATION_WORDS = new Set([
  'hi', 'hello', 'hey', 'hiya', 'howdy', 'yo', 'sup',
  'ok', 'okay', 'yes', 'no', 'yeah', 'nope', 'sure', 'fine', 'good',
  'thanks', 'thank you', 'thx', 'nice', 'cool', 'super', 'awesome', 'great', 'perfect',
  'food', 'culture', 'nature', 'gems', 'activities', 'places', 'spots',
  'help', 'locora', 'assistant'
]);

export const sanitizeAndMergeState = (prevState = {}, updates = {}) => {
  const sanitizeDest = (dest) => {
    if (!dest || typeof dest !== 'string') return null;
    const clean = dest.trim().replace(/[,\.\?!]+$/g, '').trim();
    if (clean.length <= 2 && clean.toLowerCase() !== 'ur') return null;
    if (NON_DESTINATION_WORDS.has(clean.toLowerCase())) return null;
    return clean;
  };

  const cleanUpdateDest = sanitizeDest(updates.destination);
  const cleanPrevDest = sanitizeDest(prevState.destination);

  const merged = {
    location: {
      ...(prevState.location || {}),
      ...(updates.location || {})
    },
    destination: cleanUpdateDest || cleanPrevDest || null,
    availableMinutes: updates.availableMinutes !== undefined && updates.availableMinutes !== null && Number.isFinite(Number(updates.availableMinutes))
      ? Number(updates.availableMinutes)
      : (prevState.availableMinutes !== undefined && prevState.availableMinutes !== null && Number.isFinite(Number(prevState.availableMinutes)) ? Number(prevState.availableMinutes) : null),
    budget: updates.budget !== undefined && updates.budget !== null && Number.isFinite(Number(updates.budget))
      ? Number(updates.budget)
      : (prevState.budget !== undefined && prevState.budget !== null && Number.isFinite(Number(prevState.budget)) ? Number(prevState.budget) : null),
    currency: updates.currency || prevState.currency || 'INR',
    category: updates.category !== undefined && updates.category !== null && updates.category !== ''
      ? updates.category.toLowerCase().trim()
      : (prevState.category || null),
    preferences: Array.isArray(updates.preferences) && updates.preferences.length > 0
      ? Array.from(new Set([...(prevState.preferences || []), ...updates.preferences]))
      : (Array.isArray(prevState.preferences) ? prevState.preferences : [])
  };

  return merged;
};

const cleanCityCandidate = (str) => {
  if (!str || typeof str !== 'string') return null;
  let s = str.trim()
    .replace(/^[\s,.\-–—]+|[\s,.\-–—?!]+$/g, '')
    .replace(/^(?:the\s+city\s+of|the\s+area\s+of|the\s+town\s+of|the|city\s+of|area\s+of)\s+/i, '')
    .replace(/\s+(?:city|area|district|region)$/i, '')
    .replace(/^(?:visit|see|explore|places\s+in|places\s+near|spots\s+in|around|near|in|to|at|destination)\s+/i, '')
    .replace(/[,\.\?!].*$/g, '')
    .replace(/\s+(?:what|where|which|how|recommend|suggestions?|places|spots|activities|sights|things\s+to\s+do|please|for\s+me|today|now).*$/i, '')
    .trim();

  if (s.length <= 2 && s.toLowerCase() !== 'ur') return null;
  if (NON_DESTINATION_WORDS.has(s.toLowerCase())) return null;

  // Filter out question words, suggestions, conversational phrases from candidate cities
  if (/^(?:what|where|which|how|who|why|when|can|could|should|would|will|is|are|tell|show|recommend|suggest|i\s*want|i\s*need|help)\b/i.test(str.trim())) {
    return null;
  }

  const genericPhrases = [
    'my area', 'here', 'me', 'the city', 'the area', 'town', 'places',
    'spots', 'somewhere', 'anywhere', 'anything', 'something',
    'recommend', 'recommend me', 'explore', 'discover', 'visit', 'activities',
    'can you do', 'what can you do', 'tell me about locora', 'who are you', 'how does this work',
    'thank you', 'thanks', 'hello', 'help', 'nice', 'cool', 'super', 'awesome'
  ];
  if (genericPhrases.includes(s.toLowerCase())) return null;

  // Title-case the city name
  return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

/**
 * Deterministic travel parser & state merger.
 * NVIDIA is NOT used here so that valid travel requests are never blocked or refused.
 */
export const extractTravelIntentWithNvidia = async ({
  message,
  history = [],
  currentState = {},
  clientContext = {}
}) => {
  const trimmed = (message || '').trim();
  if (!trimmed) {
    return {
      isTravel: false,
      refusalMessage: 'I can only help you discover places and activities.',
      updatedState: sanitizeAndMergeState(currentState, {})
    };
  }

  const lower = trimmed.toLowerCase();

  // Strict check ONLY for blatant non-travel queries (math, code, programming, politics, recipes)
  const nonTravelKeywords = [
    /^what is python/i,
    /^who is the president/i,
    /^tell me a joke/i,
    /^write a code/i,
    /^write a python/i,
    /^write a script/i,
    /^explain quantum/i,
    /^solve this math/i,
    /^2\s*\+\s*2/i,
    /^who won the/i,
    /^give me a poem/i,
    /^translate this/i,
    /^bitcoin/i,
    /^cryptocurrency/i
  ];

  for (const pat of nonTravelKeywords) {
    if (pat.test(lower)) {
      return {
        isTravel: false,
        refusalMessage: 'I can only help you discover places and activities.',
        updatedState: sanitizeAndMergeState(currentState, {})
      };
    }
  }

  // Inspect previous assistant message in history to understand question-answer context
  const lastAssistantMsg = [...(history || [])].reverse().find(h => h.sender === 'assistant')?.text || '';
  const isAskingLocation = /(?:which\s+city|what\s+city|which\s+area|what\s+destination|which\s+destination|where\s+are\s+you|tell\s+me\s+a\s+city)/i.test(lastAssistantMsg);
  const isAskingBudget = /(?:budget|cost|price|how much|money|spend)/i.test(lastAssistantMsg);
  const isAskingTime = /(?:time|hours?|mins?|minutes?|duration|how long|window|schedule)/i.test(lastAssistantMsg);

  // 1. Extract available time
  let extractedMinutes = null;
  const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|hrs|hours)/i);
  if (hourMatch) {
    extractedMinutes = Math.round(parseFloat(hourMatch[1]) * 60);
  } else {
    const minMatch = lower.match(/(\d+)\s*(?:minute|min|mins|minutes)/i);
    if (minMatch) {
      extractedMinutes = parseInt(minMatch[1], 10);
    } else if (isAskingTime) {
      const numMatch = lower.match(/^(\d+(?:\.\d+)?)$/);
      if (numMatch) {
        const val = parseFloat(numMatch[1]);
        extractedMinutes = val <= 12 ? Math.round(val * 60) : Math.round(val);
      }
    }
  }

  // 2. Extract budget (handles "₹1000", "₹800", "800 rs", "budget 500", "under 500", "spend 500")
  let extractedBudget = null;
  const budgetMatch = lower.match(/(?:₹|rs\.?|inr|\$|usd|€|eur)\s*(\d+(?:,\d+)?)/i) ||
                      lower.match(/(\d+(?:,\d+)?)\s*(?:₹|rs\.?|inr|rupees|bucks|dollars)/i) ||
                      lower.match(/(?:under|within|max|budget\s*(?:is|of)?|below|spend|spending)\s*(?:₹|rs\.?|inr|\$)?\s*(\d+(?:,\d+)?)(?!\s*(?:hour|hr|minute|min))/i);
  if (budgetMatch) {
    extractedBudget = Number(budgetMatch[1].replace(/,/g, ''));
  } else if (isAskingBudget) {
    const numMatch = lower.match(/^(\d+(?:,\d+)?)$/);
    if (numMatch) {
      extractedBudget = Number(numMatch[1].replace(/,/g, ''));
    }
  }

  // 3. Extract category
  let extractedCategory = null;
  if (lower.includes('food') || lower.includes('eat') || lower.includes('eating') || lower.includes('restaurant') || lower.includes('cafe') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('breakfast') || lower.includes('bakery') || lower.includes('dining')) {
    extractedCategory = 'food';
  } else if (lower.includes('culture') || lower.includes('cultural') || lower.includes('temple') || lower.includes('museum') || lower.includes('heritage') || lower.includes('monument') || lower.includes('fort') || lower.includes('history') || lower.includes('historic') || lower.includes('art')) {
    extractedCategory = 'cultural';
  } else if (lower.includes('nature') || lower.includes('park') || lower.includes('lake') || lower.includes('beach') || lower.includes('waterfall') || lower.includes('garden') || lower.includes('viewpoint') || lower.includes('scenic') || lower.includes('outdoor')) {
    extractedCategory = 'nature';
  } else if (lower.includes('hidden') || lower.includes('secret') || lower.includes('offbeat') || lower.includes('gem') || lower.includes('gems')) {
    extractedCategory = 'hidden gems';
  } else if (lower.includes('workshop') || lower.includes('workshops') || lower.includes('pottery') || lower.includes('class') || lower.includes('craft') || lower.includes('learn')) {
    extractedCategory = 'workshops';
  } else if (lower.includes('activity') || lower.includes('activities') || lower.includes('adventure') || lower.includes('sport') || lower.includes('trek') || lower.includes('fun')) {
    extractedCategory = 'activities';
  }

  // Check for budget/cheap preferences
  const preferences = [];
  if (lower.includes('cheap') || lower.includes('budget') || lower.includes('affordable') || lower.includes('free') || lower.includes('low cost')) {
    preferences.push('budget-friendly');
    if (extractedBudget === null && currentState.budget === null) {
      extractedBudget = 500;
    }
  }

  const isGreeting = /^(hi|hello|hey|hiya|howdy|good\s+(morning|afternoon|evening|day)|greetings|sup|yo)[!.,\s]*$/i.test(trimmed);
  const isAck = /^(thanks|thank\s+you|thx|nice|okay|ok|cool|awesome|great|super|perfect|that's\s+helpful|thats\s+helpful|understood|got\s+it|sounds\s+good|wonderful)[!.,\s]*$/i.test(trimmed);
  const isAbout = /^(what\s+can\s+you\s+do|tell\s+me\s+about\s+locora|how\s+does\s+this\s+work|who\s+are\s+you|help(\s+me)?|what\s+is\s+locora)[?!.,\s]*$/i.test(trimmed);
  const isExploreQuestion = /^(?:what\s+should\s+i\s+(?:explore|do|see|visit)|what\s+to\s+(?:explore|do|see|visit)|where\s+should\s+i\s+go)[?!.,\s]*$/i.test(trimmed);

  // 4. Extract destination from natural phrasing (skip for pure greetings/about/ack/explore questions)
  let extractedDest = null;
  if (!isGreeting && !isAck && !isAbout && !isExploreQuestion) {
    const destPatterns = [
      /\b(?:i\s*am\s*new\s*to|new\s*to)\b\s+([a-zA-Z\s]{2,25}?)(?:[,\.\?!]|\s+(?:what|where|which|how|recommend|and|with|for|having|under)|$)/i,
      /\b(?:i\s*am\s*in|i'm\s*in|currently\s*in|staying\s*in|living\s*in)\b\s+([a-zA-Z\s]{2,25}?)(?:[,\.\?!]|\s+(?:what|where|which|how|recommend|and|with|for|having|under)|$)/i,
      /\b(?:in|at|around|near|visiting|trip\s*to|travel\s*to|going\s*to)\b\s+([a-zA-Z\s]{2,25}?)(?:[,\.\?!]|\s+(?:what|where|which|how|recommend|and|with|for|having|under|places|spots)|$)/i,
      /\b(?:explore|discover|visit)\b\s+([a-zA-Z\s]{2,25}?)(?:[,\.\?!]|\s+(?:what|where|which|how|recommend|and|with|for|having|under|places|spots)|$)/i,
      /\b(?:what\s*can\s*i\s*(?:do|experience|see)\s*in|what\s*to\s*(?:do|experience|see)\s*in|places\s*in|places\s*around|spots\s*in|spots\s*around)\b\s+([a-zA-Z\s]{2,25}?)(?:[,\.\?!]|\s+(?:what|where|which|how|recommend|and|with|for)|$)/i,
      /\b(?:show\s*me\s*places\s*(?:in|around|near))\b\s+([a-zA-Z\s]{2,25}?)(?:[,\.\?!]|\s+(?:what|where|which|how|recommend|and|with|for)|$)/i
    ];

  for (const pat of destPatterns) {
    const match = lower.match(pat);
    if (match && match[1]) {
      const candidate = cleanCityCandidate(match[1]);
      if (candidate) {
        extractedDest = candidate;
        break;
      }
    }
  }

  // If assistant asked for city, and user gave a short answer (1-4 words) that is not purely budget/time:
  if (!extractedDest && isAskingLocation) {
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount <= 4 && !extractedBudget && !extractedMinutes && !extractedCategory) {
      const candidate = cleanCityCandidate(trimmed);
      if (candidate) {
        extractedDest = candidate;
      }
    }
  }

    // Standalone short location response (e.g. user typed "Thane", "Kyoto", "Bandra", "Goa")
    if (!extractedDest && !extractedBudget && !extractedMinutes && !extractedCategory) {
      const wordCount = trimmed.split(/\s+/).length;
      if (wordCount <= 3 && /^[a-zA-Z\s,.'-]+$/.test(trimmed)) {
        const candidate = cleanCityCandidate(trimmed);
        if (candidate && !['hi', 'hello', 'hey', 'help', 'yes', 'no', 'ok', 'okay', 'thanks', 'thank you', 'recommend', 'recommend me', 'explore', 'discover', 'places'].includes(trimmed.toLowerCase())) {
          extractedDest = candidate;
        }
      }
    }
  }

  // 5. Merge with existing state (Preserves destination, time, budget, category)
  const mergedState = sanitizeAndMergeState(currentState, {
    destination: extractedDest,
    availableMinutes: extractedMinutes,
    budget: extractedBudget,
    category: extractedCategory,
    preferences,
    location: clientContext.location || {}
  });

  // Check if we have any location context:
  // 1) Destination name in merged state
  // 2) GPS coordinates in state or clientContext
  const hasDestination = Boolean(mergedState.destination);
  const hasGps = Boolean(
    (mergedState.location?.latitude && mergedState.location?.longitude) ||
    (clientContext.location?.latitude && clientContext.location?.longitude)
  );
  const hasLocation = hasDestination || hasGps;

  // Conversational Intent Classification:
  // Distinguish pure conversation (greetings, gratitude, about, context sharing)
  // from genuine recommendation triggers.

  // 1. Pure Greetings ("Hi", "Hello", "Hey", "Good morning", etc.)
  const greetingPattern = /^(hi|hello|hey|hiya|howdy|good\s+(morning|afternoon|evening|day)|greetings|sup|yo)[!.,\s]*$/i;
  if (greetingPattern.test(trimmed)) {
    return {
      isTravel: true,
      updatedState: mergedState,
      action: 'conversational_reply',
      reply: "Hi! What would you like to explore today? Tell me a city, or what kind of experiences you're looking for.",
      destination: mergedState.destination,
      category: mergedState.category || 'local',
      availableMinutes: mergedState.availableMinutes,
      budget: mergedState.budget,
      currency: mergedState.currency || 'INR',
      searchKeywords: trimmed,
      userSummary: trimmed
    };
  }

  // 2. Gratitude / Acknowledgment ("Thanks", "Nice", "Okay", "That's helpful", etc.)
  const ackPattern = /^(thanks|thank\s+you|thx|nice|okay|ok|cool|awesome|great|super|perfect|that's\s+helpful|thats\s+helpful|understood|got\s+it|sounds\s+good|wonderful)[!.,\s]*$/i;
  if (ackPattern.test(trimmed)) {
    return {
      isTravel: true,
      updatedState: mergedState,
      action: 'conversational_reply',
      reply: "You're welcome! Would you like more details on any of these spots, or another category or destination to explore?",
      destination: mergedState.destination,
      category: mergedState.category || 'local',
      availableMinutes: mergedState.availableMinutes,
      budget: mergedState.budget,
      currency: mergedState.currency || 'INR',
      searchKeywords: trimmed,
      userSummary: trimmed
    };
  }

  // 3. About Locora / Capabilities ("What can you do?", "Tell me about Locora", etc.)
  const aboutPattern = /^(what\s+can\s+you\s+do|tell\s+me\s+about\s+locora|how\s+does\s+this\s+work|who\s+are\s+you|help(\s+me)?|what\s+is\s+locora)[?!.,\s]*$/i;
  if (aboutPattern.test(trimmed)) {
    return {
      isTravel: true,
      updatedState: mergedState,
      action: 'conversational_reply',
      reply: "I help you discover verified local, cultural, food, and nature experiences tailored to your available time and budget. Tell me where you are or what destination you'd like to explore!",
      destination: mergedState.destination,
      category: mergedState.category || 'local',
      availableMinutes: mergedState.availableMinutes,
      budget: mergedState.budget,
      currency: mergedState.currency || 'INR',
      searchKeywords: trimmed,
      userSummary: trimmed
    };
  }

  // 4. Context Sharing: "I'm new to <City>", "I am in <City>" without explicit recommendation request
  const contextSharingPattern = /^(?:i\s*am\s*new\s*to|i'm\s*new\s*to|new\s*to|just\s+arrived\s+in)\s+([a-zA-Z\s]{2,25})[.?!]?$/i;
  const contextSharingMatch = trimmed.match(contextSharingPattern);
  if (contextSharingMatch) {
    const city = cleanCityCandidate(contextSharingMatch[1]) || contextSharingMatch[1].trim();
    mergedState.destination = city;
    return {
      isTravel: true,
      updatedState: mergedState,
      action: 'conversational_reply',
      reply: `Welcome to ${city}! Are you looking for authentic local food, cultural heritage, nature spots, or something else to explore?`,
      destination: city,
      category: mergedState.category || 'local',
      availableMinutes: mergedState.availableMinutes,
      budget: mergedState.budget,
      currency: mergedState.currency || 'INR',
      searchKeywords: trimmed,
      userSummary: trimmed
    };
  }

  // 4.5 Conversational follow-up: "What should I explore?"
  if (isExploreQuestion) {
    const dest = mergedState.destination || clientContext.location?.city;
    const destStr = dest ? ` in ${dest}` : '';
    return {
      isTravel: true,
      updatedState: mergedState,
      action: 'conversational_reply',
      reply: `You could explore authentic local food, cultural heritage spots, scenic nature, or hidden gems${destStr}. Which of these sounds most interesting to you?`,
      destination: mergedState.destination,
      category: mergedState.category || 'local',
      availableMinutes: mergedState.availableMinutes,
      budget: mergedState.budget,
      currency: mergedState.currency || 'INR',
      searchKeywords: trimmed,
      userSummary: trimmed
    };
  }

  // 5. Genuine Recommendation Intent Detection
  // Trigger recommendations when:
  // - User asks for recommendations/places/spots/things to do
  // - User specifies time or budget constraints
  // - User specifies an explicit category (food, culture, nature, etc.)
  // - Assistant previously asked what kind of experiences user is looking for
  const hasRecommendationKeywords = /(?:recommend|suggestions?|where\s+should\s+i\s+go|what\s+(?:can|should)\s+i\s+(?:do|see|visit)|places\s+to\s+(?:visit|see|eat|go)|show\s+me\s+places|find\s+(?:places|spots|food|cafes|temples|restaurants)|things\s+to\s+do|must\s+visit|spots\s+(?:in|around|near)|places\s+(?:in|around|near))/i.test(lower);
  const hasExplicitConstraints = extractedMinutes !== null || extractedBudget !== null;
  const hasExplicitCategory = extractedCategory !== null;
  const wasAskedPreferences = history.some(h => h.sender === 'assistant' && /(?:what would you like to explore|what kind of experiences|looking for)/i.test(h.text));

  const isRecommendationIntent = hasRecommendationKeywords || hasExplicitConstraints || (hasExplicitCategory && (hasLocation || wasAskedPreferences));

  // If user just named a city after assistant asked for city, ask what they want to explore in that city
  if (!isRecommendationIntent && isAskingLocation && extractedDest) {
    return {
      isTravel: true,
      updatedState: mergedState,
      action: 'conversational_reply',
      reply: `Got it, ${extractedDest}! What kind of experiences are you in the mood for — authentic local food, cultural heritage, nature, or hidden gems?`,
      destination: extractedDest,
      category: mergedState.category || 'local',
      availableMinutes: mergedState.availableMinutes,
      budget: mergedState.budget,
      currency: mergedState.currency || 'INR',
      searchKeywords: trimmed,
      userSummary: trimmed
    };
  }

  // If user just typed general conversational text that is not a recommendation request:
  if (!isRecommendationIntent) {
    const targetDest = mergedState.destination || clientContext.location?.city;
    const destContextStr = targetDest ? ` in ${targetDest}` : '';
    return {
      isTravel: true,
      updatedState: mergedState,
      action: 'conversational_reply',
      reply: `I can recommend verified spots${destContextStr}! What kind of places are you looking for, and do you have a specific time or budget?`,
      destination: mergedState.destination,
      category: mergedState.category || 'local',
      availableMinutes: mergedState.availableMinutes,
      budget: mergedState.budget,
      currency: mergedState.currency || 'INR',
      searchKeywords: trimmed,
      userSummary: trimmed
    };
  }

  // Decide recommendation action:
  // If we have ANY location, proceed to recommend!
  // Only ask for location if there is literally NO location anywhere.
  let action = 'recommend';
  let followUpQuestion = null;

  if (!hasLocation) {
    action = 'ask_clarification';
    followUpQuestion = 'Which city or area would you like to explore?';
  }

  return {
    isTravel: true,
    updatedState: mergedState,
    action,
    followUpQuestion,
    destination: mergedState.destination,
    category: mergedState.category || 'local',
    availableMinutes: mergedState.availableMinutes,
    budget: mergedState.budget,
    currency: mergedState.currency || 'INR',
    searchKeywords: trimmed,
    userSummary: trimmed
  };
};

/**
 * Synthesize conversational answer.
 * Uses NVIDIA optionally for final phrasing if available; falls back to factual deterministic reply.
 */
export const formatConversationalReplyWithNvidia = async ({
  userMessage,
  extractedIntent,
  recommendations = [],
  history = []
}) => {
  const destName = extractedIntent.destination || 'your area';
  const categoryName = extractedIntent.category && extractedIntent.category !== 'local' ? extractedIntent.category : 'experiences';
  const timeDesc = extractedIntent.availableMinutes
    ? `about ${Math.floor(extractedIntent.availableMinutes / 60)}h ${extractedIntent.availableMinutes % 60 ? `${extractedIntent.availableMinutes % 60}m` : ''}`.trim()
    : 'your free window';
  const budgetDesc = extractedIntent.budget !== null ? `₹${extractedIntent.budget}` : null;

  if (recommendations.length === 0) {
    return `I couldn't find verified ${categoryName} places matching your criteria in ${destName}. Try expanding your search radius or adjusting your time or budget constraints.`;
  }

  // 1. Try NVIDIA for a brief, friendly conversational response
  try {
    const factualPlaceSummaries = recommendations.slice(0, 3).map((rec, i) => {
      return `${i + 1}. ${rec.name} (${rec.category}) - ${rec.priceDisplay} - ${rec.reason || 'Verified local place'}`;
    }).join('\n');

    const systemPrompt = `You are Locora's friendly travel assistant. In 2-3 warm, natural sentences, summarize the verified recommendations for the user who is in ${destName} with ${timeDesc}${budgetDesc ? ` and ${budgetDesc} budget` : ''}. Only reference the places listed below. Do not use tables or bullet lists.
Verified Places:
${factualPlaceSummaries}`;

    const reply = await generateNvidiaResponse([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], {
      temperature: 0.5,
      maxTokens: 180
    });

    if (reply && reply.trim().length > 15 && !reply.toLowerCase().includes('i can only help you')) {
      return reply.trim();
    }
  } catch (nvidiaErr) {
    // Expected fallback — proceed to deterministic format
  }

  // 2. High-quality natural deterministic response (Format requested by LOCORA specification)
  const top = recommendations[0];
  const count = recommendations.length;

  const summaryTokens = [];
  if (extractedIntent.availableMinutes) {
    const hrs = Math.floor(extractedIntent.availableMinutes / 60);
    const mins = extractedIntent.availableMinutes % 60;
    if (hrs > 0 && mins > 0) summaryTokens.push(`${hrs}h ${mins}m`);
    else if (hrs > 0) summaryTokens.push(`${hrs} hour${hrs > 1 ? 's' : ''}`);
    else if (mins > 0) summaryTokens.push(`${mins} minutes`);
  }
  if (extractedIntent.budget !== null && extractedIntent.budget !== undefined) {
    summaryTokens.push(`₹${extractedIntent.budget}`);
  }
  if (extractedIntent.category && extractedIntent.category !== 'local') {
    summaryTokens.push(extractedIntent.category);
  }
  summaryTokens.push(`around ${destName}`);

  const ack = `Got it — ${summaryTokens.join(', ')}.`;
  return `${ack} I found ${count} verified ${categoryName} experience${count > 1 ? 's' : ''} for you, including **${top.name}** (${top.priceDisplay}, ~${top.durationMinutes || 60} min visit).`;
};
