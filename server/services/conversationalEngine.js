import { generateNvidiaResponse } from './nvidia.js';
import { formatHonestPrice } from './recommendationEngine.js';

/**
 * Locora Conversational Discovery Engine
 * 
 * Powered by NVIDIA API Key (CONVERSATIONAL pool).
 * 
 * Maintains structured multi-turn conversation state:
 * {
 *   location: {},
 *   destination: null,
 *   availableMinutes: null,
 *   budget: null,
 *   currency: "INR",
 *   category: null,
 *   preferences: []
 * }
 * 
 * STRICT DOMAIN GUARDRAILS:
 * - The chatbot is NOT a general-purpose AI assistant.
 * - Its ONLY purpose is travel and place recommendation.
 * - Non-travel queries strictly receive: "I can only help you discover places and activities."
 * - Does not invent missing values or fabricate places.
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

const parseNvidiaJSON = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null;
  let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
};

/**
 * Merge and sanitize structured state across turns
 */
export const sanitizeAndMergeState = (prevState = {}, updates = {}) => {
  const merged = {
    location: {
      ...(prevState.location || {}),
      ...(updates.location || {})
    },
    destination: updates.destination !== undefined && updates.destination !== null && updates.destination !== ''
      ? updates.destination
      : (prevState.destination || null),
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

/**
 * Step 1: Analyze user message with NVIDIA in the context of previous state.
 * Extracts intent, updates structured state, and decides if follow-up question is needed.
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

  // Pre-filter obvious non-travel queries
  const lowerMsg = trimmed.toLowerCase();
  const nonTravelPatterns = [
    /^what is python/i,
    /^who is the president/i,
    /^tell me a joke/i,
    /^write a code/i,
    /^write a python/i,
    /^write a script/i,
    /^explain quantum/i,
    /^solve this math/i,
    /^who won the/i,
    /^what is the capital of/i,
    /^give me a poem/i,
    /^translate this/i
  ];

  for (const pat of nonTravelPatterns) {
    if (pat.test(lowerMsg)) {
      return {
        isTravel: false,
        refusalMessage: 'I can only help you discover places and activities.',
        updatedState: sanitizeAndMergeState(currentState, {})
      };
    }
  }

  const existingState = sanitizeAndMergeState(currentState, {
    location: clientContext.location || {}
  });

  const systemPrompt = `You are Locora's Conversational Discovery Domain Classifier & State Manager.
Locora is a travel and place discovery engine. You are NOT a general-purpose AI.
Your ONLY purpose is travel/place recommendation, activities, itinerary scheduling, nearby experiences, travel times, and travel budgets.

ALLOWED TOPICS:
- Places to visit, sights, attractions & landmarks
- Activities, tours, workshops, experiences & things to do
- Nearby food, cafes, restaurants, nature, culture, hidden gems
- Locations, cities, areas, neighborhoods, destinations
- Distance & travel time
- Activity duration & scheduling (e.g. 2 hours, afternoon, full day)
- Budget & verified prices for travel (e.g. ₹1000, free spots, under ₹500)
- Itinerary-compatible recommendations

RECOMMENDATION QUERIES & FOLLOW-UP RULES (MUST BE CLASSIFIED AS TRAVEL - isTravel: true):
1. General recommendation requests (e.g. "recommend me", "what can I do", "where should I go", "what should I visit", "show me places", "give me activities", "i am new here recommend me", "i am new to thane recommend me", "what to do in Kyoto") ARE VALID TRAVEL QUERIES (isTravel: true).
2. Follow-up answers to assistant questions (e.g. user replies with a city name like "Thane" when asked for a city, or "₹1000" when asked for budget, or "2 hours" when asked for time, or "something cultural" when asked for category) ARE VALID TRAVEL QUERIES (isTravel: true).
3. Travel queries in natural language (e.g. "I want to explore", "I'm in Thane", "I have never been to Kyoto", "what to do in Bandra", "places around Colaba", "show me places around Thane") ARE VALID TRAVEL QUERIES (isTravel: true).

STRICT REFUSAL RULE:
If the user's message is COMPLETELY UNRELATED to travel or places (e.g. programming code/Python/React, jokes, politics, math equations, quantum physics, general homework, non-travel trivia), you MUST return:
{
  "isTravel": false,
  "refusalMessage": "I can only help you discover places and activities."
}

CONVERSATION CONTEXT & STATE TRACKING RULES:
1. Maintain and update the structured state:
   - location: object with latitude, longitude, city, country
   - destination: string (clean city or area name, e.g. "Thane", "Colaba", "Kyoto", "Goa") or null
   - availableMinutes: integer (e.g. "2 hours" -> 120, "45 mins" -> 45) or null
   - budget: number (e.g. "₹1000" -> 1000, "500" -> 500) or null
   - currency: "INR" (default)
   - category: "food" | "culture" | "nature" | "hidden gems" | "activities" | "workshops" | null
   - preferences: array of strings (e.g. ["vegetarian", "art", "scenic"])
2. RETAIN PREVIOUS CONSTRAINTS (MERGE & PERSIST):
   - Never forget previously established values. If previous state has destination="Thane" and budget=1000, and user now says "Something cultural", RETAIN destination="Thane", budget=1000, and set category="culture".
   - If user updates a value (e.g. "I actually only have ₹500"), override budget=500 while preserving destination and availableMinutes.
   - If the previous assistant question asked for a city/area and the user says "Thane", update destination="Thane".
   - Clean destination strings: strip trailing/leading action words (e.g. "i am new to thane recommend me" -> destination="Thane").
3. DECIDING WHETHER TO RECOMMEND OR ASK FOLLOW-UP:
   - Set "action": "recommend" when destination is known, or user asks for recommendations, or location + preferences/time are available.
   - Set "action": "ask_clarification" ONLY when essential information (e.g. location/destination) is completely unknown and no context exists to recommend anything.
   - Work gracefully with partial information. Do not invent missing values.

OUTPUT JSON FORMAT:
{
  "isTravel": true,
  "updatedState": {
    "destination": "Thane" (clean city/area name or null),
    "category": "culture" | "food" | "nature" | "hidden gems" | "activities" | "workshops" | null,
    "availableMinutes": 120 (integer or null),
    "budget": 1000 (number or null),
    "currency": "INR",
    "preferences": []
  },
  "action": "recommend" | "ask_clarification",
  "followUpQuestion": "Got it — Thane. What kind of experience are you looking for?" (or null if action is recommend),
  "searchKeywords": "cultural spots Thane",
  "userSummary": "Looking for cultural spots in Thane for 2 hours with ₹1000 budget."
}
`;

  const conversationMessages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(h => ({
      role: h.sender === 'user' ? 'user' : 'assistant',
      content: typeof h.text === 'string' ? h.text : JSON.stringify(h.text || '')
    })),
    {
      role: 'user',
      content: `CURRENT STRUCTURED STATE: ${JSON.stringify(existingState)}\nCLIENT CONTEXT: ${JSON.stringify(clientContext)}\nLATEST USER MESSAGE: "${trimmed}"`
    }
  ];

  try {
    const rawResult = await generateNvidiaResponse(conversationMessages, {
      temperature: 0.1,
      maxTokens: 600
    });

    const parsed = parseNvidiaJSON(rawResult);
    if (parsed && typeof parsed.isTravel === 'boolean') {
      if (!parsed.isTravel) {
        // NVIDIA said non-travel — but verify with the existing heuristic before refusing
        const heuristicCheck = heuristicIntentExtraction(trimmed, existingState, clientContext, history);
        if (heuristicCheck.isTravel) {
          // Heuristic detected travel intent that NVIDIA missed — use heuristic result
          return heuristicCheck;
        }
        return {
          isTravel: false,
          refusalMessage: parsed.refusalMessage || 'I can only help you discover places and activities.',
          updatedState: existingState
        };
      }

      const mergedState = sanitizeAndMergeState(existingState, parsed.updatedState || {});
      const isExplicitRecommend = /(?:recommend|suggestions?|places?|spots?|activities|things\s+to\s+do|what\s+can\s+i\s+do|where\s+to\s+go|where\s+should\s+i\s+go|what\s+should\s+i\s+visit|show\s+me|suggest|explore|discover|new\s+to|new\s+here)/i.test(trimmed);
      
      let determinedAction = parsed.action;
      if (!determinedAction) {
        determinedAction = (mergedState.destination || mergedState.category || isExplicitRecommend) ? 'recommend' : 'ask_clarification';
      } else if (isExplicitRecommend && mergedState.destination) {
        determinedAction = 'recommend';
      }
      
      return {
        isTravel: true,
        updatedState: mergedState,
        action: determinedAction,
        followUpQuestion: determinedAction === 'recommend' ? null : (parsed.followUpQuestion || null),
        destination: mergedState.destination,
        category: mergedState.category || 'local',
        availableMinutes: mergedState.availableMinutes,
        budget: mergedState.budget,
        currency: mergedState.currency || 'INR',
        searchKeywords: parsed.searchKeywords || trimmed,
        userSummary: parsed.userSummary || trimmed
      };
    }
  } catch (err) {
    console.warn('[CONVERSATIONAL ENGINE] NVIDIA intent extraction fallback:', err.message);
  }

  // Fallback heuristic extraction with state merging & history context
  return heuristicIntentExtraction(trimmed, existingState, clientContext, history);
};

const cleanCityCandidate = (str) => {
  if (!str || typeof str !== 'string') return null;
  let s = str.trim()
    .replace(/^[\s,.\-–—]+|[\s,.\-–—?!]+$/g, '')
    .replace(/^(?:the\s+city\s+of|the\s+area\s+of|the\s+town\s+of|the|city\s+of|area\s+of)\s+/i, '')
    .replace(/\s+(?:city|area|district|region)$/i, '')
    .replace(/^(?:visit|see|explore|places\s+in|places\s+near|spots\s+in|around|near|in|to|at|destination)\s+/i, '')
    .replace(/\s+(?:recommend\s+me|recommend|suggestions?|places|spots|activities|sights|things\s+to\s+do|please|for\s+me|today|now)$/i, '')
    .trim();

  if (s.length < 2) return null;
  const genericWords = [
    'my area', 'here', 'me', 'the city', 'the area', 'town', 'places',
    'spots', 'somewhere', 'anywhere', 'anything', 'something',
    'recommend', 'recommend me', 'explore', 'discover', 'visit', 'activities'
  ];
  if (genericWords.includes(s.toLowerCase())) return null;

  // Title-case the city name
  return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

/**
 * Deterministic regex-based fallback intent extraction with state persistence & question-answer context
 */
const heuristicIntentExtraction = (text, currentState, clientContext, history = []) => {
  const trimmed = (text || '').trim();
  const lower = trimmed.toLowerCase();

  // Non-travel keywords check
  const nonTravelKeywords = [
    'python', 'javascript', 'react', 'code', 'programming',
    'president', 'joke', 'recipe for baking', 'homework',
    'prime minister', 'crypto', 'bitcoin', 'write a function',
    'solve this math', '2+2', 'quantum physics', 'explain quantum'
  ];
  if (nonTravelKeywords.some(kw => lower.includes(kw))) {
    return {
      isTravel: false,
      refusalMessage: 'I can only help you discover places and activities.',
      updatedState: currentState
    };
  }

  // Inspect previous assistant message in history to understand question-answer context
  const lastAssistantMsg = [...(history || [])].reverse().find(h => h.sender === 'assistant')?.text || '';
  const isAskingLocation = /(?:city|area|where|destination|location|explore)/i.test(lastAssistantMsg);
  const isAskingBudget = /(?:budget|cost|price|how much|money|spend)/i.test(lastAssistantMsg);
  const isAskingTime = /(?:time|hours?|mins?|minutes?|duration|how long|window|schedule)/i.test(lastAssistantMsg);
  const isAskingCategory = /(?:experience|category|kind of|looking for|vibe|type|interest)/i.test(lastAssistantMsg);

  // Extract available time
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

  // Extract budget (handles "₹1000", "1000", "under 500", "only have 500")
  let extractedBudget = null;
  const budgetMatch = lower.match(/(?:₹|rs\.?|inr|\$|usd|€|eur)\s*(\d+(?:,\d+)?)/i) ||
                      lower.match(/(\d+(?:,\d+)?)\s*(?:₹|rs\.?|inr|rupees|bucks|dollars)/i) ||
                      lower.match(/(?:under|within|max|budget\s*(?:is|of)?|below|have|only\s*have)\s*(?:₹|rs\.?|inr|\$)?\s*(\d+(?:,\d+)?)/i);
  if (budgetMatch) {
    extractedBudget = Number(budgetMatch[1].replace(/,/g, ''));
  } else if (isAskingBudget) {
    const numMatch = lower.match(/^(\d+(?:,\d+)?)$/);
    if (numMatch) {
      extractedBudget = Number(numMatch[1].replace(/,/g, ''));
    }
  }

  // Extract category
  let extractedCategory = null;
  if (lower.includes('food') || lower.includes('eat') || lower.includes('restaurant') || lower.includes('cafe') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('breakfast') || lower.includes('bakery') || lower.includes('dining')) {
    extractedCategory = 'food';
  } else if (lower.includes('culture') || lower.includes('cultural') || lower.includes('temple') || lower.includes('museum') || lower.includes('heritage') || lower.includes('monument') || lower.includes('fort') || lower.includes('history') || lower.includes('historic') || lower.includes('art')) {
    extractedCategory = 'culture';
  } else if (lower.includes('nature') || lower.includes('park') || lower.includes('lake') || lower.includes('beach') || lower.includes('waterfall') || lower.includes('garden') || lower.includes('viewpoint') || lower.includes('scenic') || lower.includes('outdoor')) {
    extractedCategory = 'nature';
  } else if (lower.includes('hidden') || lower.includes('secret') || lower.includes('offbeat') || lower.includes('gem') || lower.includes('gems')) {
    extractedCategory = 'hidden gems';
  } else if (lower.includes('workshop') || lower.includes('pottery') || lower.includes('class') || lower.includes('craft') || lower.includes('learn')) {
    extractedCategory = 'workshops';
  } else if (lower.includes('activity') || lower.includes('activities') || lower.includes('adventure') || lower.includes('sport') || lower.includes('trek') || lower.includes('fun')) {
    extractedCategory = 'activities';
  }

  // Extract destination from natural phrasing
  let extractedDest = null;
  const destPatterns = [
    /(?:i\s*am\s*new\s*to|new\s*to)\s+([a-zA-Z\s,]{2,30})(?:[,\.\?!]|\s+recommend|\s+and|\s+with|\s+for|\s+having|\s+under|$)/i,
    /(?:i\s*am\s*in|i'm\s*in|currently\s*in|staying\s*in|living\s*in)\s+([a-zA-Z\s,]{2,30})(?:[,\.\?!]|\s+and|\s+with|\s+for|\s+having|\s+under|\s+recommend|$)/i,
    /(?:explore|discover|visit|visiting|trip\s*to|travel\s*to|going\s*to|headed\s*to|heading\s*to|around|near|in|at)\s+([a-zA-Z\s,]{2,30})(?:[,\.\?!]|\s+and|\s+with|\s+for|\s+having|\s+under|\s+recommend|\s+places|$)/i,
    /(?:what\s*can\s*i\s*do\s*in|what\s*to\s*do\s*in|places\s*in|places\s*around|spots\s*in|spots\s*around)\s+([a-zA-Z\s,]{2,30})(?:[,\.\?!]|\s+and|\s+with|\s+for|\s+recommend|$)/i,
    /(?:show\s*me\s*places\s*(?:in|around|near))\s+([a-zA-Z\s,]{2,30})(?:[,\.\?!]|\s+and|\s+with|\s+for|\s+recommend|$)/i
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

  // Standalone short location response (e.g. user typed "Thane", "Kyoto", "Bandra West")
  if (!extractedDest && !extractedBudget && !extractedMinutes && !extractedCategory) {
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount <= 3 && /^[a-zA-Z\s,.'-]+$/.test(trimmed)) {
      const candidate = cleanCityCandidate(trimmed);
      if (candidate && !['hi', 'hello', 'hey', 'help', 'yes', 'no', 'ok', 'okay', 'thanks', 'thank you', 'recommend', 'recommend me', 'explore', 'discover', 'places'].includes(trimmed.toLowerCase())) {
        extractedDest = candidate;
      }
    }
  }

  const isRecommendationIntent = /(?:recommend|recommendation|suggestions?|places?|spots?|activities|things to do|what can i do|where to go|where should i go|what should i visit|show me|suggest|ideas|explore|discover|new to|new here|visit)/i.test(lower);

  const mergedState = sanitizeAndMergeState(currentState, {
    destination: extractedDest,
    availableMinutes: extractedMinutes,
    budget: extractedBudget,
    category: extractedCategory,
    location: clientContext.location || {}
  });

  // Action decision:
  let action = 'recommend';
  let followUpQuestion = null;

  const hasLocation = Boolean(mergedState.destination || (mergedState.location?.latitude && mergedState.location?.longitude) || (clientContext.location?.latitude && clientContext.location?.longitude));

  if (!hasLocation && !isRecommendationIntent && !mergedState.category) {
    action = 'ask_clarification';
    followUpQuestion = 'Which city or area would you like to explore?';
  } else if (hasLocation && !mergedState.category && mergedState.availableMinutes === null && mergedState.budget === null && !isRecommendationIntent && !extractedDest) {
    action = 'ask_clarification';
    followUpQuestion = `Got it. What kind of experience are you looking for in ${mergedState.destination || 'your area'}? (e.g. food, culture, nature, hidden gems)`;
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
 * Step 3: Synthesize conversational answer with NVIDIA using strictly verified recommendations.
 */
export const formatConversationalReplyWithNvidia = async ({
  userMessage,
  extractedIntent,
  recommendations = [],
  history = []
}) => {
  if (recommendations.length === 0) {
    const timeStr = extractedIntent.availableMinutes ? `${Math.floor(extractedIntent.availableMinutes / 60)}h ${extractedIntent.availableMinutes % 60 ? `${extractedIntent.availableMinutes % 60}m` : ''}` : 'your time';
    const budgetStr = extractedIntent.budget !== null ? `₹${extractedIntent.budget}` : 'your budget';
    const catStr = extractedIntent.category && extractedIntent.category !== 'local' ? `${extractedIntent.category} ` : '';
    return `I couldn't find any verified ${catStr}places matching ${budgetStr} within ${timeStr}. Try expanding your search radius or asking for a different area.`;
  }

  const factualPlaceSummaries = recommendations.slice(0, 4).map((rec, i) => {
    return `${i + 1}. **${rec.name}** (${rec.category})
- Address: ${rec.address}
- Distance: ${rec.distanceLabel || `${rec.distanceKm} km`} (~${rec.travelTimeMinutes || 10} min travel)
- Recommended Visit Time: ~${rec.durationMinutes || rec.estimatedVisitMinutes || 60} min
- Price: ${rec.priceDisplay || 'Price unavailable'}
- Rating: ${rec.rating ? `${rec.rating}★ (${rec.reviewCount} reviews)` : 'Verified destination'}
- Why it fits: ${rec.reason || rec.whyVisit}`;
  }).join('\n\n');

  const systemPrompt = `You are Locora's Conversational Travel Assistant.
You provide friendly, natural, and concise recommendations to travelers.

STRICT FACTUAL INTEGRITY RULES:
1. You must ONLY mention places from the FACTUAL VERIFIED LIST below.
2. NEVER invent fake place names, fake prices, fake addresses, fake ratings, or fake URLs.
3. Keep your response conversational, concise (2 to 4 sentences), highlighting how these specific places fit the user's available time (${extractedIntent.availableMinutes ? `${extractedIntent.availableMinutes} mins` : 'schedule'}) and budget (${extractedIntent.budget !== null ? `₹${extractedIntent.budget}` : 'budget'}).
4. Do NOT output markdown tables; use a warm conversational paragraph.

FACTUAL VERIFIED PLACES:
${factualPlaceSummaries}
`;

  try {
    const reply = await generateNvidiaResponse([
      { role: 'system', content: systemPrompt },
      ...history.slice(-3).map(h => ({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: typeof h.text === 'string' ? h.text : String(h.text || '')
      })),
      { role: 'user', content: userMessage }
    ], {
      temperature: 0.5,
      maxTokens: 350
    });

    if (reply && reply.trim().length > 10) {
      return reply.trim();
    }
  } catch (err) {
    console.warn('[CONVERSATIONAL ENGINE] NVIDIA reply synthesis fallback:', err.message);
  }

  // Fallback formatted reply
  const top = recommendations[0];
  const timeDesc = extractedIntent.availableMinutes ? `your ${Math.floor(extractedIntent.availableMinutes / 60)}h window` : 'your schedule';
  const budgetDesc = extractedIntent.budget !== null ? `₹${extractedIntent.budget} budget` : 'your budget';

  return `Based on ${budgetDesc} and ${timeDesc}, I recommend checking out **${top.name}** (${top.priceDisplay}, ~${top.durationMinutes || 60} min visit). ${top.reason || 'It is an authentic spot located nearby.'}`;
};
