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

def main():
    api_key = os.getenv("BAND_API_KEY")
    url = "https://app.band.ai/api/v1/me/agents"
    
    req = urllib.request.Request(
        url,
        headers=get_headers(api_key),
        method="GET"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = json.loads(response.read().decode())
            print("Successfully retrieved agents:")
            print(json.dumps(res_body, indent=2))
    except Exception as e:
        print(f"Failed to get agents: {e}")
        if hasattr(e, 'read'):
            try:
                print("Error body:", e.read().decode())
            except:
                pass

if __name__ == "__main__":
    main()
