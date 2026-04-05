const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let url = '';
let key = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
}

async function testFunction() {
  const proxyUrl = `${url}/functions/v1/gemini-proxy`;
  
  console.log(`Calling ${proxyUrl}`);
  
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      prompt: "Hello",
      model: "gemini-2.0-flash",
      temperature: 0.1
    })
  });
  
  const text = await res.text();
  console.log("STATUS:", res.status);
  console.log("BODY:", text);
}

testFunction();
