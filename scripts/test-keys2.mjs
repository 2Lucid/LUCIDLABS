import { GoogleGenerativeAI } from '@google/generative-ai';

const keys = [
  "AIzaSyCSCCPj0ZMoOsA5nUFeTz-gLQnJxQBeRBM",
  "AIzaSyAkuafx2O5-EGy7sEORNX7CF98wkq8Nmt8",
  "AIzaSyAStyDRIKagxC7jd2VFrXtVdOYn4WIliQU",
  "AIzaSyDPYw9D8mMA52PYO4vib2U8reuWbMP6J5c",
  "AIzaSyDSSvDvKkkAo0StF_cqKi4lGEy9pNdegds",
  "AIzaSyCorcoJRAIDvvIcax-4IeqbFBzpCBrXW0c",
  "AIzaSyAZaHG30Fp8W0NS2znauCOc9ulKB5VhE5M"
];

const testKey = async (apiKey) => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Hello?");
    const response = await result.response;
    return { key: apiKey, status: "OK" };
  } catch (error) {
    return { key: apiKey, status: "DEAD", error: error.message };
  }
};

(async () => {
  console.log("Testing API keys using @google/generative-ai...\n");
  for (const key of keys) {
    const result = await testKey(key);
    if (result.status === "OK") {
      console.log(`✅ ${result.key.slice(0, 15)}... : ALIVE`);
    } else {
      console.log(`❌ ${result.key.slice(0, 15)}... : DEAD - ${result.error}`);
    }
  }
})();
