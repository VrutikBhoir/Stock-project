"""
Test enhanced news sentiment analysis
Demonstrates themes, impact assessment, and technical alignment
"""

from backend.app.services.news.news_sentiment import (
    analyze_news_sentiment,
    assess_news_technical_alignment
)


def test_news_analysis():
    """Test the enhanced news analysis engine."""
    
    print("=" * 80)
    print("ENHANCED NEWS SENTIMENT ANALYSIS TEST")
    print("=" * 80)
    print()
    
    # Test Case 1: Positive earnings news
    print("TEST 1: POSITIVE EARNINGS NEWS")
    print("-" * 80)
    headlines_1 = [
        "Company beats earnings expectations for Q4",
        "Revenue surges 25% year over year",
        "Strong profit margins boost investor confidence",
        "CEO announces expansion plans for 2026"
    ]
    result_1 = analyze_news_sentiment(headlines_1)
    print(f"Headlines analyzed: {result_1['headline_count']}")
    print(f"Sentiment: {result_1['sentiment']} (confidence: {result_1['confidence']})")
    print(f"Themes: {', '.join(result_1['themes']) if result_1['themes'] else 'None'}")
    print(f"Market Impact: {result_1['market_impact']}")
    print(f"Summary: {result_1['summary']}")
    print()
    
    # Test Case 2: Negative regulatory news
    print("TEST 2: NEGATIVE REGULATORY NEWS")
    print("-" * 80)
    headlines_2 = [
        "SEC launches investigation into company practices",
        "Regulatory concerns weigh on stock price",
        "Lawsuit filed over alleged violations",
        "Legal risks pose threat to operations"
    ]
    result_2 = analyze_news_sentiment(headlines_2)
    print(f"Headlines analyzed: {result_2['headline_count']}")
    print(f"Sentiment: {result_2['sentiment']} (confidence: {result_2['confidence']})")
    print(f"Themes: {', '.join(result_2['themes']) if result_2['themes'] else 'None'}")
    print(f"Market Impact: {result_2['market_impact']}")
    print(f"Summary: {result_2['summary']}")
    print()
    
    # Test Case 3: Mixed technology news
    print("TEST 3: MIXED TECHNOLOGY NEWS")
    print("-" * 80)
    headlines_3 = [
        "Company unveils new AI platform innovation",
        "Technical challenges delay product launch",
        "Partnership announced with major tech firm",
        "Cybersecurity concerns raised by analysts"
    ]
    result_3 = analyze_news_sentiment(headlines_3)
    print(f"Headlines analyzed: {result_3['headline_count']}")
    print(f"Sentiment: {result_3['sentiment']} (confidence: {result_3['confidence']})")
    print(f"Themes: {', '.join(result_3['themes']) if result_3['themes'] else 'None'}")
    print(f"Market Impact: {result_3['market_impact']}")
    print(f"Summary: {result_3['summary']}")
    print()
    
    # Test Case 4: News-Technical Alignment
    print("TEST 4: NEWS-TECHNICAL ALIGNMENT ANALYSIS")
    print("-" * 80)
    
    scenarios = [
        ("Positive", "Uptrend"),
        ("Positive", "Downtrend"),
        ("Negative", "Downtrend"),
        ("Negative", "Uptrend"),
        ("Neutral", "Sideways")
    ]
    
    for news_sent, tech_trend in scenarios:
        alignment = assess_news_technical_alignment(news_sent, tech_trend)
        print(f"News: {news_sent:9} | Technical: {tech_trend:9} | "
              f"Alignment: {alignment['alignment']:11} - {alignment['explanation']}")
    
    print()
    
    # Test Case 5: No news
    print("TEST 5: NO NEWS AVAILABLE")
    print("-" * 80)
    result_5 = analyze_news_sentiment([])
    print(f"Headlines analyzed: {result_5['headline_count']}")
    print(f"Sentiment: {result_5['sentiment']} (confidence: {result_5['confidence']})")
    print(f"Summary: {result_5['summary']}")
    print()
    
    print("=" * 80)
    print("✅ ALL TESTS COMPLETED SUCCESSFULLY")
    print("=" * 80)


if __name__ == "__main__":
    test_news_analysis()
