import dotenv from 'dotenv';
dotenv.config();

async function testSingle(m) {
  const key = process.env.NVIDIA_API_KEY;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: m,
        messages: [{ role: 'user', content: 'Say hello in 2 words' }],
        max_tokens: 15
      })
    });
    clearTimeout(timer);
    console.log(`Model ${m}: HTTP ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`  -> Output:`, data?.choices?.[0]?.message?.content);
      return true;
    } else {
      console.log(`  -> Err:`, (await res.text()).substring(0, 100));
    }
  } catch (e) {
    console.log(`Model ${m} failed:`, e.name === 'AbortError' ? 'TIMEOUT (8s)' : e.message);
  }
  return false;
}

async function run() {
  const models = [
    'meta/llama-3.2-11b-vision-instruct',
    'mistralai/mistral-7b-instruct-v0.3',
    'nv-mistralai/mistral-nemo-12b-instruct',
    'google/gemma-3-12b-it',
    'ibm/granite-3.0-8b-instruct'
  ];

  for (const m of models) {
    console.log(`\nTesting ${m}...`);
    const ok = await testSingle(m);
    if (ok) {
      console.log(`>>> ${m} is working fast and reliably! <<<`);
    }
  }
}

run().catch(console.error);
