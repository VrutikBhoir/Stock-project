"use client";
// AiAssistantBot.tsx
// ─────────────────────────────────────────────────────────────────────────────
// A floating AI assistant bot popup that matches the dark portfolio UI.
// Drop this component anywhere in your layout — it renders a fixed FAB button
// (bottom-right) that opens a chat panel powered by the Anthropic API.
//
// Usage:
//   import AiAssistantBot from "@/components/AiAssistantBot";
//   // Add inside your page/layout:
//   <AiAssistantBot />
//
// The bot knows about the Portfolio app features and answers "how to use" questions.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface QuickPrompt {
  label: string;
  icon: string;
  prompt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const QUICK_PROMPTS: QuickPrompt[] = [
  { icon: "🛒", label: "How to buy a stock?",      prompt: "How do I buy a stock in this portfolio app?" },
  { icon: "💸", label: "How to sell a stock?",     prompt: "How do I sell a stock in my portfolio?" },
  { icon: "🤖", label: "What is AI Advice?",       prompt: "What does the AI Advice feature do and how do I use it?" },
  { icon: "📊", label: "Understanding P&L",        prompt: "How is P&L (profit and loss) calculated in this app?" },
  { icon: "🛡️", label: "What is Risk Analysis?",  prompt: "Can you explain the Risk Analysis section?" },
  { icon: "🕒", label: "Trade History",            prompt: "How does the trade history tab work?" },
];

const SYSTEM_PROMPT = `You are a friendly, knowledgeable AI assistant embedded inside an AI Portfolio Lab web app. Your job is to help users understand how to use the app.

Here is a complete guide to the app's features:

**BUYING STOCKS:**
- Click the green "+ Buy Stock" button in the top-right header.
- A modal opens with a stock search bar — type a ticker (e.g. AAPL) or company name.
- Select a stock from the dropdown, enter the number of shares you want.
- Optionally enter a Stop Loss price (must be below current price) to auto-protect your position.
- The total cost preview updates live. Click "Buy Shares →" to confirm.

**SELLING STOCKS:**
- In the Holdings table, click the red "Sell" button next to any position.
- A modal opens showing your current shares, avg buy price, and live price.
- Enter how many shares to sell, or use the 25% / 50% / 75% / 100% quick-fill buttons.
- The Proceeds and Realized P&L preview updates instantly. Click "Sell Shares →" to confirm.

**BUYING MORE OF AN EXISTING STOCK:**
- In the Holdings table, click the green "+ Buy" button next to any existing position.
- This pre-fills the Buy modal with that stock already selected.

**AI ADVICE:**
- Click the blue "🤖 Get AI Advice" button above the holdings table.
- The AI analyses every position and returns a HOLD, SELL, or BOOK PROFIT recommendation with a reason.
- Click the ▾ arrow on any row to expand and read that stock's recommendation.

**PORTFOLIO OVERVIEW:**
- The overview section shows: Cash Balance, Portfolio Value, Total Assets, Total Profit, Total Loss, and Net P&L.
- The Net P&L card turns green (trophy 🏆) when you're profitable and red (warning ⚠️) when in loss.

**RISK ANALYSIS:**
- Displayed below the overview cards.
- Shows: Risk Level (Low/Medium/High), Diversification Score (higher = more spread out), Largest Position (the stock taking up the most of your portfolio), and its Position Weight %.

**TRADE HISTORY:**
- Click the "🕒 Trade History" tab to switch from Holdings view.
- Shows a log of all your BUY and SELL trades with symbol, quantity, and price.

**HOLDINGS TABLE COLUMNS:**
- Stock: ticker avatar + company name
- Qty: number of shares owned
- Avg: your average buy price
- Price: current live market price
- Value: current total value (qty × price)
- P&L: profit or loss in dollars + percentage

Always be concise, friendly, and use emojis naturally. If someone asks something outside the app's scope, gently redirect them back to portfolio-related topics. Respond in 2-5 sentences unless a detailed step-by-step is truly needed.`;

// ── Unique ID helper ──────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

