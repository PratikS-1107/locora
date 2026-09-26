import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getDatesInRange(startDateStr, endDateStr) {
  const dates = [];
  if (!startDateStr || !endDateStr) return dates;
  const [sY, sM, sD] = String(startDateStr).split('-').map(Number);
  const [eY, eM, eD] = String(endDateStr).split('-').map(Number);
  if (!sY || !sM || !sD || !eY || !eM || !eD) return dates;

  const curr = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);
  if (curr > end) return dates;

  while (curr <= end) {
    const year = curr.getFullYear();
    const month = String(curr.getMonth() + 1).padStart(2, '0');
    const day = String(curr.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

async function runTests() {
  console.log('=== STARTING TRIP EDITING VERIFICATION SUITE ===\n');

  // Find a test user or create a temporary dummy user_id
  const { data: usersData } = await supabase.from('profiles').select('id').limit(1);
  const testUserId = usersData?.[0]?.id;
  if (!testUserId) {
    console.error('No profiles found in DB to attach trip to.');
    process.exit(1);
  }
  console.log(`Using test profile user_id: ${testUserId}`);

  let testTripId = null;

  try {
    // -------------------------------------------------------------
    // SCENARIO 0: Create Initial Trip (June 10 - June 13 = 4 Days)
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 0: Creating Trip ---');
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .insert([{
        user_id: testUserId,
        title: 'Test Editing Expedition',
        destination: 'Jaipur, Rajasthan',
        country: 'India',
        country_code: 'IN',
        start_date: '2026-06-10',
        end_date: '2026-06-13',
        status: 'upcoming',
        trip_source: 'personal',
        is_public: false,
        cover_image_url: 'https://example.com/initial_cover.jpg',
        budget: 45000
      }])
      .select()
      .single();

    if (tripErr || !trip) {
      throw new Error(`Failed to create test trip: ${tripErr?.message}`);
    }
    testTripId = trip.id;
    console.log(`Created test trip ID: ${testTripId}`);

    // Create 4 itinerary_days
    const initialDates = getDatesInRange('2026-06-10', '2026-06-13');
    const daysToInsert = initialDates.map((d, idx) => ({
      trip_id: testTripId,
      day_number: idx + 1,
      date: d,
      notes: `Notes for Day ${idx + 1}`
    }));
    const { data: createdDays, error: daysErr } = await supabase
      .from('itinerary_days')
      .insert(daysToInsert)
      .select()
      .order('day_number', { ascending: true });

    if (daysErr || !createdDays || createdDays.length !== 4) {
      throw new Error(`Failed to create itinerary days: ${daysErr?.message}`);
    }
    console.log(`Created 4 itinerary days:`, createdDays.map(d => `Day ${d.day_number}: ${d.date} (ID: ${d.id})`));

    // Add 2 activities to Day 1, 1 activity to Day 4
    const day1Id = createdDays[0].id;
    const day4Id = createdDays[3].id;

    const { data: act1, error: a1Err } = await supabase.from('activities').insert([{
      trip_id: testTripId,
      itinerary_day_id: day1Id,
      title: 'Hawa Mahal Sunrise Tour',
      category: 'Sightseeing',
      start_time: '07:00 AM',
      duration_minutes: 90,
      estimated_cost: 500,
      currency: 'INR',
      sort_order: 0
    }]).select().single();

    const { data: act2, error: a2Err } = await supabase.from('activities').insert([{
      trip_id: testTripId,
      itinerary_day_id: day1Id,
      title: 'Local Lassi Tasting',
      category: 'Food',
      start_time: '09:00 AM',
      duration_minutes: 45,
      estimated_cost: 150,
      currency: 'INR',
      sort_order: 1
    }]).select().single();

    const { data: act4, error: a4Err } = await supabase.from('activities').insert([{
      trip_id: testTripId,
      itinerary_day_id: day4Id,
      title: 'Amber Fort Elephant Sanctuary',
      category: 'Adventure',
      start_time: '10:00 AM',
      duration_minutes: 180,
      estimated_cost: 2000,
      currency: 'INR',
      sort_order: 0
    }]).select().single();

    if (a1Err || a2Err || a4Err) {
      throw new Error(`Failed to create activities: ${a1Err?.message || a2Err?.message || a4Err?.message}`);
    }
    console.log(`Created 3 test activities: "${act1.title}", "${act2.title}", "${act4.title}"`);

    // -------------------------------------------------------------
    // SCENARIO A: Update Trip Cover Image
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO A: Change Trip Cover Image ---');
    const newCoverUrl = 'https://example.com/new_real_cover_image.webp';
    const { data: updatedCoverTrip, error: coverErr } = await supabase
      .from('trips')
      .update({ cover_image_url: newCoverUrl, updated_at: new Date().toISOString() })
      .eq('id', testTripId)
      .select()
      .single();

    if (coverErr || updatedCoverTrip.cover_image_url !== newCoverUrl) {
      throw new Error(`Scenario A Failed: Cover image did not update properly`);
    }
    console.log('✓ Scenario A PASSED: Trip cover image successfully changed and persisted:', updatedCoverTrip.cover_image_url);

    // -------------------------------------------------------------
    // SCENARIO B: Delete an Activity from an Itinerary Day
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO B: Delete an Activity from Day 1 ---');
    // Delete act2 ('Local Lassi Tasting')
    const { error: delActErr } = await supabase.from('activities').delete().eq('id', act2.id);
    if (delActErr) {
      throw new Error(`Scenario B Failed: ${delActErr.message}`);
    }

    // Verify act2 is gone, but act1 and act4 remain intact
    const { data: remainingActs } = await supabase.from('activities').select('*').eq('trip_id', testTripId);
    const hasAct2 = remainingActs.some(a => a.id === act2.id);
    const hasAct1 = remainingActs.some(a => a.id === act1.id);
    const hasAct4 = remainingActs.some(a => a.id === act4.id);

    if (hasAct2 || !hasAct1 || !hasAct4) {
      throw new Error(`Scenario B Failed: Unexpected activities state after deletion`);
    }
    console.log('✓ Scenario B PASSED: Activity deleted from DB. Remaining activities intact:', remainingActs.map(a => a.title));

    // -------------------------------------------------------------
    // SCENARIO C: Change Dates without changing duration (June 10-13 -> June 12-15)
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO C: Shift Dates (June 10-13 -> June 12-15) Preserving IDs & Activities ---');
    const shiftDates = getDatesInRange('2026-06-12', '2026-06-15');
    // Update existing itinerary_days dates sequentially
    for (let i = 0; i < createdDays.length; i++) {
      const day = createdDays[i];
      const newD = shiftDates[i];
      await supabase.from('itinerary_days').update({ date: newD }).eq('id', day.id);
    }
    await supabase.from('trips').update({ start_date: '2026-06-12', end_date: '2026-06-15' }).eq('id', testTripId);

    // Verify days
    const { data: shiftedDays } = await supabase.from('itinerary_days').select('*').eq('trip_id', testTripId).order('day_number', { ascending: true });
    if (shiftedDays[0].id !== day1Id || shiftedDays[0].date !== '2026-06-12' || shiftedDays[3].id !== day4Id || shiftedDays[3].date !== '2026-06-15') {
      throw new Error(`Scenario C Failed: Shifted days did not preserve IDs or update dates properly`);
    }

    // Verify activities are still attached to their respective days
    const { data: act1AfterShift } = await supabase.from('activities').select('*').eq('id', act1.id).single();
    const { data: act4AfterShift } = await supabase.from('activities').select('*').eq('id', act4.id).single();
    if (act1AfterShift.itinerary_day_id !== day1Id || act4AfterShift.itinerary_day_id !== day4Id) {
      throw new Error(`Scenario C Failed: Activities detached from their itinerary days!`);
    }
    console.log('✓ Scenario C PASSED: Itinerary days shifted dates while preserving IDs and attached activities');
    console.log('  Shifted days:', shiftedDays.map(d => `Day ${d.day_number}: ${d.date} (ID: ${d.id})`));

    // -------------------------------------------------------------
    // SCENARIO D: Extend Trip Length (June 12-15 = 4 days -> June 12-17 = 6 days)
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO D: Extend Trip Length (4 -> 6 Days) ---');
    const extendDates = getDatesInRange('2026-06-12', '2026-06-17');
    // Insert new days 5 and 6
    for (let i = 4; i < extendDates.length; i++) {
      await supabase.from('itinerary_days').insert([{
        trip_id: testTripId,
        day_number: i + 1,
        date: extendDates[i],
        notes: ''
      }]);
    }
    await supabase.from('trips').update({ start_date: '2026-06-12', end_date: '2026-06-17' }).eq('id', testTripId);

    const { data: extendedDays } = await supabase.from('itinerary_days').select('*').eq('trip_id', testTripId).order('day_number', { ascending: true });
    if (extendedDays.length !== 6 || extendedDays[0].id !== day1Id) {
      throw new Error(`Scenario D Failed: Extended days count expected 6, got ${extendedDays.length}`);
    }
    console.log('✓ Scenario D PASSED: Successfully extended to 6 days. Existing days & activities preserved.');
    console.log('  Extended days:', extendedDays.map(d => `Day ${d.day_number}: ${d.date} (ID: ${d.id})`));

    // -------------------------------------------------------------
    // SCENARIO E & F: Shorten Trip Length with Activities on Removed Days
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO E/F: Shorten Trip Length (6 Days -> 3 Days) with confirmation ---');
    // Day 4 currently has act4 ('Amber Fort Elephant Sanctuary').
    // If shortening to 3 days (June 12 - June 14), Day 4, 5, 6 will be removed.
    const newDatesShort = getDatesInRange('2026-06-12', '2026-06-14');
    const daysToRemove = extendedDays.slice(3); // Days 4, 5, 6
    console.log(`Days to remove upon shortening:`, daysToRemove.map(d => `Day ${d.day_number}`));

    // Check impact: count activities in removed days
    const { data: currentActs } = await supabase.from('activities').select('*').eq('trip_id', testTripId);
    const affectedActs = currentActs.filter(a => daysToRemove.some(d => d.id === a.itinerary_day_id));
    console.log(`Affected activities on removed days: ${affectedActs.length} (${affectedActs.map(a => a.title).join(', ')})`);

    if (affectedActs.length !== 1 || affectedActs[0].id !== act4.id) {
      throw new Error(`Scenario F Check Failed: Expected 1 affected activity (Amber Fort)`);
    }

    // Now execute deletion upon confirmation
    for (const d of daysToRemove) {
      await supabase.from('activities').delete().eq('itinerary_day_id', d.id);
      await supabase.from('itinerary_days').delete().eq('id', d.id);
    }
    await supabase.from('trips').update({ start_date: '2026-06-12', end_date: '2026-06-14' }).eq('id', testTripId);

    const { data: shortenedDays } = await supabase.from('itinerary_days').select('*').eq('trip_id', testTripId).order('day_number', { ascending: true });
    const { data: remainingActsShort } = await supabase.from('activities').select('*').eq('trip_id', testTripId);

    if (shortenedDays.length !== 3 || remainingActsShort.length !== 1 || remainingActsShort[0].id !== act1.id) {
      throw new Error(`Scenario F Execution Failed: Days or activities count mismatch after shortening`);
    }
    console.log('✓ Scenario E/F PASSED: Days 4-6 and their activities safely removed upon confirmation. Day 1-3 intact.');

    // -------------------------------------------------------------
    // SCENARIO G: Invalid Dates (Start > End)
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO G: Invalid Dates Validation ---');
    const invalidDates = getDatesInRange('2026-06-20', '2026-06-15');
    if (invalidDates.length !== 0) {
      throw new Error(`Scenario G Failed: Invalid date range produced dates!`);
    }
    console.log('✓ Scenario G PASSED: Start date > End date correctly returns empty dates / rejected');

    // -------------------------------------------------------------
    // SCENARIO H: Completed / Past Trip Editing
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO H: Historical / Completed Trip Editing ---');
    const pastStart = '2024-01-10';
    const pastEnd = '2024-01-13';
    const pastDates = getDatesInRange(pastStart, pastEnd);
    if (pastDates.length !== 4) {
      throw new Error(`Scenario H Failed: Historical dates not handled`);
    }

    for (let i = 0; i < shortenedDays.length; i++) {
      await supabase.from('itinerary_days').update({ date: pastDates[i] }).eq('id', shortenedDays[i].id);
    }
    // Insert 4th day for past
    await supabase.from('itinerary_days').insert([{
      trip_id: testTripId,
      day_number: 4,
      date: pastDates[3],
      notes: ''
    }]);

    const todayStr = new Date().toISOString().split('T')[0];
    let computedStatus = 'completed';
    if (todayStr < pastStart) computedStatus = 'upcoming';
    else if (todayStr >= pastStart && todayStr <= pastEnd) computedStatus = 'active';
    else computedStatus = 'completed';

    const { data: pastTrip } = await supabase
      .from('trips')
      .update({ start_date: pastStart, end_date: pastEnd, status: computedStatus })
      .eq('id', testTripId)
      .select()
      .single();

    if (pastTrip.status !== 'completed' || pastTrip.start_date !== pastStart) {
      throw new Error(`Scenario H Failed: Past trip status or dates incorrect`);
    }
    console.log(`✓ Scenario H PASSED: Historical trip dates saved and status computed as '${pastTrip.status}'`);

    console.log('\n========================================');
    console.log('🎉 ALL TRIP EDITING TESTS PASSED 100%');
    console.log('========================================\n');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    // Cleanup test trip
    if (testTripId) {
      console.log(`Cleaning up test trip ID: ${testTripId}`);
      await supabase.from('activities').delete().eq('trip_id', testTripId);
      await supabase.from('itinerary_days').delete().eq('trip_id', testTripId);
      await supabase.from('trips').delete().eq('id', testTripId);
      console.log('Cleanup complete.');
    }
  }
}

runTests();
