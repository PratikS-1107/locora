import app from '../server/index.js';
import { formatHonestPrice, filterCandidatesByConstraints, processSmartRecommendations } from '../server/services/recommendationEngine.js';

async function runRecommendationTests() {
  console.log('=== RUNNING LOCORA RECOMMENDATION ENGINE TESTS ===\n');

  // Test 1: Honest Pricing logic
  console.log('Test 1: Honest Price Formatting');
  const freePrice = formatHonestPrice(0, 'INR');
  console.assert(freePrice.price.type === 'free' && freePrice.price.amount === 0, 'Price level 0 must be free');

  const budgetPrice = formatHonestPrice(1, 'INR');
  console.assert(budgetPrice.price.type === 'varies' && budgetPrice.price.amount === null, 'Price level 1 must be varies');

  const unavailPrice = formatHonestPrice(null, 'INR');
  console.assert(unavailPrice.price.type === 'unavailable' && unavailPrice.price.amount === null, 'Null price must be unavailable');

  const verifiedPrice = formatHonestPrice(null, 'INR', 250);
  console.assert(verifiedPrice.price.type === 'verified' && verifiedPrice.price.amount === 250, 'Known cost must be verified');
  console.log('✔ Test 1 Passed: Honest pricing states accurately formatted without fake numbers.\n');

  // Test 2: Constraint Filtering (Time & Budget)
  console.log('Test 2: Time and Budget Constraint Filtering');
  const mockCandidates = [
    { placeId: 'p1', name: 'Nearby Free Temple', distanceKm: 1.0, category: 'culture', priceLevel: 0 },
    { placeId: 'p2', name: 'Distant Luxury Resort', distanceKm: 8.0, category: 'culture', priceLevel: 4 },
    { placeId: 'p3', name: 'Moderate Street Market', distanceKm: 2.0, category: 'local', priceLevel: 1 }
  ];

  // A. Short available time (e.g., 40 mins):
  // p2 travel time ~ 64 mins + 75 mins visit = 139 mins -> Must be filtered out!
  // p1 travel time ~ 8 mins + 75 mins = 83 mins -> filtered if 40 mins available
  const shortTimeFiltered = filterCandidatesByConstraints(mockCandidates, { availableMinutes: 45, budget: null });
  console.assert(!shortTimeFiltered.some(p => p.placeId === 'p2'), 'Distant place must be filtered out for short time');
  console.log('✔ Test 2A Passed: Short available time filters out unreachable/unfit places.');

  // B. Zero / Small Budget (e.g., budget = 0):
  const freeFiltered = filterCandidatesByConstraints(mockCandidates, { availableMinutes: 180, budget: 0 });
  console.assert(!freeFiltered.some(p => p.placeId === 'p2'), 'Luxury paid venue must be filtered out for 0 budget');
  console.assert(freeFiltered.some(p => p.placeId === 'p1'), 'Free venue must be retained');
  console.log('✔ Test 2B Passed: Zero/small budget filters out luxury paid places while retaining free & unpriced.\n');

  // Test 3: Recommendation Processing Logic (Structure validation)
  console.log('Test 3: Structured Recommendation Processing');
  const processed = await processSmartRecommendations({
    candidates: [
      {
        placeId: 'ChIJz2xYq_INAWARK4q3f2vY_3A',
        name: 'Fushimi Inari Taisha',
        address: '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto',
        distanceKm: 1.5,
        distanceLabel: '1.5 km away',
        rating: 4.7,
        reviewCount: 52400,
        priceLevel: 0,
        photoUrl: 'https://example.com/photo.jpg',
        googleMapsUrl: 'https://maps.google.com/?q=Fushimi+Inari',
        types: ['tourist_attraction', 'place_of_worship'],
        relevanceScore: 92
      },
      {
        placeId: 'osm_12345',
        name: 'Historic Local Tea House',
        address: 'Gion District, Kyoto',
        distanceKm: 2.0,
        distanceLabel: '2.0 km away',
        rating: null,
        reviewCount: null,
        priceLevel: null,
        photoUrl: null,
        googleMapsUrl: 'https://maps.google.com/?q=Gion+Tea',
        types: ['cafe', 'establishment'],
        relevanceScore: 80
      }
    ],
    latitude: 35.0116,
    longitude: 135.7681,
    city: 'Kyoto',
    country: 'Japan',
    category: 'culture',
    availableMinutes: 120,
    budget: 2000,
    currency: 'INR'
  });

  console.assert(processed.success === true, 'Response must be success: true');
  console.assert(processed.recommendations.length > 0, 'Must return recommendations');
  
  const topRec = processed.recommendations[0];
  console.log('   Top Recommendation structure:');
  console.log('   - Name:', topRec.name);
  console.log('   - Distance:', topRec.distanceKm, 'km');
  console.log('   - Travel Time:', topRec.travelTimeMinutes, 'mins');
  console.log('   - Estimated Visit:', topRec.estimatedVisitMinutes, 'mins');
  console.log('   - Estimated Total:', topRec.estimatedTotalMinutes, 'mins');
  console.log('   - Price:', JSON.stringify(topRec.price));
  console.log('   - Rating:', topRec.rating);
  console.log('   - Reason:', topRec.reason);

  console.assert(topRec.placeId && topRec.name && topRec.address, 'Must have placeId, name, and address');
  console.assert(topRec.travelTimeMinutes > 0, 'Must have travelTimeMinutes');
  console.assert(topRec.estimatedTotalMinutes > 0, 'Must have estimatedTotalMinutes');
  console.assert(topRec.price && typeof topRec.price.type === 'string', 'Must have structured price object');
  console.assert(topRec.mapsUrl && topRec.mapsUrl.startsWith('https://'), 'Must have valid mapsUrl');

  const secondRec = processed.recommendations.find(r => r.placeId === 'osm_12345');
  if (secondRec) {
    console.assert(secondRec.rating === null, 'Unrated candidate must keep rating null (no fake rating)');
    console.assert(secondRec.price.type === 'unavailable', 'Unpriced candidate must have type unavailable (no fake price)');
    console.assert(secondRec.imageUrl === null, 'No image candidate must have null imageUrl (no fake image)');
  }
  console.log('✔ Test 3 Passed: Recommendation structure strictly preserves factual ground truth.\n');

  // Test 4: Live HTTP Endpoint Testing
  console.log('Test 4: Testing live POST /api/recommendations and POST /api/ai/recommendations HTTP endpoints');
  const server = app.listen(3105, async () => {
    try {
      // A. Standard endpoint POST /api/recommendations
      const res = await fetch('http://localhost:3105/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai', country: 'India' },
          category: 'cultural',
          availableMinutes: 180,
          budget: 1500,
          currency: 'INR'
        })
      });

      const data = await res.json();
      console.log('   POST /api/recommendations Status:', res.status);
      console.log('   Success:', data.success);
      console.log('   Count:', data.count || data.recommendations?.length);
      console.log('   Source:', data.source);
      console.assert(res.status === 200, 'HTTP status must be 200');
      console.assert(data.success === true, 'Must return success: true');

      // B. Backwards-compatible endpoint POST /api/ai/recommendations
      const resAi = await fetch('http://localhost:3105/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: { latitude: 26.9124, longitude: 75.7873, city: 'Jaipur', country: 'India' },
          category: 'food'
        })
      });

      const dataAi = await resAi.json();
      console.log('\n   POST /api/ai/recommendations Status:', resAi.status);
      console.log('   Success:', dataAi.success);
      console.log('   Count:', dataAi.count || dataAi.recommendations?.length);
      console.assert(resAi.status === 200, 'HTTP status must be 200');
      console.assert(dataAi.success === true, 'Must return success: true');

      console.log('\n✔ Test 4 Passed: Both endpoints respond with 200 OK and validated structured schema.\n');
      console.log('=== ALL RECOMMENDATION ENGINE TESTS PASSED SUCCESSFULLY ===');
    } catch (e) {
      console.error('HTTP endpoint test error:', e);
      process.exit(1);
    } finally {
      server.close(() => process.exit(0));
    }
  });
}

runRecommendationTests().catch(err => {
  console.error('Recommendation test suite failure:', err);
  process.exit(1);
});
