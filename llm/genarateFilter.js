import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI("AIzaSyACYyICMgFq1ycNjyFZR4fs3FCCuNR1Wmc");

export async function genarateFilter(prompt) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const { response } = await model.generateContent(
    `You must extract structured e-commerce search filters from the user query.
Follow these rules strictly:
Only extract what the user clearly says. Do not assume.
If something is missing, leave it empty string ("") or null for price fields.
Do not invent colors, categories, genders, or attributes.
Deduce category ONLY from explicit words like “shoes”, “t-shirt”, “laptop”, etc.
If a price is mentioned:
“under X”, “below X”, “less than X” → price_max = X
“above X”, “over X”, “greater than X” → price_min = X
“between X and Y”, “from X to Y” → both fields
Never output anything except the JSON.
Output must strictly follow this schema:{
  "category": "",
  "brand": "",
  "color": "",
  "gender": "",
  "price_min": null,
  "price_max": null,
  "attributes": {}
}
here is the prompt given by the user : ${prompt}
`
  );
  console.log(response.text().trim());
  return response.text().trim();
}