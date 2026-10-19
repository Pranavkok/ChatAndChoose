export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { generateQueryAndFilters } from "../../../../llm/genarateFilter";
import { searchProducts, fetchAllProducts } from "../../../../vector-db/pushInVector";
import { productDetails } from "../../../../llm/genarateFinalResponse";
import { promptResponse } from "../../../../llm/genaratePromptResponse";

// ─── In-memory inventory cache ────────────────────────────────────────────────
// Fetched once per server process lifetime. Dramatically reduces Pinecone
// round-trips (was fetching ALL products on EVERY request before).
let _inventoryCache = null;
let _inventoryCachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getCachedInventory() {
  const now = Date.now();
  if (_inventoryCache && now - _inventoryCachedAt < CACHE_TTL_MS) {
    return _inventoryCache;
  }
  try {
    _inventoryCache = await fetchAllProducts();
    _inventoryCachedAt = now;
    console.log(`[cache] inventory refreshed: ${_inventoryCache.length} products`);
  } catch (err) {
    console.error("[cache] fetchAllProducts failed:", err);
    _inventoryCache = _inventoryCache ?? []; // keep stale cache on error
  }
  return _inventoryCache;
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { prompt, history } = await request.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // STEP 1: Single LLM call → enhancedQuery + filters (was 2 calls before)
    const { enhancedQuery, filters } = await generateQueryAndFilters(prompt, history);

    // STEP 2: Parallel — vector search + inventory cache warm-up
    const [productArray, inventory] = await Promise.all([
      searchProducts(enhancedQuery),
      getCachedInventory(),
    ]);

    // STEP 3: Filter results
    const maxprice = filters?.price_max ?? null;
    const minprice = filters?.price_min ?? null;
    const forGender = (filters?.gender ?? "").toLowerCase();
    const resultArray = [];

    for (const p of productArray) {
      const meta = p.metadata || {};
      const genderOk =
        !forGender || meta.gender?.toLowerCase() === forGender;
      const scoreOk = p.score > 0.45; // slightly relaxed threshold for better recall
      const priceOk =
        (maxprice == null || meta.price <= maxprice) &&
        (minprice == null || meta.price >= minprice);

      if (genderOk && scoreOk && priceOk) {
        resultArray.push(p);
      }
      if (resultArray.length >= 5) break;
    }

    // STEP 4: Parallel — generate chat response + rich product response
    const [promptRes, finalResponse] = await Promise.all([
      promptResponse(prompt, history),
      productDetails(resultArray, prompt, history, inventory),
    ]);

    return NextResponse.json({
      products: resultArray,
      formattedResponse: finalResponse,
      promptResponse: promptRes,
    });
  } catch (error) {
    console.error("get-products error:", error);
    return NextResponse.json(
      { error: "Server error: " + (error?.message ?? "unknown") },
      { status: 500 }
    );
  }
}