export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { generateQueryAndFilters } from "../../../../llm/genarateFilter";
import { searchProducts, fetchAllProducts } from "../../../../vector-db/pushInVector";
import { productDetails } from "../../../../llm/genarateFinalResponse";
import { promptResponse } from "../../../../llm/genaratePromptResponse";
import { prisma } from "@/lib/prisma";

// ─── In-memory inventory cache ────────────────────────────────────────────────
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
  } catch (err) {
    console.error("[cache] fetchAllProducts failed:", err?.message);
    _inventoryCache = _inventoryCache ?? [];
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

    // STEP 1: Single LLM call → enhancedQuery + filters (with safe fallback)
    let enhancedQuery = prompt;
    let filters = {};
    try {
      const parsed = await generateQueryAndFilters(prompt, history);
      enhancedQuery = parsed?.enhancedQuery || prompt;
      filters = parsed?.filters || {};
    } catch (llmErr) {
      console.warn("generateQueryAndFilters fallback:", llmErr?.message);
    }

    // STEP 2: Parallel — vector search + inventory cache
    let productArray = [];
    let inventory = [];
    try {
      [productArray, inventory] = await Promise.all([
        searchProducts(enhancedQuery).catch(() => []),
        getCachedInventory().catch(() => []),
      ]);
    } catch (searchErr) {
      console.warn("Search/Inventory fetch error:", searchErr?.message);
    }

    // STEP 3: Filter results
    const maxprice = filters?.price_max ?? null;
    const minprice = filters?.price_min ?? null;
    const forGender = (filters?.gender ?? "").toLowerCase();
    const resultArray = [];

    for (const p of (productArray || [])) {
      const meta = p.metadata || {};
      const genderOk = !forGender || meta.gender?.toLowerCase() === forGender;
      const scoreOk = (p.score ?? 1) > 0.45;
      const priceOk =
        (maxprice == null || meta.price <= maxprice) &&
        (minprice == null || meta.price >= minprice);

      if (genderOk && scoreOk && priceOk) {
        resultArray.push(p);
      }
      if (resultArray.length >= 6) break;
    }

    // STEP 3b: Fallback to relational DB if vector DB returned no items
    if (resultArray.length === 0) {
      try {
        const dbProducts = await prisma.product.findMany({
          take: 6,
          where: forGender ? { gender: { equals: forGender, mode: "insensitive" } } : undefined,
        });
        for (const p of dbProducts) {
          resultArray.push({
            id: String(p.id),
            score: 0.85,
            metadata: {
              title: p.title,
              description: p.description,
              category: p.category,
              gender: p.gender,
              price: p.price,
              image: p.image,
              color: p.color,
              brand: p.brand,
              size: p.size,
            },
          });
        }
      } catch (dbErr) {
        console.warn("Prisma fallback error:", dbErr?.message);
      }
    }

    // STEP 4: Parallel — generate chat response + rich product response
    let promptRes = "Here are the top recommendations from our collection:";
    let finalResponse = "";

    try {
      const [pRes, fRes] = await Promise.all([
        promptResponse(prompt, history).catch((err) => {
          console.warn("promptResponse fallback:", err?.message);
          return "Here are the top recommendations from our collection:";
        }),
        productDetails(resultArray, prompt, history, inventory).catch((err) => {
          console.warn("productDetails fallback:", err?.message);
          return resultArray.length > 0
            ? `Found ${resultArray.length} items from our catalog.`
            : "No items currently match your search. Try searching for shirts, dresses, shoes, or bags.";
        }),
      ]);
      promptRes = pRes || promptRes;
      finalResponse = fRes;
    } catch (llmFinalErr) {
      console.warn("Final LLM generation error:", llmFinalErr?.message);
    }

    return NextResponse.json({
      products: resultArray,
      formattedResponse: finalResponse,
      promptResponse: promptRes,
    });
  } catch (error) {
    console.error("get-products unhandled error:", error);
    return NextResponse.json(
      { error: "Server error: " + (error?.message ?? "unknown error") },
      { status: 500 }
    );
  }
}