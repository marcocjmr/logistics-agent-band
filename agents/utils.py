import os
import json
import re
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

# AI/ML API client
def get_aiml_client():
    key = os.getenv("AIML_API_KEY")
    if not key:
        raise ValueError("AIML_API_KEY not found in environment")
    return OpenAI(base_url="https://api.aimlapi.com/v1", api_key=key)

# Featherless AI client
def get_featherless_client():
    key = os.getenv("FEATHERLESS_API_KEY")
    if not key:
        raise ValueError("FEATHERLESS_API_KEY not found in environment")
    return OpenAI(base_url="https://api.featherless.ai/v1", api_key=key)

# Helper to extract JSON from LLM response
def extract_json(text):
    text = text.strip()
    # Try finding markdown code block
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
            
    # Try to find first '{' and last '}'
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        try:
            return json.loads(text[start:end+1])
        except json.JSONDecodeError:
            pass
            
    # Direct load
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        raise ValueError(f"Could not parse JSON from text: {text}")

# Initial JSON template
def create_initial_state(user_query, destination, start_date, end_date, budget, purpose):
    return {
        "request": {
            "user_query": user_query,
            "destination": destination,
            "start_date": start_date,
            "end_date": end_date,
            "budget": float(budget),
            "purpose": purpose
        },
        "transit": {
            "status": "pending",
            "options": [],
            "selected_option_id": None,
            "total_cost": 0.0,
            "error_message": ""
        },
        "lodging": {
            "status": "pending",
            "options": [],
            "selected_option_id": None,
            "total_cost": 0.0,
            "error_message": ""
        },
        "audit": {
            "status": "pending",
            "total_estimated_cost": 0.0,
            "comments": ""
        }
    }

# Save message to local shared JSON file for frontend dashboard synchronization
def save_local_message(sender_name, sender_type, content):
    import uuid
    from datetime import datetime
    
    file_path = os.path.join(os.path.dirname(__file__), "../shared_messages.json")
    
    # Read existing
    messages = []
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                messages = json.load(f)
        except Exception:
            messages = []
            
    # Append new
    new_msg = {
        "id": str(uuid.uuid4()),
        "content": content,
        "sender_name": sender_name,
        "sender_type": sender_type,
        "inserted_at": datetime.utcnow().isoformat() + "Z",
        "message_type": "text"
    }
    messages.append(new_msg)
    
    # Write back
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(messages, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving local message: {e}")

