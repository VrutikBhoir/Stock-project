import urllib.request
import json

try:
    with urllib.request.urlopen("http://localhost:8001/api/predict/AAPL") as response:
        data = json.loads(response.read().decode())
    
    print(json.dumps({
        "volatility": data["prediction"]["volatility"],
        "confidence_score": data["prediction"]["confidence_score"],
        "expected_return": data["investment_analysis"]["expected_performance"]["medium_term_return"],
        "recommendation": data["investment_analysis"]["recommendation"]
    }, indent=2))
except Exception as e:
    print(e)
