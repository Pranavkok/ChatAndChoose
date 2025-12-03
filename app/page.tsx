"use client";

import { url } from "inspector";
import Image from "next/image";
import { FormEvent, useState } from "react";
import Link from "next/link";

type HistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

type ChatMessage =
  | {
      role: "user";
      content: string;
    }
  | {
      role: "assistant";
      content?: string;
      payload?: {
        formattedResponse?: string;
        promptResponse?: string;
        products?: Array<{
          id: string;
          metadata?: Record<string, unknown>;
          [key: string]: unknown;
        }>;
      };
    };

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I’m your shopping assistant. Tell me what you’re looking for and I’ll find the best matches from the catalog.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/product/get-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, history }),
      });

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        payload: {
          formattedResponse: data.formattedResponse,
          promptResponse: data.promptResponse,
          products: data.products,
        },
        content:
          data.formattedResponse ||
          data.promptResponse ||
          JSON.stringify(data, null, 2),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setHistory((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        {
          role: "assistant",
          content:
            data.promptResponse ||
            data.formattedResponse 
        },
      ]);
    } catch (error) {
      const fallbackText = "Sorry, something went wrong while fetching products.";
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: fallbackText,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setHistory((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: fallbackText },
      ]);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full bg-zinc-950 text-zinc-50">
      <section className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 md:px-8">
          <div>
            <h1 className="text-sm font-medium text-zinc-100 md:text-base">
              Chat
            </h1>
            <p className="text-xs text-zinc-500">
              Ask about products, styles, budgets, or anything you want to buy.
            </p>
          </div>
          <div className="hidden items-center gap-3 text-xs text-zinc-500 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Assistant online</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 space-y-6 overflow-y-auto bg-linear-to-b from-zinc-950 to-black px-4 py-6 md:px-8">
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((m, idx) =>
              m.role === "assistant" ? (
                <div key={idx} className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-400">
                    AI
                  </div>
                  <div className="w-full space-y-4 rounded-2xl bg-zinc-900/80 px-4 py-3 text-sm text-zinc-100 shadow-sm">
                    {m.payload?.promptResponse && (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Summary
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">
                          {m.payload.promptResponse}
                        </p>
                      </div>
                    )}

                    {m.payload?.formattedResponse && (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Product Highlights
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">
                          {m.payload.formattedResponse}
                        </p>
                      </div>
                    )}

                    {m.payload?.products && m.payload.products.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          Matches
                        </p>
                        {m.payload.products.map((product, productIdx) => {
                          const metadata =
                            (product.metadata as Record<string, unknown>) ||
                            {};
                          const rawTitle = metadata["title"];
                          const rawCategory = metadata["category"];
                          const rawPrice = metadata["price"];
                          const rawDescription = metadata["description"];
                          const rawImage = metadata["image"];

                          const title =
                            typeof rawTitle === "string"
                              ? rawTitle
                              : `Product ${product.id ?? ""}`;
                          const category =
                            typeof rawCategory === "string"
                              ? rawCategory
                              : undefined;
                          const price =
                            typeof rawPrice === "number" ||
                            typeof rawPrice === "string"
                              ? rawPrice
                              : undefined;
                          const description =
                            typeof rawDescription === "string"
                              ? rawDescription
                              : undefined;
                          const imageSrc =
                            typeof rawImage === "string" && rawImage.trim().length > 0
                              ? rawImage
                              : "/noproduct.png";

                          return (
                            <div
                              key={`${product.id}-${productIdx}`}
                              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-100"
                            >
                              <div className="mb-2 overflow-hidden rounded-lg">
                                <Link href={`/products/${product.id}`}>
                                  <Image
                                    src="/noimage.png"
                                    alt={title}
                                    width={400}
                                    height={200}
                                    className="h-32 w-full object-cover"
                                    unoptimized
                                  />
                                </Link>
                              </div>
                              <p className="font-medium text-zinc-50">{title}</p>
                              {category && (
                                <p className="text-xs text-zinc-400">
                                  Category: {category}
                                </p>
                              )}
                              {price !== undefined && (
                                <p className="text-xs text-zinc-400">
                                  Price: {price}
                                </p>
                              )}
                              {description && (
                                <p className="mt-1 text-zinc-300">{description}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!m.payload && (
                      <p className="whitespace-pre-wrap text-sm text-zinc-100">
                        {m.content}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div key={idx} className="flex justify-end">
                  <div className="max-w-[75%] whitespace-pre-wrap rounded-2xl bg-emerald-500 px-4 py-3 text-sm text-emerald-950 shadow-sm">
                    {m.content}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-zinc-800 bg-zinc-950/90 px-4 py-3 md:px-8"
        >
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <textarea
              rows={1}
              className="h-11 flex-1 resize-none rounded-2xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Describe what you want to buy..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-500 px-4 text-sm font-medium text-emerald-950 shadow-md transition hover:bg-emerald-400"
              disabled={isLoading}
            >
              {isLoading ? "Thinking..." : "Send"}
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-[10px] text-zinc-500">
            Tip: Try “Find a black leather jacket under 5000 for winter” or
            “Show me budget wireless headphones for travel”.
          </p>
        </form>
      </section>
    </main>
  );
}
