import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API);

export async function promptResponse(prompt, history = []) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const { response } = await model.generateContent(
    `You are a helpful shopping assistant in an ongoing chat with a customer. Use the provided recent conversation history to stay consistent, avoid repetition, and build on what was already said.

    Conversation history (oldest first):
    ${JSON.stringify(history, null, 2)}

    Current customer message:
    ${prompt}

    Instructions:
    1. Reference the history to maintain context. If earlier you recommended something, acknowledge it briefly.
    2. Do not repeat the same sentences or wording used in the history unless necessary.
    3. Keep the tone friendly, concise (2-3 sentences), and action-oriented—like a real shopping assistant.
    4. If the customer is searching for products, mention that you have surfaced options and invite them to check them out.
    5. Never say you cannot help or that you are “just an AI”.
    6. If the history shows the same question already answered, either summarize the previous answer in new words or provide new helpful detail.

    Respond naturally and helpfully:`
  );
  console.log(response.text().trim());
  return response.text().trim();
}

export async function freshPrompt(prompt, history = []) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const promptText = `
You generate a single improved search query that will be embedded and matched against product embeddings.

Inputs:
- "history": ${JSON.stringify(history)}
- "prompt": "${prompt}"

Rules:
1. Merge relevant information from history with the latest prompt.
2. If history contains details like gender, style, category, previous preferences, size, or color, include them.
3. Never invent new details.
4. Preserve the user's intent exactly.
5. Produce a single-line search query that focuses on the product the user is trying to find.
6. The output should match the structure of the product embeddings, which include:
   title, description, color, category, gender, style, fit, pattern,
   material, specification, sleeve, length, size, brand, price.

Output:
ONLY return the merged, context-aware query as a single clean line. No explanations.
  `;

  const { response } = await model.generateContent(promptText);
  return response.text().trim();
}


// genarateFilter("I want to buy a cheetah print shirt for my son under 1000");