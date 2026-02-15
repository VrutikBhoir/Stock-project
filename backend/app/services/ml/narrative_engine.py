"""
AI Market Narrative Engine

Generates investor-aware market narratives by combining:
- Stock price predictions and trends
- Risk & volatility assessment
- News sentiment analysis
- Investor profile reasoning

Architecture: Data source layer → Signal aggregation → Reasoning layer → Narrative generation

LLM-Ready: Narrative generation isolated in _generate_narrative_text() for easy replacement
"""

import logging
from datetime import datetime, timedelta
import yfinance as yf
from typing import Dict, Optional
import re

logger = logging.getLogger(__name__)


class NarrativeEngine:
    """
    Generates investor-aware market narratives.
    
    Flow:
    1. Fetch market data (prices, trends, risk)
    2. Fetch news sentiment
    3. Aggregate signals 
    4. Reason based on investor profile
    5. Generate narrative text
    """
    
    def build_market_narrative(
        self,
        symbol: str,
        investor_profile: Dict
    ) -> Dict:
        """
        Generate complete market narrative.
        
        Args:
            symbol: Stock ticker (e.g., "MSFT")
            investor_profile: {
                "type": "Conservative | Balanced | Aggressive",
                "time_horizon": "Short-term | Medium-term | Long-term",
                "primary_goal": "Growth | Income | Capital Preservation | Speculative"
            }
        
        Returns: Exact output contract format
        """
        try:
            # 1️⃣ FETCH: Market data (price prediction + trend)
            market_data = self._fetch_market_data(symbol)
            
            # 2️⃣ FETCH: News sentiment
            news_sentiment = self._fetch_news_sentiment(symbol)
            
            # 3️⃣ FETCH: Risk & volatility
            risk_data = self._fetch_risk_data(symbol)
            
            # 4️⃣ AGGREGATE: Combine signals
            signals = self._aggregate_signals(
                market_data=market_data,
                news_sentiment=news_sentiment,
                risk_data=risk_data
            )
            
            # 5️⃣ REASON: Apply investor profile logic
            reasoned_output = self._reason_with_investor_profile(
                signals=signals,
                investor_profile=investor_profile,
                market_data=market_data,
                news_sentiment=news_sentiment,
                risk_data=risk_data
            )
            
            # 6️⃣ GENERATE: Narrative text (LLM-ready function)
            narrative_text = self._generate_narrative_text(
                symbol=symbol,
                market_bias=reasoned_output["market_bias"],
                signal_strength=reasoned_output["signal_strength"],
                investor_profile=investor_profile,
                market_data=market_data,
                signals=signals,
                risk_data=risk_data,
                news_sentiment=news_sentiment
            )
            
            # 7️⃣ STRUCTURE: Return exact contract
            return {
                "symbol": symbol,
                "market_state": {
                    "trend": market_data["trend"],
                    "confidence": signals["confidence_score"],
                    "risk_level": risk_data["level"],
                    "volatility": risk_data["volatility_label"],
                    "news_sentiment": news_sentiment["aggregated_sentiment"]
                },
                "signals": {
                    "market_bias": reasoned_output["market_bias"],
                    "signal_strength": reasoned_output["signal_strength"]
                },
                "narrative": {
                    "headline": narrative_text["headline"],
                    "text": narrative_text["text"],
                    "investor_type": investor_profile["type"]
                }
            }
        
        except Exception as e:
            logger.error(f"❌ Narrative generation failed for {symbol}: {str(e)}")
            raise
    
    # ============================================================================
    # LAYER 1: DATA SOURCE LAYER (Fetch real market data)
    # ============================================================================
    
    def _fetch_market_data(self, symbol: str) -> Dict:
        """Fetch price predictions, trends, confidence."""
        try:
            # Fetch real price data
            tick = yf.Ticker(symbol)
            hist = tick.history(period="1y")
            
            if hist.empty:
                raise ValueError(f"No data found for {symbol}")
            
            # Calculate trend
            current_price = hist["Close"].iloc[-1]
            prev_price = hist["Close"].iloc[-20]  # 1 month ago
            trend_change_pct = ((current_price - prev_price) / prev_price) * 100
            
            # Determine trend direction
            if trend_change_pct > 2:
                trend = "Uptrend"
            elif trend_change_pct < -2:
                trend = "Downtrend"
            else:
                trend = "Sideways"
            
            # Calculate confidence (based on price consistency)
            returns = hist["Close"].pct_change().dropna()
            volatility = returns.std()
            # Lower volatility = higher confidence in the trend
            confidence = max(40, 100 - (volatility * 100))
            
            logger.info(f"✓ Market data: {symbol} | Trend: {trend} | Confidence: {confidence:.0f}%")
            
            return {
                "trend": trend,
                "current_price": round(float(current_price), 2),
                "trend_change_pct": round(trend_change_pct, 2),
                "confidence": round(confidence, 0),
                "volatility_annual": round(float(volatility), 3)
            }
        
        except Exception as e:
            logger.error(f"❌ Market data fetch failed for {symbol}: {str(e)}")
            raise
    
    def _fetch_news_sentiment(self, symbol: str) -> Dict:
        """Fetch and analyze news sentiment (mock implementation)."""
        try:
            # In production, integrate with NewsAPI or similar
            # For now: deterministic mock based on symbol hash (reproducible)
            
            sentiment_map = {
                0: "Positive",
                1: "Neutral",
                2: "Negative"
            }
            
            # Deterministic sentiment based on symbol
            sentiment_index = len(symbol) % 3
            aggregated_sentiment = sentiment_map[sentiment_index]
            
            # Sentiment strength score (0-100)
            strength = (sum(ord(c) for c in symbol) % 60) + 40  # 40-100
            
            logger.info(f"✓ News sentiment: {symbol} | {aggregated_sentiment} | Strength: {strength:.0f}%")
            
            return {
                "aggregated_sentiment": aggregated_sentiment,
                "sentiment_strength": round(strength, 0),
                "sources": ["News aggregation (mock)"],
                "recent_headlines": [
                    f"Market analysis for {symbol}",
                    f"Investor sentiment on {symbol}",
                    f"Technical outlook for {symbol}"
                ]
            }
        
        except Exception as e:
            logger.error(f"❌ News sentiment fetch failed: {str(e)}")
            raise
    
    def _fetch_risk_data(self, symbol: str) -> Dict:
        """Fetch risk level and volatility."""
        try:
            tick = yf.Ticker(symbol)
            hist = tick.history(period="1y")
            
            if hist.empty:
                raise ValueError(f"No data for {symbol}")
            
            returns = hist["Close"].pct_change().dropna()
            volatility_annual = returns.std()
            
            # Classify risk level by volatility
            if volatility_annual > 0.04:
                risk_level = "High"
            elif volatility_annual > 0.025:
                risk_level = "Medium"
            else:
                risk_level = "Low"
            
            # Volatility label
            if volatility_annual > 0.05:
                volatility_label = "Very High"
            elif volatility_annual > 0.035:
                volatility_label = "High"
            elif volatility_annual > 0.02:
                volatility_label = "Moderate"
            else:
                volatility_label = "Low"
            
            logger.info(f"✓ Risk data: {symbol} | Level: {risk_level} | Volatility: {volatility_label}")
            
            return {
                "level": risk_level,
                "volatility_annual": round(float(volatility_annual), 3),
                "volatility_label": volatility_label,
                "beta_equivalent": round(volatility_annual / 0.02, 2)  # Relative to market
            }
        
        except Exception as e:
            logger.error(f"❌ Risk data fetch failed: {str(e)}")
            raise
    
    # ============================================================================
    # LAYER 2: SIGNAL AGGREGATION (Combine data sources)
    # ============================================================================
    
    def _aggregate_signals(
        self,
        market_data: Dict,
        news_sentiment: Dict,
        risk_data: Dict
    ) -> Dict:
        """
        Aggregate market signals.
        Detect conflicts, weight signals.
        """
        
        # Signal weights (configurable)
        weights = {
            "trend": 0.35,
            "news": 0.25,
            "risk": 0.20,
            "volatility": 0.20
        }
        
        # Trend signal: Uptrend=+1, Downtrend=-1, Sideways=0
        trend_signal = {
            "Uptrend": 1.0,
            "Sideways": 0.0,
            "Downtrend": -1.0
        }.get(market_data["trend"], 0.0)
        
        # News signal: Positive=+1, Neutral=0, Negative=-1
        news_signal = {
            "Positive": 1.0,
            "Neutral": 0.0,
            "Negative": -1.0
        }.get(news_sentiment["aggregated_sentiment"], 0.0)
        
        # Risk signal: penalizes when risk is high (inverse relationship)
        risk_signal = {
            "High": -0.3,
            "Medium": 0.0,
            "Low": 0.3
        }.get(risk_data["level"], 0.0)
        
        # Volatility signal
        volatility_signal = {
            "Very High": -0.4,
            "High": -0.2,
            "Moderate": 0.0,
            "Low": 0.2
        }.get(risk_data["volatility_label"], 0.0)
        
        # Weighted composite score (-1 to +1)
        composite_signal = (
            trend_signal * weights["trend"] +
            news_signal * weights["news"] +
            risk_signal * weights["risk"] +
            volatility_signal * weights["volatility"]
        )
        
        # Convert to 0-100 scale for confidence
        confidence_score = round(((composite_signal + 1) / 2) * 100, 0)
        
        # Detect conflicting signals
        signals_list = [
            ("Trend", trend_signal),
            ("News", news_signal),
            ("Risk", risk_signal),
            ("Volatility", volatility_signal)
        ]
        
        conflicting = len([s for s in signals_list if s[1] * composite_signal < 0])
        has_conflict = conflicting >= 2
        
        logger.info(f"✓ Signals: composite={composite_signal:.2f}, confidence={confidence_score:.0f}%, conflict={has_conflict}")
        
        return {
            "trend_signal": round(trend_signal, 2),
            "news_signal": round(news_signal, 2),
            "risk_signal": round(risk_signal, 2),
            "volatility_signal": round(volatility_signal, 2),
            "composite_signal": round(composite_signal, 2),
            "confidence_score": int(confidence_score),
            "has_conflict": has_conflict
        }
    
    # ============================================================================
    # LAYER 3: REASONING LAYER (Interpret through investor lens)
    # ============================================================================
    
    def _reason_with_investor_profile(
        self,
        signals: Dict,
        investor_profile: Dict,
        market_data: Dict,
        news_sentiment: Dict,
        risk_data: Dict
    ) -> Dict:
        """
        Reason based on investor profile.
        - Softens/strengthens language by certainty
        - Adjusts interpretation by investor risk tolerance
        - Generates market bias (Bullish/Bearish/Neutral)
        """
        
        composite_signal = signals["composite_signal"]
        confidence = signals["confidence_score"]
        investor_type = investor_profile["type"]
        
        # Determine market bias (independent of investor)
        if composite_signal > 0.3:
            market_bias = "Bullish"
        elif composite_signal < -0.3:
            market_bias = "Bearish"
        else:
            market_bias = "Neutral"
        
        # Signal strength: Strong/Moderate/Weak based on confidence + agreement
        if confidence >= 75 and not signals["has_conflict"]:
            signal_strength = "Strong"
        elif confidence >= 55 or (confidence >= 45 and not signals["has_conflict"]):
            signal_strength = "Moderate"
        else:
            signal_strength = "Weak"
        
        # Investor-specific adjustment (soften/strengthen language)
        # This affects the narrative text generation
        language_intensity = self._calculate_language_intensity(
            investor_type=investor_type,
            market_bias=market_bias,
            signal_strength=signal_strength,
            risk_level=risk_data["level"]
        )
        
        logger.info(f"✓ Reasoning: bias={market_bias}, strength={signal_strength}, intensity={language_intensity}")
        
        return {
            "market_bias": market_bias,
            "signal_strength": signal_strength,
            "language_intensity": language_intensity,  # For narrative generation
            "reasoning": {
                "composite_signal": composite_signal,
                "confidence": confidence,
                "investor_risk_tolerance": {
                    "Conservative": "Low",
                    "Balanced": "Medium",
                    "Aggressive": "High"
                }.get(investor_type, "Medium")
            }
        }
    
    def _calculate_language_intensity(
        self,
        investor_type: str,
        market_bias: str,
        signal_strength: str,
        risk_level: str
    ) -> str:
        """
        Calculate how strongly to express the narrative.
        
        Returns: "very_cautious" | "cautious" | "neutral" | "confident" | "very_confident"
        """
        
        # Conservative investors get more cautious language
        if investor_type == "Conservative":
            if signal_strength == "Strong":
                return "cautious"  # Soften even strong signals
            else:
                return "very_cautious"
        
        # Aggressive investors get more confident language
        elif investor_type == "Aggressive":
            if signal_strength == "Strong":
                return "very_confident"
            elif signal_strength == "Moderate":
                return "confident"
            else:
                return "neutral"
        
        # Balanced: match signal strength
        else:
            if signal_strength == "Strong":
                return "confident"
            elif signal_strength == "Moderate":
                return "neutral"
            else:
                return "cautious"
    
    # ============================================================================
    # LAYER 4: NARRATIVE GENERATION (LLM-Ready)
    # ============================================================================
    
    def _generate_narrative_text(
        self,
        symbol: str,
        market_bias: str,
        signal_strength: str,
        investor_profile: Dict,
        market_data: Dict,
        signals: Dict,
        risk_data: Dict,
        news_sentiment: Dict
    ) -> Dict:
        """
        Generate narrative text.
        
        LLM-READY: This function is isolated and can be replaced with:
        - GPT-4 API call
        - Local LLM (Llama, Mistral, etc.)
        - Fine-tuned model
        
        No API changes required when upgrading.
        
        Returns:
            {
                "headline": "...",
                "text": "..."
            }
        """
        
        # Generate headline
        headline = self._generate_headline(
            symbol=symbol,
            market_bias=market_bias,
            signal_strength=signal_strength,
            risk_level=risk_data["level"]
        )
        
        # Generate narrative text (5-7 sentences)
        text = self._generate_narrative_body(
            symbol=symbol,
            market_bias=market_bias,
            signal_strength=signal_strength,
            investor_profile=investor_profile,
            market_data=market_data,
            signals=signals,
            risk_data=risk_data,
            news_sentiment=news_sentiment
        )
        
        return {
            "headline": headline,
            "text": text
        }
    
    def _generate_headline(
        self,
        symbol: str,
        market_bias: str,
        signal_strength: str,
        risk_level: str
    ) -> str:
        """Generate concise headline."""
        
        strength_adjectives = {
            "Strong": "Clear",
            "Moderate": "Moderate",
            "Weak": "Mixed"
        }
        
        adjective = strength_adjectives.get(signal_strength, "Moderate")
        
        risk_note = f" with {risk_level} Risk" if risk_level in ["High", "Medium"] else ""
        
        bias_direction = "Bullish" if market_bias == "Bullish" else ("Bearish" if market_bias == "Bearish" else "Neutral")
        
        headline = f"{adjective} {bias_direction} Outlook{risk_note}"
        
        return headline
    
    def _generate_narrative_body(
        self,
        symbol: str,
        market_bias: str,
        signal_strength: str,
        investor_profile: Dict,
        market_data: Dict,
        signals: Dict,
        risk_data: Dict,
        news_sentiment: Dict
    ) -> str:
        """Generate the main narrative text (5-7 sentences)."""
        
        sentences = []
        
        # Sentence 1: Opening market state
        trend = market_data["trend"]
        confidence = market_data["confidence"]
        sentences.append(
            f"{symbol} is currently in a {trend.lower()} with {confidence:.0f}% confidence based on technical analysis."
        )
        
        # Sentence 2: Signal alignment
        if signals["has_conflict"]:
            sentences.append(
                f"Market signals show conflicting patterns, suggesting {signal_strength.lower()} conviction in the current direction."
            )
        else:
            sentences.append(
                f"Multiple technical indicators align, providing {signal_strength.lower()} signals for {market_bias.lower()} momentum."
            )
        
        # Sentence 3: News context
        news_sentiment_level = news_sentiment["aggregated_sentiment"]
        sentences.append(
            f"Recent news sentiment is {news_sentiment_level.lower()}, {'supporting' if market_bias == 'Bullish' and news_sentiment_level == 'Positive' else 'diverging from'} the technical outlook."
        )
        
        # Sentence 4: Risk consideration
        volatility = risk_data["volatility_label"]
        sentences.append(
            f"Volatility levels are currently {volatility.lower()}, {'requiring careful position sizing' if volatility in ['High', 'Very High'] else 'providing a stable backdrop for moves'}."
        )
        
        # Sentence 5: Investor-specific implication
        investor_goal = investor_profile["primary_goal"]
        if market_bias == "Bullish":
            if investor_goal == "Growth":
                sentences.append(
                    f"For growth-oriented investors, this bias could present upside opportunity, though confirmation is advised given {signal_strength.lower()} signal strength."
                )
            elif investor_goal == "Income":
                sentences.append(
                    f"For income-focused strategies, the uptrend may provide entry points for covered calls or other income-generating tactics."
                )
            else:
                sentences.append(
                    f"The bullish setup contradicts capital preservation objectives; consider waiting for confirmation or hedging exposure."
                )
        else:
            if investor_goal == "Capital Preservation":
                sentences.append(
                    f"The {market_bias.lower()} backdrop aligns with capital preservation goals; reduce exposure or consider defensive positioning."
                )
            elif investor_goal == "Growth":
                sentences.append(
                    f"Growth investors may see this as a buying opportunity if conviction remains {signal_strength.lower()} with strong fundamentals."
                )
            else:
                sentences.append(
                    f"The current market state suggests caution before initiating large positions; wait for clearer directional signals."
                )
        
        # Sentence 6: Action guidance
        risk_note = ""
        if risk_data["level"] == "High":
            risk_note = " Watch volatility closely; "
        
        if signal_strength == "Strong":
            sentences.append(
                f"{risk_note}Strong signals support taking action aligned with the {market_bias.lower()} bias."
            )
        elif signal_strength == "Moderate":
            sentences.append(
                f"{risk_note}Moderate signals warrant cautious positioning; use smaller position sizes."
            )
        else:
            sentences.append(
                f"{risk_note}Weak signals suggest waiting for clearer market direction before significant moves."
            )
        
        return " ".join(sentences)


def build_market_narrative(symbol: str, investor_profile: Dict) -> Dict:
    """
    Convenience function: Single entry point for the narrative engine.
    
    This function is what the FastAPI route calls.
    """
    engine = NarrativeEngine()
    return engine.build_market_narrative(symbol, investor_profile)
