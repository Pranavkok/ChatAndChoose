import { Pinecone } from "@pinecone-database/pinecone";

// Reuse a single Pinecone client and index
const pinecone = new Pinecone({
  apiKey: "pcsk_r9Bk9_2UgxU8a8ReRUUoPv1b4rzJ3LQAYUZ3qK1pRwT5LfkdL4SGwkyZ5aoAeUS26f5wj",
});
const productsIndex = pinecone.index("products");

export async function removeFromVector(productId) {
  const id = String(productId ?? "").trim();
  if (!id) {
    console.warn("removeFromVector called without a valid productId");
    return { success: false, message: "productId is required" };
  }

  try {
    await productsIndex.deleteOne(id);
    console.log(`Product ${id} removed from vector database`);
    return { success: true, message: `Product ${id} removed from vector database` };
  } catch (error) {
    console.error("Error removing product from vector database:", error);
    return { success: false, message: "Failed to remove product from vector database" };
  }
}


// export async function removeMultipleFromVector(productIds) {
//   const pc = new Pinecone({
//     apiKey: process.env.PINECONE_API_KEY || "pcsk_r9Bk9_2UgxU8a8ReRUUoPv1b4rzJ3LQAYUZ3qK1pRwT5LfkdL4SGwkyZ5aoAeUS26f5wj"
//   });
//   const index = pc.index("products");

//   try {
//     const stringIds = productIds.map(id => String(id));
//     await index.deleteMany(stringIds);
//     console.log(`Products ${stringIds.join(", ")} removed from vector database`);
//     return { success: true, message: `Products removed from vector database` };
//   } catch (error) {
//     console.error("Error removing products from vector database:", error);
//     throw error;
//   }
// }

