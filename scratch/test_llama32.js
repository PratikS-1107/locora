import dotenv from 'dotenv';
dotenv.config();

async function testOthers() {
  const key = process.env.NVIDIA_API_KEY;
  const models = [
    'meta/llama-3.2-11b-vision-instruct',
    'meta/llama-3.2-3b-instruct',
    'meta/llama-3.2-1b-instruct',
    'meta/llama-3.2-90b-vision-instruct'
  ];

  for (const m of models) {
    try {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: 'user', content: 'Say hello' }],
          max_tokens: 15
        })
      });
      console.log(`Model ${m}: HTTP ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`  -> Output:`, data?.choices?.[0]?.message?.content?.trim());
      }
    } catch (e) {
      console.log(`Exception ${m}:`, e.message);
    }
  }
}

testOthers().catch(console.error);
