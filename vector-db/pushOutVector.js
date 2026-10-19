import { Pinecone } from "@pinecone-database/pinecone";

let pineconeClient = null;
function getProductsIndex() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing PINECONE_API_KEY environment variable.");
  }
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient.index(process.env.PINECONE_INDEX_NAME || "products");
}

export async function removeFromVector(productId) {
  const id = String(productId ?? "").trim();
  if (!id) {
    throw new Error("removeFromVector called without a valid productId.");
  }

  try {
    const productsIndex = getProductsIndex();
    await productsIndex.deleteOne(id);
  } catch (error) {
    console.error(`Error removing product ${id} from vector database:`, error);
    throw new Error(`Failed to remove product ${id} from vector database.`);
  }
}