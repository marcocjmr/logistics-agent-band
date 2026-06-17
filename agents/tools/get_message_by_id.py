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
    room_id = "ef62ae22-69a3-4906-8dca-36cdf0a946f0"
    message_id = "6ec52208-cdb0-4afe-89d3-e7f7f8221e65"
    url = f"https://app.band.ai/api/v1/agent/chats/{room_id}/messages/{message_id}"
    
    req = urllib.request.Request(
        url,
        headers=get_headers(api_key),
        method="GET"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = json.loads(response.read().decode())
            print(json.dumps(res_body, indent=2))
    except Exception as e:
        print(f"Failed to get message: {e}")
        if hasattr(e, 'read'):
            try:
                print("Error body:", e.read().decode())
            except:
                pass

if __name__ == "__main__":
    main()
