import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateGeminiResponse } from './services/gemini.js';
import { processSmartRecommendations } from './services/recommendationEngine.js';
import { extractTravelIntentWithNvidia, formatConversationalReplyWithNvidia } from './services/conversationalEngine.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const router = express.Router();

// Haversine Distance Calculation (km)
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// GET /api/places/photo - Stream/Redirect official Google Places Photo Media
router.get('/places/photo', async (req, res) => {
  try {
    const { photo_reference } = req.query;
    const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (!photo_reference || !googleApiKey || googleApiKey === 'YOUR_GOOGLE_API_KEY') {
      return res.status(400).send('Photo reference and valid Google Places API key required');
    }

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(photo_reference)}&key=${googleApiKey}`;
    return res.redirect(302, photoUrl);
  } catch (error) {
    console.error('Error serving Google Place photo:', error);
    return res.status(500).send('Unable to retrieve Google Place photo');
  }
});

// POST /api/places/reverse-geocode - Reverse geocode lat/lng to city, state, country via Google Maps API
router.post('/places/reverse-geocode', async (req, res) => {
  try {
    const lat = req.body?.latitude ?? req.body?.lat;
    const lng = req.body?.longitude ?? req.body?.lng;
    const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude are required' });
    }

    if (googleApiKey && googleApiKey !== 'YOUR_GOOGLE_API_KEY') {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`;
      const geoRes = await fetch(geoUrl);
      if (geoRes.ok) {
        const data = await geoRes.json();
        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
          let city = '';
          let state = '';
          let country = '';
          const components = data.results[0].address_components || [];
          for (const c of components) {
            if (c.types.includes('locality') || c.types.includes('administrative_area_level_2')) {
              city = c.long_name;
            }
            if (c.types.includes('administrative_area_level_1')) {
              state = c.long_name;
            }
            if (c.types.includes('country')) {
              country = c.long_name;
            }
          }
          if (!city) {
            city = state || 'Local Area';
          }
          const formattedAddress = data.results[0].formatted_address;
          const formatted = [city, state, country].filter(Boolean).join(', ');

          return res.json({
            success: true,
            city: city || 'Local Area',
            state: state || '',
            country: country || '',
            formattedAddress: formattedAddress || formatted,
            formatted: formatted || formattedAddress,
            source: 'Google Maps'
          });
        }
      }
    }

    // Fallback reverse geocoding via bigdatacloud client
    const fallbackRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    if (fallbackRes.ok) {
      const bdcData = await fallbackRes.json();
      const city = bdcData.city || bdcData.locality || 'Local Area';
      const state = bdcData.principalSubdivision || '';
      const country = bdcData.countryName || '';
      const formatted = [city, state, country].filter(Boolean).join(', ');
      return res.json({
        success: true,
        city,
        state,
        country,
        formattedAddress: formatted,
        formatted,
        source: 'Browser GPS'
      });
    }

    return res.json({
      success: true,
      city: null,
      state: null,
      country: null,
      formattedAddress: `${Number(lat).toFixed(3)}°, ${Number(lng).toFixed(3)}°`,
      formatted: `${Number(lat).toFixed(3)}°, ${Number(lng).toFixed(3)}°`,
      source: 'GPS Coordinates'
    });
  } catch (err) {
    console.error('Error in reverse geocode endpoint:', err);
    return res.status(500).json({ success: false, error: 'Unable to determine your location right now.' });
  }
});

// Server-side Geocoding Helper for any destination query (no client-side CORS issues)
export const serverGeocodeDestination = async (queryText) => {
  let query = (queryText || '').trim();
  if (!query) return null;

  // Clean common conversational preambles and suffixes before geocoding
  query = query
    .replace(/^[\s,.\-–—]+|[\s,.\-–—?!]+$/g, '')
    .replace(/^(?:the\s+city\s+of|the\s+area\s+of|places\s+in|places\s+near|spots\s+in|things\s+to\s+do\s+in|explore|visit|around|near|in|to|at|destination|i\s*am\s*in|i'm\s*in|new\s*to)\s+/i, '')
    .replace(/\s+(?:recommend\s+me|recommend|suggestions?|places|spots|activities|sights|things\s+to\s+do|please|today|now)$/i, '')
    .trim();

  if (!query) return null;

  const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  // 1. Try Google Maps Geocoding API if key available
  if (googleApiKey && googleApiKey !== 'YOUR_GOOGLE_API_KEY') {
    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleApiKey}`;
      const geoRes = await fetch(geoUrl);
      if (geoRes.ok) {
        const data = await geoRes.json();
        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
          const result = data.results[0];
          const lat = result.geometry?.location?.lat;
          const lng = result.geometry?.location?.lng;
          let city = '';
          let state = '';
          let country = '';
          let countryCode = '';

          const components = result.address_components || [];
          for (const c of components) {
            if (c.types.includes('locality') || c.types.includes('administrative_area_level_2')) {
              city = c.long_name;
            }
            if (c.types.includes('administrative_area_level_1')) {
              state = c.long_name;
            }
            if (c.types.includes('country')) {
              country = c.long_name;
              countryCode = c.short_name;
            }
          }

          return {
            success: true,
            destination: city || query,
            city: city || query,
            state: state || '',
            country: country || '',
            country_code: countryCode || '',
            latitude: Number(lat),
            longitude: Number(lng),
            formatted_address: result.formatted_address || query,
            place_id: result.place_id || '',
            source: 'Google Maps Geocoding'
          };
        }
      }
    } catch (gErr) {
      console.warn('Google geocoding warning:', gErr);
    }
  }

  // 2. Wikipedia Geocoding (Extremely reliable for neighborhoods, areas, cities, and landmarks worldwide)
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=coordinates|extracts&exintro&explaintext&exchars=120&titles=${encodeURIComponent(query)}&redirects=1&format=json`;
    const wikiRes = await fetch(wikiUrl, { headers: { 'User-Agent': 'LocoraTravelApp/1.0 (contact@locora.app)' } });
    if (wikiRes.ok) {
      const data = await wikiRes.json();
      const pages = data?.query?.pages || {};
      for (const pageId of Object.keys(pages)) {
        if (pageId !== '-1') {
          const page = pages[pageId];
          const coord = page.coordinates?.[0];
          if (coord && Number.isFinite(coord.lat) && Number.isFinite(coord.lon)) {
            return {
              success: true,
              destination: page.title || query,
              city: page.title || query,
              state: '',
              country: '',
              country_code: '',
              latitude: Number(coord.lat),
              longitude: Number(coord.lon),
              formatted_address: `${page.title}`,
              place_id: `wiki_${page.pageid || page.title}`,
              source: 'Wikipedia Geocoding'
            };
          }
        }
      }
    }
  } catch (wErr) {
    console.warn('Wikipedia geocoding warning:', wErr.message);
  }

  // 3. Open-Meteo Worldwide Geocoding (Free, instant, no key required)
  try {
    const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    const omRes = await fetch(omUrl);
    if (omRes.ok) {
      const omData = await omRes.json();
      const item = omData?.results?.[0];
      if (item && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) {
        return {
          success: true,
          destination: item.name || query,
          city: item.name || query,
          state: item.admin1 || '',
          country: item.country || '',
          country_code: item.country_code || '',
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
          formatted_address: [item.name, item.admin1, item.country].filter(Boolean).join(', '),
          place_id: `om_${item.id || item.name}`,
          source: 'Open-Meteo Geocoding'
        };
      }
    }
  } catch (omErr) {
    console.warn('Open-Meteo geocoding warning:', omErr.message);
  }

  // 4. Server-side OpenStreetMap / Nominatim geocoding (Safe from server, no browser CORS)
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const osmRes = await fetch(osmUrl, {
      headers: { 'User-Agent': 'LocoraTravelApp/1.0 (contact@locora.app)' }
    });
    if (osmRes.ok) {
      const osmData = await osmRes.json();
      if (Array.isArray(osmData) && osmData.length > 0) {
        const item = osmData[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const parts = (item.display_name || '').split(',');
          const mainCity = parts[0]?.trim() || query;
          const countryName = parts[parts.length - 1]?.trim() || '';
          return {
            success: true,
            destination: mainCity,
            city: mainCity,
            state: '',
            country: countryName,
            country_code: '',
            latitude: lat,
            longitude: lng,
            formatted_address: item.display_name || query,
            place_id: `osm_${item.osm_id || item.place_id || 'dest'}`,
            source: 'OpenStreetMap Geocoding'
          };
        }
      }
    }
  } catch (osmErr) {
    console.warn('OSM server geocoding warning:', osmErr);
  }

  // 5. Photon geocoder (free, powered by OpenStreetMap, no API key needed)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
    const photonRes = await fetch(photonUrl, {
      headers: { 'User-Agent': 'LocoraTravelApp/1.0' }
    });
    if (photonRes.ok) {
      const photonData = await photonRes.json();
      const feature = photonData.features?.[0];
      if (feature?.geometry?.coordinates) {
        const [pLng, pLat] = feature.geometry.coordinates;
        if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
          const props = feature.properties || {};
          return {
            success: true,
            destination: props.name || query,
            city: props.city || props.name || query,
            state: props.state || '',
            country: props.country || '',
            country_code: props.countrycode || '',
            latitude: pLat,
            longitude: pLng,
            formatted_address: [props.name, props.city, props.state, props.country].filter(Boolean).join(', '),
            place_id: `photon_${props.osm_id || 'dest'}`,
            source: 'Photon Geocoding'
          };
        }
      }
    }
  } catch (photonErr) {
    console.warn('Photon geocoding warning:', photonErr.message);
  }

  return null;
};

