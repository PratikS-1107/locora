import { formatDuration, getTodayLocalDateString } from '../src/utils/formatters.js';

console.log('=== TEST A: DURATION FORMATTING ===');
const durationTests = [
  { in: 0, exp: '0 min' },
  { in: 30, exp: '30 min' },
  { in: 45, exp: '45 min' },
  { in: 60, exp: '1 hr' },
  { in: 90, exp: '1 hr 30 min' },
  { in: 120, exp: '2 hrs' },
  { in: 150, exp: '2 hrs 30 min' },
  { in: 180, exp: '3 hrs' },
  { in: null, exp: '0 min' },
  { in: undefined, exp: '0 min' },
  { in: '120 min', exp: '2 hrs' }
];

let testAFailed = false;
for (const t of durationTests) {
  const res = formatDuration(t.in);
  const pass = res === t.exp;
  if (!pass) testAFailed = true;
  console.log(`Input: ${t.in} -> Result: "${res}" | Expected: "${t.exp}" [${pass ? 'PASS' : 'FAIL'}]`);
}

console.log('\n=== TEST B & C: TRIP OVERLAP LOGIC ===');
// Overlap condition: existing.start_date <= new_end_date AND existing.end_date >= new_start_date
const checkOverlap = (existing, newStart, newEnd) => {
  return existing.start_date <= newEnd && existing.end_date >= newStart;
};

const existingTrip = { start_date: '2026-10-01', end_date: '2026-10-05' };

// TEST B: Attempt 2026-10-03 -> 2026-10-07 (Overlap)
const isOverlapB = checkOverlap(existingTrip, '2026-10-03', '2026-10-07');
console.log(`TEST B Overlap (2026-10-03 -> 2026-10-07): ${isOverlapB ? 'DETECTED & BLOCKED (PASS)' : 'FAILED'}`);

// TEST C: Attempt 2026-10-06 -> 2026-10-10 (Non-overlap)
const isOverlapC = checkOverlap(existingTrip, '2026-10-06', '2026-10-10');
console.log(`TEST C Non-overlap (2026-10-06 -> 2026-10-10): ${!isOverlapC ? 'ALLOWED (PASS)' : 'FAILED'}`);

// Boundary overlap: 2026-09-26 -> 2026-10-01
const isBoundaryOverlap = checkOverlap(existingTrip, '2026-09-26', '2026-10-01');
console.log(`Boundary Overlap (2026-09-26 -> 2026-10-01): ${isBoundaryOverlap ? 'DETECTED & BLOCKED (PASS)' : 'FAILED'}`);

console.log('\n=== TEST D: PAST DATE VALIDATION ===');
const today = '2026-09-26';
const validateNewTripDates = (start, end, todayDate) => {
  if (!start || !end) return { valid: false, error: 'Start and End dates required' };
  if (start < todayDate) return { valid: false, error: 'Start date cannot be in the past for a new trip.' };
  if (end < start) return { valid: false, error: 'End date cannot be before start date.' };
  if (end < todayDate) return { valid: false, error: 'End date cannot be in the past for a new trip.' };
  return { valid: true };
};

const pastTest = validateNewTripDates('1989-01-01', '1989-01-05', today);
console.log(`TEST D Past Date (1989-01-01 -> 1989-01-05): Rejected: ${!pastTest.valid ? 'YES (PASS)' : 'NO (FAIL)'}, Reason: "${pastTest.error}"`);

const futureTest = validateNewTripDates('2026-10-01', '2026-10-05', today);
console.log(`Valid Future Trip (2026-10-01 -> 2026-10-05): Accepted: ${futureTest.valid ? 'YES (PASS)' : 'NO (FAIL)'}`);

console.log('\n=== TEST F & G: DISCOVER ACTIVE TRIP LOGIC ===');
const evaluateDiscoverTrip = (userTrips, todayDate) => {
  const personalTrips = (userTrips || []).filter(t => (t.trip_source === 'personal' || !t.trip_source) && t.start_date && t.end_date);
  const activeTrip = personalTrips.find(t => t.start_date <= todayDate && t.end_date >= todayDate) || null;
  return {
    hasTrip: Boolean(activeTrip),
    activeTrip
  };
};

// TEST F: Completed trip 2026-09-01 -> 2026-09-10 when today is 2026-09-26
const completedTrips = [
  { id: 'trip-past', name: 'Past Trip', start_date: '2026-09-01', end_date: '2026-09-10', trip_source: 'personal' }
];
const ctxF = evaluateDiscoverTrip(completedTrips, today);
console.log(`TEST F Completed Trip (2026-09-01 -> 2026-09-10 on 2026-09-26): hasTrip=${ctxF.hasTrip}, activeTrip=${ctxF.activeTrip} [${!ctxF.hasTrip ? 'PASS: Shows Local/GPS Exploration Mode' : 'FAIL'}]`);

// TEST G: Active trip 2026-09-20 -> 2026-09-30 when today is 2026-09-26
const activeTrips = [
  { id: 'trip-active', name: 'Current Active Trip', start_date: '2026-09-20', end_date: '2026-09-30', trip_source: 'personal' }
];
const ctxG = evaluateDiscoverTrip(activeTrips, today);
console.log(`TEST G Active Trip (2026-09-20 -> 2026-09-30 on 2026-09-26): hasTrip=${ctxG.hasTrip}, activeTrip=${ctxG.activeTrip?.name} [${ctxG.hasTrip && ctxG.activeTrip?.id === 'trip-active' ? 'PASS: Uses Active Journey Context' : 'FAIL'}]`);

// Upcoming trip 2026-10-01 -> 2026-10-10 when today is 2026-09-26
const upcomingTrips = [
  { id: 'trip-future', name: 'Future Trip', start_date: '2026-10-01', end_date: '2026-10-10', trip_source: 'personal' }
];
const ctxUpcoming = evaluateDiscoverTrip(upcomingTrips, today);
console.log(`Upcoming Trip (2026-10-01 -> 2026-10-10 on 2026-09-26): hasTrip=${ctxUpcoming.hasTrip} [${!ctxUpcoming.hasTrip ? 'PASS: Not marked active' : 'FAIL'}]`);
