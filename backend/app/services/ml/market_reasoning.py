"""
AI Market Reasoning Assistant

Explains provided market signals with conservative analysis
and investor-specific interpretation. Does NOT calculate indicators.
"""

import logging
from typing import Dict, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class MarketSignals:
    """Input signals for market reasoning."""
    composite_score: float      # 0-100
    technical_score: float      # Score component
    trend_score: float          # Score component  
    risk_score: float          # Score component
    momentum_score: float       # Score component
    rsi_value: float           # 0-100
    macd_state: str           # "Above Signal" / "Below Signal"
    volatility_level: str     # "Low" / "Medium" / "High"
    support_level: float       # Price level
    resistance_level: float    # Price level
    entry_zone_low: float      # Entry range low
    entry_zone_high: float     # Entry range high
    exit_zone_low: float       # Exit range low
    exit_zone_high: float      # Exit range high
    model_confidence: float    # 0-100
    investor_type: str         # "Conservative" / "Balanced" / "Aggressive"
    investment_horizon: str    # "Short-term" / "Medium-term" / "Long-term"


@dataclass
class MarketReasoning:
    """Structured market reasoning output."""
    ai_reasoning: str
    key_insights: str
    investor_interpretation: str
    risk_notice: str
    decision_signal: str


class MarketReasoningAssistant:
    """
    AI Market Reasoning Assistant
    
    Explains provided signals with conservative interpretation
    and investor-specific guidance.
    """
    
    def explain_signals(self, signals: MarketSignals) -> MarketReasoning:
        """
        Explain provided market signals.
        
        Args:
            signals: MarketSignals with all computed values
            
        Returns:
            MarketReasoning with explanations
        """
        
        ai_reasoning = self._generate_ai_reasoning(signals)
        key_insights = self._generate_key_insights(signals)
        investor_interpretation = self._generate_investor_interpretation(signals)
        risk_notice = self._generate_risk_notice(signals)
        decision_signal = self._determine_decision_signal(signals)
        
        return MarketReasoning(
            ai_reasoning=ai_reasoning,
            key_insights=key_insights,
            investor_interpretation=investor_interpretation,
            risk_notice=risk_notice,
            decision_signal=decision_signal
        )
    
    def _generate_ai_reasoning(self, signals: MarketSignals) -> str:
        """Generate factual AI reasoning in bullet points."""
        
        reasoning_points = []
        
        # Composite score analysis
        if signals.composite_score >= 70:
            reasoning_points.append(f"• Composite score of {signals.composite_score:.0f}/100 indicates strong signal strength")
        elif signals.composite_score >= 50:
            reasoning_points.append(f"• Composite score of {signals.composite_score:.0f}/100 shows moderate signal strength") 
        else:
            reasoning_points.append(f"• Composite score of {signals.composite_score:.0f}/100 suggests weak signal conditions")
        
        # Technical components
        reasoning_points.append(f"• Technical score: {signals.technical_score:.1f}, Trend score: {signals.trend_score:.1f}, Momentum score: {signals.momentum_score:.1f}")
        
        # RSI state
        if signals.rsi_value > 70:
            reasoning_points.append(f"• RSI at {signals.rsi_value:.0f} indicates overbought territory")
        elif signals.rsi_value < 30:
            reasoning_points.append(f"• RSI at {signals.rsi_value:.0f} shows oversold conditions")
        else:
            reasoning_points.append(f"• RSI at {signals.rsi_value:.0f} remains in neutral territory")
        
        # MACD state
        reasoning_points.append(f"• MACD is {signals.macd_state.lower()}, indicating {self._interpret_macd(signals.macd_state)} momentum")
        
        # Volatility and levels
        reasoning_points.append(f"• {signals.volatility_level.lower()} volatility environment with support at {signals.support_level:.2f} and resistance at {signals.resistance_level:.2f}")
        
        # Model confidence
        if signals.model_confidence < 60:
            reasoning_points.append(f"• Model confidence at {signals.model_confidence:.0f}% suggests elevated uncertainty in signals")
        else:
            reasoning_points.append(f"• Model confidence at {signals.model_confidence:.0f}% indicates reliable signal quality")
        
        return "\n".join(reasoning_points)
    
    def _generate_key_insights(self, signals: MarketSignals) -> str:
        """Generate compressed key insights."""
        
        # Score interpretation
        if signals.composite_score >= 65 and signals.model_confidence >= 60:
            strength = "Strong"
        elif signals.composite_score >= 45 and signals.model_confidence >= 50:
            strength = "Moderate"
        else:
            strength = "Weak"
        
        # Risk assessment
        risk_level = "elevated" if signals.risk_score > 60 else "moderate" if signals.risk_score > 40 else "contained"
        
        # Entry zone analysis
        entry_range = signals.entry_zone_high - signals.entry_zone_low
        entry_precision = "tight" if entry_range < (signals.support_level * 0.02) else "wide" if entry_range > (signals.support_level * 0.05) else "moderate"
        
        return (f"{strength} signal composite ({signals.composite_score:.0f}/100) with {risk_level} risk profile. "
                f"{signals.macd_state} MACD and {self._interpret_rsi_zone(signals.rsi_value)} RSI positioning. "
                f"Entry zone spans {signals.entry_zone_low:.2f}-{signals.entry_zone_high:.2f} ({entry_precision} range). "
                f"Model confidence: {signals.model_confidence:.0f}%.")
    
    def _generate_investor_interpretation(self, signals: MarketSignals) -> str:
        """Generate investor-specific interpretation."""
        
        if signals.investor_type == "Conservative":
            return self._conservative_interpretation(signals)
        elif signals.investor_type == "Aggressive":
            return self._aggressive_interpretation(signals)
        else:  # Balanced
            return self._balanced_interpretation(signals)
    
    def _conservative_interpretation(self, signals: MarketSignals) -> str:
        """Conservative investor interpretation."""
        
        decision = self._determine_decision_signal(signals)
        
        if signals.model_confidence < 65 or signals.composite_score < 60:
            return (f"Conservative approach for {signals.investment_horizon.lower()} timeframe: "
                   f"Given model confidence of {signals.model_confidence:.0f}% and composite score of {signals.composite_score:.0f}, "
                   f"current signals lack the certainty required for capital deployment. "
                   f"Risk score of {signals.risk_score:.1f} suggests waiting for clearer conditions. "
                   f"Monitor for improvement in signal strength before considering position changes.")
        
        if decision == "BUY":
            return (f"Conservative entry consideration: Composite score of {signals.composite_score:.0f} with {signals.model_confidence:.0f}% confidence "
                   f"meets minimum thresholds for careful positioning. Entry zone {signals.entry_zone_low:.2f}-{signals.entry_zone_high:.2f} "
                   f"provides defined risk parameters. Consider gradual accumulation with position sizing reflecting "
                   f"risk score of {signals.risk_score:.1f}. Exit planning around {signals.exit_zone_low:.2f}-{signals.exit_zone_high:.2f}.")
        
        elif decision == "SELL":
            return (f"Conservative risk management: Signal deterioration with composite score of {signals.composite_score:.0f} "
                   f"suggests reducing exposure. {signals.volatility_level.lower()} volatility and risk score of {signals.risk_score:.1f} "
                   f"warrant defensive positioning. Consider trimming positions, particularly if holding above {signals.resistance_level:.2f} area.")
        
        else:  # HOLD
            return (f"Conservative hold stance: Current composite score of {signals.composite_score:.0f} with {signals.model_confidence:.0f}% confidence "
                   f"suggests maintaining existing positions without changes. Monitor for signal improvement or deterioration. "
                   f"Respect support ({signals.support_level:.2f}) and resistance ({signals.resistance_level:.2f}) levels for future decisions.")
    
    def _aggressive_interpretation(self, signals: MarketSignals) -> str:
        """Aggressive investor interpretation."""
        
        decision = self._determine_decision_signal(signals)
        
        if signals.composite_score > 60 and signals.model_confidence > 55:
            if decision == "BUY":
                return (f"Aggressive opportunity for {signals.investment_horizon.lower()} strategy: "
                       f"Composite score of {signals.composite_score:.0f} with momentum score of {signals.momentum_score:.1f} "
                       f"supports conviction positioning. Entry zone {signals.entry_zone_low:.2f}-{signals.entry_zone_high:.2f} "
                       f"offers tactical entry points. {signals.macd_state} MACD alignment supports directional bias. "
                       f"Target exit consideration in {signals.exit_zone_low:.2f}-{signals.exit_zone_high:.2f} range.")
            
            elif decision == "SELL":
                return (f"Aggressive short-term positioning: Signal deterioration with composite falling to {signals.composite_score:.0f} "
                       f"and risk score elevated to {signals.risk_score:.1f} favors tactical hedging or profit-taking. "
                       f"{signals.volatility_level.lower()} volatility provides opportunity for quick reversals. "
                       f"Monitor breakdown below {signals.support_level:.2f} for acceleration.")
        
        return (f"Aggressive tactical approach: Mixed signals with composite score of {signals.composite_score:.0f} "
               f"and {signals.model_confidence:.0f}% confidence suggest range-bound strategy. "
               f"Use {signals.volatility_level.lower()} volatility for swing trades between support ({signals.support_level:.2f}) "
               f"and resistance ({signals.resistance_level:.2f}). RSI at {signals.rsi_value:.0f} provides timing reference.")
    
    def _balanced_interpretation(self, signals: MarketSignals) -> str:
        """Balanced investor interpretation."""
        
        decision = self._determine_decision_signal(signals)
        
        if signals.model_confidence > 60:
            if decision == "BUY":
                return (f"Balanced approach for {signals.investment_horizon.lower()} investing: "
                       f"Composite score of {signals.composite_score:.0f} with technical score of {signals.technical_score:.1f} "
                       f"supports measured position building. Entry zone {signals.entry_zone_low:.2f}-{signals.entry_zone_high:.2f} "
                       f"allows for phased accumulation. Risk score of {signals.risk_score:.1f} guides appropriate sizing. "
                       f"Plan partial profit-taking in {signals.exit_zone_low:.2f}-{signals.exit_zone_high:.2f} area.")
            
            elif decision == "SELL":
                return (f"Balanced risk management: Composite score decline to {signals.composite_score:.0f} with "
                       f"{signals.volatility_level.lower()} volatility suggests rebalancing exposure. "
                       f"Trend score of {signals.trend_score:.1f} and {signals.macd_state.lower()} MACD warrant "
                       f"defensive adjustments. Consider reducing positions while maintaining core holdings.")
        
        return (f"Balanced patience strategy: Current composite score of {signals.composite_score:.0f} with "
               f"{signals.model_confidence:.0f}% confidence suggests waiting for clearer signals. "
               f"Maintain existing allocation while monitoring for improvement in trend ({signals.trend_score:.1f}) "
               f"and momentum ({signals.momentum_score:.1f}) components.")
    
    def _generate_risk_notice(self, signals: MarketSignals) -> str:
        """Generate risk notice."""
        
        notices = []
        
        # Model confidence warning
        if signals.model_confidence < 60:
            notices.append(f"Low model confidence ({signals.model_confidence:.0f}%) increases signal uncertainty")
        
        # Volatility warning
        if signals.volatility_level == "High":
            notices.append("High volatility environment increases position risk and price swings")
        
        # Entry/exit zone notice
        notices.append("Entry and exit zones are indicative ranges, not guaranteed execution levels")
        
        # General disclaimer
        notices.append("All signals are analytical interpretations subject to market risk and changing conditions")
        
        # RSI extreme warning
        if signals.rsi_value > 75 or signals.rsi_value < 25:
            notices.append(f"Extreme RSI reading ({signals.rsi_value:.0f}) may indicate potential reversal risk")
        
        return "RISKS: " + " • ".join(notices) + "."
    
    def _determine_decision_signal(self, signals: MarketSignals) -> str:
        """Determine BUY/HOLD/SELL signal based on composite factors."""
        
        # Conservative approach - require higher thresholds
        if signals.model_confidence < 50:
            return "HOLD"
        
        # Main signal from composite score with confidence weighting
        adjusted_score = signals.composite_score * (signals.model_confidence / 100)
        
        # RSI modification
        if signals.rsi_value > 70:
            adjusted_score -= 10  # Reduce for overbought
        elif signals.rsi_value < 30:
            adjusted_score += 5   # Small boost for oversold
        
        # MACD confirmation
        if signals.macd_state == "Above Signal" and adjusted_score > 50:
            adjusted_score += 5
        elif signals.macd_state == "Below Signal" and adjusted_score < 50:
            adjusted_score -= 5
        
        # Risk score adjustment
        if signals.risk_score > 70:
            adjusted_score *= 0.8  # Reduce conviction in high risk
        
        # Final decision with conservative bias
        if adjusted_score >= 60:
            return "BUY"
        elif adjusted_score <= 35:
            return "SELL"
        else:
            return "HOLD"
    
    def _interpret_macd(self, macd_state: str) -> str:
        """Interpret MACD state."""
        return "bullish" if macd_state == "Above Signal" else "bearish"
    
    def _interpret_rsi_zone(self, rsi_value: float) -> str:
        """Interpret RSI zone."""
        if rsi_value > 70:
            return "overbought"
        elif rsi_value < 30:
            return "oversold"
        else:
            return "neutral"


