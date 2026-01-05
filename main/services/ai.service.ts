import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_API_KEY || "");

export async function identifyCollectible(imageBuffer: Buffer, mimeType: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are an expert in Pop Mart collectibles. 
    Analyze the provided image and identify the specific collectible. 
    Return a JSON object with the following fields:
    - name: The name of the specific character/figure.
    - series: The name of the series it belongs to (e.g., "Ancient Castle Series", "Aquarium Series", "Little Mischief").
    - rarity: The rarity (e.g., "Common", "Rare", "Secret").
    - confidence: A value between 0 and 1 indicating your confidence.

    If you cannot identify it, return an error field.
    Only return the JSON object, nothing else.
  `;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: mimeType,
      },
    },
  ]);

  const response = await result.response;
  const text = response.text();
  
  try {
    // Handling potential markdown formatting in Gemini output
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Failed to parse AI response:", text);
    throw new Error("Invalid AI response format");
  }
}
