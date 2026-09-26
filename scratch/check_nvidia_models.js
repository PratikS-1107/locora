import dotenv from 'dotenv';
dotenv.config();

async function checkNvidiaModels() {
  const key = process.env.NVIDIA_API_KEY;
  const models = [
    'meta/llama-3.3-70b-instruct',
    'meta/llama-3.1-8b-instruct',
    'mistralai/mistral-large-2-instruct',
    'nvidia/llama-3.1-nemotron-70b-instruct',
    'meta/llama3-70b-instruct',
    'meta/llama3-8b-instruct',
    'deepseek-ai/deepseek-r1'
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
          messages: [{ role: 'user', content: 'Say hi' }],
          max_tokens: 20
        })
      });

      console.log(`NVIDIA Model ${m}: HTTP ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`  -> Output:`, data?.choices?.[0]?.message?.content?.trim());
      } else {
        const txt = await res.text();
        console.log(`  -> Error:`, txt.substring(0, 150));
      }
    } catch (e) {
      console.log(`NVIDIA Model ${m} exception:`, e.message);
    }
  }
}

checkNvidiaModels().catch(console.error);
