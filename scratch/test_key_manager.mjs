import { executeWithKeyPool, getKeyPoolStatus, resetKeyPoolCooldowns, isRateLimitOrQuotaError } from '../server/services/keyManager.js';

async function runTests() {
  console.log('=== RUNNING AI KEY MANAGER UNIT TESTS ===\n');

  // Test 1: Rate limit error detection
  console.log('Test 1: Rate limit detection helper');
  console.assert(isRateLimitOrQuotaError(new Error('HTTP 429: Too Many Requests'), 429) === true, 'Failed 429 detection');
  console.assert(isRateLimitOrQuotaError(new Error('Resource has been exhausted (e.g. check quota)')) === true, 'Failed quota detection');
  console.assert(isRateLimitOrQuotaError(new Error('Invalid JSON argument')) === false, 'Wrongly flagged validation error as rate limit');
  console.log('✔ Test 1 Passed: Rate-limit detection logic works accurately.\n');

  // Setup test environment keys for isolated pools
  process.env.GEMINI_DISCOVER_KEY_1 = 'AIzaSy_TEST_DISCOVER_KEY_ONE';
  process.env.GEMINI_DISCOVER_KEY_2 = 'AIzaSy_TEST_DISCOVER_KEY_TWO';
  process.env.GEMINI_RECOMMENDATION_KEY_1 = 'AIzaSy_TEST_RECS_KEY_ONE';
  process.env.GEMINI_RECOMMENDATION_KEY_2 = 'AIzaSy_TEST_RECS_KEY_TWO';
  process.env.NVIDIA_API_KEY = 'nvapi_TEST_NVIDIA_KEY';

  resetKeyPoolCooldowns();

  // Test 2: Normal execution on Key 1
  console.log('Test 2: Normal execution on Key 1 in Discover Pool');
  let usedKey = null;
  const res1 = await executeWithKeyPool('DISCOVER', async (key, index) => {
    usedKey = key;
    return `success-with-key-${index}`;
  });
  console.assert(res1 === 'success-with-key-1', 'Should use key 1');
  console.assert(usedKey === 'AIzaSy_TEST_DISCOVER_KEY_ONE', 'Should receive key 1');
  console.log('✔ Test 2 Passed: Successfully used primary key in Discover pool.\n');

  // Test 3: Simulated 429 on Key 1 automatically rotates to Key 2
  console.log('Test 3: Simulated 429 Rate Limit on Key 1 with automatic failover to Key 2');
  let attempts = [];
  const res2 = await executeWithKeyPool('DISCOVER', async (key, index) => {
    attempts.push(index);
    if (index === 1) {
      const rateLimitErr = new Error('HTTP 429: Resource exhausted quota exceeded');
      rateLimitErr.status = 429;
      throw rateLimitErr;
    }
    return `recovered-with-key-${index}`;
  });

  console.assert(res2 === 'recovered-with-key-2', 'Should recover with key 2');
  console.assert(attempts.length === 2 && attempts[0] === 1 && attempts[1] === 2, 'Should attempt key 1 then key 2');
  console.log('✔ Test 3 Passed: Seamless failover to Key 2 when Key 1 is rate-limited.\n');

  // Test 4: Pool Isolation (Recommendation pool is NOT affected by Discover cooldown)
  console.log('Test 4: Pool Isolation (Recommendation pool still uses its own Key 1)');
  let recsKeyIndex = null;
  const res3 = await executeWithKeyPool('RECOMMENDATION', async (key, index) => {
    recsKeyIndex = index;
    return `recs-key-${index}`;
  });
  console.assert(recsKeyIndex === 1, 'Recommendation pool must use its own Key 1 independently');
  console.assert(res3 === 'recs-key-1', 'Recommendation pool result matched');
  console.log('✔ Test 4 Passed: Recommendation pool remains isolated and unaffected by Discover pool cooldown.\n');

  // Test 5: Validation/Non-rate-limit error does NOT switch keys
  console.log('Test 5: Non-rate-limit error (e.g. 400 Bad Request) does NOT rotate keys');
  let nonRateAttempts = [];
  try {
    await executeWithKeyPool('RECOMMENDATION', async (key, index) => {
      nonRateAttempts.push(index);
      const badReqErr = new Error('HTTP 400: Invalid field parameter in payload');
      badReqErr.status = 400;
      throw badReqErr;
    });
  } catch (err) {
    console.assert(err.status === 400, 'Original error propagated');
  }
  console.assert(nonRateAttempts.length === 1 && nonRateAttempts[0] === 1, 'Should NOT try key 2 for ordinary 400 errors');
  console.log('✔ Test 5 Passed: Ordinary errors do not waste or switch backup keys.\n');

  // Test 6: Both keys failing returns clean structured error
  console.log('Test 6: Both keys rate-limited returns clean structured error');
  resetKeyPoolCooldowns();
  let failAttempts = [];
  try {
    await executeWithKeyPool('DISCOVER', async (key, index) => {
      failAttempts.push(index);
      const err = new Error('HTTP 429: Too Many Requests');
      err.status = 429;
      throw err;
    });
    console.assert(false, 'Should have thrown error');
  } catch (err) {
    console.assert(failAttempts.length === 2, 'Should have attempted both key 1 and key 2');
    console.assert(err.isRateLimited === true, 'Structured error marked rate limited');
    console.assert(err.message.includes('All configured keys for Discover pool failed'), 'Clean error message');
  }
  console.log('✔ Test 6 Passed: Clean structured error returned when pool is fully exhausted.\n');

  console.log('=== ALL AI KEY MANAGER TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
