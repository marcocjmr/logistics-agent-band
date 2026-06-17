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

def main():
    api_key = os.getenv("BAND_API_KEY")
    
    # 1. Create chat room
    print("Creating new chat room...")
    create_url = "https://app.band.ai/api/v1/agent/chats"
    payload = {
        "chat": {
            "title": "Corporate Travel Swarm Room"
        }
    }
    
    req = urllib.request.Request(
        create_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=get_headers(api_key),
        method="POST"
    )
    
    room_id = None
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = json.loads(response.read().decode())
            print("Create room response:", json.dumps(res_body, indent=2))
            room_id = res_body.get("data", {}).get("chat_room", {}).get("id")
            # Fallback if structure is different
            if not room_id:
                room_id = res_body.get("data", {}).get("id")
            if not room_id:
                room_id = res_body.get("chat_room", {}).get("id")
            print(f"Room ID: {room_id}")
    except Exception as e:
        print(f"Failed to create room: {e}")
        if hasattr(e, 'read'):
            try:
                print("Error body:", e.read().decode())
            except:
                pass
        return
        
    # 2. Add user as participant
    user_id = "1de401e1-2ad1-4e4a-bb91-8751daa4a87f"
    print(f"Adding user {user_id} to room {room_id}...")
    add_url = f"https://app.band.ai/api/v1/agent/chats/{room_id}/participants"
    add_payload = {
        "participant": {
            "participant_id": user_id,
            "role": "member"
        }
    }
    
    req_add = urllib.request.Request(
        add_url,
        data=json.dumps(add_payload).encode("utf-8"),
        headers=get_headers(api_key),
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req_add, timeout=10) as response:
            res_body = json.loads(response.read().decode())
            print("Successfully added user to the room!")
            print(json.dumps(res_body, indent=2))
    except Exception as e:
        print(f"Failed to add user: {e}")
        if hasattr(e, 'read'):
            try:
                print("Error body:", e.read().decode())
            except:
                pass

if __name__ == "__main__":
    main()
