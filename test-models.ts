import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
 console.error("No API key found in .env");
 process.exit(1);
}

async function listModels() {
 try {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  console.log("Available models:");
  data.models.forEach((model: any) => {
   console.log(`- ${model.name} (Supported methods: ${model.supportedGenerationMethods.join(', ')})`);
  });
 } catch (error) {
  console.error("Error listing models:", error);
 }
}

listModels();
