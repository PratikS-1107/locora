import { generateGeminiResponse } from './gemini.js';

/**
 * Locora Smart Recommendation Engine
 * 
 * Flow:
 *   USER INPUT
 *       ↓
 *   LOCORA BACKEND
 *       ↓
 *   GOOGLE PLACES / REAL PLACES SERVICES (Factual Source)
 *       ↓
 *   VALIDATION + CONSTRAINTS FILTERING (Time, Budget, Radius, Venue Types)
 *       ↓
 *   GEMINI REASONING & RANKING (RECOMMENDATION Pool)
 *       ↓
 *   STRUCTURED RECOMMENDATIONS
 * 
 * Ground Truth Rules:
 *   - Google Places / OpenStreetMap is the sole factual source for names, addresses, coordinates, photos, ratings.
 *   - Gemini only reasons and ranks over verified candidates.
 *   - Gemini NEVER creates fake places, fake ratings, fake prices, or fake images.
 *   - Pricing is strictly labeled: 'free' | 'verified' | 'varies' | 'unavailable'.
 */

// Format price object and display string with absolute honesty (no fabricated amounts)
export const formatHonestPrice = (priceLevel, currency = 'INR', knownCost = null) => {
  if (knownCost !== null && Number.isFinite(Number(knownCost)) && Number(knownCost) > 0) {
    return {
      price: {
        type: 'verified',
        amount: Number(knownCost),
        currency
      },
      priceDisplay: `₹${Number(knownCost).toLocaleString()}`
    };
  }

  if (priceLevel === 0) {
    return {
      price: {
        type: 'free',
        amount: 0,
        currency
      },
      priceDisplay: 'Free Entry'
    };
  }

  if (priceLevel === 1) {
    return {
      price: {
        type: 'varies',
        amount: null,
        currency
      },
      priceDisplay: 'Budget ($)'
    };
  }

  if (priceLevel === 2) {
    return {
      price: {
        type: 'varies',
        amount: null,
        currency
      },
      priceDisplay: 'Moderate ($$)'
    };
  }

  if (priceLevel === 3) {
    return {
      price: {
        type: 'varies',
        amount: null,
        currency
      },
      priceDisplay: 'Premium ($$$)'
    };
  }

  if (priceLevel === 4) {
    return {
      price: {
        type: 'varies',
        amount: null,
        currency
      },
      priceDisplay: 'Luxury ($$$$)'
    };
  }

  return {
    price: {
      type: 'unavailable',
      amount: null,
      currency
    },
    priceDisplay: 'Price unavailable'
  };
};

/**
 * Filter candidates by travel time, usable activity time, and budget feasibility.
 */
export const filterCandidatesByConstraints = (candidates, { availableMinutes, budget }) => {
  return candidates.filter(place => {
    const distKm = place.distanceKm || 1.0;
    const travelTimeMinutes = Math.max(5, Math.round(distKm * 8));
    const visitMinutes = Number(place.estimatedVisitMinutes || place.durationMinutes || place.duration_minutes) || getDefaultVisitDuration(place.category || 'local');
    const estimatedTotalMinutes = travelTimeMinutes + visitMinutes;

    // Attach computed metrics to place object for downstream consumers
    place.travelTimeMinutes = travelTimeMinutes;
    place.estimatedVisitMinutes = visitMinutes;
    place.estimatedTotalMinutes = estimatedTotalMinutes;

    // 1. Time Constraint Filter
    if (Number.isFinite(availableMinutes) && availableMinutes > 0) {
      const usableActivityMinutes = availableMinutes - travelTimeMinutes;
      // If traveler cannot even spend 15 mins at destination, reject
      if (usableActivityMinutes < 10) {
        return false;
      }
      // If total trip time exceeds available time by more than 20%, reject
      if (estimatedTotalMinutes > availableMinutes * 1.2) {
        return false;
      }
    }

    // 2. Budget Constraint Filter
    if (Number.isFinite(budget)) {
      // If budget is explicitly 0 (Free Only), strictly allow only free places (priceLevel 0 or free)
      if (budget === 0 && (place.priceLevel >= 2 || (place.estimated_cost && place.estimated_cost > 0))) {
        return false;
      }
      // If budget is small (e.g. <= 500 INR), reject places with priceLevel >= 3 or known cost > 500
      if (budget <= 500 && (place.priceLevel >= 3 || (place.estimated_cost && place.estimated_cost > 500))) {
        return false;
      }
      // If budget is moderate (e.g. <= 1500 INR), reject luxury level 4 places
      if (budget <= 1500 && (place.priceLevel >= 4 || (place.estimated_cost && place.estimated_cost > 1500))) {
        return false;
      }
    }

    return true;
  });
};

