import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "products";

if (!PINECONE_API_KEY) {
  throw new Error("Missing PINECONE_API_KEY environment variable.");
}

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const productsIndex = pinecone.index(PINECONE_INDEX_NAME);

export async function removeFromVector(productId) {
  const id = String(productId ?? "").trim();
  if (!id) {
    throw new Error("removeFromVector called without a valid productId.");
  }

  try {
    await productsIndex.deleteOne(id);
  } catch (error) {
    console.error(`Error removing product ${id} from vector database:`, error);
    throw new Error(`Failed to remove product ${id} from vector database.`);
  }
}