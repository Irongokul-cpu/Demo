import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getSustainabilityAdvice(userContext: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a sustainability expert. Based on the user's recent data: ${userContext}, provide 3 personalized, actionable tips to reduce their carbon footprint. Keep it encouraging and concise. Use markdown for formatting.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error getting AI advice:", error);
    return "I'm having trouble connecting to my sustainability database right now. Try again later!";
  }
}

export async function chatWithAssistant(message: string, history: { role: string, parts: { text: string }[] }[]) {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are a friendly sustainability assistant. Help users track their carbon emissions, explain environmental concepts, and suggest ways to live more sustainably. Be encouraging and use data-backed advice.",
      },
    });

    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error in chat:", error);
    return "Sorry, I encountered an error. Let's try talking about something else!";
  }
}

export async function getWeatherData(city: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `What is the current weather in ${city}? Provide the temperature, conditions, and a brief summary. Format the response as a JSON object with keys: temp (number), condition (string), summary (string).`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error getting weather data:", error);
    return { temp: 25, condition: "Sunny", summary: "Unable to fetch live weather. Showing typical conditions." };
  }
}