const getDefaultVisitDuration = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('food') || cat.includes('culinary')) return 45;
  if (cat.includes('culture') || cat.includes('museum') || cat.includes('heritage')) return 75;
  if (cat.includes('nature') || cat.includes('park') || cat.includes('lake')) return 60;
  if (cat.includes('workshop')) return 90;
  if (cat.includes('hidden')) return 45;
  return 60;
};

// Safe JSON parser for Gemini output
const parseGeminiJSON = (rawText) => {
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

const extractList = (parsed) => {
  if (!parsed || typeof parsed !== 'object') return [];
  if (Array.isArray(parsed.recommendations)) return parsed.recommendations;
  for (const key of Object.keys(parsed)) {
    if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
      return parsed[key];
    }
  }
  return [];
};

// In-memory cache for recommendation reasoning
const recsReasoningCache = new Map();

/**
 * Execute the complete recommendation pipeline over verified candidate places.
 */
export const processSmartRecommendations = async ({
  candidates = [],
  latitude,
  longitude,
  city = 'Current Location',
  country = '',
  category = 'local',
  availableMinutes = null,
  budget = null,
  currency = 'INR'
}) => {
  const intentKey = (category || 'local').toLowerCase().trim();

  // 1. Filter candidates by travel time and budget feasibility
  let feasibleCandidates = filterCandidatesByConstraints(candidates, {
    availableMinutes,
    budget
  });

  if (feasibleCandidates.length === 0 && candidates.length > 0) {
    feasibleCandidates = candidates.slice().sort((a, b) => (a.distanceKm || 99) - (b.distanceKm || 99)).slice(0, 8);
  }

  if (feasibleCandidates.length === 0) {
    return {
      success: true,
      source: 'no_feasible_candidates',
      count: 0,
      recommendations: [],
      message: `No authentic places found matching '${intentKey}' within your time and budget constraints.`
    };
  }

  // 2. Prepare candidate representations for Gemini reasoning
  const candidatesForPrompt = feasibleCandidates.slice(0, 10).map(p => {
    const travelTime = Math.max(5, Math.round((p.distanceKm || 1.0) * 8));
    const priceInfo = formatHonestPrice(p.priceLevel, currency);
    return {
      placeId: p.placeId,
      name: p.name,
      address: p.address,
      distanceLabel: p.distanceLabel || `${p.distanceKm || 1} km away`,
      travelTimeMinutes: travelTime,
      rating: p.rating !== null ? `${p.rating}★ (${p.reviewCount || 0} reviews)` : 'Rating unavailable',
      priceDisplay: priceInfo.priceDisplay,
      types: p.types || []
    };
  });

  const prompt = `
You are Locora's Factual Travel Recommendation & Contextual Reasoning Engine.
Analyze candidate REAL places near GPS coordinates (${latitude}, ${longitude}) in ${city}, ${country}.

CONSTRAINTS & CONTEXT:
- Selected Category: "${intentKey}"
- Available Time: ${availableMinutes ? `${availableMinutes} minutes` : 'Flexible'}
- Budget Limit: ${budget !== null ? `${currency} ${budget}` : 'Any budget'}

CANDIDATES (Factual real places verified via Google/OSM):
${JSON.stringify(candidatesForPrompt, null, 2)}

STRICT RULES:
1. Return ONLY exact placeIds from candidate list. NEVER INVENT PLACES OR PLACENAMES.
2. For each recommendation, provide:
   - "reason": A personalized 1-2 sentence explanation of why this real place fits the user's category ("${intentKey}"), travel time, and constraints.
   - "estimatedVisitMinutes": Realistic integer duration (30-120 minutes) to visit this place.
   - "relevanceScore": Integer between 60 and 99 reflecting match quality.
3. Order candidates from highest fit to lowest.

JSON OUTPUT SCHEMA:
{
  "recommendations": [
    {
      "placeId": "exact_place_id",
      "relevanceScore": 88,
      "reason": "Authentic local spot fitting your available time gap.",
      "estimatedVisitMinutes": 60
    }
  ]
}
`;

  const cacheKey = `${Number(latitude).toFixed(4)}:${Number(longitude).toFixed(4)}:${intentKey}:${availableMinutes || 'any'}:${budget || 'any'}:${feasibleCandidates.slice(0, 8).map(p => p.placeId).join(',')}`;
  
  let rankedRecommendations = [];
  let source = 'real_places_deterministic';

  try {
    const cached = recsReasoningCache.get(cacheKey);
    const rawResult = cached && Date.now() - cached.timestamp < 5 * 60 * 1000
      ? cached.value
      : await generateGeminiResponse(prompt, { pool: 'RECOMMENDATION' });

    if (rawResult && !cached) {
      recsReasoningCache.set(cacheKey, { timestamp: Date.now(), value: rawResult });
    }

    const parsed = parseGeminiJSON(rawResult);
    const recList = extractList(parsed);

    if (recList.length > 0) {
      const candidateMap = new Map(feasibleCandidates.map(c => [c.placeId, c]));

      for (const item of recList) {
        const place = candidateMap.get(item.placeId);
        if (place) {
          const distKm = place.distanceKm || 1.0;
          const travelMins = Math.max(5, Math.round(distKm * 8));
          const visitMins = Number(item.estimatedVisitMinutes) || getDefaultVisitDuration(intentKey);
          const totalMins = travelMins + visitMins;
          const priceObj = formatHonestPrice(place.priceLevel, currency);
          const capitalizedCat = intentKey.charAt(0).toUpperCase() + intentKey.slice(1);
          const reason = item.reason || place.whyVisit || `Verified ${intentKey} experience (${place.distanceLabel || `${distKm} km away`})`;

          rankedRecommendations.push({
            id: place.placeId,
            placeId: place.placeId,
            name: place.name,
            title: place.name,
            address: place.address,
            latitude: place.latitude,
            longitude: place.longitude,
            distanceKm: distKm,
            distance: place.distanceLabel || `${distKm} km away`,
            distanceLabel: place.distanceLabel || `${distKm} km away`,
            travelTimeMinutes: travelMins,
            travelMinutes: travelMins,
            estimated_travel_minutes: travelMins,
            estimatedVisitMinutes: visitMins,
            durationMinutes: visitMins,
            duration_minutes: visitMins,
            estimatedTotalMinutes: totalMins,
            price: priceObj.price,
            priceDisplay: priceObj.priceDisplay,
            priceLevel: place.priceLevel,
            rating: place.rating !== null && place.rating !== undefined ? Number(place.rating) : null,
            reviewCount: place.reviewCount !== null && place.reviewCount !== undefined ? Number(place.reviewCount) : null,
            openNow: place.openNow ?? null,
            imageUrl: place.photoUrl || null,
            image: place.photoUrl || null,
            mapsUrl: place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.placeId}`,
            googleMapsUrl: place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.placeId}`,
            category: capitalizedCat,
            reason: reason,
            whyVisit: reason,
            why_it_fits: reason,
            description: `${place.address}${place.rating ? ` — Rated ${place.rating}★ on Google Places.` : ''}`,
            relevanceScore: Number(item.relevanceScore) || place.relevanceScore || 75,
            source: 'real_places_ai_ranked'
          });
        }
      }

      if (rankedRecommendations.length > 0) {
        source = 'real_places_ai_ranked';
      }
    }
  } catch (aiErr) {
    console.warn('[RECOMMENDATION ENGINE] AI ranking fallback triggered:', aiErr.message);
  }

  // Fallback: If AI reasoning did not produce list, use deterministic ranking
  if (rankedRecommendations.length === 0) {
    rankedRecommendations = feasibleCandidates.slice(0, 10).map(place => {
      const distKm = place.distanceKm || 1.0;
      const travelMins = Math.max(5, Math.round(distKm * 8));
      const visitMins = getDefaultVisitDuration(intentKey);
      const totalMins = travelMins + visitMins;
      const priceObj = formatHonestPrice(place.priceLevel, currency);
      const capitalizedCat = intentKey.charAt(0).toUpperCase() + intentKey.slice(1);
      const reason = `Authentic ${intentKey} experience located ${place.distanceLabel || `${distKm} km away`}.`;

      return {
        id: place.placeId,
        placeId: place.placeId,
        name: place.name,
        title: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        distanceKm: distKm,
        distance: place.distanceLabel || `${distKm} km away`,
        distanceLabel: place.distanceLabel || `${distKm} km away`,
        travelTimeMinutes: travelMins,
        travelMinutes: travelMins,
        estimated_travel_minutes: travelMins,
        estimatedVisitMinutes: visitMins,
        durationMinutes: visitMins,
        duration_minutes: visitMins,
        estimatedTotalMinutes: totalMins,
        price: priceObj.price,
        priceDisplay: priceObj.priceDisplay,
        priceLevel: place.priceLevel,
        rating: place.rating !== null && place.rating !== undefined ? Number(place.rating) : null,
        reviewCount: place.reviewCount !== null && place.reviewCount !== undefined ? Number(place.reviewCount) : null,
        openNow: place.openNow ?? null,
        imageUrl: place.photoUrl || null,
        image: place.photoUrl || null,
        mapsUrl: place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.placeId}`,
        googleMapsUrl: place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.placeId}`,
        category: capitalizedCat,
        reason: reason,
        whyVisit: reason,
        why_it_fits: reason,
        description: `${place.address}${place.rating ? ` — Rated ${place.rating}★ on Google Places.` : ''}`,
        relevanceScore: place.relevanceScore || 70,
        source: 'real_places_deterministic'
      };
    });
    source = 'real_places_deterministic';
  }

  // Sort descending by relevance score
  rankedRecommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    success: true,
    source,
    count: rankedRecommendations.length,
    recommendations: rankedRecommendations
  };
};
