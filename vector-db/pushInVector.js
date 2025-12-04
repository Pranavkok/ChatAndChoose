import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { NextResponse } from "next/server.js";

// Reuse clients across calls (avoid recreating on every request)
const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENAI_API
);
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const productsIndex = pinecone.index("products");


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

  const response = await embeddingModel.embedContent({
    content: {
      parts: [{ text: productString }],
    },
  });

  console.log(response.embedding.values);
  const embedding = response.embedding.values;

  await productsIndex.upsert([
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
    const res = await embeddingModel.embedContent(trimmed);
    return res.embedding.values; // float array
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

    const results = await productsIndex.query({
      vector: queryEmbedding,
      topK: 20,
      includeMetadata: true,
      includeValues: false
    });

    console.log(results.matches);

    return results.matches || [];
  } catch (err) {
    console.error("Error searching products:", err);
    return [];
  }
}

export async function fetchAllProducts() {
  const allProducts = [];
  let nextToken = undefined;

  do {
    const listResponse = await productsIndex.listPaginated({
      limit: 100,
      prefix: "",
      paginationToken: nextToken
    });

    const ids = listResponse.vectors.map(v => v.id);

    if (ids.length > 0) {
      const fetchRes = await productsIndex.fetch(ids);

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
}

// fetchAllProducts();
