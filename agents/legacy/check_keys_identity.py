import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

def get_headers(api_key):
    return {
        "X-API-Key": api_key,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

def get_agent_identity(name, api_key):
    if not api_key:
        print(f"{name}: [MISSING]")
        return
        
    url = "https://app.band.ai/api/v1/agent/me"
    req = urllib.request.Request(url, headers=get_headers(api_key))
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            print(f"{name}: {json.dumps(data)}")
    except Exception as e:
        print(f"{name} Error: {e}")
        if hasattr(e, 'read'):
            try:
                print("Error body:", e.read().decode())
            except:
                pass

def main():
    keys = {
        "BAND_API_KEY": os.getenv("BAND_API_KEY"),
        "REQUIREMENTS_ANALYST_API_KEY": os.getenv("REQUIREMENTS_ANALYST_API_KEY"),
        "TRANSIT_PLANNER_API_KEY": os.getenv("TRANSIT_PLANNER_API_KEY"),
        "ACCOMMODATION_SCOUT_API_KEY": os.getenv("ACCOMMODATION_SCOUT_API_KEY"),
        "FINANCIAL_AUDITOR_API_KEY": os.getenv("FINANCIAL_AUDITOR_API_KEY"),
    }
    
    print("--- Verifying Agent Identities ---")
    for name, api_key in keys.items():
        get_agent_identity(name, api_key)

if __name__ == "__main__":
    main()
