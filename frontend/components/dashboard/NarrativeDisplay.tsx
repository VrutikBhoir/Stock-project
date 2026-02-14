import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NarrativeData {
  status: string;
  timestamp: string;
  symbol: string;
  model_used: string;
  narrative: {
    sentiment: "Bullish" | "Neutral" | "Bearish";
    confidence: number;
    conviction: "High" | "Medium" | "Low";
    signal_strength: "Strong" | "Moderate" | "Weak";
    sections: {
      market_summary: string;
      why_this_outlook: string;
      key_factors: string[];
      disclaimer: string;
    };
  };
  market_data: {
    trend: string;
    trend_change_pct: number;
    volatility: string;
    risk_level: string;
    expected_return: number;
  };
  investor_context: {
    investor_type: string;
    time_horizon: string;
    investment_goal: string;
    recommendation: string;
    action_guidance: string;
    insights: string[];
  };
  explainability: {
    generated_by: string;
    model_info: string;
  };
}

interface NarrativeDisplayProps {
  data: NarrativeData;
  isLoading?: boolean;
}

/**
 * NarrativeDisplay Component
 *
 * Presents ML-driven market narrative in a clean, user-friendly format.
 * - 5-second read mode at top with sentiment badge
 * - Expandable sections for deeper understanding
 * - Investor-specific insights
 * - Action guidance with risk disclaimers
 */
export default function NarrativeDisplay({ data, isLoading = false }: NarrativeDisplayProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("summary");
  const [showFullText, setShowFullText] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-gray-500">No narrative data available</div>;
  }

  const { narrative, market_data, investor_context, explainability } = data;
  const { sentiment, confidence, conviction, signal_strength } = narrative;

  // Sentiment emoji and color
  const sentimentConfig = {
    Bullish: { emoji: "📈", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
    Neutral: { emoji: "📊", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
    Bearish: { emoji: "📉", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  };

  const config = sentimentConfig[sentiment] || sentimentConfig.Neutral;

  // Conviction badge
  const convictionColors = {
    High: "bg-green-100 text-green-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-red-100 text-red-800",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`border-2 rounded-lg p-6 ${config.bg} ${config.border}`}
    >
      {/* ===== SECTION 1: 5-SECOND READ MODE ===== */}
      <div className="mb-6 pb-6 border-b-2 border-current border-opacity-20">
        <motion.div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Sentiment Emoji + Label */}
          <div className="flex items-center gap-3">
            <span className="text-4xl">{config.emoji}</span>
            <div>
              <p className={`text-3xl font-bold ${config.color}`}>{sentiment}</p>
              <p className="text-xs text-gray-500">AI-Driven Outlook</p>
            </div>
          </div>

          {/* Confidence + Conviction Badges */}
          <div className="flex gap-3">
            {/* Confidence Badge */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-2xl font-bold text-gray-700">{confidence.toFixed(1)}%</div>
              <span className="text-xs text-gray-600 font-semibold">Confidence</span>
            </div>

            {/* Conviction Badge */}
            <div className={`px-4 py-2 rounded-lg ${convictionColors[conviction]} font-bold`}>
              {conviction} Conviction
            </div>
          </div>
        </motion.div>

        {/* One-liner summary */}
        <motion.p className="mt-4 text-lg font-semibold text-gray-800">
          {sentiment === "Bullish" && `Bullish market with ${confidence.toFixed(0)}% confidence and ${conviction.toLowerCase()} conviction.`}
          {sentiment === "Neutral" && `Mixed signals ahead with ${confidence.toFixed(0)}% model confidence—maintain caution.`}
          {sentiment === "Bearish" && `Bearish environment with ${confidence.toFixed(0)}% confidence. Defensive positioning recommended.`}
        </motion.p>
      </div>

      {/* ===== SECTION 2: ACTION BADGE ===== */}
      <motion.div className="mb-6 p-4 bg-white rounded-lg border-l-4 border-blue-500">
        <p className="text-sm text-gray-600 font-semibold">Suggested Action</p>
        <p className="text-xl font-bold text-gray-800 mt-1">{investor_context.recommendation}</p>
        <p className="text-xs text-gray-500 mt-2">{investor_context.action_guidance}</p>
      </motion.div>

      {/* ===== SECTION 3: EXPANDABLE NARRATIVE SECTIONS ===== */}
      <div className="space-y-3 mb-6">
        {/* Market Summary */}
        <motion.div
          onClick={() => setExpandedSection(expandedSection === "summary" ? null : "summary")}
          className="cursor-pointer p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-800">📊 Market Summary</h3>
            <span className="text-gray-400">{expandedSection === "summary" ? "−" : "+"}</span>
          </div>
          <AnimatePresence>
            {expandedSection === "summary" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: narrative.sections.market_summary }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Why This Outlook */}
        <motion.div
          onClick={() => setExpandedSection(expandedSection === "why" ? null : "why")}
          className="cursor-pointer p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-800">🤔 Why This Outlook?</h3>
            <span className="text-gray-400">{expandedSection === "why" ? "−" : "+"}</span>
          </div>
          <AnimatePresence>
            {expandedSection === "why" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: narrative.sections.why_this_outlook }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Key Factors */}
        <motion.div
          onClick={() => setExpandedSection(expandedSection === "factors" ? null : "factors")}
          className="cursor-pointer p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-800">🎯 Key Factors</h3>
            <span className="text-gray-400">{expandedSection === "factors" ? "−" : "+"}</span>
          </div>
          <AnimatePresence>
            {expandedSection === "factors" && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2"
              >
                {narrative.sections.key_factors.map((factor, idx) => (
                  <li key={idx} className="text-gray-700 text-sm flex gap-2">
                    <span className="text-blue-500">•</span>
                    <span dangerouslySetInnerHTML={{ __html: factor }} />
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Investor Insights */}
        <motion.div
          onClick={() => setExpandedSection(expandedSection === "insights" ? null : "insights")}
          className="cursor-pointer p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-800">💡 Your Insights</h3>
            <span className="text-gray-400">{expandedSection === "insights" ? "−" : "+"}</span>
          </div>
          <AnimatePresence>
            {expandedSection === "insights" && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2"
              >
                {investor_context.insights.map((insight, idx) => (
                  <li key={idx} className="text-gray-700 text-sm leading-relaxed">
                    {insight}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ===== SECTION 4: MARKET DATA METRICS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <div>
          <p className="text-xs text-gray-600 font-semibold">Trend</p>
          <p className="text-lg font-bold text-gray-800 capitalize">{market_data.trend}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-semibold">Change</p>
          <p className={`text-lg font-bold ${market_data.trend_change_pct > 0 ? "text-green-600" : "text-red-600"}`}>
            {market_data.trend_change_pct > 0 ? "+" : ""}{market_data.trend_change_pct.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-semibold">Volatility</p>
          <p className="text-lg font-bold text-gray-800">{market_data.volatility}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-semibold">Risk Level</p>
          <p className="text-lg font-bold text-gray-800">{market_data.risk_level}</p>
        </div>
      </div>

      {/* ===== SECTION 5: METADATA + DISCLAIMER ===== */}
      <motion.div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
        <p className="mb-2">
          <strong>Generated by:</strong> {explainability.generated_by} | <strong>Model:</strong> {explainability.model_info}
        </p>
        <p className="text-gray-500 italic">{narrative.sections.disclaimer}</p>
      </motion.div>
    </motion.div>
  );
}