def explain_market_signals(
    composite_score: float,
    technical_score: float,
    trend_score: float,
    risk_score: float,
    momentum_score: float,
    rsi_value: float,
    macd_state: str,
    volatility_level: str,
    support_level: float,
    resistance_level: float,
    entry_zone_low: float,
    entry_zone_high: float,
    exit_zone_low: float,
    exit_zone_high: float,
    model_confidence: float,
    investor_type: str,
    investment_horizon: str
) -> Dict[str, str]:
    """
    Convenience function for market signal explanation.
    
    Returns dictionary with reasoning sections.
    """
    
    signals = MarketSignals(
        composite_score=composite_score,
        technical_score=technical_score,
        trend_score=trend_score,
        risk_score=risk_score,
        momentum_score=momentum_score,
        rsi_value=rsi_value,
        macd_state=macd_state,
        volatility_level=volatility_level,
        support_level=support_level,
        resistance_level=resistance_level,
        entry_zone_low=entry_zone_low,
        entry_zone_high=entry_zone_high,
        exit_zone_low=exit_zone_low,
        exit_zone_high=exit_zone_high,
        model_confidence=model_confidence,
        investor_type=investor_type,
        investment_horizon=investment_horizon
    )
    
    assistant = MarketReasoningAssistant()
    result = assistant.explain_signals(signals)
    
    return {
        "ai_reasoning": result.ai_reasoning,
        "key_insights": result.key_insights,
        "investor_interpretation": result.investor_interpretation,
        "risk_notice": result.risk_notice,
        "decision_signal": result.decision_signal
    }