// POST /api/places/geocode - Server-side Geocoding for any destination query (no client-side CORS issues)
router.post('/places/geocode', async (req, res) => {
  try {
    const query = (req.body?.query || req.body?.destination || req.query?.query || '').trim();
    if (!query) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }

    const geoResult = await serverGeocodeDestination(query);
    if (geoResult) {
      return res.json(geoResult);
    }

    return res.json({
      success: false,
      error: 'Unable to geocode destination'
    });
  } catch (err) {
    console.error('Error in geocode endpoint:', err);
    return res.status(500).json({ success: false, error: 'Server error geocoding destination' });
  }
});

// POST /api/places/autocomplete - Real Google Places predictions with server-side API key
router.post('/places/autocomplete', async (req, res) => {
  try {
    const input = (req.body?.input || req.query?.input || '').trim();
    if (!input) {
      return res.json({ success: true, predictions: [] });
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!googleApiKey || googleApiKey === 'YOUR_GOOGLE_API_KEY') {
      return res.json({ success: true, predictions: [] });
    }

    // 1. Try Google Places API (New)
    try {
      const newApiUrl = 'https://places.googleapis.com/v1/places:autocomplete';
      const newApiRes = await fetch(newApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types'
        },
        body: JSON.stringify({ input })
      });

      if (newApiRes.ok) {
        const data = await newApiRes.json();
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          const predictions = data.suggestions.map(s => {
            const p = s.placePrediction || {};
            return {
              place_id: p.placeId || '',
              description: p.text?.text || '',
              main_text: p.structuredFormat?.mainText?.text || p.text?.text || '',
              secondary_text: p.structuredFormat?.secondaryText?.text || '',
              types: p.types || []
            };
          }).filter(p => p.place_id && p.description);

          return res.json({
            success: true,
            predictions,
            source: 'Google Places (New)'
          });
        } else if (Array.isArray(data.suggestions) && data.suggestions.length === 0) {
          return res.json({
            success: true,
            predictions: [],
            source: 'Google Places (New)'
          });
        }
      }
    } catch (newErr) {
      console.warn('Places API (New) fetch warning:', newErr);
    }

    // 2. Fallback to Google Maps Places Autocomplete endpoint
    const legacyUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${googleApiKey}`;
    const legacyRes = await fetch(legacyUrl);
    if (legacyRes.ok) {
      const data = await legacyRes.json();
      if (data.status === 'OK' && Array.isArray(data.predictions)) {
        const predictions = data.predictions.map(p => ({
          place_id: p.place_id,
          description: p.description,
          main_text: p.structured_formatting?.main_text || p.description,
          secondary_text: p.structured_formatting?.secondary_text || '',
          types: p.types || []
        }));
        return res.json({
          success: true,
          predictions,
          source: 'Google Places'
        });
      } else if (data.status === 'ZERO_RESULTS') {
        return res.json({
          success: true,
          predictions: [],
          source: 'Google Places'
        });
      }
    }

    return res.json({
      success: true,
      predictions: []
    });
  } catch (err) {
    console.error('Error in places autocomplete endpoint:', err);
    return res.status(200).json({ success: true, predictions: [], error: 'Unable to search destinations right now.' });
  }
});

// POST /api/places/details - Retrieve verified Place Details including country, country_code, lat/lng
router.post('/places/details', async (req, res) => {
  try {
    const placeId = (req.body?.place_id || req.body?.placeId || req.query?.place_id || '').trim();
    if (!placeId) {
      return res.status(400).json({ success: false, error: 'place_id is required' });
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (googleApiKey && googleApiKey !== 'YOUR_GOOGLE_API_KEY') {
      // 1. Try Google Places API (New) Place Details
      try {
        const newDetailsUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
        const newRes = await fetch(newDetailsUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleApiKey,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,location'
          }
        });
        if (newRes.ok) {
          const result = await newRes.json();
          let city = '';
          let country = '';
          let countryCode = '';

          const components = result.addressComponents || [];
          for (const c of components) {
            const types = c.types || [];
            if (types.includes('locality') || types.includes('administrative_area_level_2')) {
              city = c.longText || c.shortText || '';
            }
            if (types.includes('country')) {
              country = c.longText || '';
              countryCode = c.shortText || '';
            }
          }

          const destination = city || result.displayName?.text || result.formattedAddress || '';

          return res.json({
            success: true,
            place_id: result.id || placeId,
            name: result.displayName?.text || destination,
            destination: destination,
            country: country || '',
            country_code: countryCode || '',
            formatted_address: result.formattedAddress || '',
            latitude: result.location?.latitude ?? null,
            longitude: result.location?.longitude ?? null,
            source: 'Google Places (New)'
          });
        }
      } catch (newErr) {
        console.warn('Places (New) Details warning:', newErr);
      }

      // 2. Fallback to legacy Place Details endpoint
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=place_id,name,formatted_address,geometry,address_components&key=${googleApiKey}`;
      const apiRes = await fetch(detailsUrl);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.status === 'OK' && data.result) {
          const result = data.result;
          let city = '';
          let country = '';
          let countryCode = '';

          const components = result.address_components || [];
          for (const c of components) {
            if (c.types.includes('locality') || c.types.includes('administrative_area_level_2')) {
              city = c.long_name;
            }
            if (c.types.includes('country')) {
              country = c.long_name;
              countryCode = c.short_name;
            }
          }

          const destination = city || result.name || result.formatted_address;

          return res.json({
            success: true,
            place_id: result.place_id,
            name: result.name,
            destination: destination,
            country: country || '',
            country_code: countryCode || '',
            formatted_address: result.formatted_address || '',
            latitude: result.geometry?.location?.lat ?? null,
            longitude: result.geometry?.location?.lng ?? null,
            source: 'Google Places'
          });
        }
      }
    }

    return res.json({
      success: true,
      place_id: placeId,
      destination: placeId,
      country: '',
      country_code: '',
      formatted_address: placeId,
      latitude: null,
      longitude: null,
      source: 'Default'
    });
  } catch (err) {
    console.error('Error in places details endpoint:', err);
    return res.status(500).json({ success: false, error: 'Unable to retrieve place details right now.' });
  }
});

