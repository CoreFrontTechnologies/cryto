import { GoogleGenAI, Type } from "@google/genai";
import { Prices, Sentiment, PredictionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getPrediction(
  symbol: string,
  currentPrices: Prices,
  sentiment: Sentiment
): Promise<PredictionResult> {
  const currentPrice = currentPrices[symbol]?.price || 0;
  const change24h = currentPrices[symbol]?.change24h || 0;
  
  const prompt = `
    As a crypto market analyst, predict the price of ${symbol} at 11:59 PM tonight.
    Current Data:
    - Asset: ${symbol}
    - Current Price: $${currentPrice}
    - 24h Change: ${change24h}%
    - Market Sentiment (Fear & Greed): ${sentiment.value} (${sentiment.classification})
    - Current Time: ${new Date().toLocaleTimeString()}
    - Target Time: 11:59 PM

    Provide a realistic prediction based on current volatility and sentiment.
    Return the response in JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          symbol: { type: Type.STRING },
          predictedPrice: { type: Type.NUMBER },
          confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 100" },
          reasoning: { type: Type.STRING },
          probabilityRange: {
            type: Type.OBJECT,
            properties: {
              low: { type: Type.NUMBER },
              high: { type: Type.NUMBER }
            },
            required: ["low", "high"]
          }
        },
        required: ["symbol", "predictedPrice", "confidence", "reasoning", "probabilityRange"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
