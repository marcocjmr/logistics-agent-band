import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

def get_headers(api_key):
    return {
        "X-API-Key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

def add_participant(chat_id, participant_id, api_key):
    url = f"https://app.band.ai/api/v1/agent/chats/{chat_id}/participants"
    payload = {
        "participant": {
            "participant_id": participant_id,
            "role": "member"
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=get_headers(api_key),
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = json.loads(response.read().decode())
            print(f"Successfully added participant {participant_id}")
            print(json.dumps(res_body, indent=2))
            return True
    except Exception as e:
        print(f"Failed to add participant {participant_id}: {e}")
        if hasattr(e, 'read'):
            try:
                print("Error body:", e.read().decode())
            except:
                pass
        return False

def main():
    api_key = os.getenv("BAND_API_KEY")
    chat_id = "ef62ae22-69a3-4906-8dca-36cdf0a946f0"
    
    # Participant IDs to add
    participants = [
        os.getenv("TRANSIT_PLANNER_ID"),
        os.getenv("ACCOMMODATION_SCOUT_ID"),
        os.getenv("FINANCIAL_AUDITOR_ID")
    ]
    
    for pid in participants:
        if pid:
            print(f"Adding participant {pid}...")
            add_participant(chat_id, pid, api_key)
        else:
            print("Skipping empty participant ID")

if __name__ == "__main__":
    main()
