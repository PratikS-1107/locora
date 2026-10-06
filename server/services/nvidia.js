import dotenv from 'dotenv';
import { executeWithKeyPool } from './keyManager.js';

dotenv.config();

/**
 * NVIDIA Conversational Discovery AI Service
 * 
 * Uses isolated 'CONVERSATIONAL' key pool:
 *   - NVIDIA_API_KEY (or NVIDIA_API_KEY_1 / NVIDIA_API_KEY_2)
 * 
 * Standard endpoint: https://integrate.api.nvidia.com/v1/chat/completions
 */
export const generateNvidiaResponse = async (messages, options = {}) => {
  const models = options.models || [
    options.model || 'meta/llama-3.2-11b-vision-instruct'
  ];
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens || 1024;

  return await executeWithKeyPool('CONVERSATIONAL', async (apiKey, keyIndex) => {
    const url = 'https://integrate.api.nvidia.com/v1/chat/completions';
    let lastError = null;

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: Array.isArray(messages) ? messages : [{ role: 'user', content: String(messages) }],
            temperature,
            max_tokens: maxTokens
          })
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            return content;
          }
        } else {
          const errText = await response.text();
          console.error(`[AI ERROR] Provider: NVIDIA | Model: ${model} | Pool: CONVERSATIONAL | Endpoint: ${url} | HTTP Status: ${response.status} | Error: ${errText}`);
          const err = new Error(`NVIDIA API (${model}) HTTP ${response.status}: ${errText}`);
          err.status = response.status;
          err.statusCode = response.status;
          if (response.status === 429 || response.status === 503) {
            throw err;
          }
          lastError = err;
        }
      } catch (fetchErr) {
        console.error(`[AI ERROR] Provider: NVIDIA | Model: ${model} | Pool: CONVERSATIONAL | Endpoint: ${url} | Message: ${fetchErr.message}`);
        if (fetchErr.status === 429 || fetchErr.statusCode === 429) {
          throw fetchErr;
        }
        lastError = fetchErr;
      }
    }

    throw lastError || new Error('All NVIDIA models failed for CONVERSATIONAL pool.');
  });
};
