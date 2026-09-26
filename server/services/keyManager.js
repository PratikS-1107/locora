import dotenv from 'dotenv';
dotenv.config();

/**
 * Server-Side AI API Key Management Infrastructure for Locora
 * 
 * Manages isolated key pools with automated failover and cooldowns:
 *   - DISCOVER: GEMINI_DISCOVER_KEY_1, GEMINI_DISCOVER_KEY_2 (fallback to GEMINI_API_KEY)
 *   - RECOMMENDATION: GEMINI_RECOMMENDATION_KEY_1, GEMINI_RECOMMENDATION_KEY_2 (fallback to GEMINI_API_KEY)
 *   - CONVERSATIONAL: NVIDIA_API_KEY / NVIDIA_API_KEY_1, NVIDIA_API_KEY_2
 * 
 * Strict Security Guidelines:
 *   - Server-side execution only (never bundled into Vite/client)
 *   - Never logs raw API keys, Authorization headers, or tokens
 *   - Quota/Rate-limit (429) triggers cooldown and seamless rotation to Key 2
 *   - Non-rate-limit errors (e.g. 400 Bad Request) do not rotate keys
 */

const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes cooldown on 429 / quota limit

// In-memory cooldown tracking per pool and key index
const cooldownState = {
  DISCOVER: { 1: 0, 2: 0 },
  RECOMMENDATION: { 1: 0, 2: 0 },
  CONVERSATIONAL: { 1: 0, 2: 0 }
};

/**
 * Check if a given error indicates a rate-limit or quota exhaustion.
 */
export const isRateLimitOrQuotaError = (error, status) => {
  if (status === 429 || status === 503) return true;
  if (!error) return false;

  const msg = typeof error === 'string' ? error : (error.message || '');
  const lower = msg.toLowerCase();

  return (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('resource_exhausted') ||
    lower.includes('too many requests') ||
    lower.includes('exceeded your current quota') ||
    lower.includes('service unavailable')
  );
};

/**
 * Retrieve configured keys for a specific pool.
 * Does not expose key values in return objects intended for logging.
 */
const getPoolKeys = (poolName) => {
  const norm = (poolName || '').toUpperCase();

  if (norm === 'DISCOVER') {
    const key1 = process.env.GEMINI_DISCOVER_KEY_1 || null;
    const key2 = process.env.GEMINI_DISCOVER_KEY_2 || null;
    return [
      { index: 1, key: isValidKey(key1) ? key1 : null },
      { index: 2, key: isValidKey(key2) ? key2 : null }
    ];
  }

  if (norm === 'RECOMMENDATION') {
    const key1 = process.env.GEMINI_RECOMMENDATION_KEY_1 || null;
    const key2 = process.env.GEMINI_RECOMMENDATION_KEY_2 || null;
    return [
      { index: 1, key: isValidKey(key1) ? key1 : null },
      { index: 2, key: isValidKey(key2) ? key2 : null }
    ];
  }

  if (norm === 'CONVERSATIONAL') {
    const key1 = process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY_1 || null;
    const key2 = process.env.NVIDIA_API_KEY_2 || null;
    return [
      { index: 1, key: isValidKey(key1) ? key1 : null },
      { index: 2, key: isValidKey(key2) ? key2 : null }
    ];
  }

  throw new Error(`[AI KeyManager] Unknown key pool: "${poolName}". Supported pools: DISCOVER, RECOMMENDATION, CONVERSATIONAL`);
};

const isValidKey = (key) => {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  return (
    trimmed.length > 5 &&
    !trimmed.startsWith('YOUR_') &&
    !trimmed.includes('your-') &&
    !trimmed.includes('placeholder')
  );
};

const getPoolDisplayName = (poolName) => {
  const norm = (poolName || '').toUpperCase();
  if (norm === 'DISCOVER') return 'Discover';
  if (norm === 'RECOMMENDATION') return 'Recommendation';
  if (norm === 'CONVERSATIONAL') return 'Conversational';
  return poolName;
};

/**
 * Execute an API operation using the isolated key pool with automatic failover.
 * 
 * @param {string} poolName - 'DISCOVER' | 'RECOMMENDATION' | 'CONVERSATIONAL'
 * @param {Function} requestFn - async (apiKey, keyIndex) => result
 * @returns {Promise<any>} Result from successful execution
 */
