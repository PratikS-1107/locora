import dotenv from 'dotenv';
dotenv.config();

import { generateGeminiResponse } from '../server/services/gemini.js';
import { generateNvidiaResponse } from '../server/services/nvidia.js';
import { processSmartRecommendations } from '../server/services/recommendationEngine.js';
import { extractTravelIntentWithNvidia, formatConversationalReplyWithNvidia, DEFAULT_CONVERSATION_STATE } from '../server/services/conversationalEngine.js';
import { getKeyPoolStatus } from '../server/services/keyManager.js';

async function runProductionAITests() {
  console.log('====================================================');
  console.log('LOCORA PRODUCTION AI ARCHITECTURE INTEGRATION TEST');
  console.log('====================================================\n');

  // Test 1: Key Pool Status Inspection (No key values exposed)
  console.log('1. Checking Key Pool Statuses:');
  console.log('   - Discover Pool Status:', getKeyPoolStatus('DISCOVER'));
  console.log('   - Recommendation Pool Status:', getKeyPoolStatus('RECOMMENDATION'));
  console.log('   - Conversational Pool Status:', getKeyPoolStatus('CONVERSATIONAL'));

  // Test 2: DISCOVER Key Pool Call
  console.log('\n2. Testing Discover Gemini Pool (GEMINI_DISCOVER_KEY_1 / 2):');
  try {
    const discoverRes = await generateGeminiResponse(
      'Respond with a brief 1-sentence welcome for a travel app user in Mumbai.',
      { pool: 'DISCOVER' }
    );
    console.log('   ✓ Discover Pool Success! Response length:', discoverRes?.length, 'chars');
  } catch (err) {
    console.error('   ✗ Discover Pool Error:', err.message);
  }

  // Test 3: RECOMMENDATION Key Pool Call
  console.log('\n3. Testing Recommendation Gemini Pool (GEMINI_RECOMMENDATION_KEY_1 / 2):');
  try {
    const recRes = await generateGeminiResponse(
      'Rank these 2 real places for 2 hours in Colaba: Gateway of India, Cafe Mondegar. Output valid JSON: {"top": "place name"}',
      { pool: 'RECOMMENDATION' }
    );
    console.log('   ✓ Recommendation Pool Success! Response length:', recRes?.length, 'chars');
  } catch (err) {
    console.error('   ✗ Recommendation Pool Error:', err.message);
  }

  // Test 4: CONVERSATIONAL NVIDIA Pool Call
  console.log('\n4. Testing Conversational NVIDIA Pool (NVIDIA_API_KEY):');
  try {
    const nvidiaRes = await generateNvidiaResponse([
      { role: 'system', content: 'You are a concise travel assistant.' },
      { role: 'user', content: 'Say hello in 5 words.' }
    ]);
    console.log('   ✓ NVIDIA Conversational Pool Success! Response length:', nvidiaRes?.length, 'chars');
  } catch (err) {
    console.error('   ✗ NVIDIA Pool Error:', err.message);
  }

  // Test 5: End-to-End Recommendation Engine
  console.log('\n5. Testing End-to-End Recommendation Engine with Factual Candidates:');
  const factualMockCandidates = [
    {
      id: 'place-gateway',
      place_id: 'ChIJ-923',
      name: 'Gateway of India',
      address: 'Apollo Bandar, Colaba, Mumbai',
      latitude: 18.9220,
      longitude: 72.8347,
      rating: 4.6,
      user_ratings_total: 154000,
      types: ['tourist_attraction', 'point_of_interest'],
      price_level: 0,
      photos: []
    },
    {
      id: 'place-mondegar',
      place_id: 'ChIJ-mondegar',
      name: 'Cafe Mondegar',
      address: 'Colaba Causeway, Mumbai',
      latitude: 18.9235,
      longitude: 72.8318,
      rating: 4.4,
      user_ratings_total: 18200,
      types: ['restaurant', 'food', 'point_of_interest'],
      price_level: 2,
      photos: []
    }
  ];

  try {
    const recEngineResult = await processSmartRecommendations({
      candidates: factualMockCandidates,
      latitude: 18.9220,
      longitude: 72.8347,
      city: 'Mumbai',
      category: 'culture',
      availableMinutes: 120,
      budget: 800,
      currency: 'INR'
    });

    console.log('   ✓ Recommendation Engine Succeeded! Returned recommendations:', recEngineResult.recommendations?.length);
    if (recEngineResult.recommendations?.length > 0) {
      console.log('     First Rec:', recEngineResult.recommendations[0].name, '| Visit Duration:', recEngineResult.recommendations[0].estimatedVisitMinutes, 'mins | Price:', recEngineResult.recommendations[0].priceDisplay);
    }
  } catch (err) {
    console.error('   ✗ Recommendation Engine Error:', err.message);
  }

  // Test 6: Conversational Intent Extraction & Guardrail
  console.log('\n6. Testing Conversational Discovery Guardrail & Multi-Turn State:');
  try {
    // Non-travel check
    const nonTravel = await extractTravelIntentWithNvidia({
      message: 'What is Python programming?',
      history: [],
      currentState: DEFAULT_CONVERSATION_STATE,
      clientContext: {}
    });
    console.log('   ✓ Non-travel refusal check:', nonTravel.isTravel === false ? 'PASSED ("' + nonTravel.refusalMessage + '")' : 'FAILED');

    // Travel check with multi-turn
    const travelTurn1 = await extractTravelIntentWithNvidia({
      message: 'I have 3 hours and ₹1000 in Mumbai.',
      history: [],
      currentState: DEFAULT_CONVERSATION_STATE,
      clientContext: { location: { city: 'Mumbai', latitude: 18.922, longitude: 72.834 } }
    });
    console.log('   ✓ Travel Turn 1 (Constraint Extraction):', {
      availableMinutes: travelTurn1.availableMinutes,
      budget: travelTurn1.budget,
      action: travelTurn1.action,
      followUp: travelTurn1.followUpQuestion
    });

    const travelTurn2 = await extractTravelIntentWithNvidia({
      message: 'Something cultural.',
      history: [
        { sender: 'user', text: 'I have 3 hours and ₹1000 in Mumbai.' },
        { sender: 'assistant', text: travelTurn1.followUpQuestion || 'Got it. What kind of experience are you looking for?' }
      ],
      currentState: travelTurn1.updatedState,
      clientContext: { location: { city: 'Mumbai', latitude: 18.922, longitude: 72.834 } }
    });
    console.log('   ✓ Travel Turn 2 (State Retention + Category):', {
      category: travelTurn2.category,
      availableMinutes: travelTurn2.availableMinutes,
      budget: travelTurn2.budget,
      action: travelTurn2.action
    });
  } catch (err) {
    console.error('   ✗ Conversational Context Error:', err.message);
  }

  console.log('\n====================================================');
  console.log('ALL INTEGRATION TESTS COMPLETED');
  console.log('====================================================');
}

runProductionAITests().catch(err => console.error('Fatal error running tests:', err));
