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

    // 0. Environment check — notify immediately if critical keys are missing
    const geminiKey = process.env.GOOGLE_GENAI_API || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const pineconeKey = process.env.PINECONE_API_KEY;
    const dbUrl = process.env.DATABASE_URL;

    const missingKeys = [];
    if (!geminiKey) missingKeys.push("GOOGLE_GENAI_API (or GEMINI_API_KEY)");
    if (!pineconeKey) missingKeys.push("PINECONE_API_KEY");
    if (!dbUrl) missingKeys.push("DATABASE_URL");

    if (missingKeys.length > 0) {
      return NextResponse.json({
        products: [],
        formattedResponse: `⚠️ Configuration Notice: Missing environment variables on Vercel:\n\n• ${missingKeys.join("\n• ")}\n\nPlease add them in your Vercel Project Settings → Environment Variables.`,
        promptResponse: "Missing configuration keys",
      });
    }

    // STEP 1: Extract query and filters
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
        searchProducts(enhancedQuery).catch((err) => {
          console.error("searchProducts error:", err?.message);
          return [];
        }),
        getCachedInventory().catch(() => []),
      ]);
    } catch (searchErr) {
      console.warn("Search/Inventory fetch error:", searchErr?.message);
    }

    // STEP 3: Multi-pass filter results
    const maxprice = filters?.price_max != null ? Number(filters.price_max) : null;
    const minprice = filters?.price_min != null ? Number(filters.price_min) : null;
    const forGender = (filters?.gender ?? "").toLowerCase();
    let resultArray = [];

    const isGenderMatch = (meta) => {
      if (!forGender) return true;
      const g = (meta?.gender || "").toLowerCase();
      if (!g || g === "unisex") return true;
      return g.includes(forGender) || forGender.includes(g);
    };

    // Pass 1: Strict match (gender + price budget + score threshold)
    for (const p of (productArray || [])) {
      const meta = p.metadata || {};
      const genderOk = isGenderMatch(meta);
      const scoreOk = (p.score ?? 1) > 0.25;
      const numPrice = Number(meta.price);
      const priceOk =
        isNaN(numPrice) ||
        ((maxprice == null || numPrice <= maxprice) &&
         (minprice == null || numPrice >= minprice));

      if (genderOk && scoreOk && priceOk) {
        resultArray.push(p);
      }
      if (resultArray.length >= 6) break;
    }

    // Pass 2: Relax price restriction if strict budget filter eliminated all items
    if (resultArray.length === 0 && (productArray || []).length > 0) {
      for (const p of productArray) {
        const meta = p.metadata || {};
        if (isGenderMatch(meta) && (p.score ?? 1) > 0.25) {
          resultArray.push(p);
        }
        if (resultArray.length >= 6) break;
      }
    }

    // Pass 3: Take top vector semantic matches if still empty
    if (resultArray.length === 0 && (productArray || []).length > 0) {
      resultArray = productArray.slice(0, 6);
    }

    // Pass 4: Fallback to relational DB if vector DB returned no items
    if (resultArray.length === 0) {
      try {
        let dbProducts = [];
        if (forGender) {
          dbProducts = await prisma.product.findMany({
            take: 6,
            where: { gender: { contains: forGender, mode: "insensitive" } },
          });
        }
        if (dbProducts.length === 0) {
          dbProducts = await prisma.product.findMany({ take: 6 });
        }
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
        console.error("Prisma fallback error:", dbErr?.message);
      }
    }

    // STEP 4: Generate chat response + rich product response
    let promptRes = "Here are our recommendations:";
    let finalResponse = "";

    try {
      const [pRes, fRes] = await Promise.all([
        promptResponse(prompt, history).catch((err) => {
          console.warn("promptResponse fallback:", err?.message);
          return "Here are the top recommendations from our collection:";
        }),
        productDetails(resultArray, prompt, history, inventory).catch((err) => {
          console.error("productDetails error:", err?.message);
          return resultArray.length > 0
            ? `Found ${resultArray.length} items from our catalog.`
            : `We couldn't find any items matching "${prompt}" in the current catalog.`;
        }),
      ]);
      promptRes = pRes || promptRes;
      finalResponse = fRes;
    } catch (llmFinalErr) {
      console.warn("Final LLM generation error:", llmFinalErr?.message);
      finalResponse = `Found ${resultArray.length} items from our catalog.`;
    }

    return NextResponse.json({
      products: resultArray,
      formattedResponse: finalResponse,
      promptResponse: promptRes,
      debug: {
        vectorCount: (productArray || []).length,
        resultCount: resultArray.length,
      },
    });
  } catch (error) {
    console.error("get-products unhandled error:", error);
    return NextResponse.json(
      { error: "Server error: " + (error?.message ?? "unknown error") },
      { status: 500 }
    );
  }
}