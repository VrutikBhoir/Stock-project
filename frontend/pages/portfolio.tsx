import { useEffect, useState, useMemo, useRef, useCallback, memo } from "react"
import { supabase } from "../lib/supabase"
import { useRouter } from "next/router"
import { STOCKS } from "../data/stocks"
import { API_BASE_URL } from "@/lib/api"
import AiAssistantBot from "../components/AiAssistantBot"
import Head from "next/head"
import { isArray } from "util"

// Simple cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

const cachedFetch = async (url: string) => {
  const cached = apiCache.get(url)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  const res = await fetch(url)
  const data = await res.json()
  apiCache.set(url, { data, timestamp: Date.now() })
  return data
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Holding {
  symbol: string
  name?: string
  quantity: number
  avg_price: number
  current_price: number
  profit_loss: number
}

interface Trade {
  id: string
  trade_type: string
  symbol: string
  quantity: number
  price: number
}

interface AiAdvice {
  symbol: string
  recommendation: "SELL" | "HOLD" | "BOOK PROFIT"
  reason: string
}

interface Summary {
  cash_balance: number
  portfolio_value: number
  total_assets: number
}

interface Risk {
  risk_level: string
  diversification_score: number
  largest_position: string
  largest_position_percent: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  }).format(n)
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${Number(n).toFixed(2)}%`
const fmtS = (n: number) => (Number.isInteger(n) ? `${n}` : Number(n).toFixed(4))

// ── Memoized Holdings Row Component ──────────────────────────────────────────────
const HoldingRow = memo(({ 
  h, i, last, expanded, ai, holdings, livePrice, aiMap, setExpanded, loadingAI, openBuy, openSell 
}: any) => {
  const pnl = Number(h.profit_loss)
  const isProfit = pnl >= 0
  const currentVal = h.quantity * h.current_price
  const exp = expanded === h.symbol

  return (
    <div key={h.symbol} style={{ animation:"fadeUp .25s ease" }}>
      <div className="srow" style={{ display:"grid", gridTemplateColumns:"1.6fr .7fr .7fr .8fr .8fr 1fr 160px", padding:"14px 20px", borderBottom:(!last || exp) ? "1px solid rgba(255,255,255,.04)" : "none", alignItems:"center", background:"transparent", transition:"background .15s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:11 }}>
          <div style={{ width:38, height:38, borderRadius:9, background: isProfit ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700, color: isProfit ? "#34d399" : "#f87171", flexShrink:0 }}>
            {h.symbol.slice(0,4)}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"#f1f5f9", fontFamily:"'DM Mono',monospace" }}>{h.symbol}</div>
            {h.name && <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{h.name}</div>}
          </div>
        </div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#94a3b8" }}>{fmtS(h.quantity)}</div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#64748b" }}>{fmt(h.avg_price)}</div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#94a3b8" }}>{fmt(h.current_price)}</div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#e2e8f0" }}>{fmt(currentVal)}</div>
        <div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:600, color: isProfit ? "#34d399" : "#f87171" }}>{pnl >= 0 ? "+" : ""}{fmt(pnl)}</div>
          <div style={{ fontSize:11, marginTop:2, color: isProfit ? "#6ee7b7" : "#fca5a5" }}>
            {fmtPct(((pnl / (h.quantity * h.avg_price)) * 100) || 0)}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6 }}>
          <button className="bbtn" onClick={() => openBuy(h.symbol)} style={{ padding:"5px 10px", borderRadius:7, border:"1px solid rgba(52,211,153,.2)", background:"rgba(52,211,153,.07)", color:"#34d399", cursor:"pointer", fontSize:12, fontWeight:600, transition:"all .15s" }}>+ Buy</button>
          <button className="sbtn" onClick={() => openSell(h)} style={{ padding:"5px 10px", borderRadius:7, border:"1px solid rgba(248,113,113,.2)", background:"rgba(248,113,113,.07)", color:"#f87171", cursor:"pointer", fontSize:12, fontWeight:600, transition:"all .15s" }}>Sell</button>
          {(ai || !isProfit) && (
            <span title="AI advice" onClick={() => setExpanded(exp ? null : h.symbol)}
              style={{ color:"#63b3ed", fontSize:15, cursor:"pointer", display:"inline-block", transform: exp ? "rotate(180deg)" : "none", transition:"transform .2s", userSelect:"none" }}>▾</span>
          )}
        </div>
      </div>

      {/* AI row */}
      {exp && (
        <div style={{ background:"linear-gradient(135deg,rgba(10,16,32,.97),rgba(16,26,46,.8))", borderTop:"1px solid rgba(99,179,237,.1)", borderBottom:!last ? "1px solid rgba(255,255,255,.04)" : "none", padding:"18px 20px", animation:"fadeUp .25s ease" }}>
          {loadingAI && !ai ? (
            <div style={{ display:"flex", alignItems:"center", gap:10, color:"#64748b", fontSize:13 }}>
              <span style={{ width:10, height:10, borderRadius:"50%", background:"#63b3ed", display:"inline-block", animation:"pulse 1s infinite" }} />
              AI is analysing {h.symbol}…
            </div>
          ) : ai ? (
            <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
              <div style={{ flexShrink:0, padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:700, whiteSpace:"nowrap",
                background: ai.recommendation === "HOLD" ? "rgba(251,191,36,.14)" : ai.recommendation === "BOOK PROFIT" ? "rgba(52,211,153,.14)" : "rgba(248,113,113,.14)",
                color:      ai.recommendation === "HOLD" ? "#fbbf24"              : ai.recommendation === "BOOK PROFIT" ? "#34d399"              : "#f87171",
                border:     `1px solid ${ai.recommendation === "HOLD" ? "rgba(251,191,36,.3)" : ai.recommendation === "BOOK PROFIT" ? "rgba(52,211,153,.3)" : "rgba(248,113,113,.3)"}` }}>
                🤖 {ai.recommendation === "HOLD" ? "⏳ HOLD" : ai.recommendation === "BOOK PROFIT" ? "✅ BOOK PROFIT" : "🚨 SELL"}
              </div>
              <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.75 }}>{ai.reason}</p>
            </div>
          ) : (
            <p style={{ color:"#64748b", fontSize:13 }}>Click <strong style={{ color:"#63b3ed" }}>Get AI Advice</strong> above to load recommendations.</p>
          )}
        </div>
      )}
    </div>
  )
}, (prev, next) => {
  return prev.h.symbol === next.h.symbol && prev.expanded === next.expanded && prev.ai === next.ai && prev.loadingAI === next.loadingAI
})

// ── Main Component ────────────────────────────────────────────────────────────
export default function Portfolio() {
  const router = useRouter()
  const { symbol: qSymbol, action } = router.query
  const resolvedSymbol = Array.isArray(qSymbol) ? qSymbol[0] : qSymbol

  

  // ── State ─────────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState<Summary | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [aiAdvice, setAiAdvice] = useState<AiAdvice[]>([])
  const [risk, setRisk] = useState<Risk | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [loadingPortfolio, setLoadingPortfolio] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  // Buy/Sell modal
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"buy" | "sell">("buy")
  const [modalStock, setModalStock] = useState<{ symbol: string; name?: string; current_price?: number } | null>(null)
  const [shareInput, setShareInput] = useState("")
  const [stopLoss, setStopLoss] = useState("")
  const [modalErr, setModalErr] = useState("")
  const [modalLoading, setModalLoading] = useState(false)
  
  // Buy search dropdown
  const [buyQ, setBuyQ] = useState("")
  const [buyOpen, setBuyOpen] = useState(false)
  const [livePrice, setLivePrice] = useState(0)
  const buyRef = useRef<HTMLDivElement>(null)

  // Expanded AI row
  const [expanded, setExpanded] = useState<string | null>(null)

  // Active tab
  const [tab, setTab] = useState<"holdings" | "trades">("holdings")

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (buyRef.current && !buyRef.current.contains(e.target as Node)) setBuyOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── Fetch live price when modal stock changes (debounced) ─────────────────────────
  useEffect(() => {
    const sym = modalStock?.symbol
    if (!sym || typeof sym !== "string") return

    const timer = setTimeout(async () => {
      try {
        const data = await cachedFetch(`${API_BASE_URL}/api/quotes?symbols=${sym}`)
        if (data && typeof data === "object" && sym in data && data[sym]?.price) {
          setLivePrice(Number(data[sym].price))
        }
      } catch (err) {
        console.error("Price fetch failed", err)
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [modalStock])

  // ── Load portfolio on mount ───────────────────────────────────────────────
  useEffect(() => {
    async function loadPortfolio() {
      const { data } = await supabase.auth.getUser()
      if (!data?.user) return
      const uid = data.user.id
      setLoadingPortfolio(true)
      try {
        await Promise.all([
  cachedFetch(`${API_BASE_URL}/api/trade/portfolio/holdings/${uid}`)
    .then((res) => setHoldings(Array.isArray(res) ? res : res.data || [])),

  cachedFetch(`${API_BASE_URL}/api/trade/portfolio/summary/${uid}`)
    .then(setSummary),

  cachedFetch(`${API_BASE_URL}/api/trade/portfolio/trades/${uid}`)
    .then((res) => setTrades(Array.isArray(res) ? res : res.data || [])),

  cachedFetch(`${API_BASE_URL}/api/trade/portfolio/risk/${uid}`)
    .then(setRisk),
])
      } catch (err) {
        console.error("Portfolio load failed", err)
      } finally {
        setLoadingPortfolio(false)
      }
    }
    loadPortfolio()
  }, [API_BASE_URL])

  // ── Handle URL action (buy/sell pre-fill) ─────────────────────────────────
  useEffect(() => {
    if (resolvedSymbol && action) {
      const h = holdings.find((h) => h.symbol === resolvedSymbol)
      if (action === "buy") { openBuy(resolvedSymbol) }
      else if (action === "sell" && h) { openSell(h) }
    }
  }, [resolvedSymbol, action, holdings])

  // ── Buy dropdown results ──────────────────────────────────────────────────
  const buyResults = useMemo(() => {
    const q = buyQ.trim().toLowerCase()
    if (!q) return STOCKS.slice(0, 8)
    return STOCKS.filter((s: any) =>
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [buyQ])

  // ── Derived overview ──────────────────────────────────────────────────────
  const overview = useMemo(() => {
    const profitH = holdings.filter((h) => Number(h.profit_loss) >= 0)
    const lossH = holdings.filter((h) => Number(h.profit_loss) < 0)
    return {
      totalPnl: holdings.reduce((a, h) => a + Number(h.profit_loss), 0),
      totalProfit: profitH.reduce((a, h) => a + Number(h.profit_loss), 0),
      totalLoss: lossH.reduce((a, h) => a + Math.abs(Number(h.profit_loss)), 0),
      profitCount: profitH.length,
      lossCount: lossH.length,
    }
  }, [holdings])

  const aiMap = Object.fromEntries(
  (Array.isArray(aiAdvice) ? aiAdvice : []).map((a) => [a.symbol, a])
)

  const sharesNum = parseFloat(shareInput) || 0
  const totalCost = sharesNum * livePrice
  const modalHolding = modalStock ? holdings.find((h) => h.symbol === modalStock.symbol) : undefined
  const sellProceeds = sharesNum * livePrice
  const sellPnl = modalHolding ? sharesNum * (livePrice - modalHolding.avg_price) : 0

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openBuy = (sym?: string) => {
    setModalMode("buy")
    setModalStock(sym ? { symbol: sym } : null)
    setBuyQ(""); setShareInput(""); setStopLoss(""); setModalErr(""); setModalOpen(true)
  }
  const openSell = (h: Holding) => {
    setModalMode("sell")
    setModalStock({ symbol: h.symbol, name: h.name, current_price: h.current_price })
    setShareInput(""); setStopLoss(""); setModalErr(""); setModalOpen(true)
  }
  const closeModal = () => {
    setModalOpen(false); setModalStock(null)
    setShareInput(""); setStopLoss(""); setModalErr(""); setBuyQ("")
  }

  // ── BUY ───────────────────────────────────────────────────────────────────
  const executeBuy = async () => {
    setModalErr("")
    if (!modalStock) { setModalErr("Please select a stock first."); return }
    const shares = parseFloat(shareInput)
    if (!shares || shares <= 0) { setModalErr("Enter a valid number of shares."); return }
    const parsedSL = stopLoss.trim() === "" ? null : Number(stopLoss)
    if (parsedSL !== null && (!isFinite(parsedSL) || parsedSL <= 0)) { setModalErr("Stop loss must be a positive number."); return }
    if (parsedSL !== null && parsedSL >= livePrice) { setModalErr("Stop loss must be lower than current price."); return }

    setModalLoading(true)
    try {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setModalErr("User not logged in."); return }
      const res = await fetch(`${API_BASE_URL}/api/trade/portfolio/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: data.user.id, symbol: modalStock.symbol, quantity: shares, stop_loss: parsedSL }),
      })
      if (!res.ok) {
        const txt = await res.text()
        try { setModalErr(JSON.parse(txt)?.detail || "Buy failed.") }
        catch { setModalErr(txt || "Buy failed.") }
        return
      }
      closeModal()
      router.replace(router.asPath)
    } catch {
      setModalErr(`Cannot reach API at ${API_BASE_URL}`)
    } finally { setModalLoading(false) }
  }

  // ── SELL ──────────────────────────────────────────────────────────────────
  const executeSell = async () => {
    setModalErr("")
    if (!modalStock) return
    const shares = parseFloat(shareInput)
    const h = holdings.find((h) => h.symbol === modalStock.symbol)!
    if (!shares || shares <= 0) { setModalErr("Enter a valid number of shares."); return }
    if (shares > h.quantity) { setModalErr(`You only own ${fmtS(h.quantity)} shares.`); return }

    setModalLoading(true)
    try {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setModalErr("User not logged in."); return }
      const res = await fetch(`${API_BASE_URL}/api/trade/portfolio/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: data.user.id, symbol: modalStock.symbol, quantity: shares }),
      })
      if (!res.ok) { const txt = await res.text(); setModalErr(txt || "Sell failed."); return }
      closeModal()
      window.location.reload()
    } catch {
      setModalErr(`Cannot reach API at ${API_BASE_URL}`)
    } finally { setModalLoading(false) }
  }

  // ── AI Advice ─────────────────────────────────────────────────────────────
  const fetchAiAdvice = async () => {
  setLoadingAI(true)
  try {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    const res = await fetch(`${API_BASE_URL}/api/portfolio/ai-advice/${data.user.id}`)
    const responseData = await res.json()

    if (Array.isArray(responseData)) {
      setAiAdvice(responseData)
    } else if (responseData.advice) {
      setAiAdvice(responseData.advice)
    } else {
      setAiAdvice([])
    }
  } catch (err) {
    console.error("AI advice fetch failed", err)
  } finally {
    setLoadingAI(false)
  }
}

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingPortfolio) {
    return (
      <>
        <Head><title>Portfolio | Loading...</title></Head>
        <div className="bg">
          <div className="market-grid" />
        </div>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 44, height: 44, border: "3px solid rgba(99,179,237,.15)", borderTop: "3px solid #63b3ed", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#cbd5e1", fontSize: 14 }}>Loading portfolio…</p>
          </div>
        </div>
        <style jsx>{`
          .bg {
            position: fixed;
            inset: 0;
            z-index: -1;
            background: linear-gradient(135deg, #020617 0%, #0a0f1e 50%, #020617 100%);
          }
          .market-grid {
            position: absolute;
            inset: 0;
            background-image: 
              linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
            background-size: 50px 50px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </>
    )
  }

  const hasHoldings = holdings.length > 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>AI Portfolio Lab | Stock Market Platform</title>
      </Head>

      {/* STOCK MARKET THEMED BACKGROUND - SIMPLIFIED */}
      <div className="bg">
        <div className="market-grid" />
        <div className="orbs">
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>
        <div className="gradient-overlay" />
      </div>

      <div style={{ minHeight: "100vh", fontFamily: "'DM Sans','Inter',sans-serif", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after { box-sizing: border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:#0f172a; }
        ::-webkit-scrollbar-thumb { background:#334155; border-radius:3px; }
        
        /* BACKGROUND */
        .bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          background: linear-gradient(135deg, #020617 0%, #0a0f1e 50%, #020617 100%);
        }

        .market-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          will-change: background-position;
        }

        .orbs {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          animation: orbFloat 15s infinite ease-in-out;
          will-change: transform;
        }

        .orb1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.3), transparent);
          top: 10%;
          left: 10%;
        }

        .orb2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent);
          top: 40%;
          right: 10%;
          animation-delay: 3s;
        }

        .orb3 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.2), transparent);
          bottom: 10%;
          left: 50%;
          animation-delay: 6s;
        }

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -50px) scale(1.1); }
          66% { transform: translate(-50px, 50px) scale(0.9); }
        }

        .gradient-overlay {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
          animation: pulseOverlay 8s ease-in-out infinite;
          will-change: opacity;
        }

        @keyframes pulseOverlay {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }

        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes pop    { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .srow:hover  { background:rgba(255,255,255,.025) !important; }
        .ocard       { transition:transform .2s,box-shadow .2s; }
        .ocard:hover { transform:translateY(-3px); box-shadow:0 16px 40px rgba(0,0,0,.5) !important; }
        .ditem:hover { background:rgba(99,179,237,.09) !important; }
        .minput:focus { outline:none; border-color:rgba(99,179,237,.55) !important; box-shadow:0 0 0 3px rgba(99,179,237,.1); }
        .sbtn:hover  { background:rgba(248,113,113,.2) !important; }
        .bbtn:hover  { background:rgba(52,211,153,.2) !important; }
        .pctbtn:hover { background:rgba(255,255,255,.07) !important; color:#94a3b8 !important; }
        .tabBtn:hover { color:#94a3b8 !important; }
      `}</style>

      {/* ── Buy / Sell Modal ── */}
      {modalOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,.75)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center" }} onClick={closeModal}>
          <div style={{ background:"linear-gradient(135deg,#0f1e35,#0c1525)", border:"1px solid rgba(255,255,255,.08)", borderRadius:18, padding:32, width:430, maxWidth:"92vw", boxShadow:"0 24px 64px rgba(0,0,0,.7)", animation:"pop .25s ease" }} onClick={(e) => e.stopPropagation()}>

            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:"#f1f5f9" }}>{modalMode === "buy" ? "🛒 Buy Stock" : "💸 Sell Stock"}</h3>
              <button onClick={closeModal} style={{ background:"none", border:"none", color:"#64748b", fontSize:22, cursor:"pointer" }}>×</button>
            </div>

            {/* BUY: stock search */}
            {modalMode === "buy" && (
              <div ref={buyRef} style={{ position:"relative", marginBottom:20 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#475569", letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>Search Stock</label>
                {modalStock ? (
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(99,179,237,.08)", border:"1px solid rgba(99,179,237,.2)", borderRadius:10 }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:"rgba(99,179,237,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:700, color:"#63b3ed" }}>{modalStock.symbol.slice(0,4)}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9" }}>{modalStock.symbol}</div>
                      <div style={{ fontSize:11, color:"#64748b" }}>Live price: {livePrice ? `$${livePrice.toFixed(2)}` : "Loading..."}</div>
                    </div>
                    <button onClick={() => setModalStock(null)} style={{ background:"none", border:"none", color:"#64748b", fontSize:18, cursor:"pointer" }}>×</button>
                  </div>
                ) : (
                  <>
                    <div style={{ position:"relative" }}>
                      <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#475569", pointerEvents:"none" }}>🔍</span>
                      <input className="minput" type="text" value={buyQ} placeholder="Type ticker or name… e.g. AAPL"
                        onChange={(e) => { setBuyQ(e.target.value.toUpperCase()); setBuyOpen(true) }}
                        onFocus={() => setBuyOpen(true)}
                        style={{ width:"100%", padding:"11px 12px 11px 36px", background:"#0a1628", border:"1px solid rgba(255,255,255,.08)", borderRadius:10, color:"#e2e8f0", fontSize:14, fontFamily:"inherit", transition:"border-color .2s,box-shadow .2s" }} />
                    </div>
                    {buyOpen && buyResults.length > 0 && (
                      <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#0f1e35", border:"1px solid rgba(99,179,237,.18)", borderRadius:12, overflow:"hidden", zIndex:10, boxShadow:"0 12px 32px rgba(0,0,0,.6)", animation:"fadeUp .15s ease" }}>
                        {(buyResults as any[]).map((s, i) => (
                          <div key={s.symbol} className="ditem"
                            onClick={() => { setModalStock({ symbol: s.symbol, name: s.name }); setBuyOpen(false); setBuyQ("") }}
                            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", cursor:"pointer", borderBottom: i < buyResults.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none", background:"transparent", transition:"background .1s" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:34, height:34, borderRadius:8, background:"rgba(99,179,237,.08)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700, color:"#63b3ed" }}>{s.symbol.slice(0,4)}</div>
                              <div>
                                <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9" }}>{s.symbol}</div>
                                <div style={{ fontSize:11, color:"#64748b" }}>{s.name}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* SELL: holding info */}
            {modalMode === "sell" && modalStock && modalHolding && (
              <div style={{ marginBottom:20, padding:"12px 16px", background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.15)", borderRadius:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:"rgba(248,113,113,.1)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:700, color:"#f87171" }}>{modalStock.symbol.slice(0,4)}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9" }}>{modalStock.symbol}</div>
                    <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
                      You own <strong style={{ color:"#94a3b8" }}>{fmtS(modalHolding.quantity)} shares</strong> · Avg {fmt(modalHolding.avg_price)} · Now {fmt(livePrice || modalHolding.current_price)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shares input */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#475569", letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>Number of Shares</label>
              <input className="minput" type="number" min="0.0001" step="0.0001" value={shareInput}
                onChange={(e) => { setShareInput(e.target.value); setModalErr("") }}
                placeholder={modalMode === "sell" && modalHolding ? `Max: ${fmtS(modalHolding.quantity)}` : "e.g. 10"}
                style={{ width:"100%", padding:"12px 14px", background:"#0a1628", border:"1px solid rgba(255,255,255,.08)", borderRadius:10, color:"#e2e8f0", fontSize:15, fontFamily:"'DM Mono',monospace", transition:"border-color .2s,box-shadow .2s" }} />
              {modalMode === "sell" && modalHolding && (
                <div style={{ display:"flex", gap:6, marginTop:8 }}>
                  {[25, 50, 75, 100].map((p) => (
                    <button key={p} className="pctbtn"
                      onClick={() => setShareInput(String(parseFloat(((modalHolding.quantity * p) / 100).toFixed(4))))}
                      style={{ flex:1, padding:"5px 0", borderRadius:7, border:"1px solid rgba(255,255,255,.07)", background:"rgba(255,255,255,.03)", color:"#64748b", cursor:"pointer", fontSize:12, transition:"all .15s" }}>
                      {p}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stop Loss (buy only) */}
            {modalMode === "buy" && (
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#475569", letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>Stop Loss <span style={{ color:"#334155", fontWeight:400 }}>(optional)</span></label>
                <input className="minput" type="number" min="0" step="0.01" value={stopLoss}
                  onChange={(e) => { setStopLoss(e.target.value); setModalErr("") }}
                  placeholder="e.g. 145.00"
                  style={{ width:"100%", padding:"12px 14px", background:"#0a1628", border:"1px solid rgba(255,255,255,.08)", borderRadius:10, color:"#e2e8f0", fontSize:14, fontFamily:"'DM Mono',monospace", transition:"border-color .2s,box-shadow .2s" }} />
              </div>
            )}

            {/* Cost / proceeds preview */}
            {sharesNum > 0 && livePrice > 0 && (
              <div style={{ marginBottom:20, padding:"12px 16px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:10 }}>
                {modalMode === "buy" ? (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:13, color:"#64748b" }}>Total cost</span>
                    <span style={{ fontSize:16, fontWeight:700, color:"#63b3ed", fontFamily:"'DM Mono',monospace" }}>{fmt(totalCost)}</span>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:13, color:"#64748b" }}>Proceeds</span>
                      <span style={{ fontSize:14, fontWeight:700, color:"#e2e8f0", fontFamily:"'DM Mono',monospace" }}>{fmt(sellProceeds)}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:13, color:"#64748b" }}>Realized P&L</span>
                      <span style={{ fontSize:14, fontWeight:700, color: sellPnl >= 0 ? "#34d399" : "#f87171", fontFamily:"'DM Mono',monospace" }}>{sellPnl >= 0 ? "+" : ""}{fmt(sellPnl)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {modalErr && (
              <div style={{ marginBottom:16, padding:"10px 14px", background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)", borderRadius:9, fontSize:13, color:"#f87171" }}>⚠️ {modalErr}</div>
            )}

            <button onClick={modalMode === "buy" ? executeBuy : executeSell}
              disabled={modalLoading || (modalMode === "buy" && !modalStock)}
              style={{ width:"100%", padding:13, borderRadius:12, border:"none", cursor:"pointer", fontSize:15, fontWeight:700, color:"#fff",
                background: modalMode === "buy" ? "linear-gradient(135deg,#10b981,#06b6d4)" : "linear-gradient(135deg,#ef4444,#f97316)",
                opacity: (modalLoading || (modalMode === "buy" && !modalStock)) ? 0.5 : 1, transition:"opacity .2s" }}>
              {modalLoading ? "Processing…"
                : modalMode === "buy"
                  ? `Buy ${sharesNum > 0 ? `${fmtS(sharesNum)} shares` : "Shares"} →`
                  : `Sell ${sharesNum > 0 ? `${fmtS(sharesNum)} shares` : "Shares"} →`}
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background:"linear-gradient(180deg,#0d1526,transparent)", borderBottom:"1px solid rgba(255,255,255,.055)", padding:"18px 36px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:"-.3px", color:"#f1f5f9" }}>📊 AI Portfolio Lab</h1>
          <p style={{ fontSize:12, color:"#64748b", marginTop:2 }}>Track, trade, and get AI guidance on your positions</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => openBuy()} style={{ padding:"7px 18px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#10b981,#06b6d4)", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700 }}>
            + Buy Stock
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ margin:"16px 36px 0", padding:"10px 16px", background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)", borderRadius:10, fontSize:13, color:"#f87171" }}>⚠️ {errorMessage}</div>
      )}

      <div style={{ padding:"28px 36px", maxWidth:1100, margin:"0 auto" }}>

        {/* ── Summary + Risk row ── */}
        {summary && (
          <section style={{ marginBottom:32, animation:"fadeUp .35s ease" }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"#475569", letterSpacing:".08em", textTransform:"uppercase", marginBottom:16 }}>📈 Overview</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:14 }}>
              {([
                { label:"Cash Balance",    value:fmt(summary.cash_balance),    icon:"💵", color:"#63b3ed", glow:"rgba(99,179,237,.07)" },
                { label:"Portfolio Value", value:fmt(summary.portfolio_value), icon:"📊", color:"#a78bfa", glow:"rgba(167,139,250,.07)" },
                { label:"Total Assets",    value:fmt(summary.total_assets),    icon:"🏦", color:"#34d399", glow:"rgba(52,211,153,.07)" },
                { label:"Total Profit",    value:fmt(overview.totalProfit),    icon:"📈", color:"#34d399", glow:"rgba(52,211,153,.07)" },
                { label:"Total Loss",      value:fmt(overview.totalLoss),      icon:"📉", color:"#f87171", glow:"rgba(248,113,113,.07)" },
              ] as { label:string; value:string; icon:string; color:string; glow:string }[]).map((c, i) => (
                <div key={i} className="ocard" style={{ background:c.glow, border:`1px solid ${c.color}1f`, borderRadius:14, padding:"20px 18px", boxShadow:"0 4px 20px rgba(0,0,0,.25)" }}>
                  <div style={{ fontSize:22, marginBottom:8 }}>{c.icon}</div>
                  <div style={{ fontSize:10, color:"#64748b", marginBottom:4, fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" }}>{c.label}</div>
                  <div style={{ fontSize:22, fontWeight:700, color:c.color, fontFamily:"'DM Mono',monospace", letterSpacing:"-.5px" }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* Net P&L bar */}
            <div style={{ background: overview.totalPnl >= 0 ? "linear-gradient(135deg,rgba(52,211,153,.08),rgba(6,182,212,.05))" : "linear-gradient(135deg,rgba(248,113,113,.08),rgba(239,68,68,.05))", border:`1px solid ${overview.totalPnl >= 0 ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)"}`, borderRadius:14, padding:"18px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" }}>Net P&L</div>
                <div style={{ fontSize:28, fontWeight:700, color: overview.totalPnl >= 0 ? "#34d399" : "#f87171", fontFamily:"'DM Mono',monospace" }}>{overview.totalPnl >= 0 ? "+" : ""}{fmt(overview.totalPnl)}</div>
              </div>
              <div style={{ fontSize:36, width:58, height:58, display:"flex", alignItems:"center", justifyContent:"center", background: overview.totalPnl >= 0 ? "rgba(52,211,153,.08)" : "rgba(248,113,113,.08)", borderRadius:"50%" }}>
                {overview.totalPnl >= 0 ? "🏆" : "⚠️"}
              </div>
            </div>

            {/* Risk panel */}
            {risk && (
              <div style={{ background:"rgba(167,139,250,.05)", border:"1px solid rgba(167,139,250,.12)", borderRadius:14, padding:"18px 22px" }}>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:14, fontWeight:700, textTransform:"uppercase", letterSpacing:".07em" }}>🛡️ Risk Analysis</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14 }}>
                  {([
                    { label:"Risk Level",           value:risk.risk_level },
                    { label:"Diversification",       value:`${risk.diversification_score}%` },
                    { label:"Largest Position",      value:risk.largest_position },
                    { label:"Position Weight",       value:`${risk.largest_position_percent}%` },
                  ] as { label:string; value:string }[]).map((r, i) => (
                    <div key={i}>
                      <div style={{ fontSize:10, color:"#475569", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>{r.label}</div>
                      <div style={{ fontSize:16, fontWeight:700, color:"#a78bfa", fontFamily:"'DM Mono',monospace" }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Empty state ── */}
        {!hasHoldings && (
          <div style={{ textAlign:"center", padding:"80px 24px", animation:"fadeIn .4s ease" }}>
            <div style={{ fontSize:58, marginBottom:20 }}>📭</div>
            <h3 style={{ fontSize:18, fontWeight:600, color:"#334155", marginBottom:10 }}>Your portfolio is empty</h3>
            <p style={{ fontSize:14, color:"#2e3f54", lineHeight:1.9, maxWidth:340, margin:"0 auto 28px" }}>
              Click <strong style={{ color:"#63b3ed" }}>+ Buy Stock</strong> above to make your first trade.
            </p>
            <button onClick={() => openBuy()} style={{ padding:"12px 28px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#10b981,#06b6d4)", color:"#fff", cursor:"pointer", fontSize:15, fontWeight:700 }}>
              🛒 Buy Your First Stock
            </button>
          </div>
        )}

        {hasHoldings && (
          <>
            {/* ── Tabs ── */}
            <div style={{ display:"flex", gap:4, marginBottom:20, background:"rgba(255,255,255,.03)", borderRadius:10, padding:4, width:"fit-content", border:"1px solid rgba(255,255,255,.06)" }}>
              {(["holdings", "trades"] as const).map((t) => (
                <button key={t} className="tabBtn" onClick={() => setTab(t)}
                  style={{ padding:"7px 20px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, transition:"all .2s",
                    background: tab === t ? "rgba(99,179,237,.12)" : "transparent",
                    color: tab === t ? "#63b3ed" : "#475569" }}>
                  {t === "holdings" ? `📈 Holdings (${holdings.length})` : `🕒 Trade History (${trades.length})`}
                </button>
              ))}
            </div>

            {/* ── Holdings Table ── */}
            {tab === "holdings" && (
              <section style={{ animation:"fadeUp .4s ease" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <h2 style={{ fontSize:13, fontWeight:700, color:"#475569", letterSpacing:".08em", textTransform:"uppercase" }}>My Stocks</h2>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    {loadingAI && (
                      <span style={{ display:"flex", alignItems:"center", gap:6, color:"#63b3ed", fontSize:12 }}>
                        <span style={{ width:8, height:8, borderRadius:"50%", background:"#63b3ed", display:"inline-block", animation:"pulse 1s infinite" }} />
                        AI analysing…
                      </span>
                    )}
                    <button onClick={fetchAiAdvice} disabled={loadingAI}
                      style={{ padding:"6px 14px", borderRadius:8, border:"1px solid rgba(99,179,237,.22)", background:"rgba(99,179,237,.06)", color:"#63b3ed", cursor:"pointer", fontSize:12, fontWeight:600, opacity: loadingAI ? 0.5 : 1 }}>
                      🤖 Get AI Advice
                    </button>
                  </div>
                </div>

                <div style={{ background:"#0c1322", borderRadius:14, border:"1px solid rgba(255,255,255,.055)", overflow:"hidden" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1.6fr .7fr .7fr .8fr .8fr 1fr 160px", padding:"11px 20px", borderBottom:"1px solid rgba(255,255,255,.05)", fontSize:11, color:"#3d5068", fontWeight:700, letterSpacing:".07em", textTransform:"uppercase" }}>
                    <span>Stock</span><span>Qty</span><span>Avg</span><span>Price</span><span>Value</span><span>P&L</span><span style={{ textAlign:"right" }}>Actions</span>
                  </div>
                  {holdings.map((h, i) => (
                    <HoldingRow 
                      key={h.symbol}
                      h={h} 
                      i={i} 
                      last={i === holdings.length - 1}
                      expanded={expanded}
                      ai={aiMap[h.symbol]}
                      holdings={holdings}
                      livePrice={livePrice}
                      aiMap={aiMap}
                      setExpanded={setExpanded}
                      loadingAI={loadingAI}
                      openBuy={openBuy}
                      openSell={openSell}
                    />
                  ))}
                </div>

                {aiAdvice.length === 0 && (
                  <div style={{ marginTop:14, padding:"12px 16px", background:"rgba(99,179,237,.04)", borderRadius:10, border:"1px solid rgba(99,179,237,.1)", display:"flex", gap:10 }}>
                    <span style={{ fontSize:15 }}>🤖</span>
                    <p style={{ fontSize:12, color:"#4a607a", lineHeight:1.6 }}>
                      <strong style={{ color:"#63b3ed" }}>AI Tip:</strong> Click <strong style={{ color:"#63b3ed" }}>Get AI Advice</strong> for personalised HOLD, SELL, or BOOK PROFIT recommendations on each position.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* ── Trade History ── */}
            {tab === "trades" && (
              <section style={{ animation:"fadeUp .4s ease" }}>
                <h2 style={{ fontSize:13, fontWeight:700, color:"#475569", letterSpacing:".08em", textTransform:"uppercase", marginBottom:14 }}>🕒 Trade History</h2>
                {trades.length === 0 ? (
                  <p style={{ color:"#334155", fontSize:14 }}>No trades yet.</p>
                ) : (
                  <div style={{ background:"#0c1322", borderRadius:14, border:"1px solid rgba(255,255,255,.055)", overflow:"hidden" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"120px 1fr 100px 120px", padding:"11px 20px", borderBottom:"1px solid rgba(255,255,255,.05)", fontSize:11, color:"#3d5068", fontWeight:700, letterSpacing:".07em", textTransform:"uppercase" }}>
                      <span>Type</span><span>Symbol</span><span>Qty</span><span style={{ textAlign:"right" }}>Price</span>
                    </div>
                    {trades.map((t, i) => (
                      <div key={t.id} className="srow" style={{ display:"grid", gridTemplateColumns:"120px 1fr 100px 120px", padding:"13px 20px", borderBottom: i < trades.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none", alignItems:"center", background:"transparent", transition:"background .15s" }}>
                        <div>
                          <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                            background: t.trade_type === "BUY" ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)",
                            color:      t.trade_type === "BUY" ? "#34d399"             : "#f87171",
                            border:     `1px solid ${t.trade_type === "BUY" ? "rgba(52,211,153,.25)" : "rgba(248,113,113,.25)"}` }}>
                            {t.trade_type === "BUY" ? "▲ BUY" : "▼ SELL"}
                          </span>
                        </div>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:700, color:"#f1f5f9" }}>{t.symbol}</div>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#94a3b8" }}>{fmtS(t.quantity)}</div>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#e2e8f0", textAlign:"right" }}>{fmt(t.price)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
      <AiAssistantBot />
    </div>
    </>
  )
}