// ── Bot avatar SVG ────────────────────────────────────────────────────────────
function BotAvatar({ size = 32, pulse = false }: { size?: number; pulse?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #1e40af, #0891b2)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      boxShadow: pulse ? "0 0 0 4px rgba(99,179,237,.2), 0 0 16px rgba(8,145,178,.4)" : "none",
      animation: pulse ? "botPulse 2s ease-in-out infinite" : "none",
      fontSize: size * 0.5,
    }}>
      🤖
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#63b3ed",
          animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", gap: 10,
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-end",
      animation: "msgSlide .2s ease",
    }}>
      {!isUser && <BotAvatar size={28} />}
      <div style={{
        maxWidth: "78%",
        padding: "10px 14px",
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isUser
          ? "linear-gradient(135deg, #1d4ed8, #0891b2)"
          : "rgba(255,255,255,.06)",
        border: isUser ? "none" : "1px solid rgba(255,255,255,.08)",
        color: "#e2e8f0",
        fontSize: 13,
        lineHeight: 1.65,
        wordBreak: "break-word" as const,
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: "rgba(99,179,237,.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13,
        }}>👤</div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AiAssistantBot() {
  const [open, setOpen]               = useState(false);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [isTyping, setIsTyping]       = useState(false);
  const [hasUnread, setHasUnread]     = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isMinimised, setIsMinimised] = useState(false);
  const messagesEndRef                = useRef<HTMLDivElement>(null);
  const inputRef                      = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input on open
  useEffect(() => {
    if (open && !isMinimised) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, isMinimised]);

  // Show unread dot when closed and AI responds
  useEffect(() => {
    if (!open && messages.length > 0 && messages[messages.length - 1].role === "assistant") {
      setHasUnread(true);
    }
  }, [messages, open]);

  const handleOpen = () => {
    setOpen(true);
    setHasUnread(false);
    setIsMinimised(false);
  };

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setShowWelcome(false);
    setInput("");

    const userMsg: Message = { id: uid(), role: "user", content: trimmed, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const history = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: trimmed }
      ];

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: history
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const replyText = data?.reply || "Sorry, I couldn't get a response right now. Please try again!";

      const botMsg: Message = {
        id: uid(),
        role: "assistant",
        content: replyText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("AI Assistant error:", error);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: "⚠️ I'm having trouble connecting right now. Please try again in a moment.", timestamp: new Date() },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, isTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowWelcome(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes botPulse  { 0%,100%{box-shadow:0 0 0 4px rgba(99,179,237,.2),0 0 16px rgba(8,145,178,.4)} 50%{box-shadow:0 0 0 8px rgba(99,179,237,.08),0 0 24px rgba(8,145,178,.2)} }
        @keyframes fabPop    { from{opacity:0;transform:scale(.7) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes panelSlide{ from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes msgSlide  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes typingDot { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1);opacity:1} }
        @keyframes unreadPing{ 0%{transform:scale(1)} 70%{transform:scale(1.4);opacity:0} 100%{transform:scale(1);opacity:0} }
        @keyframes welcomeFade{from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)}}
        .qpbtn:hover { background:rgba(99,179,237,.14) !important; border-color:rgba(99,179,237,.35) !important; transform:translateY(-1px); }
        .send-btn:hover { background:linear-gradient(135deg,#2563eb,#0891b2) !important; }
        .bot-input:focus { outline:none; border-color:rgba(99,179,237,.5) !important; box-shadow:0 0 0 3px rgba(99,179,237,.08); }
        .fab:hover { transform:scale(1.08) !important; }
        .icon-btn:hover { background:rgba(255,255,255,.08) !important; color:#94a3b8 !important; }
      `}</style>

      {/* ── FAB button ── */}
      {!open && (
        <button
          className="fab"
          onClick={handleOpen}
          title="Ask AI Assistant"
          style={{
            position: "fixed", bottom: 28, right: 28, zIndex: 100,
            width: 60, height: 60, borderRadius: "50%", border: "none",
            background: "linear-gradient(135deg,#1e40af,#0891b2)",
            boxShadow: "0 8px 32px rgba(8,145,178,.45), 0 2px 8px rgba(0,0,0,.4)",
            cursor: "pointer", fontSize: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform .2s",
            animation: "fabPop .35s cubic-bezier(.34,1.56,.64,1)",
          }}
        >
          🤖
          {hasUnread && (
            <span style={{
              position: "absolute", top: 4, right: 4,
              width: 14, height: 14, borderRadius: "50%",
              background: "#f87171", border: "2px solid #070d1a",
            }}>
              <span style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "#f87171", animation: "unreadPing 1.5s ease infinite",
              }} />
            </span>
          )}
        </button>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 100,
          width: 390, maxWidth: "calc(100vw - 32px)",
          background: "linear-gradient(160deg,#0d1829,#0a1220)",
          border: "1px solid rgba(99,179,237,.15)",
          borderRadius: 20,
          boxShadow: "0 24px 64px rgba(0,0,0,.75), 0 0 0 1px rgba(99,179,237,.06)",
          fontFamily: "'DM Sans',sans-serif",
          animation: "panelSlide .3s cubic-bezier(.34,1.2,.64,1)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          maxHeight: isMinimised ? "auto" : "600px",
        }}>

          {/* Header */}
          <div style={{
            padding: "16px 18px",
            background: "linear-gradient(135deg,rgba(30,64,175,.3),rgba(8,145,178,.15))",
            borderBottom: isMinimised ? "none" : "1px solid rgba(255,255,255,.06)",
            display: "flex", alignItems: "center", gap: 12,
            flexShrink: 0,
          }}>
            <BotAvatar size={38} pulse={!isMinimised} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Portfolio Assistant</div>
              <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
                Online · Ask me anything
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {messages.length > 0 && (
                <button className="icon-btn" onClick={clearChat} title="Clear chat"
                  style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: "#475569", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                  🗑
                </button>
              )}
              <button className="icon-btn" onClick={() => setIsMinimised((m) => !m)} title={isMinimised ? "Expand" : "Minimise"}
                style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: "#475569", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                {isMinimised ? "⬆" : "⬇"}
              </button>
              <button className="icon-btn" onClick={() => setOpen(false)} title="Close"
                style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: "#475569", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                ×
              </button>
            </div>
          </div>

          {!isMinimised && (
            <>
              {/* Messages area */}
              <div style={{
                flex: 1, overflowY: "auto", padding: "18px 16px",
                display: "flex", flexDirection: "column", gap: 14,
                minHeight: 280,
                scrollbarWidth: "thin",
              }}>

                {/* Welcome state */}
                {showWelcome && messages.length === 0 && (
                  <div style={{ animation: "welcomeFade .4s ease" }}>
                    <div style={{
                      textAlign: "center", padding: "12px 0 20px",
                    }}>
                      <div style={{ fontSize: 40, marginBottom: 10 }}>👋</div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
                        Hi! I'm your Portfolio Assistant
                      </h3>
                      <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7, maxWidth: 280, margin: "0 auto" }}>
                        I can help you understand how to use every feature of this app. Pick a topic or ask me anything!
                      </p>
                    </div>

                    {/* Quick prompts grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {QUICK_PROMPTS.map((qp) => (
                        <button key={qp.label} className="qpbtn"
                          onClick={() => sendMessage(qp.prompt)}
                          style={{
                            padding: "10px 12px", borderRadius: 11,
                            border: "1px solid rgba(99,179,237,.18)",
                            background: "rgba(99,179,237,.06)",
                            color: "#94a3b8", cursor: "pointer",
                            fontSize: 12, fontWeight: 500,
                            textAlign: "left" as const,
                            display: "flex", alignItems: "center", gap: 7,
                            transition: "all .15s",
                            fontFamily: "'DM Sans',sans-serif",
                          }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>{qp.icon}</span>
                          <span style={{ lineHeight: 1.35 }}>{qp.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message list */}
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-end", animation: "msgSlide .2s ease" }}>
                    <BotAvatar size={28} />
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: "16px 16px 16px 4px",
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(255,255,255,.08)",
                    }}>
                      <TypingDots />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick prompts strip (after first message) */}
              {messages.length > 0 && (
                <div style={{
                  padding: "8px 12px",
                  borderTop: "1px solid rgba(255,255,255,.04)",
                  display: "flex", gap: 6, overflowX: "auto",
                  flexShrink: 0,
                  scrollbarWidth: "none",
                }}>
                  {QUICK_PROMPTS.slice(0, 4).map((qp) => (
                    <button key={qp.label} className="qpbtn"
                      onClick={() => sendMessage(qp.prompt)}
                      style={{
                        padding: "5px 10px", borderRadius: 20,
                        border: "1px solid rgba(99,179,237,.18)",
                        background: "rgba(99,179,237,.05)",
                        color: "#64748b", cursor: "pointer",
                        fontSize: 11, fontWeight: 500,
                        whiteSpace: "nowrap" as const,
                        flexShrink: 0,
                        transition: "all .15s",
                        fontFamily: "'DM Sans',sans-serif",
                      }}>
                      {qp.icon} {qp.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input row */}
              <div style={{
                padding: "12px 14px",
                borderTop: "1px solid rgba(255,255,255,.06)",
                display: "flex", gap: 10, alignItems: "center",
                flexShrink: 0,
                background: "rgba(0,0,0,.2)",
              }}>
                <input
                  ref={inputRef}
                  className="bot-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask how to use this app…"
                  disabled={isTyping}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.08)",
                    borderRadius: 12,
                    color: "#e2e8f0",
                    fontSize: 13,
                    fontFamily: "'DM Sans',sans-serif",
                    transition: "border-color .2s, box-shadow .2s",
                    opacity: isTyping ? 0.6 : 1,
                  }}
                />
                <button
                  className="send-btn"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  style={{
                    width: 42, height: 42, borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg,#1d4ed8,#0891b2)",
                    color: "#fff", cursor: "pointer",
                    fontSize: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    opacity: (!input.trim() || isTyping) ? 0.4 : 1,
                    transition: "all .2s",
                  }}
                >
                  ➤
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}