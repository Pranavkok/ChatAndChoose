import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { NextResponse } from "next/server.js";

// Reuse clients across calls (avoid recreating on every request)
const genAI = new GoogleGenerativeAI(
  "AIzaSyACYyICMgFq1ycNjyFZR4fs3FCCuNR1Wmc"
);
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

const pinecone = new Pinecone({
  apiKey: "pcsk_r9Bk9_2UgxU8a8ReRUUoPv1b4rzJ3LQAYUZ3qK1pRwT5LfkdL4SGwkyZ5aoAeUS26f5wj",
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
        price: product.price,
        image: product.image,
        color: product.color,
        brand: product.brand
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
    // Avoid wasting tokens when query is empty
    return [];
  }

  try {
    const queryEmbedding = await getQueryEmbedding(trimmed);

    const results = await productsIndex.query({
      vector: queryEmbedding,
      topK: 20,
      includeMetadata: true,
      includeValues: false,
    });

    console.log(results.matches);

    return results.matches || [];
  } catch (err) {
    console.error("Error searching products:", err);
    return [];
  }
}

// searchProducts("i want to listen music")

// const xyz = {
//     "id": 12,
//     "category": "Accessories",
//     "title": "Unisex Adjustable Cap",
//     "description": "Simple and stylish cap for everyday use.",
//     "specification": "Adjustable strap, cotton blend",
//     "price": 12,
//     "image": "https://example.com/images/cap.jpg",
//     "brand": "DailyFit",
//     "gender": "Unisex",
//     "size": "One Size",
//     "color": "Grey",
//     "material": "Cotton",
//     "style": "Casual",
//     "pattern": "Solid",
//     "fit": "Regular",
//     "length": "Short",
//     "sleeve": "None",
//     "createdAt": "2025-12-01T10:48:22.919Z",
//     "updatedAt": "2025-12-01T10:48:22.919Z"
// }

// pushInVector(xyz);


// const res = product.stringify();const res = JSON.stringify(product);

// main();