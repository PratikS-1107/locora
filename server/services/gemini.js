import dotenv from 'dotenv';
dotenv.config();

/**
 * Gemini API Service (Server-side execution only)
 * Resilient multi-model fallback to ensure high availability against 503 spikes.
 */
export const generateGeminiResponse = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_NEW_GEMINI_API_KEY' || apiKey.includes('YOUR_')) {
    throw new Error('GEMINI_API_KEY environment variable is missing or unconfigured on server.');
  }

  const models = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-flash-latest'
  ];

  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        },
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
        lastError = new Error(`Gemini API (${model}) HTTP ${response.status}: ${errText}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini model endpoints failed.');
};
