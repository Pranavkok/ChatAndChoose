import { Pinecone } from "@pinecone-database/pinecone";

// --- Configuration ---
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "products";

// --- Client Initialization ---
if (!PINECONE_API_KEY) {
  throw new Error("Missing PINECONE_API_KEY environment variable.");
}

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const productsIndex = pinecone.index(PINECONE_INDEX_NAME);

/**
 * Removes a product from the Pinecone vector database by its ID.
 * @param {string | number} productId - The ID of the product to remove.
 * @returns {Promise<void>}
 * @throws {Error} If the productId is invalid or the deletion fails.
 */
export async function removeFromVector(productId) {
  const id = String(productId ?? "").trim();
  if (!id) {
    throw new Error("removeFromVector called without a valid productId.");
  }

  try {
    await productsIndex.deleteOne(id);
  } catch (error) {
    console.error(`Error removing product ${id} from vector database:`, error);
    // Re-throw the error to be handled by the calling function
    throw new Error(`Failed to remove product ${id} from vector database.`);
  }
}
