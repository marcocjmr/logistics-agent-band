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

def make_request(url, api_key):
    req = urllib.request.Request(url, headers=get_headers(api_key))
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error requesting {url}: {e}")
        if hasattr(e, 'read'):
            try:
                print("Error response body:", e.read().decode())
            except:
                pass
        return None

def main():
    api_key = os.getenv("BAND_API_KEY")
    if not api_key:
        print("Error: BAND_API_KEY not found in env.")
        return
        
    print("--- Listing Chats via Direct HTTP ---")
    chats_url = "https://app.band.ai/api/v1/agent/chats"
    res = make_request(chats_url, api_key)
    if res:
        print(json.dumps(res, indent=2))
        
    room_id = "ef62ae22-69a3-4906-8dca-36cdf0a946f0"
    print(f"\n--- Listing Participants for Room {room_id} ---")
    parts_url = f"https://app.band.ai/api/v1/agent/chats/{room_id}/participants"
    res_parts = make_request(parts_url, api_key)
    if res_parts:
        print(json.dumps(res_parts, indent=2))

if __name__ == "__main__":
    main()
