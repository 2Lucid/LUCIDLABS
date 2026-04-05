const keys = [
  "AIzaSyCSCCPj0ZMoOsA5nUFeTz-gLQnJxQBeRBM",
  "AIzaSyAkuafx2O5-EGy7sEORNX7CF98wkq8Nmt8",
  "AIzaSyAStyDRIKagxC7jd2VFrXtVdOYn4WIliQU",
  "AIzaSyDPYw9D8mMA52PYO4vib2U8reuWbMP6J5c",
  "AIzaSyDSSvDvKkkAo0StF_cqKi4lGEy9pNdegds",
  "AIzaSyCorcoJRAIDvvIcax-4IeqbFBzpCBrXW0c",
  "AIzaSyAZaHG30Fp8W0NS2znauCOc9ulKB5VhE5M"
];

const testKey = async (key) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${key}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Hello" }] }]
      })
    });
    if (res.ok) {
      return { key, status: "OK", code: res.status };
    } else {
      const data = await res.json().catch(() => ({}));
      return { key, status: "DEAD", code: res.status, error: data?.error?.message || res.statusText };
    }
  } catch (e) {
    return { key, status: "DEAD", error: e.message };
  }
};

(async () => {
  console.log("Testing API keys found in .env.local...\n");
  for (const key of keys) {
    const result = await testKey(key);
    if (result.status === "OK") {
      console.log(`✅ ${result.key.slice(0, 15)}... : ALIVE (Code ${result.code})`);
    } else {
      console.log(`❌ ${result.key.slice(0, 15)}... : DEAD (Code ${result.code}) - ${result.error}`);
    }
  }
})();
