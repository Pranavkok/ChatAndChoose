import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI("AIzaSyACYyICMgFq1ycNjyFZR4fs3FCCuNR1Wmc");

export async function productDetails(objarr) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const { response } = await model.generateContent(
    `
    You are a product description formatter. Format the products in a clean, natural way.

    You will receive an array of product objects. Each object has: {id, score, metadata}. Ignore "score" and "values".

    Instructions:
    1. Read every item in the array.
    2. Create a natural, conversational product description for each item.
    3. Use only the metadata fields: title, description, category, price.
    4. Write in a friendly, helpful tone - like a shopping assistant.
    5. Format each product as a clean paragraph, not bullet points.
    6. Make it readable and engaging.

    Format for each product:
    <title> - <category>
    Price: $<price>
    <description>

    Add a blank line between products.

    Here is the array of products:
    ${JSON.stringify(objarr, null, 2)}
    `
  );
  console.log(response.text().trim());
  return response.text().trim();
}

// productDetails([
//     {
//         "id": "12",
//         "score": 0.445139498,
//         "values": [],
//         "metadata": {
//             "category": "Accessories",
//             "description": "Simple and stylish cap for everyday use.",
//             "price": 12,
//             "title": "Unisex Adjustable Cap"
//         }
//     },
//     {
//         "id": "13",
//         "score": 0.41240257,
//         "values": [],
//         "metadata": {
//             "category": "Clothing",
//             "description": "Stylish leather jacket with durable stitching.",
//             "price": 120,
//             "title": "Women's Leather Jacket"
//         }
//     },
//     {
//         "id": "15",
//         "score": 0.367213279,
//         "values": [],
//         "metadata": {
//             "category": "Electronics",
//             "description": "High-quality headphones with active noise cancellation.",
//             "price": 89.99,
//             "title": "Wireless Noise-Cancelling Headphones"
//         }
//     }
// ])