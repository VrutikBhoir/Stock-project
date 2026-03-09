"""
Simple API test for Market Reasoning endpoint
"""
import requests
import json

def test_api():
    """Test the market reasoning API endpoint."""
    
    print("🌐 Testing Market Reasoning API")
    print("=" * 50)
    
    # Test health endpoint
    try:
        health_response = requests.get("http://localhost:8001/api/market-reasoning/health")
        print(f"✅ Health Check: {health_response.status_code}")
        print(f"   Response: {health_response.json()}")
    except Exception as e:
        print(f"❌ Health Check Failed: {e}")
        return
    
    # Test main reasoning endpoint
    test_data = {
        "composite_score": 75.5,
        "technical_score": 80.2,
        "trend_score": 72.8,
        "risk_score": 45.3,
        "momentum_score": 78.1,
        "rsi_value": 55.0,
        "macd_state": "Above Signal",
        "volatility_level": "Medium",
        "support_level": 148.50,
        "resistance_level": 158.00,
        "entry_zone_low": 150.25,
        "entry_zone_high": 152.75,
        "exit_zone_low": 156.00,
        "exit_zone_high": 159.50,
        "model_confidence": 82.0,
        "investor_type": "Balanced",
        "investment_horizon": "Medium-term"
    }
    
    try:
        response = requests.post(
            "http://localhost:8001/api/market-reasoning/explain",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\n📊 Reasoning API Test: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ API Response Success")
            print(f"📈 Decision Signal: {result.get('decision_signal', 'N/A')}")
            print(f"🔍 Key Insights: {result.get('key_insights', 'N/A')[:100]}...")
            print(f"⚠️  Risk Notice Present: {'risk_notice' in result}")
        else:
            print(f"❌ API Error: {response.text}")
            
    except Exception as e:
        print(f"❌ API Test Failed: {e}")

if __name__ == "__main__":
    test_api()