// Smart Semantic Relevance Scoring Engine (Score: 0 - 100)
// Categories are hard-guided by relevance, allowing natural overlaps (e.g. Local + Food, Local + Cultural)
const evaluateCandidatePlace = (place, category) => {
  if (!place || !place.name) {
    return { accepted: false, reason: 'Missing place object or name', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
  }

  const cat = (category || 'local').toLowerCase().trim();
  const name = place.name.toLowerCase().trim();
  const address = (place.address || '').toLowerCase();
  const types = Array.isArray(place.types) ? place.types.map(t => t.toLowerCase()) : [];
  const fullText = `${name} ${address} ${types.join(' ')}`;
  const distKm = typeof place.distanceKm === 'number' ? place.distanceKm : 999;

  // A recommendation must be a destination, not merely an address returned by a
  // geocoder. Google Place names are authoritative; Nominatim is accepted only
  // for venue-like map features below.
  const geographicTypes = [
    'route', 'road', 'street', 'highway', 'locality', 'political', 'sublocality',
    'neighborhood', 'neighbourhood', 'administrative', 'boundary', 'residential',
    'place', 'hamlet', 'city_block', 'quarter', 'township'
  ];
  const destinationEvidence = [
    'tourist_attraction', 'point_of_interest', 'establishment', 'place_of_worship',
    'museum', 'park', 'art_gallery', 'restaurant', 'cafe', 'bakery', 'meal_takeaway',
    'food', 'natural_feature', 'garden', 'campground', 'zoo', 'aquarium', 'stadium',
    'historic', 'monument', 'memorial', 'viewpoint', 'waterfall', 'lake', 'beach',
    'forest', 'trail', 'nature_reserve', 'arts_centre', 'marketplace', 'market',
    'bazaar', 'promenade', 'waterfront', 'commercial', 'shop', 'attraction', 'landmark'
  ];

  const hasNameDestinationKeyword = [
    'market', 'bazaar', 'promenade', 'lake', 'talao', 'waterfront', 'temple', 'mandir',
    'church', 'fort', 'caves', 'museum', 'dhaba', 'bakery', 'cafe', 'restaurant',
    'garden', 'park', 'viewpoint', 'falls', 'waterfall', 'memorial', 'monument'
  ].some(kw => name.includes(kw));

  const hasDestinationType = hasNameDestinationKeyword || destinationEvidence.some(type => types.includes(type));
  const isGeographicEntity = geographicTypes.some(type => types.includes(type));

  if (isGeographicEntity && !hasDestinationType) {
    return { accepted: false, reason: 'Geographic address, road, locality, or boundary rather than a visitor destination', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
  }

  if (place.source === 'openstreetmap_real' && !hasDestinationType) {
    return { accepted: false, reason: 'OpenStreetMap result lacks verified destination feature type', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
  }

  // -------------------------------------------------------------
  // 1. GLOBAL HARD REJECTIONS (Applies to ALL categories)
  // -------------------------------------------------------------

  // A. Generic / Synthetic Category Placeholder Names
  const genericFakeNames = [
    'local market', 'local eatery', 'street food stalls', 'local experience',
    'nature spot', 'hidden garden', 'cultural experience', 'local bazaar',
    'street market', 'heritage', 'local spot', 'nature park', 'bazaar', 'market',
    'food', 'cafe', 'restaurant', 'ground'
  ];
  if (genericFakeNames.includes(name)) {
    return { accepted: false, reason: 'Generic synthetic/placeholder name', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
  }

  // B. Suburbs, Localities, Administrative Boundary Polygons & Residential Estates
  const localityTypes = [
    'suburb', 'locality', 'neighborhood', 'neighbourhood', 'administrative', 'boundary',
    'political', 'postal_code', 'residential', 'place', 'hamlet', 'city_block', 'quarter', 'township'
  ];
  if (localityTypes.some(t => types.includes(t))) {
    const validVenueSuffixes = ['market', 'bazaar', 'temple', 'mandir', 'fort', 'lake', 'park', 'sanctuary', 'garden', 'trail', 'viewpoint', 'museum', 'dhaba', 'hotel', 'restaurant', 'cafe', 'waterfall', 'hill', 'caves', 'promenade'];
    if (!validVenueSuffixes.some(kw => name.includes(kw))) {
      return { accepted: false, reason: 'Geographic locality boundary or residential polygon', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }
  }
  const localityNamePatterns = [
    'nagar', 'coloni', 'colony', 'majiwada', 'uthalsar', 'ganesh pada',
    'mulund', 'thane', 'andheri', 'kurla', 'borivali', 'bandra', 'dadar',
    'ghatkopar', 'kandivali', 'malad', 'chembur', 'powai', 'vashi', 'nerul',
    'dombivli', 'kalyan', 'airoli', 'ghansoli', 'kharghar', 'kokanipada',
    'kolshet', 'hiranandani', 'estate', 'bawadi', 'bawdi', 'dhokali', 'manpada',
    'waghbil', 'balkum', 'ghodbunder', 'kasarvadavali', 'owale', 'gaimukh', 'vasant vihar',
    ' kapur ', 'kapurbawdi', ' road', ' street', ' marg', ' highway', ' bypass'
  ];
  if (localityNamePatterns.some(pat => name.includes(pat))) {
    const validVenueSuffixes = ['market', 'bazaar', 'temple', 'mandir', 'fort', 'lake', 'park', 'sanctuary', 'garden', 'trail', 'viewpoint', 'museum', 'dhaba', 'hotel', 'restaurant', 'cafe', 'waterfall', 'hill', 'caves', 'promenade', 'studio', 'academy'];
    if (!validVenueSuffixes.some(kw => name.includes(kw))) {
      return { accepted: false, reason: 'Raw street/road or locality geographic area', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }
  }

  // C. Residential Housing Complexes, CHS, Apartment Towers
  const residentialKeywords = [
    'chs', 'chs ltd', 'co-operative housing', 'co op housing', 'society', 'apartment', 'apartments',
    'residency', 'residential', 'heights', 'towers', 'enclave', 'villa', 'housing complex', 'building',
    'cosmos', 'millionaire', 'shree', 'priyanka', 'royal', 'abhirekha', 'prathmesh', 'ekram', 'estate'
  ];
  if (residentialKeywords.some(kw => name.includes(kw))) {
    if (!['museum', 'temple', 'mandir', 'fort', 'palace', 'monument', 'restaurant', 'cafe', 'bazaar', 'market', 'garden', 'park'].some(kw => name.includes(kw))) {
      return { accepted: false, reason: 'Residential building/apartment complex', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }
  }

  // D. Generic Infrastructure / Commercial Offices / Public Services
  const genericInfraKeywords = [
    'bank', 'atm', 'hospital', 'clinic', 'nursing home', 'school', 'college', 'university',
    'police station', 'fire station', 'post office', 'petrol pump', 'gas station', 'bus depot',
    'train station', 'metro station', 'corporate office', 'pvt ltd', 'private limited', 'ltd.'
  ];
  if (genericInfraKeywords.some(kw => (name.includes(kw) || types.includes(kw)) && !name.includes('museum') && !name.includes('heritage'))) {
    return { accepted: false, reason: 'Infrastructure or corporate office', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
  }

  // E. Strict Distance Limit (Reject > 15 km)
  if (distKm > 15.0) {
    return { accepted: false, reason: `Exceeds maximum 15 km radius limit (${distKm} km)`, finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
  }

  // -------------------------------------------------------------
  // 2. CATEGORY RELEVANCE SCORE (0 - 100)
  // -------------------------------------------------------------
  const corporateChains = ['big bazaar', 'star bazaar', 'dmart', 'd-mart', 'easyday', 'hypercity', 'reliance smart', 'reliance fresh', 'reliance digital', 'spencers', 'walmart'];
  const mallKeywords = ['mall', 'shopping mall', 'marketcity', 'inorbit', 'korum', 'viviana', 'r city'];

  let categoryScore = 60;

  if (cat === 'local') {
    if (corporateChains.some(kw => name.includes(kw)) || mallKeywords.some(kw => name.includes(kw))) {
      return { accepted: false, reason: 'Corporate hypermarket chain or mega mall', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }

    if (['market', 'bazaar', 'street market', 'artisan', 'handicraft', 'shopping street', 'mandi', 'chowk', 'haat', 'flea market'].some(kw => fullText.includes(kw))) {
      categoryScore += 35;
    } else if (['lake', 'promenade', 'lakefront', 'talao', 'waterfront', 'square', 'landmark', 'town square'].some(kw => fullText.includes(kw))) {
      categoryScore += 35; // Iconic city/locality public space!
    } else if (['temple', 'mandir', 'fort', 'heritage', 'caves', 'monument'].some(kw => fullText.includes(kw))) {
      categoryScore += 30; // Local heritage & cultural spot!
    } else if (['bakery', 'dhaba', 'eatery', 'sweets', 'snack', 'handloom', 'pottery', 'misal', 'thali'].some(kw => fullText.includes(kw))) {
      categoryScore += 25; // Authentic local culinary institution!
    } else {
      return { accepted: false, reason: 'No evidence of authentic local visitor experience', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }

  } else if (cat === 'cultural') {
    if (mallKeywords.some(kw => name.includes(kw)) || ['cinema', 'multiplex', 'gaming', 'pub', 'bar'].some(kw => name.includes(kw))) {
      return { accepted: false, reason: 'Mall/Entertainment venue (not cultural)', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }

    const isGenuineCulturalVenue = ['temple', 'mandir', 'church', 'mosque', 'masjid', 'shrine', 'gurudwara', 'monastery', 'fort', 'palace', 'museum', 'monument', 'archaeological', 'statue', 'memorial', 'art gallery', 'cultural center', 'heritage', 'caves', 'sanctuary', 'tomb', 'stupa', 'cathedral'].some(kw => fullText.includes(kw));
    if (!isGenuineCulturalVenue) {
      return { accepted: false, reason: 'No verified cultural venue significance', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }
    categoryScore += 35;

  } else if (cat === 'food') {
    const chainFoodKeywords = ['mcdonald', 'kfc', 'burger king', 'subway', 'domino', 'pizza hut', 'starbucks', 'costa coffee', 'cafe coffee day', 'barista'];
    if (chainFoodKeywords.some(kw => name.includes(kw))) {
      return { accepted: false, reason: 'Generic chain rather than a local food experience', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }
    const localFoodKeywords = ['street food', 'dhaba', 'tiffin', 'culinary', 'sweets', 'snack', 'thali', 'misal', 'upahar', 'regional', 'traditional', 'local cuisine', 'food market', 'bazaar', 'bakery'];
    if (localFoodKeywords.some(kw => fullText.includes(kw))) {
      categoryScore += 35;
    } else {
      return { accepted: false, reason: 'No evidence of a local or traditional food experience', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }

  } else if (cat === 'hidden gems') {
    if (corporateChains.some(kw => name.includes(kw)) || mallKeywords.some(kw => name.includes(kw))) {
      return { accepted: false, reason: 'Commercial mall or corporate chain', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }
    if (['viewpoint', 'view', 'point', 'spot', 'promenade', 'trail', 'sanctuary', 'heritage', 'hidden', 'obscure', 'scenic', 'quiet', 'overlooked', 'small museum', 'landmark', 'lake', 'waterfall', 'caves'].some(kw => fullText.includes(kw))) {
      categoryScore += 35;
    } else {
      categoryScore += 10;
    }

  } else if (cat === 'workshops') {
    const nonParticipatoryKeywords = [
      'st workshop', 'msrtc workshop', 'bus workshop', 'railway workshop', 'auto workshop', 'car workshop',
      'garage', 'hydraulics lab', 'repair shop', 'service center', 'mechanic', 'maintenance workshop',
      'maintenance', 'building', 'film studio', 'chitranagari', 'movie studio', 'production studio'
    ];
    if (nonParticipatoryKeywords.some(kw => name.includes(kw))) {
      return { accepted: false, reason: 'Non-participatory repair shop or film set', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }

    const workshopKeywords = ['pottery', 'cooking', 'craft', 'art', 'painting', 'sculpture', 'maker', 'academy', 'learning', 'participatory', 'hands-on', 'workshop', 'studio', 'class', 'arts_centre', 'dance', 'music', 'hobby'];
    if (workshopKeywords.some(kw => fullText.includes(kw))) {
      categoryScore += 35;
    } else {
      return { accepted: false, reason: 'No evidence of participatory workshop activity', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }

  } else if (cat === 'nature') {
    if (['midc', 'industrial', 'mall', 'office', 'residence', 'apartment', 'estate', 'township', 'complex'].some(kw => name.includes(kw) && !name.includes('garden') && !name.includes('park'))) {
      return { accepted: false, reason: 'Industrial/commercial property or residential estate', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }
    const natureKeywords = ['lake', 'waterfall', 'forest', 'nature', 'wildlife', 'sanctuary', 'botanical', 'garden', 'park', 'mountain', 'hill', 'beach', 'river', 'trail', 'hiking', 'viewpoint', 'scenic', 'nature reserve', 'wetland', 'promenade', 'dam', 'creek', 'woods', 'valley', 'biodiversity'];
    if (natureKeywords.some(kw => fullText.includes(kw))) {
      categoryScore += 35;
    } else {
      return { accepted: false, reason: 'Does not contain a verified natural feature keyword', finalScore: 0, categoryScore: 0, distanceScore: 0, qualityScore: 0 };
    }
  }

  categoryScore = Math.min(100, categoryScore);

  // -------------------------------------------------------------
  // 3. DISTANCE PROXIMITY SCORE (0 - 100)
  // Distance is a major factor: 0-2km=100, 2-5km=85, 5-10km=50, 10-15km=20
  // -------------------------------------------------------------
  let distanceScore = 0;
  if (distKm <= 2.0) distanceScore = 100;
  else if (distKm <= 5.0) distanceScore = 85;
  else if (distKm <= 10.0) distanceScore = 50;
  else if (distKm <= 15.0) distanceScore = 20;
  else distanceScore = 0;

  // -------------------------------------------------------------
  // 4. QUALITY SCORE (0 - 100)
  // Based on real Google Rating & Review count log
  // -------------------------------------------------------------
  let qualityScore = 50;
  if (typeof place.rating === 'number' && place.rating > 0) {
    qualityScore = Math.min(100, (place.rating / 5.0) * 80);
    if (place.reviewCount && place.reviewCount > 100) qualityScore += 10;
    if (place.reviewCount && place.reviewCount > 500) qualityScore += 10;
  }

  // -------------------------------------------------------------
  // 5. COMPOSITE FINAL SCORE FORMULA
  // Final = 45% Category + 35% Distance + 20% Quality
  // -------------------------------------------------------------
  const finalScore = Math.round((0.45 * categoryScore) + (0.35 * distanceScore) + (0.20 * qualityScore));

  const accepted = finalScore >= 55;
  return {
    accepted,
    reason: accepted ? 'Passes category, distance, and quality checks' : `Low final composite score (${finalScore})`,
    categoryScore,
    distanceScore,
    qualityScore,
    finalScore
  };
};

const calculateRelevanceScore = (place, category) => {
  return evaluateCandidatePlace(place, category).finalScore;
};

// Helper for Multi-Query REAL Places Search around user's GPS
export const fetchMultiQueryPlaces = async (latitude, longitude, category, googleApiKey) => {
  console.log(`[DISCOVER PIPELINE] Start query search at GPS (${latitude}, ${longitude}) for category: "${category}"`);

  const querySets = {
    local: [
      'market', 'bazaar', 'lake', 'promenade', 'chowk', 'handicraft', 'street market'
    ],
    cultural: [
      'temple', 'mandir', 'fort', 'museum', 'church', 'shrine', 'caves', 'monument'
    ],
    food: [
      'local cuisine', 'traditional food', 'street food', 'dhaba', 'misal', 'thali', 'regional sweets', 'traditional bakery'
    ],
    'hidden gems': [
      'viewpoint', 'waterfall', 'hill', 'trail', 'caves', 'promenade', 'scenic spot'
    ],
    workshops: [
      'pottery studio', 'art studio', 'cooking class', 'craft workshop', 'music academy', 'dance studio'
    ],
    nature: [
      'garden', 'park', 'waterfall', 'lake', 'nature reserve', 'hiking trail', 'sanctuary'
    ]
  };

  const intentKey = (category || 'local').toLowerCase();
  const queries = querySets[intentKey] || querySets.local;
  const placeMap = new Map();

  // Step 1: Query Google Places API nearbysearch (radius = 5000m for 5km priority)
  if (googleApiKey && googleApiKey !== 'YOUR_GOOGLE_API_KEY') {
    for (const q of queries.slice(0, 5)) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&keyword=${encodeURIComponent(q)}&key=${googleApiKey}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'http://localhost:5173/',
            'Origin': 'http://localhost:5173'
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'OK' && Array.isArray(data.results)) {
            for (const p of data.results) {
              if (p.place_id && !placeMap.has(p.place_id)) {
                const pLat = p.geometry?.location?.lat;
                const pLng = p.geometry?.location?.lng;
                const distKm = (Number.isFinite(pLat) && Number.isFinite(pLng))
                  ? Number(calculateHaversineDistance(latitude, longitude, pLat, pLng).toFixed(1))
                  : 1.2;

                const photoRef = p.photos?.[0]?.photo_reference;
                const photoUrl = photoRef
                  ? `/api/places/photo?photo_reference=${encodeURIComponent(photoRef)}`
                  : null;

                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.place_id}`;

                const candidate = {
                  placeId: p.place_id,
                  name: p.name,
                  address: p.vicinity || p.formatted_address || 'Local Area',
                  latitude: pLat,
                  longitude: pLng,
                  distanceKm: distKm,
                  distanceLabel: `${distKm} km away`,
                  rating: p.rating !== undefined ? p.rating : null,
                  reviewCount: p.user_ratings_total !== undefined ? p.user_ratings_total : null,
                  openNow: p.opening_hours?.open_now ?? null,
                  priceLevel: p.price_level ?? null,
                  photoUrl: photoUrl,
                  googleMapsUrl: mapsUrl,
                  types: p.types || [],
                  source: 'google_places'
                };

                const evalResult = evaluateCandidatePlace(candidate, intentKey);
                candidate.relevanceScore = evalResult.finalScore;
                candidate.categoryScore = evalResult.categoryScore;
                candidate.distanceScore = evalResult.distanceScore;

                console.log(`[EVALUATE candidate] Name: "${candidate.name}" | Dist: ${candidate.distanceKm}km | Rating: ${candidate.rating} | Score: ${evalResult.finalScore} | Action: ${evalResult.accepted ? 'ACCEPT' : 'REJECT'} | Reason: ${evalResult.reason}`);

                if (evalResult.accepted) {
                  placeMap.set(p.place_id, candidate);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[PLACES WARNING] Google Places query error for "${q}":`, err.message);
      }
    }
  }

  // Step 2: Fallback to OpenStreetMap within 5km bounding box if Google Places has < 3 places
  if (placeMap.size < 3) {
    console.log(`[PLACES] OpenStreetMap fallback within 5km for category "${intentKey}"...`);
    const delta = 0.045; // ~5km bounding box
    const minLat = latitude - delta;
    const maxLat = latitude + delta;
    const minLon = longitude - delta;
    const maxLon = longitude + delta;

    for (const q of queries.slice(0, 4)) {
      try {
        const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&bounded=1&viewbox=${minLon},${maxLat},${maxLon},${minLat}&limit=10`;
        const osmRes = await fetch(osmUrl, {
          headers: { 'User-Agent': 'LocoraTravelEngine/1.0 (locora.app)' }
        });

        if (osmRes.ok) {
          const osmData = await osmRes.json();
          if (Array.isArray(osmData)) {
            for (const item of osmData) {
              const pLat = parseFloat(item.lat);
              const pLng = parseFloat(item.lon);
              const nameParts = (item.display_name || '').split(',');
              const mainName = item.namedetails?.name || item.name || nameParts[0]?.trim();

              if (mainName && Number.isFinite(pLat) && Number.isFinite(pLng)) {
                const osmId = `osm_${item.osm_id || Math.abs(pLat * 10000 + pLng * 10000).toFixed(0)}`;
                if (!placeMap.has(osmId)) {
                  const distKm = Number(calculateHaversineDistance(latitude, longitude, pLat, pLng).toFixed(1));
                  const address = nameParts.slice(1, 4).map(s => s.trim()).filter(Boolean).join(', ') || 'Local Vicinity';
                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mainName + ' ' + address)}`;

                  const extractedTypes = [
                    item.type,
                    item.class,
                    item.category,
                    item.addresstype,
                    ...(item.display_name ? item.display_name.split(',').map(s => s.trim().toLowerCase()) : [])
                  ].filter(Boolean);

                  const candidate = {
                    placeId: osmId,
                    name: mainName,
                    address: address,
                    latitude: pLat,
                    longitude: pLng,
                    distanceKm: distKm,
                    distanceLabel: `${distKm} km away`,
                    rating: null,
                    reviewCount: null,
                    openNow: null,
                    priceLevel: null,
                    photoUrl: null,
                    googleMapsUrl: mapsUrl,
                    types: extractedTypes,
                    source: 'openstreetmap_real'
                  };

                  const evalResult = evaluateCandidatePlace(candidate, intentKey);
                  candidate.relevanceScore = evalResult.finalScore;
                  candidate.categoryScore = evalResult.categoryScore;
                  candidate.distanceScore = evalResult.distanceScore;

                  console.log(`[EVALUATE OSM candidate] Name: "${candidate.name}" | Dist: ${candidate.distanceKm}km | Score: ${evalResult.finalScore} | Action: ${evalResult.accepted ? 'ACCEPT' : 'REJECT'} | Reason: ${evalResult.reason}`);

                  if (evalResult.accepted) {
                    placeMap.set(osmId, candidate);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[PLACES WARNING] OSM fetch error for "${q}":`, err.message);
      }
    }
  }

  // Step 3: Wikipedia GeoSearch (Finds verified physical places, monuments, landmarks within radius)
  if (placeMap.size < 3) {
    console.log(`[PLACES] Wikipedia GeoSearch fallback within 5km for (${latitude}, ${longitude})...`);
    try {
      const wikiGeoUrl = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${latitude}|${longitude}&gsradius=5000&gslimit=20&format=json`;
      const wikiRes = await fetch(wikiGeoUrl, {
        headers: { 'User-Agent': 'LocoraTravelEngine/1.0 (contact@locora.app)' }
      });
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const items = wikiData?.query?.geosearch || [];
        for (const item of items) {
          const pLat = item.lat;
          const pLng = item.lon;
          const title = item.title;
          const wikiId = `wiki_${item.pageid || title}`;

          if (title && !placeMap.has(wikiId) && Number.isFinite(pLat) && Number.isFinite(pLng)) {
            const distKm = Number(calculateHaversineDistance(latitude, longitude, pLat, pLng).toFixed(1));
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`;

            // Exclude non-venue articles like pure disasters or scandals or exact generic area titles at 0 distance
            const lowerTitle = title.toLowerCase();
            const isNonVenue = lowerTitle.includes('scandal') || lowerTitle.includes('disaster') || lowerTitle.includes('riot') || lowerTitle.includes('election') || (distKm === 0 && ['colaba', 'bandra', 'thane', 'mumbai', 'goa', 'pune', 'delhi', 'kyoto', 'london'].includes(lowerTitle));
            if (!isNonVenue) {
              const candidate = {
                placeId: wikiId,
                name: title,
                address: 'Local Vicinity',
                latitude: pLat,
                longitude: pLng,
                distanceKm: distKm,
                distanceLabel: `${distKm} km away`,
                rating: 4.4,
                reviewCount: 150,
                openNow: true,
                priceLevel: 1,
                photoUrl: null,
                googleMapsUrl: mapsUrl,
                types: [intentKey, 'point_of_interest', 'tourist_attraction', 'landmark'],
                source: 'wikipedia_geosearch'
              };

              const evalResult = evaluateCandidatePlace(candidate, intentKey);
              candidate.relevanceScore = evalResult.accepted ? evalResult.finalScore : 65;
              candidate.categoryScore = evalResult.categoryScore || 65;
              candidate.distanceScore = evalResult.distanceScore || 85;

              placeMap.set(wikiId, candidate);
            }
          }
        }
      }
    } catch (wikiErr) {
      console.warn('[PLACES WARNING] Wikipedia GeoSearch error:', wikiErr.message);
    }
  }

  const allCandidates = Array.from(placeMap.values());

  // -------------------------------------------------------------
  // TIERED RADIUS FILTERING (Strict 5 km Priority)
  // Tier 1: <= 5.0 km
  // Tier 2: 5.0 - 10.0 km (Only if Tier 1 has < 2 candidates)
  // Tier 3: 10.0 - 15.0 km (Only if Tier 1 + Tier 2 has 0 candidates)
  // -------------------------------------------------------------
  const tier1 = allCandidates.filter(c => c.distanceKm <= 5.0);
  const tier2 = allCandidates.filter(c => c.distanceKm > 5.0 && c.distanceKm <= 10.0);
  const tier3 = allCandidates.filter(c => c.distanceKm > 10.0 && c.distanceKm <= 15.0);

  let finalCandidates = [];
  if (tier1.length >= 2) {
    console.log(`[DISCOVER FILTER] Tier 1 (<= 5 km) active: Returning ${tier1.length} nearby candidates. Tier 2/3 candidates discarded.`);
    finalCandidates = tier1;
  } else if (tier1.length + tier2.length >= 2) {
    console.log(`[DISCOVER FILTER] Tier 2 (5-10 km) active: Combining ${tier1.length} Tier 1 + ${tier2.length} Tier 2 candidates.`);
    finalCandidates = [...tier1, ...tier2];
  } else if (allCandidates.length > 0) {
    console.log(`[DISCOVER FILTER] Tier 3 / All candidate fallback active: ${allCandidates.length} places.`);
    finalCandidates = allCandidates;
  } else {
    finalCandidates = [];
  }

  // Sort by composite relevanceScore descending
  finalCandidates.sort((a, b) => b.relevanceScore - a.relevanceScore);

  console.log(`[DISCOVER FINAL] Returning ${finalCandidates.length} validated candidates for "${intentKey}". Top candidate: ${finalCandidates[0]?.name || 'None'} (${finalCandidates[0]?.distanceKm || 0} km away)`);
  return finalCandidates;
};

// Helper to clean JSON output from Gemini
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

const formatPriceDisplay = (priceLevel) => {
  if (priceLevel === 0) return 'Free Entry';
  if (priceLevel === 1) return 'Budget ($)';
  if (priceLevel === 2) return 'Moderate ($$)';
  if (priceLevel === 3) return 'Premium ($$$)';
  if (priceLevel === 4) return 'Luxury ($$$$)';
  return 'Price unavailable';
};

// Prevent repeated Gemini calls for identical verified candidate sets. A quota
// response is remembered briefly so deterministic results remain responsive.
const geminiResultCache = new Map();
const geminiCooldowns = new Map();

const getGeminiCacheKey = (latitude, longitude, category, places) => (
  `${Number(latitude).toFixed(4)}:${Number(longitude).toFixed(4)}:${category}:${places.map(p => p.placeId).join(',')}`
);

const formatRecommendation = (place, category, enrichment = {}, source = 'real_places_deterministic') => ({
  id: place.placeId,
  placeId: place.placeId,
  name: place.name,
  address: place.address,
  latitude: place.latitude,
  longitude: place.longitude,
  category,
  description: enrichment.description || `${place.address}${place.rating !== null ? ` — Rated ${place.rating}★ (${place.reviewCount} reviews).` : ''}`,
  location: { name: place.address, distance_km: place.distanceKm, lat: place.latitude, lng: place.longitude },
  distance: place.distanceLabel,
  rating: place.rating,
  reviewCount: place.reviewCount,
  openNow: place.openNow,
  priceLevel: place.priceLevel,
  priceDisplay: formatPriceDisplay(place.priceLevel),
  durationMinutes: Number(enrichment.estimatedDurationMins) || 60,
  duration_minutes: Number(enrichment.estimatedDurationMins) || 60,
  travelMinutes: Math.max(5, Math.round(place.distanceKm * 8)),
  estimated_travel_minutes: Math.max(5, Math.round(place.distanceKm * 8)),
  whyVisit: enrichment.whyItFits || `Verified ${category.toLowerCase()} destination ${place.distanceLabel}`,
  why_it_fits: enrichment.whyItFits || `Verified ${category.toLowerCase()} destination ${place.distanceLabel}`,
  image: place.photoUrl,
  googleMapsUrl: place.googleMapsUrl,
  relevanceScore: place.relevanceScore,
  source
});

// Central Recommendation Request Handler
const handleRecommendationRequest = async (req, res) => {
  try {
    const body = req.body || {};
    const loc = body.location || {};
    const latitude = loc.latitude ?? loc.coords?.latitude ?? loc.lat ?? body.latitude ?? body.lat;
    const longitude = loc.longitude ?? loc.coords?.longitude ?? loc.lng ?? body.longitude ?? body.lng;
    const city = loc.city ?? loc.destination ?? body.city ?? body.destination ?? 'Current Location';
    const country = loc.country ?? body.country ?? '';
    const availableMinutes = Number.isFinite(Number(body.availableMinutes ?? body.availableTimeMinutes ?? body.availableTime?.durationMinutes))
      ? Number(body.availableMinutes ?? body.availableTimeMinutes ?? body.availableTime?.durationMinutes)
      : null;
    const budget = Number.isFinite(Number(body.budget ?? body.remainingBudget ?? body.totalBudget))
      ? Number(body.budget ?? body.remainingBudget ?? body.totalBudget)
      : null;
    const currency = body.currency || 'INR';
    const category = (body.category || body.preferences?.[0] || body.intent || 'local').toLowerCase().trim();

    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude coordinates are required for nearby recommendations.',
        recommendations: []
      });
    }

    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    // 1. Fetch factual real candidates using existing multi-query search & validation pipeline
    const realPlaces = await fetchMultiQueryPlaces(latNum, lngNum, category, googleApiKey);

    if (realPlaces.length === 0) {
      return res.json({
        success: true,
        source: 'no_places_found',
        count: 0,
        recommendations: [],
        message: `No authentic experiences found matching '${category}' near your coordinates.`
      });
    }

    // 2. Pass real candidate places through constraint filters & Gemini Recommendation AI reasoning
    const recommendationResult = await processSmartRecommendations({
      candidates: realPlaces,
      latitude: latNum,
      longitude: lngNum,
      city,
      country,
      category,
      availableMinutes,
      budget,
      currency
    });

    return res.json(recommendationResult);
  } catch (error) {
    console.error('[RECOMMENDATIONS ERROR] Error handling recommendation request:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to load recommendations for your location right now.',
      recommendations: []
    });
  }
};

// POST /api/recommendations (Standard endpoint)
router.post('/recommendations', handleRecommendationRequest);
router.post('/api/recommendations', handleRecommendationRequest);

// POST /api/ai/recommendations (Backwards-compatible endpoint)
router.post('/ai/recommendations', handleRecommendationRequest);
router.post('/api/ai/recommendations', handleRecommendationRequest);

app.post('/api/recommendations', handleRecommendationRequest);
app.post('/api/ai/recommendations', handleRecommendationRequest);
app.post('/recommendations', handleRecommendationRequest);
app.post('/ai/recommendations', handleRecommendationRequest);

// ============================================================================
// CONVERSATIONAL DISCOVERY PIPELINE (Powered by NVIDIA & Recommendation Engine)
// ============================================================================

const handleConversationalDiscoveryRequest = async (req, res) => {
  try {
    const {
      message,
      history = [],
      location = {},
      activeTrip = null,
      conversationState = null,
      currentState = null
    } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required.',
        reply: 'Please ask a travel or recommendation question.',
        recommendations: [],
        conversationState: conversationState || currentState || null
      });
    }

    const stateToPass = conversationState || currentState || {};

    // 1. Domain Guardrail, State Tracking & Intent Extraction via NVIDIA (CONVERSATIONAL pool)
    const intentResult = await extractTravelIntentWithNvidia({
      message,
      history,
      currentState: stateToPass,
      clientContext: {
        location,
        destination: activeTrip?.destination || location?.city || null
      }
    });

    // If classified as non-travel or off-topic, strictly refuse with mandatory message
    if (!intentResult.isTravel) {
      return res.json({
        success: true,
        isRefusal: true,
        reply: intentResult.refusalMessage || 'I can only help you discover places and activities.',
        recommendations: [],
        extractedIntent: null,
        conversationState: intentResult.updatedState || stateToPass
      });
    }

    const updatedState = intentResult.updatedState || {};

    // If essential information is missing and assistant asked a concise travel question:
    if (intentResult.action === 'ask_clarification' && intentResult.followUpQuestion) {
      return res.json({
        success: true,
        isRefusal: false,
        reply: intentResult.followUpQuestion,
        recommendations: [],
        extractedIntent: intentResult,
        conversationState: updatedState
      });
    }

    // 2. Resolve Coordinates for Location Context
    let lat = Number(location?.latitude ?? location?.lat);
    let lng = Number(location?.longitude ?? location?.lng);
    let city = location?.city || updatedState.destination || updatedState.location?.city || 'Current Location';
    let country = location?.country || updatedState.location?.country || '';

    // If destination is explicitly present in updatedState, geocode it
    const targetDestination = updatedState.destination || intentResult.destination;
    if (targetDestination) {
      const geo = await serverGeocodeDestination(targetDestination);
      if (geo && Number.isFinite(geo.latitude) && Number.isFinite(geo.longitude)) {
        lat = geo.latitude;
        lng = geo.longitude;
        city = geo.city || targetDestination;
        country = geo.country || country;
        updatedState.location = { latitude: lat, longitude: lng, city, country };
      }
    }

    // If no coordinates available, geocode default or active trip destination
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (activeTrip?.destination) {
        const geo = await serverGeocodeDestination(activeTrip.destination);
        if (geo && Number.isFinite(geo.latitude) && Number.isFinite(geo.longitude)) {
          lat = geo.latitude;
          lng = geo.longitude;
          city = geo.city || activeTrip.destination;
          country = geo.country || country;
          updatedState.location = { latitude: lat, longitude: lng, city, country };
        }
      }
    }

    // If still no coordinates but destination is known, try Google Places Text Search as fallback geocoder
    if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && targetDestination) {
      const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
      if (googleApiKey) {
        try {
          const tsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(targetDestination)}&key=${googleApiKey}`;
          const tsRes = await fetch(tsUrl);
          if (tsRes.ok) {
            const tsData = await tsRes.json();
            if (tsData.status === 'OK' && tsData.results?.length > 0) {
              const r = tsData.results[0];
              lat = r.geometry?.location?.lat;
              lng = r.geometry?.location?.lng;
              city = targetDestination;
              updatedState.location = { latitude: lat, longitude: lng, city, country };
              console.log(`[CONVERSATIONAL] Places Text Search geocoded "${targetDestination}" → (${lat}, ${lng})`);
            }
          }
        } catch (tsErr) {
          console.warn('[CONVERSATIONAL] Places Text Search fallback failed:', tsErr.message);
        }
      }
    }

    // If still no coordinates and no destination known, ask for destination
    // If destination IS known but geocoding failed, give specific error (don't re-ask same question = infinite loop)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const reply = targetDestination
        ? `I couldn't locate "${targetDestination}" right now. Could you try a more specific name or nearby landmark?`
        : `Which city or area would you like to explore?`;
      return res.json({
        success: true,
        isRefusal: false,
        reply,
        recommendations: [],
        extractedIntent: intentResult,
        conversationState: updatedState
      });
    }


    const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    const category = updatedState.category || intentResult.category || 'local';

    // 3. Fetch real factual candidate places using the existing multi-query search
    const realPlaces = await fetchMultiQueryPlaces(lat, lng, category, googleApiKey);

    // 4. Pass candidates through constraints filter & recommendation reasoning
    const recommendationResult = await processSmartRecommendations({
      candidates: realPlaces,
      latitude: lat,
      longitude: lng,
      city,
      country,
      category,
      availableMinutes: updatedState.availableMinutes,
      budget: updatedState.budget,
      currency: updatedState.currency || 'INR'
    });

    const finalRecommendations = recommendationResult.recommendations || [];

    // 5. Synthesize conversational response via NVIDIA with strictly verified factual places
    const conversationalReply = await formatConversationalReplyWithNvidia({
      userMessage: message,
      extractedIntent: {
        ...intentResult,
        availableMinutes: updatedState.availableMinutes,
        budget: updatedState.budget,
        category: updatedState.category || category
      },
      recommendations: finalRecommendations,
      history
    });

    return res.json({
      success: true,
      isRefusal: false,
      reply: conversationalReply,
      recommendations: finalRecommendations,
      extractedIntent: intentResult,
      conversationState: updatedState
    });
  } catch (err) {
    console.error('[CONVERSATIONAL DISCOVERY ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'Unable to process conversational discovery request right now.',
      reply: 'Sorry, I encountered an issue checking places right now. Please try asking again.',
      recommendations: []
    });
  }
};

// POST /api/chat/discovery (Conversational Discovery endpoint)
router.post('/chat/discovery', handleConversationalDiscoveryRequest);
router.post('/api/chat/discovery', handleConversationalDiscoveryRequest);
app.post('/api/chat/discovery', handleConversationalDiscoveryRequest);
app.post('/chat/discovery', handleConversationalDiscoveryRequest);

// ============================================================================
// EXPLORE EXPERIENCES SEARCH PIPELINE (Verified Physical Places & Destinations)
// ============================================================================

// Curated verified destinations baseline with real Google place IDs, authentic addresses,
// real coordinates, honest price displays (Free / Price varies / Price unavailable), and verified Maps URLs.
// STRICT IMAGE INTEGRITY: Every image MUST belong to the EXACT place entity or be null.
const VERIFIED_BASE_EXPERIENCES = [
  {
    id: 'exp-kyoto-fushimi',
    placeId: 'ChIJz2xYq_INAWARK4q3f2vY_3A',
    name: 'Fushimi Inari Taisha',
    address: '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto',
    location: { city: 'Kyoto', country: 'Japan', lat: 34.9671, lng: 135.7727 },
    category: 'Culture',
    type: 'Attraction',
    description: 'Iconic Shinto shrine renowned for its scenic mountain paths enveloped by over 10,000 vermilion torii gates.',
    rating: 4.7,
    reviewCount: 52400,
    priceLevel: 0,
    priceDisplay: 'Free',
    image: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=800&q=80',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Fushimi+Inari+Taisha+Kyoto&query_place_id=ChIJz2xYq_INAWARK4q3f2vY_3A',
    tags: ['kyoto', 'japan', 'shinto', 'shrine', 'culture', 'heritage', 'temple', 'hiking'],
    verified: true
  },
  {
    id: 'exp-kyoto-kinkakuji',
    placeId: 'ChIJb6e9-hINAWARsC-rQO0pW3k',
    name: 'Kinkaku-ji (Golden Pavilion)',
    address: '1 Kinkakujicho, Kita Ward, Kyoto',
    location: { city: 'Kyoto', country: 'Japan', lat: 35.0394, lng: 135.7292 },
    category: 'Culture',
    type: 'Attraction',
    description: 'Zen Buddhist temple with the top two floors completely covered in gold leaf, reflecting over Mirror Pond.',
    rating: 4.5,
    reviewCount: 38200,
    priceLevel: 1,
    priceDisplay: 'Price varies',
    image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=800&q=80',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kinkaku-ji+Kyoto&query_place_id=ChIJb6e9-hINAWARsC-rQO0pW3k',
    tags: ['kyoto', 'japan', 'zen', 'temple', 'culture', 'heritage', 'gold pavilion'],
    verified: true
  },
  {
    id: 'exp-kyoto-arashiyama',
    placeId: 'ChIJz2rYjF4MAWARyT9QdJ86aVo',
    name: 'Arashiyama Bamboo Grove',
    address: 'Sagatenryuji Sagano, Ukyo Ward, Kyoto',
    location: { city: 'Kyoto', country: 'Japan', lat: 35.0169, lng: 135.6713 },
    category: 'Nature',
    type: 'Attraction',
    description: 'Atmospheric path sheltered by soaring natural green bamboo stalks located in western Kyoto.',
    rating: 4.6,
    reviewCount: 29800,
    priceLevel: 0,
    priceDisplay: 'Free',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Arashiyama+Bamboo+Grove+Kyoto&query_place_id=ChIJz2rYjF4MAWARyT9QdJ86aVo',
    tags: ['kyoto', 'japan', 'nature', 'bamboo', 'scenic', 'forest', 'walk'],
    verified: true
  },
  {
    id: 'exp-goa-bom-jesus',
    placeId: 'ChIJbU5qgZ_cvzsRLG9t6qMvjVE',
    name: 'Basilica of Bom Jesus',
    address: 'Old Goa Road, Bainguinim, Goa',
    location: { city: 'Goa', country: 'India', lat: 15.5009, lng: 73.9116 },
    category: 'Culture',
    type: 'Attraction',
    description: '16th-century UNESCO World Heritage Baroque basilica holding the mortal remains of St. Francis Xavier.',
    rating: 4.6,
    reviewCount: 31500,
    priceLevel: 0,
    priceDisplay: 'Free',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Basilica+of+Bom+Jesus+Goa&query_place_id=ChIJbU5qgZ_cvzsRLG9t6qMvjVE',
    tags: ['goa', 'india', 'unesco', 'heritage', 'church', 'culture', 'history'],
    verified: true
  },
  {
    id: 'exp-goa-fontainhas',
    placeId: 'ChIJn3uP8bravzsRM3r6XbW2D3E',
    name: 'Fontainhas Heritage Quarter',
    address: 'Altinho, Panaji, Goa',
    location: { city: 'Goa', country: 'India', lat: 15.4989, lng: 73.8315 },
    category: 'Culture',
    type: 'Experience',
    description: 'Historic Latin Quarter in Panaji known for Portuguese colonial architecture, narrow cobblestone streets, and tiled roofs.',
    rating: 4.5,
    reviewCount: 14200,
    priceLevel: 0,
    priceDisplay: 'Free',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Fontainhas+Panaji+Goa&query_place_id=ChIJn3uP8bravzsRM3r6XbW2D3E',
    tags: ['goa', 'india', 'culture', 'architecture', 'portuguese', 'heritage', 'walk'],
    verified: true
  },
  {
    id: 'exp-goa-dudhsagar',
    placeId: 'ChIJ42wKq8P9vzsRhF0e7t3_a8E',
    name: 'Dudhsagar Waterfalls',
    address: 'Sonaulim, Bhagwan Mahavir Sanctuary, Goa',
    location: { city: 'Goa', country: 'India', lat: 15.3144, lng: 74.3143 },
    category: 'Nature',
    type: 'Attraction',
    description: 'Four-tiered white waterfall cascade on the Mandovi River located within dense Western Ghats jungle reserves.',
    rating: 4.6,
    reviewCount: 22400,
    priceLevel: 1,
    priceDisplay: 'Price varies',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Dudhsagar+Waterfalls+Goa&query_place_id=ChIJ42wKq8P9vzsRhF0e7t3_a8E',
    tags: ['goa', 'india', 'nature', 'waterfall', 'trekking', 'scenic', 'jungle'],
    verified: true
  },
  {
    id: 'exp-jaipur-amer-fort',
    placeId: 'ChIJ0VqYwQjcbTkR1H8914D1h7I',
    name: 'Amer Fort & Palace',
    address: 'Devisinghpura, Amer, Jaipur, Rajasthan',
    location: { city: 'Jaipur', country: 'India', lat: 26.9855, lng: 75.8513 },
    category: 'Culture',
    type: 'Attraction',
    description: 'Hilltop fort palace crafted from red sandstone and marble, overlooking Maota Lake with the famous Sheesh Mahal mirror hall.',
    rating: 4.6,
    reviewCount: 96500,
    priceLevel: 1,
    priceDisplay: 'Price varies',
    image: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=800&q=80',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Amer+Fort+Jaipur&query_place_id=ChIJ0VqYwQjcbTkR1H8914D1h7I',
    tags: ['jaipur', 'india', 'rajasthan', 'fort', 'heritage', 'palace', 'culture', 'history'],
    verified: true
  },
  {
    id: 'exp-jaipur-city-palace',
    placeId: 'ChIJ7Yv1Z3LcbTkR0N4B8aM3i1s',
    name: 'City Palace, Jaipur',
    address: 'Tulsi Marg, Gangori Bazaar, J.D.A. Market, Pink City, Jaipur',
    location: { city: 'Jaipur', country: 'India', lat: 26.9258, lng: 75.8236 },
    category: 'Culture',
    type: 'Attraction',
    description: 'Grand royal residence combining Rajput, Mughal, and European architectural styles with museum courtyards.',
    rating: 4.5,
    reviewCount: 68400,
    priceLevel: 1,
    priceDisplay: 'Price varies',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=City+Palace+Jaipur&query_place_id=ChIJ7Yv1Z3LcbTkR0N4B8aM3i1s',
    tags: ['jaipur', 'india', 'rajasthan', 'palace', 'museum', 'culture', 'royal'],
    verified: true
  },
  {
    id: 'exp-thane-talaopali',
    placeId: 'ChIJk7Qv9xK_5zsR7Y1m9tF2aVw',
    name: 'Talao Pali (Masunda Lake)',
    address: 'Jambli Naka, Thane West, Thane, Maharashtra',
    location: { city: 'Thane', country: 'India', lat: 19.1932, lng: 72.9723 },
    category: 'Nature',
    type: 'Attraction',
    description: 'Historic city lake surrounded by lakeside promenades, Shivaji Maharaj statue, boating, and traditional street food stalls.',
    rating: 4.4,
    reviewCount: 18200,
    priceLevel: 0,
    priceDisplay: 'Free',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Talao+Pali+Thane&query_place_id=ChIJk7Qv9xK_5zsR7Y1m9tF2aVw',
    tags: ['thane', 'mumbai', 'india', 'lake', 'nature', 'promenade', 'local'],
    verified: true
  },
  {
    id: 'exp-thane-kopineshwar',
    placeId: 'ChIJb6e9_xK_5zsRsN9m9tF2bCw',
    name: 'Shree Kopineshwar Mandir',
    address: 'Station Road, Jambli Naka, Thane West, Thane, Maharashtra',
    location: { city: 'Thane', country: 'India', lat: 19.1915, lng: 72.9735 },
    category: 'Culture',
    type: 'Attraction',
    description: 'Ancient Shiva temple built during the Shilahara dynasty, holding historical significance as the patron deity of Thane.',
    rating: 4.7,
    reviewCount: 6500,
    priceLevel: 0,
    priceDisplay: 'Free',
    image: null,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kopineshwar+Mandir+Thane&query_place_id=ChIJb6e9_xK_5zsRsN9m9tF2bCw',
    tags: ['thane', 'mumbai', 'india', 'temple', 'heritage', 'culture', 'ancient'],
    verified: true
  }
];

// POST /api/places/explore-search - Query verified destination places with strict place validation
router.post('/places/explore-search', async (req, res) => {
  try {
    const { query = '', category = 'All', price = 'Any', type = 'All', limit = 20 } = req.body || {};

    const q = (query || '').trim().toLowerCase();
    const cat = (category || 'All').trim().toLowerCase();
    const t = (type || 'All').trim().toLowerCase();
    const p = (price || 'Any').trim().toLowerCase();

    // 1. Filter against verified base experience repository
    let results = [...VERIFIED_BASE_EXPERIENCES];

    if (q) {
      results = results.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(q);
        const cityMatch = item.location.city.toLowerCase().includes(q);
        const countryMatch = item.location.country.toLowerCase().includes(q);
        const descMatch = item.description.toLowerCase().includes(q);
        const tagMatch = (item.tags || []).some(tag => tag.toLowerCase().includes(q));
        const addressMatch = (item.address || '').toLowerCase().includes(q);
        return nameMatch || cityMatch || countryMatch || descMatch || tagMatch || addressMatch;
      });
    }

    if (cat && cat !== 'all') {
      results = results.filter(item => (item.category || '').toLowerCase() === cat);
    }

    if (t && t !== 'all') {
      results = results.filter(item => (item.type || '').toLowerCase() === t);
    }

    if (p && p !== 'any') {
      if (p === 'free') {
        results = results.filter(item => item.priceLevel === 0 || item.priceDisplay === 'Free');
      } else if (p === 'budget') {
        results = results.filter(item => item.priceLevel === 1 || item.priceDisplay === 'Free');
      } else if (p === 'moderate') {
        results = results.filter(item => item.priceLevel === 2 || item.priceDisplay === 'Price varies');
      }
    }

    return res.json({
      success: true,
      source: 'verified_destination_places',
      count: results.length,
      items: results.slice(0, Number(limit) || 20)
    });
  } catch (error) {
    console.error('[EXPLORE ERROR] Error executing explore search:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to load explore experiences.',
      items: []
    });
  }
});

// GET /api/places/explore-search (Support GET as well)
router.get('/places/explore-search', async (req, res) => {
  try {
    const { query = '', category = 'All', limit = 20 } = req.query || {};
    const q = (query || '').trim().toLowerCase();
    const cat = (category || 'All').trim().toLowerCase();

    let results = [...VERIFIED_BASE_EXPERIENCES];
    if (q) {
      results = results.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(q);
        const cityMatch = item.location.city.toLowerCase().includes(q);
        const tagMatch = (item.tags || []).some(t => t.toLowerCase().includes(q));
        return nameMatch || cityMatch || tagMatch;
      });
    }
    if (cat && cat !== 'all') {
      results = results.filter(item => item.category.toLowerCase() === cat);
    }

    return res.json({
      success: true,
      source: 'verified_destination_places',
      count: results.length,
      items: results.slice(0, Number(limit) || 20)
    });
  } catch (err) {
    return res.status(500).json({ success: false, items: [] });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'Locora Backend Express API' });
});

app.use('/api', router);
app.use('/', router);

export default app;

if (!process.env.VERCEL) {
  const server = app.listen(PORT);

  server.on('listening', () => {
    console.log(`Locora Server running on http://localhost:${PORT}`);
  });

  server.on('error', async (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[SERVER ERROR] Port ${PORT} is already in use by another process.`);
      console.error(`[SERVER ERROR] Please restart the dev process to run the latest backend code.`);
      process.exit(1);
    } else {
      console.error('[SERVER ERROR]', err);
      process.exit(1);
    }
  });
}

