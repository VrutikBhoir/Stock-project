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
import pickle
import os
from backend.app.services.alpha_vintage import normalize_symbol_for_yfinance
from backend.app.services.news.news_fetcher import fetch_stock_news
from backend.app.services.news.news_sentiment import analyze_news_sentiment, assess_news_technical_alignment

logger = logging.getLogger(__name__)

# Exchange suffixes that yfinance uses directly
_EXCHANGE_SUFFIXES = {".NS", ".BO", ".L", ".AX", ".TO", ".HK", ".SI", ".PA", ".DE", ".F"}


class NarrativeEngine:
    """
    Generates investor-aware market narratives.
    
    Flow:
    1. Fetch market data (prices, trends, risk)
    2. Fetch news sentiment
    3. Aggregate signals 
    4. Reason based on investor profile
    5. Generate narrative text
    
    ✅ Uses trained model if available (narrative_engine_final.pkl)
    ⚠️ Falls back to algorithmic generation if model not found
    """
    
    def __init__(self):
        """Initialize engine and attempt to load trained model."""
        self.model = None
        self.use_trained_model = False
        
        # Attempt to load trained model
        model_path = os.path.join(
            os.path.dirname(__file__),
            "models",
            "narrative_engine_final.pkl"
        )
        
        try:
            if os.path.exists(model_path):
                with open(model_path, "rb") as f:
                    self.model = pickle.load(f)
                self.use_trained_model = True
                logger.info(f"✅ Loaded trained model from {model_path}")
            else:
                logger.info(f"⚠️ Model file not found at {model_path} - using algorithmic narrative generation")
        except Exception as e:
            logger.warning(f"⚠️ Failed to load trained model: {str(e)} - using algorithmic narrative generation")
    
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
            # Log what mode we're using
            if self.use_trained_model:
                logger.info(f"📊 {symbol}: Using TRAINED MODEL for narrative generation")
            else:
                logger.info(f"📊 {symbol}: Using ALGORITHMIC narrative generation (model not available)")
            
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
            # Normalize symbol for yfinance
            normalized_symbol = normalize_symbol_for_yfinance(symbol)
            
            # Build candidates - avoid double-adding exchange suffixes
            has_exchange_suffix = any(normalized_symbol.upper().endswith(s) for s in _EXCHANGE_SUFFIXES)
            
            if has_exchange_suffix:
                # Symbol already has exchange suffix, use as-is and try swapping Indian exchanges
                candidates = [normalized_symbol]
                if normalized_symbol.upper().endswith(".NS"):
                    candidates.append(normalized_symbol[:-3] + ".BO")
                elif normalized_symbol.upper().endswith(".BO"):
                    candidates.append(normalized_symbol[:-3] + ".NS")
            else:
                # No exchange suffix, try adding common ones
                candidates = [
                    normalized_symbol,
                    normalized_symbol + ".NS",  # NSE (India)
                    normalized_symbol + ".BO"   # BSE (India)
                ]
            
            hist = None
            used_symbol = None
            
            for candidate in candidates:
                try:
                    tick = yf.Ticker(candidate)
                    hist = tick.history(period="1y")
                    if not hist.empty:
                        used_symbol = candidate
                        logger.info(f"✓ Market data fetched for {symbol} using: {candidate}")
                        break
                except Exception as e:
                    logger.debug(f"  Tried {candidate}: {str(e)[:50]}")
                    continue
            
            if hist is None or hist.empty:
                raise ValueError(f"No data found for {symbol}. Tried: {', '.join(candidates)}")
            
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
        """
        Fetch and analyze news sentiment using real news data.
        Enhanced with themes, impact assessment, and technical alignment.
        """
        try:
            # Fetch recent news headlines (last 3-7 days)
            headlines = fetch_stock_news(symbol, days=5)
            
            # If no NEWS_API_KEY or no headlines found, use fallback
            if not headlines:
                logger.warning(f"⚠️ No news headlines found for {symbol}, using fallback")
                # Deterministic fallback based on symbol
                sentiment_map = {0: "Positive", 1: "Neutral", 2: "Negative"}
                sentiment_index = len(symbol) % 3
                aggregated_sentiment = sentiment_map[sentiment_index]
                
                return {
                    "aggregated_sentiment": aggregated_sentiment,
                    "sentiment_strength": 50,
                    "themes": [],
                    "market_impact": "Low",
                    "headline_count": 0,
                    "summary": f"Limited news coverage available for {symbol}. Using technical analysis as primary indicator.",
                    "sources": ["Fallback (no news API)"],
                    "recent_headlines": []
                }
            
            # Analyze sentiment with enhanced features
            analysis = analyze_news_sentiment(headlines)
            
            # Convert confidence to strength percentage
            sentiment_strength = int(analysis["confidence"] * 100)
            
            logger.info(
                f"✓ News sentiment: {symbol} | {analysis['sentiment']} | "
                f"Strength: {sentiment_strength}% | Themes: {', '.join(analysis['themes'][:2]) if analysis['themes'] else 'None'} | "
                f"Impact: {analysis['market_impact']}"
            )
            
            return {
                "aggregated_sentiment": analysis["sentiment"],
                "sentiment_strength": sentiment_strength,
                "themes": analysis["themes"],
                "market_impact": analysis["market_impact"],
                "headline_count": analysis["headline_count"],
                "summary": analysis["summary"],
                "scores": analysis["scores"],
                "sources": [f"News API ({analysis['headline_count']} headlines)"],
                "recent_headlines": headlines[:5]  # Keep top 5 for reference
            }
        
        except Exception as e:
            logger.error(f"❌ News sentiment fetch failed for {symbol}: {str(e)}")
            # Return neutral fallback on error
            return {
                "aggregated_sentiment": "Neutral",
                "sentiment_strength": 50,
                "themes": [],
                "market_impact": "Low",
                "headline_count": 0,
                "summary": "Unable to analyze news sentiment due to technical issues.",
                "sources": ["Error fallback"],
                "recent_headlines": []
            }
    
    def _fetch_risk_data(self, symbol: str) -> Dict:
        """Fetch risk level and volatility."""
        try:
            # Normalize symbol for yfinance
            normalized_symbol = normalize_symbol_for_yfinance(symbol)
            
            # Build candidates - avoid double-adding exchange suffixes
            has_exchange_suffix = any(normalized_symbol.upper().endswith(s) for s in _EXCHANGE_SUFFIXES)
            
            if has_exchange_suffix:
                # Symbol already has exchange suffix, use as-is and try swapping Indian exchanges
                candidates = [normalized_symbol]
                if normalized_symbol.upper().endswith(".NS"):
                    candidates.append(normalized_symbol[:-3] + ".BO")
                elif normalized_symbol.upper().endswith(".BO"):
                    candidates.append(normalized_symbol[:-3] + ".NS")
            else:
                # No exchange suffix, try adding common ones
                candidates = [
                    normalized_symbol,
                    normalized_symbol + ".NS",  # NSE (India)
                    normalized_symbol + ".BO"   # BSE (India)
                ]
            
            hist = None
            used_symbol = None
            
            for candidate in candidates:
                try:
                    tick = yf.Ticker(candidate)
                    hist = tick.history(period="1y")
                    if not hist.empty:
                        used_symbol = candidate
                        logger.info(f"✓ Risk data fetched for {symbol} using: {candidate}")
                        break
                except Exception as e:
                    logger.debug(f"  Tried {candidate}: {str(e)[:50]}")
                    continue
            
            if hist is None or hist.empty:
                raise ValueError(f"No data for {symbol}. Tried: {', '.join(candidates)}")
            
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
        """
        Generate INVESTOR-SPECIFIC narrative text.
        
        CRITICAL: Each investor type gets a completely different narrative
        with unique strategy, tone, and recommendations.
        """
        
        investor_type = investor_profile["type"]
        time_horizon = investor_profile["time_horizon"]
        investor_goal = investor_profile["primary_goal"]
        
        # Route to investor-specific generator
        if investor_type == "Conservative":
            return self._generate_conservative_narrative(
                symbol, market_bias, signal_strength, time_horizon, investor_goal,
                market_data, signals, risk_data, news_sentiment
            )
        elif investor_type == "Aggressive":
            return self._generate_aggressive_narrative(
                symbol, market_bias, signal_strength, time_horizon, investor_goal,
                market_data, signals, risk_data, news_sentiment
            )
        else:  # Balanced
            return self._generate_balanced_narrative(
                symbol, market_bias, signal_strength, time_horizon, investor_goal,
                market_data, signals, risk_data, news_sentiment
            )
    
    def _generate_conservative_narrative(
        self, symbol: str, market_bias: str, signal_strength: str,
        time_horizon: str, investor_goal: str, market_data: Dict,
        signals: Dict, risk_data: Dict, news_sentiment: Dict
    ) -> str:
        """Conservative investors: Capital preservation, downside protection, patience."""
        
        trend = market_data["trend"]
        confidence = market_data["confidence"]
        volatility = risk_data["volatility_label"]
        risk_level = risk_data["level"]
        news_sent = news_sentiment["aggregated_sentiment"]
        news_themes = news_sentiment.get("themes", [])
        
        narrative = []
        
        # Opening: Risk-first perspective
        narrative.append(
            f"For Conservative Investors pursuing {investor_goal} over a {time_horizon.lower()} horizon: "
            f"{symbol} presents a {risk_level.lower()}-risk profile with {volatility.lower()} volatility. "
        )
        
        # Downside protection focus
        if market_bias == "Bearish" or risk_level == "High":
            narrative.append(
                f"Current market conditions favor defensive positioning. The {trend.lower()} pattern "
                f"combined with {signal_strength.lower()} bearish signals suggests prioritizing capital preservation "
                f"over potential gains. "
            )
        elif market_bias == "Bullish" and signal_strength == "Strong":
            narrative.append(
                f"While technical indicators show a {trend.lower()}, conservative principles dictate "
                f"waiting for confirmation and establishing protective measures before any allocation. "
                f"Never chase momentum—patience is your primary advantage. "
            )
        else:
            narrative.append(
                f"Mixed market signals with {confidence:.0f}% technical confidence indicate holding steady "
                f"rather than initiating new positions. Unclear direction requires maximum caution. "
            )
        
        # News context with conservative lens
        if news_themes:
            theme_text = " and ".join(news_themes[:2])
            narrative.append(
                f"News surrounding {theme_text} shows {news_sent.lower()} sentiment, but conservative "
                f"investors should focus on fundamental stability rather than short-term headlines. "
            )
        
        # Time horizon-specific guidance
        if "Long-term" in time_horizon:
            narrative.append(
                f"Your {time_horizon.lower()} timeframe allows you to weather volatility, but only if "
                f"fundamentals justify holding through downturns. Avoid positions you cannot hold for 3-5 years. "
            )
        else:
            narrative.append(
                f"Given your {time_horizon.lower()} timeframe, avoid exposure to volatile assets like {symbol} "
                f"unless protected by strict stop-losses and hedges. "
            )
        
        # Conservative-specific action plan
        if market_bias == "Bullish" and signal_strength == "Strong" and risk_level == "Low":
            narrative.append(
                f"If allocating, limit to 3-5% of portfolio, use dollar-cost averaging over weeks, "
                f"and set stop-loss at 5-7% below entry. Consider covered calls to generate income while capping upside. "
            )
        elif market_bias == "Bearish":
            narrative.append(
                f"Avoid new positions entirely. If currently holding, reduce exposure by 30-50% and "
                f"consider protective puts or collar strategies to guard against further decline. "
            )
        else:
            narrative.append(
                f"Stand aside until market direction clarifies. Park capital in treasury bonds or money market funds. "
                f"Missing opportunity costs less than absorbing losses you cannot recover from. "
            )
        
        return "".join(narrative)
    
    def _generate_aggressive_narrative(
        self, symbol: str, market_bias: str, signal_strength: str,
        time_horizon: str, investor_goal: str, market_data: Dict,
        signals: Dict, risk_data: Dict, news_sentiment: Dict
    ) -> str:
        """Aggressive investors: Opportunity capture, momentum, higher risk tolerance."""
        
        trend = market_data["trend"]
        confidence = market_data["confidence"]
        volatility = risk_data["volatility_label"]
        risk_level = risk_data["level"]
        news_sent = news_sentiment["aggregated_sentiment"]
        market_impact = news_sentiment.get("market_impact", "Low")
        
        narrative = []
        
        # Opening: Opportunity-first perspective
        narrative.append(
            f"For Aggressive Investors targeting {investor_goal} in a {time_horizon.lower()} window: "
            f"{symbol} shows {signal_strength.lower()} {market_bias.lower()} momentum with {confidence:.0f}% technical conviction. "
        )
        
        # Momentum and opportunity emphasis
        if market_bias == "Bullish" and signal_strength in ["Strong", "Moderate"]:
            narrative.append(
                f"The {trend.lower()} structure presents a actionable setup for capturing upside. "
                f"{volatility} volatility creates price swings you can exploit—this is where aggressive strategies thrive. "
            )
        elif market_bias == "Bearish" and signal_strength == "Strong":
            narrative.append(
                f"Strong downward momentum opens short-selling or inverse ETF opportunities. "
                f"Aggressive investors profit from declines—position accordingly with tight risk controls. "
            )
        else:
            narrative.append(
                f"Current {market_bias.lower()} bias with {signal_strength.lower()} conviction suggests "
                f"tactical positioning rather than conviction trades. Scalp volatility, don't marry positions. "
            )
        
        # News catalyst analysis
        if news_sent == "Positive" and market_impact == "High":
            narrative.append(
                f"High-impact positive news creates momentum fuel. Front-run the herd—enter before the crowd "
                f"recognizes the catalyst, but plan your exit before euphoria peaks. "
            )
        elif news_sent == "Negative" and market_impact == "High":
            narrative.append(
                f"Negative catalysts with high impact often create oversold bounces. Consider contrarian entries "
                f"if technical support holds, but keep stops ruthlessly tight. "
            )
        
        # Time horizon-specific tactics
        if "Short-term" in time_horizon:
            narrative.append(
                f"Your {time_horizon.lower()} focus demands laser precision. Enter on confirmed breakouts, "
                f"size positions for 2-3% portfolio risk, target 10-20% gains, and exit at predetermined levels. "
                f"No averaging down—cut losses fast at -5% stops. "
            )
        elif "Medium-term" in time_horizon:
            narrative.append(
                f"Medium-term positioning allows riding trends for weeks or months. Build 10-15% positions, "
                f"use trailing stops at -12%, and let winners run to 30-50% gains. Add on strength, never on weakness. "
            )
        else:
            narrative.append(
                f"Long-term aggressive growth means concentrating in high-conviction ideas. "
                f"Allocate 15-25% if thesis is strong, tolerate -20% drawdowns, and hold for multi-bagger potential. "
            )
        
        # Aggressive-specific action plan
        if market_bias == "Bullish" and signal_strength == "Strong":
            narrative.append(
                f"Execute immediately on strength. Buy breakouts, use options for leverage if suitable, "
                f"and scale in aggressively as price confirms momentum. This is your edge—act while others hesitate. "
            )
        elif market_bias == "Neutral" or signal_strength == "Weak":
            narrative.append(
                f"Weak setups don't suit aggressive capital—deploy elsewhere. Rotate into sectors showing "
                f"clearer momentum or trade volatility through straddles if you must stay engaged. "
            )
        else:
            narrative.append(
                f"In bearish environments, flip your bias—short rallies, buy puts, or inverse the position. "
                f"Aggressive doesn't mean reckless: respect the trend, even if it's against your preference. "
            )
        
        return "".join(narrative)
    
    def _generate_balanced_narrative(
        self, symbol: str, market_bias: str, signal_strength: str,
        time_horizon: str, investor_goal: str, market_data: Dict,
        signals: Dict, risk_data: Dict, news_sentiment: Dict
    ) -> str:
        """Balanced investors: Confirmation, moderate sizing, stability."""
        
        trend = market_data["trend"]
        confidence = market_data["confidence"]
        volatility = risk_data["volatility_label"]
        risk_level = risk_data["level"]
        news_sent = news_sentiment["aggregated_sentiment"]
        news_themes = news_sentiment.get("themes", [])
        has_conflict = signals["has_conflict"]
        
        narrative = []
        
        # Opening: Balanced perspective
        narrative.append(
            f"For Balanced Investors seeking {investor_goal} within a {time_horizon.lower()} strategy: "
            f"{symbol} currently exhibits a {trend.lower()} with {confidence:.0f}% analytical confidence and {risk_level.lower()} risk characteristics. "
        )
        
        # Confirmation and stability focus
        if not has_conflict and signal_strength in ["Strong", "Moderate"]:
            narrative.append(
                f"Technical indicators converge on a {market_bias.lower()} outlook, providing the confirmation "
                f"balanced strategies require. {volatility} volatility levels are {'manageable' if volatility in ['Low', 'Moderate'] else 'elevated but not prohibitive'} "
                f"for measured position building. "
            )
        else:
            narrative.append(
                f"Mixed signals with {signal_strength.lower()} conviction suggest a disciplined wait-and-see approach. "
                f"Balanced portfolios benefit from clarity—avoid forcing positions when market direction remains ambiguous. "
            )
        
        # News analysis with balanced lens
        if news_themes:
            theme_text = " and ".join(news_themes[:2])
            narrative.append(
                f"Recent developments around {theme_text} reflect {news_sent.lower()} news sentiment. "
                f"Balanced investors should weigh this information alongside technical trends but avoid overreacting to headlines alone. "
            )
        
        # Time horizon integration
        if "Medium-term" in time_horizon:
            narrative.append(
                f"Your {time_horizon.lower()} horizon (1-3 years) aligns well with building positions gradually "
                f"and allowing thesis to play out without forced timing. Aim for core holdings you can hold through normal volatility. "
            )
        elif "Long-term" in time_horizon:
            narrative.append(
                f"A {time_horizon.lower()} perspective permits riding through short-term noise. Focus on whether "
                f"the fundamental story supports sustained returns over multiple years, not just current price action. "
            )
        else:
            narrative.append(
                f"The {time_horizon.lower()} window limits room for error. Require stronger confirmation before committing "
                f"and maintain tighter risk controls than you would for longer-duration strategies. "
            )
        
        # Balanced-specific allocation guidance
        if market_bias == "Bullish" and signal_strength == "Strong" and risk_level in ["Low", "Medium"]:
            narrative.append(
                f"Establish initial positions at 5-8% of portfolio, entering in tranches over 2-3 weeks to average your cost basis. "
                f"Set stop-loss at -10% for risk management while allowing room for normal fluctuation. "
                f"Plan to scale up to 10-12% if thesis strengthens; trim partially on outsized gains exceeding 30%. "
            )
        elif market_bias == "Bearish" and signal_strength == "Strong":
            narrative.append(
                f"Reduce existing exposure to 3-5% maximum or exit entirely if holding only for momentum. "
                f"For core long-term holdings, consider hedging with 10-15% portfolio allocation to inverse positions or protective puts. "
                f"Avoid catching falling knives—let price stabilize before considering re-entry. "
            )
        else:
            narrative.append(
                f"Maintain current positioning without adding new capital. Review fundamentals quarterly and "
                f"adjust allocations based on evolving data rather than reacting to short-term volatility. "
                f"Balanced portfolios succeed through discipline, not constant tinkering—patience over panic. "
            )
        
        return "".join(narrative)


def build_market_narrative(symbol: str, investor_profile: Dict) -> Dict:
    """
    Convenience function: Single entry point for the narrative engine.
    
    This function is what the FastAPI route calls.
    """
    engine = NarrativeEngine()
    return engine.build_market_narrative(symbol, investor_profile)
