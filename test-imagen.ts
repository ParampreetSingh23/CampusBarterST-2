import { config } from "dotenv";
config();

async function testImagen() {
 const apiKey = process.env.GEMINI_API_KEY;
 if (!apiKey) throw new Error("Missing API Key");

 const model = "imagen-4.0-generate-001";
 const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;

 console.log(`Testing with model: ${model}`);

 const response = await fetch(url, {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   instances: [{ prompt: "A highly detailed university campus textbook" }],
   parameters: { sampleCount: 1 }
  })
 });

 if (!response.ok) {
  console.error("Error from API:", response.status, response.statusText);
  const text = await response.text();
  console.error(text);
  return;
 }

 const data = await response.json();
 console.log("Success! Received payload keys:", Object.keys(data));
 if (data.predictions && data.predictions[0]) {
  console.log("Image bytes prefix:", data.predictions[0].bytesBase64Encoded.substring(0, 50) + "...");
 }
}

testImagen().catch(console.error);
