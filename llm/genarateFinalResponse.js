import { GoogleGenerativeAI } from "@google/generative-ai";
function getGenAI() {
  const key = process.env.GOOGLE_GENAI_API || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error("Missing Gemini API Key. Please set GOOGLE_GENAI_API or GEMINI_API_KEY in your environment variables.");
  }
  return new GoogleGenerativeAI(key);
}

const systemMessage = `You are a friendly fashion and beauty shopping assistant. You help users find and buy clothing, accessories, cosmetics, skincare, and beauty products.`;

/**
 * Generate the final rich product response.
 * inventorySnippet is passed in from the route (already fetched + cached there).
 */
export async function productDetails(objarr, prompt, history = [], inventorySnippet = []) {
  // Trim history to last 3 exchanges to keep prompt smaller → faster
  const recentHistory =
    history.length > 0
      ? history.slice(-6).map((h) => `${h.role}: ${h.content}`).join("\n")
      : "No chat history";

  // Reduce inventory to just titles + prices to keep tokens lean
  const inventorySummary =
    inventorySnippet.length > 0
      ? inventorySnippet
          .slice(0, 30) // cap at 30 items
          .map((p) => `• ${p.title} (${p.category}) — $${p.price}`)
          .join("\n")
      : "No inventory available";

  const finalPrompt = `${systemMessage}

User query: "${prompt}"

Vector search results (${objarr.length} products found):
${
  objarr && objarr.length > 0
    ? objarr
        .map((p) => {
          const m = p.metadata || {};
          return `- ${m.title} (${m.category}) $${m.price}: ${m.description}`;
        })
        .join("\n")
    : "No matches from vector search"
}

Our catalog (top items):
${inventorySummary}

Recent conversation:
${recentHistory}

═══════════════════════════════════════════════════════════════
RESPONSE INSTRUCTIONS (MANDATORY)
═══════════════════════════════════════════════════════════════

**PRIMARY GOAL**: Help users find products. Be warm, concise, and action-oriented.

SCENARIO A: VECTOR SEARCH FOUND PRODUCTS (${objarr.length} > 0):
1. Acknowledge user intent in 1 sentence.
2. Present each found product: **[Title]** — [Category] 💰 $[price] — [1 sentence description]
3. Suggest 1-2 additional products from our catalog that complement the results.
4. End with ONE focused question (size, color, or style preference).

SCENARIO B: NO VECTOR MATCHES:
- If NOT fashion/beauty: "I specialize in fashion and beauty — clothing, shoes, accessories, makeup, skincare. How can I help you there?"
- If IS fashion/beauty: Browse the catalog and suggest 2-3 relevant items. Format: **[Title]** — 🔍 *Search: "[exact title]"*
- End with a question to narrow preferences.

RULES:
✓ Be concise — max 150 words
✓ Always end with a question
✓ Use warm, confident language
✓ Never mention "the list" or "inventory above"
✓ Never invent products

Generate your response now:`;

  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const { response } = await model.generateContent(finalPrompt);
  return response.text().trim();
}