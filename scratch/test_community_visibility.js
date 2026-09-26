import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const serviceSupabase = createClient(supabaseUrl, serviceKey);
const anonSupabase = createClient(supabaseUrl, anonKey);

async function runTests() {
  console.log('=== COMMUNITY PUBLIC TRIP VISIBILITY TEST ===\n');

  // Find two test user profiles
  const { data: profiles } = await serviceSupabase.from('profiles').select('id, name, avatar_url').limit(2);
  if (!profiles || profiles.length < 2) {
    console.log('Need at least 2 profiles in DB. Found:', profiles?.length);
    process.exit(1);
  }

  const userA = profiles[0];
  const userB = profiles[1];
  console.log(`User A (Owner): ${userA.id} (${userA.name})`);
  console.log(`User B (Viewer): ${userB.id} (${userB.name})\n`);

  let testTripId = null;

  try {
    // 1. User A creates a personal trip
    console.log('--- Step 1: User A creates a trip (Private by default) ---');
    const { data: trip, error: createErr } = await serviceSupabase.from('trips').insert([{
      user_id: userA.id,
      title: 'Rajasthan Royal Heritage Journey',
      description: 'An enchanting journey through the royal forts and lakes of Rajasthan.',
      destination: 'Udaipur, Rajasthan',
      country: 'India',
      country_code: 'IN',
      start_date: '2026-11-10',
      end_date: '2026-11-15',
      status: 'upcoming',
      is_public: false,
      trip_source: 'personal',
      budget: 60000
    }]).select().single();

    if (createErr || !trip) {
      throw new Error(`Failed to create test trip: ${createErr?.message}`);
    }
    testTripId = trip.id;
    console.log(`Created Trip ID: ${testTripId} (is_public: ${trip.is_public}, trip_source: ${trip.trip_source})`);

    // Add days and activities to the trip
    const { data: day1 } = await serviceSupabase.from('itinerary_days').insert([{
      trip_id: testTripId,
      day_number: 1,
      date: '2026-11-10',
      notes: 'Arrival in Udaipur'
    }]).select().single();

    await serviceSupabase.from('activities').insert([{
      trip_id: testTripId,
      itinerary_day_id: day1.id,
      title: 'City Palace & Lake Pichola Boat Ride',
      category: 'Sightseeing',
      start_time: '10:00 AM',
      duration_minutes: 120,
      estimated_cost: 1200,
      currency: 'INR'
    }]);

    // 2. User B queries community trips while trip is Private
    console.log('\n--- Step 2: User B queries Community while trip is PRIVATE ---');
    const { data: privateCommunityTrips } = await anonSupabase
      .from('trips')
      .select('*')
      .eq('is_public', true)
      .neq('trip_source', 'template');

    const foundPrivate = privateCommunityTrips?.some(t => t.id === testTripId);
    console.log(`Trip visible in Community when is_public=false? ${foundPrivate ? 'YES (BUG)' : 'NO (CORRECT)'}`);
    if (foundPrivate) {
      throw new Error('Security violation: Private trip was visible in Community query!');
    }

    // 3. User A makes the trip PUBLIC
    console.log('\n--- Step 3: User A toggles trip to PUBLIC (is_public = true) ---');
    const { data: updatedTrip, error: updateErr } = await serviceSupabase
      .from('trips')
      .update({ is_public: true, updated_at: new Date().toISOString() })
      .eq('id', testTripId)
      .select()
      .single();

    if (updateErr || !updatedTrip.is_public) {
      throw new Error(`Failed to update trip to public: ${updateErr?.message}`);
    }
    console.log(`Trip visibility updated in DB: is_public = ${updatedTrip.is_public}`);

    // 4. User B queries Community without search
    console.log('\n--- Step 4: User B queries Community (All public trips) ---');
    const { data: publicCommunityTrips } = await anonSupabase
      .from('trips')
      .select('*')
      .eq('is_public', true)
      .neq('trip_source', 'template')
      .order('created_at', { ascending: false });

    const foundPublic = publicCommunityTrips?.find(t => t.id === testTripId);
    console.log(`Trip visible in Community when is_public=true? ${foundPublic ? 'YES (CORRECT)' : 'NO (BUG)'}`);
    if (!foundPublic) {
      throw new Error('Bug: Public trip was NOT returned in Community query!');
    }

    // 5. User B searches Community by destination ("Udaipur")
    console.log('\n--- Step 5: User B searches Community for "Udaipur" ---');
    const q1 = 'Udaipur';
    const { data: destSearchResults } = await anonSupabase
      .from('trips')
      .select('*')
      .eq('is_public', true)
      .neq('trip_source', 'template')
      .or(`title.ilike.%${q1}%,destination.ilike.%${q1}%,country.ilike.%${q1}%,description.ilike.%${q1}%`);

    const foundByDest = destSearchResults?.some(t => t.id === testTripId);
    console.log(`Found when searching "Udaipur"? ${foundByDest ? 'YES (CORRECT)' : 'NO (BUG)'}`);
    if (!foundByDest) {
      throw new Error('Bug: Search by destination failed to find public trip!');
    }

    // 6. User B searches Community by title keyword ("Heritage Journey")
    console.log('\n--- Step 6: User B searches Community for "Heritage Journey" ---');
    const q2 = 'Heritage Journey';
    const { data: titleSearchResults } = await anonSupabase
      .from('trips')
      .select('*')
      .eq('is_public', true)
      .neq('trip_source', 'template')
      .or(`title.ilike.%${q2}%,destination.ilike.%${q2}%,country.ilike.%${q2}%,description.ilike.%${q2}%`);

    const foundByTitle = titleSearchResults?.some(t => t.id === testTripId);
    console.log(`Found when searching "Heritage Journey"? ${foundByTitle ? 'YES (CORRECT)' : 'NO (BUG)'}`);
    if (!foundByTitle) {
      throw new Error('Bug: Search by title keyword failed to find public trip!');
    }

    // 7. User A sets trip back to PRIVATE
    console.log('\n--- Step 7: User A sets trip back to PRIVATE (is_public = false) ---');
    await serviceSupabase
      .from('trips')
      .update({ is_public: false, updated_at: new Date().toISOString() })
      .eq('id', testTripId);

    const { data: searchAfterPrivate } = await anonSupabase
      .from('trips')
      .select('*')
      .eq('is_public', true)
      .neq('trip_source', 'template')
      .or(`title.ilike.%${q1}%,destination.ilike.%${q1}%,country.ilike.%${q1}%,description.ilike.%${q1}%`);

    const foundAfterPrivate = searchAfterPrivate?.some(t => t.id === testTripId);
    console.log(`Trip found in search after being made private? ${foundAfterPrivate ? 'YES (BUG)' : 'NO (CORRECT)'}`);
    if (foundAfterPrivate) {
      throw new Error('Security violation: Made-private trip was still returned in search!');
    }

    // 8. Verify Explore and My Trips separation
    console.log('\n--- Step 8: Verify Explore and My Trips separation ---');
    const { data: exploreTrips } = await anonSupabase
      .from('trips')
      .select('*')
      .eq('trip_source', 'template');

    const inExplore = exploreTrips?.some(t => t.id === testTripId);
    console.log(`Personal trip appears in Explore templates? ${inExplore ? 'YES (BUG)' : 'NO (CORRECT)'}`);
    if (inExplore) {
      throw new Error('Architecture violation: Personal trip leaked into Explore templates!');
    }

    console.log('\n========================================');
    console.log('🎉 ALL COMMUNITY VISIBILITY & SEARCH TESTS PASSED');
    console.log('========================================\n');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    if (testTripId) {
      console.log(`Cleaning up test trip ID: ${testTripId}`);
      await serviceSupabase.from('activities').delete().eq('trip_id', testTripId);
      await serviceSupabase.from('itinerary_days').delete().eq('trip_id', testTripId);
      await serviceSupabase.from('trips').delete().eq('id', testTripId);
      console.log('Cleanup complete.');
    }
  }
}

runTests();
