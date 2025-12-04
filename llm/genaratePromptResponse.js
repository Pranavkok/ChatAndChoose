import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI("AIzaSyACYyICMgFq1ycNjyFZR4fs3FCCuNR1Wmc");

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

export async function freshPrompt(prompt,history=[]){
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const { response } = await model.generateContent(
    `Rewrite the user's prompt into a clearer, more detailed, and context-aware version.

User Prompt:
"${prompt}"

Chat History Context:
${JSON.stringify(history)}

Your task:
- Keep the user's meaning intact.
- Remove ambiguity.
- Add missing details only if they are implied by the history.
- Do NOT invent new information.
- Make the rewritten prompt more specific, structured, and suitable for an LLM.
- Output ONLY the rewritten prompt. No explanations.`
  );
  console.log(response.text().trim());
  return response.text().trim();
}

// genarateFilter("I want to buy a cheetah print shirt for my son under 1000");