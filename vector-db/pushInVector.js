import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { NextResponse } from "next/server.js";

let embeddingModel = null;
function getEmbeddingModel() {
  if (!embeddingModel) {
    const apiKey = process.env.GOOGLE_GENAI_API || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing Gemini API key (GOOGLE_GENAI_API or GEMINI_API_KEY)");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    embeddingModel = genAI.getGenerativeModel({
      model: "text-embedding-004",
    });
  }
  return embeddingModel;
}

let productsIndex = null;
function getProductsIndex() {
  if (!productsIndex) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing PINECONE_API_KEY environment variable.");
    }
    const pinecone = new Pinecone({ apiKey });
    productsIndex = pinecone.index(process.env.PINECONE_INDEX_NAME || "products");
  }
  return productsIndex;
}

function buildSemanticText(product) {
  return `
    ${product.title}. 
    ${product.description}. 
    This is a ${product.color} ${product.category} for ${product.gender}. 
    Style: ${product.style}, Fit: ${product.fit}, Pattern: ${product.pattern}. 
    Material: ${product.material}. 
    Specification: ${product.specification}. 
    Sleeve: ${product.sleeve}, Length: ${product.length}, Size: ${product.size}. 
    Brand: ${product.brand}. 
    Price: ${product.price}.
  `.replace(/\s+/g, " ").trim();
}

export async function pushInVector(product) {
  const productString = buildSemanticText(product);
  const model = getEmbeddingModel();

  const response = await model.embedContent({
    content: {
      parts: [{ text: productString }],
    },
  });

  const embedding = response.embedding.values;
  const index = getProductsIndex();

  await index.upsert([
    {
      id: String(product.id),
      values: embedding,
      metadata: {
        description: product.description,
        title: product.title,
        category: product.category,
        gender: product.gender,
        price: product.price,
        image: product.image,
        color: product.color,
        brand: product.brand,
        size: product.size,
      }
    }
  ]);
  console.log("Product pushed to vector database");
  return NextResponse.json(
    { message: "Product Push success" },
    { status: 200 }
  );
}

async function getQueryEmbedding(query) {
  const trimmed = (query ?? "").trim();
  if (!trimmed) {
    throw new Error("Query text is required for embedding");
  }

  try {
    const model = getEmbeddingModel();
    const res = await model.embedContent(trimmed);
    return res.embedding.values;
  } catch (err) {
    console.error("Error generating query embedding:", err);
    throw err;
  }
}

export async function searchProducts(queryText) {
  const trimmed = (queryText ?? "").trim();
  if (!trimmed) {
    return [];
  }

  try {
    const queryEmbedding = await getQueryEmbedding(trimmed);
    const index = getProductsIndex();

    const results = await index.query({
      vector: queryEmbedding,
      topK: 20,
      includeMetadata: true,
      includeValues: false
    });

    return results.matches || [];
  } catch (err) {
    console.error("Error searching products:", err);
    return [];
  }
}

export async function fetchAllProducts() {
  const allProducts = [];
  let nextToken = undefined;

  try {
    const index = getProductsIndex();
    do {
      const listResponse = await index.listPaginated({
        limit: 100,
        prefix: "",
        paginationToken: nextToken
      });

      const ids = listResponse.vectors.map(v => v.id);

      if (ids.length > 0) {
        const fetchRes = await index.fetch(ids);

        Object.entries(fetchRes.records).forEach(([id, record]) => {
          allProducts.push({
            id,
            ...record.metadata
          });
        });
      }

      nextToken = listResponse.paginationToken;
    } while (nextToken);

    console.log(`Fetched ${allProducts.length} products from vector DB`);
    return allProducts;
  } catch (err) {
    console.error("Error fetching all products:", err);
    return [];
  }
}