export const executeWithKeyPool = async (poolName, requestFn) => {
  const pool = (poolName || 'DISCOVER').toUpperCase();
  const poolLabel = getPoolDisplayName(pool);
  const keys = getPoolKeys(pool);
  const now = Date.now();

  if (!cooldownState[pool]) {
    cooldownState[pool] = { 1: 0, 2: 0 };
  }

  // Filter available configured keys
  const configuredKeys = keys.filter(k => Boolean(k.key));

  if (configuredKeys.length === 0) {
    const envVarNames = pool === 'DISCOVER'
      ? 'GEMINI_DISCOVER_KEY_1 / GEMINI_DISCOVER_KEY_2'
      : pool === 'RECOMMENDATION'
      ? 'GEMINI_RECOMMENDATION_KEY_1 / GEMINI_RECOMMENDATION_KEY_2'
      : 'NVIDIA_API_KEY';

    throw new Error(`[AI KeyManager] No API key configured for ${poolLabel} pool. Please set ${envVarNames} in server environment.`);
  }

  // Determine candidate execution order based on cooldowns
  // If Key 1 is on cooldown but Key 2 is available, try Key 2 first.
  let candidates = [...configuredKeys].sort((a, b) => {
    const aCool = cooldownState[pool][a.index] > now ? 1 : 0;
    const bCool = cooldownState[pool][b.index] > now ? 1 : 0;
    return aCool - bCool || a.index - b.index;
  });

  let lastError = null;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const keyIndex = candidate.index;
    const isUnderCooldown = cooldownState[pool][keyIndex] > now;

    if (isUnderCooldown && configuredKeys.length > 1 && i === 0 && cooldownState[pool][candidates[1]?.index] <= now) {
      // Primary key is under cooldown, skipping directly to next key
      continue;
    }

    console.log(`[AI] ${poolLabel} request using key ${keyIndex}`);

    try {
      const result = await requestFn(candidate.key, keyIndex);
      // Reset cooldown on successful response
      cooldownState[pool][keyIndex] = 0;
      return result;
    } catch (err) {
      lastError = err;
      const isRateLimit = isRateLimitOrQuotaError(err, err?.status || err?.statusCode || err?.response?.status);

      if (isRateLimit) {
        // Mark key on cooldown
        cooldownState[pool][keyIndex] = Date.now() + COOLDOWN_DURATION_MS;

        const nextCandidate = candidates[i + 1];
        if (nextCandidate) {
          console.warn(`[AI] ${poolLabel} key ${keyIndex} rate limited, switching to key ${nextCandidate.index}`);
          continue; // Seamless failover to next key in pool
        } else {
          console.error(`[AI] ${poolLabel} key ${keyIndex} rate limited. No backup key available in pool.`);
        }
      } else {
        // Ordinary error (validation, malformed request, parse error) -> DO NOT switch keys
        throw err;
      }
    }
  }

  // If all keys in pool failed or are exhausted
  const structuredError = new Error(`[AI] All configured keys for ${poolLabel} pool failed or are currently rate-limited.`);
  structuredError.originalError = lastError;
  structuredError.pool = pool;
  structuredError.isRateLimited = true;
  throw structuredError;
};

/**
 * Get status of a key pool (for diagnostics/monitoring, never returns key strings).
 */
export const getKeyPoolStatus = (poolName) => {
  const pool = (poolName || '').toUpperCase();
  const keys = getPoolKeys(pool);
  const now = Date.now();

  return keys.map(k => ({
    index: k.index,
    isConfigured: Boolean(k.key),
    isAvailable: Boolean(k.key) && (cooldownState[pool]?.[k.index] || 0) <= now,
    cooldownRemainingSeconds: Math.max(0, Math.round(((cooldownState[pool]?.[k.index] || 0) - now) / 1000))
  }));
};

/**
 * Reset cooldown state (useful for tests and manual health-checks).
 */
export const resetKeyPoolCooldowns = (poolName = null) => {
  if (poolName) {
    const p = poolName.toUpperCase();
    if (cooldownState[p]) cooldownState[p] = { 1: 0, 2: 0 };
  } else {
    for (const p of Object.keys(cooldownState)) {
      cooldownState[p] = { 1: 0, 2: 0 };
    }
  }
};
