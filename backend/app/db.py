from supabase import create_client, Client
import os
from dotenv import load_dotenv
from pathlib import Path
import httpx

# Load .env from project root (/backend)
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Lazy initialization - don't create client at import time
_supabase_client = None

def get_supabase():
    """Get or initialize Supabase client on-demand with optimized connection settings"""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file")
        
        # Create Supabase client (note: supabase-py creates its own HTTP client)
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[OK] Supabase client initialized successfully")
    return _supabase_client

def test_connection():
    """Test if Supabase connection is working"""
    try:
        client = get_supabase()
        # Simple test query
        result = client.table("portfolio_accounts").select("*").limit(1).execute()
        print("[OK] Supabase connection test successful")
        return True
    except Exception as e:
        print(f"[ERROR] Supabase connection test failed: {e}")
        return False

# For backward compatibility, create a property-like interface
class SupabaseProxy:
    def __getattr__(self, name):
        return getattr(get_supabase(), name)

supabase = SupabaseProxy()
print("[DEBUG] Supabase proxy created (lazy initialization)")
