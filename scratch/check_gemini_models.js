import dotenv from 'dotenv';
dotenv.config();

async function checkModels() {
  const key = process.env.GEMINI_DISCOVER_KEY_1;
  const modelsToTest = [
    'gemini-flash-latest',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.5-flash'
  ];

  for (const m of modelsToTest) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': key
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }]
        })
      });
      console.log(`Model ${m}: HTTP ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`  -> Output:`, data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      } else {
        const txt = await res.text();
        console.log(`  -> Error:`, txt.substring(0, 150));
      }
    } catch (e) {
      console.log(`Model ${m} exception:`, e.message);
    }
  }
}

checkModels().catch(console.error);
