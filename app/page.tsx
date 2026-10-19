"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type HistoryEntry = { role: "user" | "assistant"; content: string };

type Product = {
  id: string;
  score?: number;
  metadata?: {
    title?: string;
    category?: string;
    price?: number | string;
    description?: string;
    image?: string;
    gender?: string;
    brand?: string;
    color?: string;
  };
};

type ChatMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content?: string;
      isLoading?: boolean;
      payload?: {
        formattedResponse?: string;
        promptResponse?: string;
        products?: Product[];
      };
    };

// ── Quick searches ────────────────────────────────────────────────────────────
const CHIPS = [
  "Casual shirts for men",
  "Summer dresses under ₹2000",
  "White sneakers",
  "Office bag for women",
  "Skincare for dry skin",
];

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconSend = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 8H2M9 3l5 5-5 5" />
  </svg>
);

const IconSpinner = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M8 1v3M8 12v3M3.05 3.05l2.12 2.12M10.83 10.83l2.12 2.12M1 8h3M12 8h3M3.05 12.95l2.12-2.12M10.83 5.17l2.12-2.12"
      style={{ animation: "spin 1s linear infinite" }} />
  </svg>
);

const IconPlus = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

const IconBrandMark = () => (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2L10.5 6.5H14L10.5 9.5L12 14L8 11.5L4 14L5.5 9.5L2 6.5H5.5L8 2Z" />
  </svg>
);

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ product }: { product: Product }) {
  const m = product.metadata ?? {};
  const title = m.title ?? `Item ${product.id}`;
  const price = m.price;
  const category = m.category;
  const hasImg = typeof m.image === "string" && m.image.trim().length > 0;

  const categoryIcon: Record<string, string> = {
    clothing: "◻",
    shoes: "◻",
    footwear: "◻",
    bags: "◻",
    beauty: "◻",
    skincare: "◻",
    accessories: "◻",
  };
  const iconKey = Object.keys(categoryIcon).find((k) =>
    category?.toLowerCase().includes(k)
  );

  return (
    <div className="product-card" role="article" aria-label={title}>
      <div className="product-img">
        {hasImg ? (
          <Image src={m.image!} alt={title} width={160} height={110} style={{ width: "100%", height: "100%", objectFit: "cover" }} unoptimized />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        )}
      </div>
      <div className="product-meta">
        <p className="product-cat">{category ?? "Product"}</p>
        <p className="product-name">{title}</p>
        {price !== undefined && (
          <p className="product-price">
            {typeof price === "number" ? (price < 200 ? `$${price}` : `₹${price}`) : price}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="msg-row-ai" role="status" aria-label="Thinking">
      <div className="ai-avatar">
        <IconBrandMark />
      </div>
      <div className="ai-bubble">
        <div className="typing">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

// ── AI message ────────────────────────────────────────────────────────────────
function AIMessage({ msg }: { msg: Extract<ChatMessage, { role: "assistant" }> }) {
  if (msg.isLoading) return <TypingIndicator />;

  const hasProducts = (msg.payload?.products?.length ?? 0) > 0;
  const hasChat = !!(msg.payload?.promptResponse && hasProducts);
  const hasFormatted = !!msg.payload?.formattedResponse;

  return (
    <div className="msg-row-ai">
      <div className="ai-avatar" aria-hidden="true">
        <IconBrandMark />
      </div>
      <div className="ai-bubble">
        {/* Short chat line */}
        {hasChat && (
          <p className="ai-chat-text">{msg.payload!.promptResponse}</p>
        )}

        {/* Formatted product response */}
        {hasFormatted && (
          <div className="ai-formatted">{msg.payload!.formattedResponse}</div>
        )}

        {/* Product cards */}
        {hasProducts && (
          <div>
            <p className="products-label">Results</p>
            <div className="products-scroll" role="list">
              {msg.payload!.products!.map((p, i) => (
                <div key={`${p.id}-${i}`} role="listitem">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plain text (no payload) */}
        {!msg.payload && (
          <p className="ai-plain-text">{msg.content}</p>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi. I'm your shopping assistant — describe what you're looking for and I'll find the best matches from our catalog.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function resizeTextarea(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  async function submit(e?: FormEvent, override?: string) {
    e?.preventDefault();
    const text = (override ?? input).trim();
    if (!text || isLoading) return;

    setMessages((p) => [...p, { role: "user", content: text }, { role: "assistant", isLoading: true }]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);

    try {
      const res = await fetch("/api/product/get-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("API error response:", data);
        throw new Error(data?.error || `Server error (${res.status})`);
      }

      const reply: ChatMessage = {
        role: "assistant",
        payload: {
          formattedResponse: data.formattedResponse,
          promptResponse: data.promptResponse,
          products: data.products,
        },
        content: data.formattedResponse ?? data.promptResponse ?? "",
      };

      setMessages((p) => [...p.slice(0, -1), reply]);
      setHistory((p) => [
        ...p,
        { role: "user", content: text },
        { role: "assistant", content: data.promptResponse ?? data.formattedResponse ?? "" },
      ]);
    } catch (err: unknown) {
      console.error("Chat request failed:", err);
      const errMsg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setMessages((p) => [...p.slice(0, -1), { role: "assistant", content: errMsg }]);
      setHistory((p) => [...p, { role: "user", content: text }, { role: "assistant", content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  }

  const isWelcome = messages.length === 1;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="app-layout">
        {/* ── Sidebar ── */}
        <aside className="sidebar" role="navigation" aria-label="Sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark" aria-hidden="true">
              <IconBrandMark />
            </div>
            <span className="sidebar-logo-name">Catalog</span>
          </div>

          <button
            id="new-chat-btn"
            className="sidebar-new-chat"
            aria-label="New conversation"
            onClick={() => {
              setMessages([{ role: "assistant", content: "Hi. I'm your shopping assistant — describe what you're looking for and I'll find the best matches from our catalog." }]);
              setHistory([]);
              setInput("");
            }}
          >
            <IconPlus /> New conversation
          </button>

          <nav className="sidebar-section" aria-label="Browse categories">
            <p className="sidebar-section-label">Browse</p>
            {["Clothing", "Footwear", "Bags", "Beauty", "Accessories"].map((cat) => (
              <button
                key={cat}
                className="sidebar-item"
                onClick={() => { setInput(cat); textareaRef.current?.focus(); }}
                aria-label={`Search ${cat}`}
              >
                {cat}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="status-dot" aria-hidden="true" />
            <span>Assistant online</span>
          </div>
        </aside>

        {/* ── Chat ── */}
        <main className="chat-main" role="main">
          {/* Header */}
          <header className="chat-header">
            <div>
              <p className="chat-header-title">Shopping Assistant</p>
              <p className="chat-header-sub">Fashion &amp; Beauty</p>
            </div>
            <div className="header-live" role="status" aria-label="Online">
              <div className="status-dot" aria-hidden="true" />
              Online
            </div>
          </header>

          {/* Messages */}
          <div className="messages-area" role="log" aria-label="Conversation" aria-live="polite">
            <div className="messages-inner">

              {/* Welcome */}
              {isWelcome && (
                <div className="welcome">
                  <h1 className="welcome-title">What are you looking for?</h1>
                  <p className="welcome-sub">
                    Describe any fashion or beauty item and I'll search our catalog for the closest matches.
                  </p>
                </div>
              )}

              {/* Messages */}
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="msg-row-user">
                    <div className="user-bubble">{m.content}</div>
                  </div>
                ) : (
                  <AIMessage key={i} msg={m} />
                )
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="input-area">
            <div className="input-inner">
              {/* Chips */}
              <div className="chips" role="list" aria-label="Quick searches">
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    role="listitem"
                    className="chip"
                    disabled={isLoading}
                    onClick={() => submit(undefined, c)}
                    aria-label={c}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form id="chat-form" onSubmit={submit} aria-label="Send a message">
                <div className="input-box">
                  <textarea
                    ref={textareaRef}
                    id="chat-input"
                    className="chat-textarea"
                    rows={1}
                    placeholder="Describe what you want to find..."
                    value={input}
                    disabled={isLoading}
                    aria-label="Message"
                    onChange={(e) => { setInput(e.target.value); resizeTextarea(e.target); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
                    }}
                  />
                  <button
                    id="send-btn"
                    type="submit"
                    className="send-btn"
                    disabled={isLoading || !input.trim()}
                    aria-label={isLoading ? "Sending" : "Send"}
                  >
                    {isLoading ? <IconSpinner /> : <IconSend />}
                  </button>
                </div>
                <div className="input-meta">
                  <span>Enter to send · Shift+Enter for new line</span>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
