import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API);

/**
 * Generates a short, contextual chat response (shown above product cards).
 * Uses gemini-2.0-flash for speed.
 */
export async function promptResponse(prompt, history = []) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const recentHistory =
    history.length > 0
      ? history
          .slice(-4)
          .map((h) => `${h.role}: ${h.content}`)
          .join("\n")
      : "none";

  const { response } = await model.generateContent(
    `You are a helpful, friendly shopping assistant. Keep responses SHORT (1-2 sentences max).

Recent conversation:
${recentHistory}

Customer message: "${prompt}"

Instructions:
- Acknowledge what the customer is looking for in 1 sentence.
- If products are being surfaced, say "Here's what I found for you!" or similar.
- Never say you cannot help. Never say you're "just an AI".
- Do NOT repeat exact phrases from history.

Respond naturally (1-2 sentences only):`
  );

  return response.text().trim();
}