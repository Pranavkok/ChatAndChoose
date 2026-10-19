import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API);

/**
 * Single LLM call: merges freshPrompt + genarateFilter into one call.
 * Returns { enhancedQuery, filters } — saves one full round-trip.
 */
export async function generateQueryAndFilters(prompt, history = []) {
  // Use flash-lite for speed — filter extraction is simple structured output
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const historySnippet =
    history.length > 0
      ? history
          .slice(-4) // only last 2 exchanges
          .map((h) => `${h.role}: ${h.content}`)
          .join("\n")
      : "none";

  const { response } = await model.generateContent(
    `You are a search query optimizer for a fashion/beauty e-commerce store.

Given the conversation history and current user message, output a JSON object with two fields:
1. "enhancedQuery": a single rich search query string that merges context from history with current intent, optimized for semantic vector search. Include product attributes like gender, color, style, category, material if mentioned or inferrable from history. Max 2 sentences.
2. "filters": structured filters extracted from the user's message ONLY (not invented).

Conversation history (recent):
${historySnippet}

Current user message: "${prompt}"

Rules for filters:
- Only extract what is EXPLICITLY stated. Never invent.
- "under X", "below X" → price_max = X
- "above X", "over X" → price_min = X  
- "between X and Y" → both fields
- Leave fields empty string "" or null if not mentioned.

Output ONLY valid JSON, nothing else:
{
  "enhancedQuery": "",
  "filters": {
    "category": "",
    "brand": "",
    "color": "",
    "gender": "",
    "size": "",
    "price_min": null,
    "price_max": null,
    "attributes": {}
  }
}`
  );

  let text = response.text().trim();
  // Strip markdown code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }

  return JSON.parse(text);
}