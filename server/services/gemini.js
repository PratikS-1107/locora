import dotenv from 'dotenv';
import { executeWithKeyPool } from './keyManager.js';

dotenv.config();

/**
 * Gemini AI Service with Automated Key Rotation & Multi-Model Fallback
 * 
 * Supports isolated pools:
 *   - 'DISCOVER' (GEMINI_DISCOVER_KEY_1 / GEMINI_DISCOVER_KEY_2)
 *   - 'RECOMMENDATION' (GEMINI_RECOMMENDATION_KEY_1 / GEMINI_RECOMMENDATION_KEY_2)
 * 
 * Fallback Models:
 *   - gemini-1.5-flash
 *   - gemini-2.0-flash
 *   - gemini-1.5-pro
 *   - gemini-flash-latest
 */
export const generateGeminiResponse = async (prompt, options = {}) => {
  const pool = (typeof options === 'string' ? options : options?.pool || 'DISCOVER').toUpperCase();
  const models = options?.models || [
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest'
  ];

  return await executeWithKeyPool(pool, async (apiKey, keyIndex) => {
    let lastError = null;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey
          },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            return generatedText;
          }
        } else {
          const errText = await response.text();
          console.error(`[AI ERROR] Provider: Google Gemini | Model: ${model} | Pool: ${pool} | Endpoint: ${url} | HTTP Status: ${response.status} | Error: ${errText}`);
          const err = new Error(`Gemini API (${model}) HTTP ${response.status}: ${errText}`);
          err.status = response.status;
          err.statusCode = response.status;

          // If rate limited or quota exceeded on this model, throw immediately so keyManager can switch keys
          if (response.status === 429 || response.status === 503 || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('quota')) {
            throw err;
          }

          lastError = err;
        }
      } catch (fetchErr) {
        console.error(`[AI ERROR] Provider: Google Gemini | Model: ${model} | Pool: ${pool} | Endpoint: ${url} | Message: ${fetchErr.message}`);
        // If it's already a rate limit error, propagate it directly for key failover
        if (fetchErr.status === 429 || fetchErr.statusCode === 429 || fetchErr.message?.includes('RESOURCE_EXHAUSTED') || fetchErr.message?.includes('429')) {
          throw fetchErr;
        }
        lastError = fetchErr;
      }
    }

    throw lastError || new Error(`All Gemini models failed for ${pool} pool.`);
  });
};
