import { extractTravelIntentWithNvidia, sanitizeAndMergeState, DEFAULT_CONVERSATION_STATE } from '../server/services/conversationalEngine.js';

async function testHeuristicSafetyNet() {
  console.log('====================================================');
  console.log('   HEURISTIC SAFETY NET — FINAL VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  const check = (label, condition, detail) => {
    total++;
    if (condition) { passed++; console.log(`  ✓ ${label}`); }
    else { console.log(`  ✗ ${label}`, detail || ''); }
  };

  // ── PRIMARY TEST: the exact message from the bug report ──
  console.log('[TEST A] "i am in thane i have 4 hrs i want to eat what should i have ?"');
  const a = await extractTravelIntentWithNvidia({
    message: 'i am in thane i have 4 hrs i want to eat what should i have ?',
    history: [],
    currentState: DEFAULT_CONVERSATION_STATE,
    clientContext: {}
  });
  check('isTravel = true', a.isTravel === true, { got: a.isTravel });
  check('destination includes Thane', a.updatedState?.destination?.toLowerCase() === 'thane', { got: a.updatedState?.destination });
  check('availableMinutes = 240', a.updatedState?.availableMinutes === 240, { got: a.updatedState?.availableMinutes });
  check('category = food', a.updatedState?.category === 'food', { got: a.updatedState?.category });
  check('action = recommend', a.action === 'recommend', { got: a.action });

  // ── PRIMARY REFUSAL TEST ──
  console.log('\n[TEST B] "tell me a joke"');
  const b = await extractTravelIntentWithNvidia({
    message: 'tell me a joke',
    history: [],
    currentState: DEFAULT_CONVERSATION_STATE,
    clientContext: {}
  });
  check('isTravel = false', b.isTravel === false, { got: b.isTravel });
  check('refusal message present', !!b.refusalMessage, { got: b.refusalMessage });

  // ── MUST-WORK EXTRAS ──
  console.log('\n[TEST C] "what should i eat in thane?"');
  const c = await extractTravelIntentWithNvidia({
    message: 'what should i eat in thane?',
    history: [], currentState: DEFAULT_CONVERSATION_STATE, clientContext: {}
  });
  check('isTravel = true', c.isTravel === true, { got: c.isTravel });

  console.log('\n[TEST D] "find me a cafe"');
  const d = await extractTravelIntentWithNvidia({
    message: 'find me a cafe',
    history: [], currentState: DEFAULT_CONVERSATION_STATE, clientContext: {}
  });
  check('isTravel = true', d.isTravel === true, { got: d.isTravel });

  console.log('\n[TEST E] "i want dinner"');
  const e = await extractTravelIntentWithNvidia({
    message: 'i want dinner',
    history: [], currentState: DEFAULT_CONVERSATION_STATE, clientContext: {}
  });
  check('isTravel = true', e.isTravel === true, { got: e.isTravel });

  console.log('\n[TEST F] "i have ₹500 what can i do?"');
  const f = await extractTravelIntentWithNvidia({
    message: 'i have ₹500 what can i do?',
    history: [], currentState: DEFAULT_CONVERSATION_STATE, clientContext: {}
  });
  check('isTravel = true', f.isTravel === true, { got: f.isTravel });

  // ── MUST-REFUSE EXTRAS ──
  console.log('\n[TEST G] "write Python code"');
  const g = await extractTravelIntentWithNvidia({
    message: 'write Python code',
    history: [], currentState: DEFAULT_CONVERSATION_STATE, clientContext: {}
  });
  check('isTravel = false', g.isTravel === false, { got: g.isTravel });

  console.log('\n[TEST H] "explain quantum physics"');
  const h = await extractTravelIntentWithNvidia({
    message: 'explain quantum physics',
    history: [], currentState: DEFAULT_CONVERSATION_STATE, clientContext: {}
  });
  check('isTravel = false', h.isTravel === false, { got: h.isTravel });

  console.log('\n====================================================');
  console.log(`   RESULT: ${passed}/${total} checks passed`);
  console.log('====================================================');
}

testHeuristicSafetyNet().catch(console.error);


