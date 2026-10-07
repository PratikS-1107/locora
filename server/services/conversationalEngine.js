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
  'food', 'culture', 'nature', 'gems', 'activities', 'activity', 'places', 'spots',
  'experience', 'experiences', 'trip', 'trips', 'tour', 'travel',
  'here', 'there', 'somewhere', 'anywhere', 'everywhere', 'anything', 'something', 'nothing',
  'now', 'today', 'tomorrow', 'tonight', 'yesterday',
  'help', 'locora', 'assistant', 'recommend', 'recommendation', 'recommendations',
  'explore', 'discover', 'visit'
]);

export const sanitizeAndMergeState = (prevState = {}, updates = {}) => {
  const sanitizeDest = (dest) => {
    if (!dest || typeof dest !== 'string') return null;
    const clean = dest.trim().replace(/[,.?!]+$/g, '').trim();
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
    .replace(/^[\s,.\–—\-]+|[\s,.\–—\-?!]+$/g, '')
    .replace(/^(?:the\s+city\s+of|the\s+area\s+of|the\s+town\s+of|the|city\s+of|area\s+of)\s+/i, '')
    .replace(/\s+(?:city|area|district|region)$/i, '')
    .replace(/^(?:visit|see|explore|places\s+in|places\s+near|spots\s+in|around|near|in|to|at|destination)\s+/i, '')
    .replace(/[,\.\?!].*$/g, '')
    .replace(/\s+(?:what|where|which|how|recommend|suggestions?|places|spots|activities|sights|things\s+to\s+do|please|for\s+me|today|now).*$/i, '')
    .trim();

  if (s.length <= 2 && s.toLowerCase() !== 'ur') return null;
  if (NON_DESTINATION_WORDS.has(s.toLowerCase())) return null;

  // Filter out question words, suggestions, conversational phrases from candidate cities
  if (/^(?:what|where|which|how|who|why|when|can|could|should|would|will|is|are|tell|show|recommend|suggest|i\s*want|i\s*need|help|i'm|i\s*am)\b/i.test(str.trim())) {
    return null;
  }

  const genericPhrases = [
    'my area', 'here', 'there', 'me', 'the city', 'the area', 'town', 'places',
    'spots', 'somewhere', 'anywhere', 'anything', 'something', 'nothing',
    'recommend', 'recommend me', 'explore', 'discover', 'visit', 'activities',
    'can you do', 'what can you do', 'tell me about locora', 'who are you', 'how does this work',
    'thank you', 'thanks', 'hello', 'help', 'nice', 'cool', 'super', 'awesome', 'experience', 'experiences'
  ];
  if (genericPhrases.includes(s.toLowerCase())) return null;

  // Title-case the city name
  return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

/**
 * Deterministic Semantic Fallback Classifier (used when AI is unavailable or fails).
 * Adheres strictly to the four distinct user intent classes:
 * 1. "conversation"
 * 2. "context"
 * 3. "clarification"
 * 4. "recommendation"
 */
const fallbackDeterministicClassifier = ({ trimmed, lower, history, currentState, clientContext }) => {
  // 1. Casual Greetings
  const isGreeting = /^(?:hi|hello|hey|hiya|howdy|good\s+(?:morning|afternoon|evening|day)|greetings|sup|yo)[!.,\s]*$/i.test(trimmed);
  if (isGreeting) {
    return {
      intent: 'conversation',
      destination: null,
      category: null,
      availableMinutes: null,
      budget: null,
      reply: "Hi! What would you like to explore today? Tell me a city, or what kind of experiences you're looking for."
    };
  }

  // 2. Gratitude / Acknowledgment
  const isAck = /^(?:thanks|thank\s+you|thx|nice|okay|ok|cool|awesome|great|super|perfect|that's\s+helpful|thats\s+helpful|understood|got\s+it|sounds\s+good|wonderful)[!.,\s]*$/i.test(trimmed);
  if (isAck) {
    return {
      intent: 'conversation',
      destination: null,
      category: null,
      availableMinutes: null,
      budget: null,
      reply: "You're welcome! Would you like more details on any of these spots, or another category or destination to explore?"
    };
  }

  // 3. Capabilities / About Locora
  const isAbout = /^(?:what\s+can\s+you\s+do|tell\s+me\s+about\s+locora|how\s+does\s+this\s+work|who\s+are\s+you|help(?:\s+me)?|what\s+is\s+locora)[?!.,\s]*$/i.test(trimmed);
  if (isAbout) {
    return {
      intent: 'conversation',
      destination: null,
      category: null,
      availableMinutes: null,
      budget: null,
      reply: "I help you discover verified local, cultural, food, and nature experiences tailored to your available time and budget. Tell me where you are or what destination you'd like to explore!"
    };
  }

  // 4. Context: "I'm new here"
  if (/^(?:i\s*am\s*new\s*here|i'm\s*new\s*here|new\s*here)[.?!]?$/i.test(trimmed)) {
    return {
      intent: 'context',
      destination: null,
      category: null,
      availableMinutes: null,
      budget: null,
      reply: "Welcome! Which city or area are you currently in or looking to explore?"
    };
  }

  // 5. Context: "I'm new to <City>"
  const newToCityMatch = trimmed.match(/^(?:i\s*am\s*new\s*to|i'm\s*new\s*to|new\s*to|just\s+arrived\s+in)\s+([a-zA-Z\s]{2,25})[.?!]?$/i);
  if (newToCityMatch) {
    const city = cleanCityCandidate(newToCityMatch[1]);
    return {
      intent: 'context',
      destination: city,
      category: null,
      availableMinutes: null,
      budget: null,
      reply: `Welcome to ${city || 'the area'}! Are you looking for authentic local food, cultural heritage, nature spots, or something else to explore?`
    };
  }

  // 6. Context: "I want something to eat" / food preference
  if (/^(?:i\s*want\s*(?:something\s+to\s+eat|food)|looking\s+for\s+food|hungry)[.?!]?$/i.test(trimmed)) {
    return {
      intent: 'context',
      destination: null,
      category: 'food',
      availableMinutes: null,
      budget: null,
      reply: "What kind of food or cuisine are you in the mood for, and in which area?"
    };
  }

  // 7. Clarification / Vague Topic: "experience" / "experiences"
  if (/^experiences?[.?!]?$/i.test(trimmed)) {
    return {
      intent: 'clarification',
      destination: null,
      category: null,
      availableMinutes: null,
      budget: null,
      reply: "Sure! What kind of experience are you looking for — authentic local food, cultural heritage, nature, or hidden gems?"
    };
  }

  // 8. Recommendation Intent Detection
  const isDirectRec = /(?:recommend|suggestions?|where\s+should\s+i\s+(?:go|eat|visit)|what\s+(?:can|should)\s+i\s+(?:do|see|visit)|places\s+to\s+(?:visit|see|eat|go)|show\s+me\s+places|find\s+(?:me\s+)?(?:places|spots|food|cafes|temples|restaurants)|things\s+to\s+do|must\s+visit)/i.test(lower);

  // Extract destination from explicit prepositional phrase (e.g. "in Thane", "near Bandra")
  let dest = null;
  const inCityMatch = lower.match(/\b(?:in|at|around|near|to)\s+([a-zA-Z\s]{2,20}?)(?:[,\.\?!]|\s+(?:for|with|under|having)|$)/i);
  if (inCityMatch) {
    dest = cleanCityCandidate(inCityMatch[1]);
  }

  let cat = null;
  if (/food|eat|restaurant|cafe|dining/i.test(lower)) cat = 'food';
  else if (/cultur|temple|museum|heritage|history|monument/i.test(lower)) cat = 'cultural';
  else if (/nature|park|lake|beach|waterfall|garden/i.test(lower)) cat = 'nature';
  else if (/gem|hidden/i.test(lower)) cat = 'hidden gems';

  let mins = null;
  const hrMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|hrs|hours)/i);
  if (hrMatch) mins = Math.round(parseFloat(hrMatch[1]) * 60);

  if (isDirectRec) {
    return {
      intent: 'recommendation',
      destination: dest,
      category: cat,
      availableMinutes: mins,
      budget: null,
      reply: null
    };
  }

  return {
    intent: 'conversation',
    destination: dest,
    category: cat,
    availableMinutes: mins,
    budget: null,
    reply: "I'm here to help you discover great local spots! Tell me where you are and what you'd like to experience."
  };
};

/**
 * Natural Language Travel Intent & State Analyzer.
 * Accurately determines whether the user is:
 * 1. having a normal conversation
 * 2. providing context (CONTEXT != DESTINATION)
 * 3. asking a question / clarifying (KEYWORD != DESTINATION)
 * 4. asking for recommendations (CONVERSATION != RECOMMENDATION REQUEST)
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

  // Strict check ONLY for blatant non-travel queries (math, code, programming, politics, crypto)
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

  // Multi-Turn AI Intent Analysis via NVIDIA LLaMA 3.2
  let aiResult = null;
  try {
    const systemPrompt = `You are the Natural Language Intent Analyzer for Locora, a hyper-local travel & discovery assistant.
Analyze the user's latest message and conversation history.

Classify the user intent into exactly ONE of 4 categories:
1. "conversation" - Casual greetings (hi, hello), capability questions (what can you do), politeness, gratitude (thanks), chit-chat, or general remarks.
2. "context" - Sharing personal context or preferences without an explicit request for immediate place recommendations (e.g. "I'm new here", "I'm new to Thane", "I want something to eat", "I have 2 hours", "my budget is 500").
3. "clarification" - Vague topic mentions or asking clarifying questions (e.g. "experience", "food", "what do you mean").
4. "recommendation" - Clear, explicit request for place recommendations, spots, activities, or things to visit (e.g. "Find me local food in Thane", "Recommend cultural places in Thane for 3 hours", "Where should I go in Mumbai?").

CRITICAL RULES:
- CONTEXT != DESTINATION: Only extract "destination" if the user explicitly specifies a real city/town/geographic location (e.g. "Thane", "Mumbai", "Kyoto"). Words like "experience", "here", "food", "nature", "places", "activity", "tomorrow" are NEVER destinations.
- KEYWORD != DESTINATION: Never treat arbitrary nouns as destinations.
- CONVERSATION != RECOMMENDATION: Do NOT classify as "recommendation" unless the user clearly asks to find, recommend, suggest, or show places.
- When intent is "conversation", "context", or "clarification", generate a natural, helpful 1-2 sentence assistant reply or follow-up question.

Output ONLY valid JSON with this exact structure:
{
  "intent": "conversation" | "context" | "clarification" | "recommendation",
  "destination": string | null,
  "category": "food" | "cultural" | "nature" | "hidden gems" | "workshops" | "activities" | null,
  "availableMinutes": number | null,
  "budget": number | null,
  "reply": string | null
}`;

    const promptMessages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Existing State: ${JSON.stringify(currentState)}\nHistory: ${JSON.stringify((history || []).slice(-4))}\nLatest Message: "${trimmed}"`
      }
    ];

    const aiText = await generateNvidiaResponse(promptMessages, {
      temperature: 0.1,
      maxTokens: 250
    });

    if (aiText) {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.destination) {
          parsed.destination = cleanCityCandidate(parsed.destination);
        }
        aiResult = parsed;
      }
    }
  } catch (aiErr) {
    // Graceful fallback to deterministic classifier
  }

  // Deterministic Fallback if AI was unavailable
  if (!aiResult) {
    aiResult = fallbackDeterministicClassifier({
      trimmed,
      lower,
      history,
      currentState,
      clientContext
    });
  }

  // Extract explicit constraints if user directly typed numbers/currency
  const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|hrs|hours)/i);
  let explicitMinutes = hourMatch ? Math.round(parseFloat(hourMatch[1]) * 60) : null;
  if (!explicitMinutes) {
    const minMatch = lower.match(/(\d+)\s*(?:minute|min|mins|minutes)/i);
    if (minMatch) explicitMinutes = parseInt(minMatch[1], 10);
  }

  let explicitBudget = null;
  const budgetMatch = lower.match(/(?:₹|rs\.?|inr|\$|usd|€|eur)\s*(\d+(?:,\d+)?)/i) ||
                      lower.match(/(\d+(?:,\d+)?)\s*(?:₹|rs\.?|inr|rupees|bucks|dollars)/i) ||
                      lower.match(/(?:under|within|max|budget\s*(?:is|of)?|below|spend|spending)\s*(?:₹|rs\.?|inr|\$)?\s*(\d+(?:,\d+)?)(?!\s*(?:hour|hr|minute|min))/i);
  if (budgetMatch) explicitBudget = Number(budgetMatch[1].replace(/,/g, ''));

  // Merge state cleanly (preserves valid destination, time, budget, category)
  const mergedState = sanitizeAndMergeState(currentState, {
    destination: aiResult.destination || null,
    availableMinutes: explicitMinutes !== null ? explicitMinutes : (aiResult.availableMinutes || null),
    budget: explicitBudget !== null ? explicitBudget : (aiResult.budget || null),
    category: aiResult.category || null,
    preferences: [],
    location: clientContext.location || {}
  });

  const hasDestination = Boolean(mergedState.destination);
  const hasGps = Boolean(
    (mergedState.location?.latitude && mergedState.location?.longitude) ||
    (clientContext.location?.latitude && clientContext.location?.longitude)
  );
  const hasLocation = hasDestination || hasGps;

  // DECISION LOGIC:
  // THE RECOMMENDATION ENGINE MUST ONLY RUN WHEN THERE IS CLEAR RECOMMENDATION INTENT!
  // All other turns (conversation, context-sharing, clarification, questions) return conversational replies with NO recommendations.
  if (aiResult.intent !== 'recommendation') {
    return {
      isTravel: true,
      updatedState: mergedState,
      action: 'conversational_reply',
      reply: aiResult.reply || "I'm here to help you discover great local spots! Tell me where you are and what you'd like to experience.",
      destination: mergedState.destination,
      category: mergedState.category || 'local',
      availableMinutes: mergedState.availableMinutes,
      budget: mergedState.budget,
      currency: mergedState.currency || 'INR',
      searchKeywords: trimmed,
      userSummary: trimmed
    };
  }

  // When recommendation intent IS confirmed:
  // If we have location context, invoke the recommendation engine!
  // If NO location context at all, ask for city/area.
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
    reply: followUpQuestion,
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
