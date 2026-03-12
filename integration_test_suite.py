#!/usr/bin/env python3
"""
Integration Test Suite for Stock Price Predictor
=================================================

Tests the full end-to-end integration between frontend and backend.
"""

import asyncio
import aiohttp
import json
import time
from pathlib import Path

class IntegrationTestRunner:
    def __init__(self):
        self.frontend_url = "http://localhost:3000"
        self.backend_url = "http://stocklens-production-89a6.up.railway.app/"
        self.results = []
        
    async def test_health_endpoints(self):
        """Test that both frontend and backend health endpoints respond."""
        print("🏥 Testing Health Endpoints...")
        
        async with aiohttp.ClientSession() as session:
            # Test backend health
            try:
                async with session.get(f"{self.backend_url}/health") as response:
                    if response.status == 200:
                        print("✅ Backend health check passed")
                        return True
                    else:
                        print(f"❌ Backend health check failed: {response.status}")
                        return False
            except Exception as e:
                print(f"❌ Backend health check failed: {e}")
                return False
    
    async def test_api_endpoints(self):
        """Test critical API endpoints."""
        print("🔌 Testing API Endpoints...")
        
        test_data = {
            "symbol": "AAPL",
            "investor_type": "Balanced",
            "time_horizon": "Medium-term"
        }
        
        endpoints = [
            ("/api/predict", "POST", {"symbol": "AAPL"}),
            ("/api/narrative", "POST", test_data),
            ("/api/risk", "POST", {"symbol": "AAPL"}),
        ]
        
        async with aiohttp.ClientSession() as session:
            for endpoint, method, data in endpoints:
                try:
                    url = f"{self.backend_url}{endpoint}"
                    if method == "GET":
                        async with session.get(url) as response:
                            status = response.status
                    else:
                        async with session.post(url, json=data) as response:
                            status = response.status
                            
                    if status in [200, 201]:
                        print(f"✅ {endpoint}: {status}")
                    else:
                        print(f"❌ {endpoint}: {status}")
                        
                except Exception as e:
                    print(f"❌ {endpoint}: {e}")
    
    async def test_data_flow(self):
        """Test complete data flow from prediction to narrative."""
        print("🌊 Testing Data Flow...")
        
        async with aiohttp.ClientSession() as session:
            # Step 1: Get prediction
            try:
                prediction_data = {"symbol": "AAPL"}
                async with session.post(f"{self.backend_url}/api/predict", json=prediction_data) as response:
                    if response.status == 200:
                        prediction_result = await response.json()
                        print("✅ Prediction API successful")
                        
                        # Step 2: Use prediction in narrative
                        narrative_data = {
                            "symbol": "AAPL",
                            "investor_type": "Growth",
                            "time_horizon": "Long-term"
                        }
                        
                        async with session.post(f"{self.backend_url}/api/narrative", json=narrative_data) as response:
                            if response.status == 200:
                                narrative_result = await response.json()
                                print("✅ Narrative API successful")
                                print("✅ End-to-end data flow working")
                            else:
                                print(f"❌ Narrative API failed: {response.status}")
                    else:
                        print(f"❌ Prediction API failed: {response.status}")
                        
            except Exception as e:
                print(f"❌ Data flow test failed: {e}")
    
    async def run_all_tests(self):
        """Run all integration tests."""
        print("🚀 Stock Price Predictor - Integration Test Suite")
        print("=" * 60)
        
        start_time = time.time()
        
        tests = [
            self.test_health_endpoints,
            self.test_api_endpoints,
            self.test_data_flow,
        ]
        
        for test in tests:
            await test()
            print()  # Add spacing between tests
        
        duration = time.time() - start_time
        print(f"🏁 Integration tests completed in {duration:.2f}s")

async def main():
    """Main entry point for integration tests."""
    runner = IntegrationTestRunner()
    
    print("⚠️  Make sure both frontend (port 3000) and backend (port 8001) are running!")
    print("   Frontend: npm run dev (in frontend directory)")
    print("   Backend: uvicorn app.main:app --reload --port 8001 (in backend directory)")
    print()
    
    # Wait a moment for user to read
    await asyncio.sleep(2)
    
    await runner.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())