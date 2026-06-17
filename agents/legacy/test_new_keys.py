import os
import http.client
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

keys = {
    "REQUIREMENTS_ANALYST_API_KEY": os.getenv("REQUIREMENTS_ANALYST_API_KEY"),
    "TRANSIT_PLANNER_API_KEY": os.getenv("TRANSIT_PLANNER_API_KEY"),
    "ACCOMMODATION_SCOUT_API_KEY": os.getenv("ACCOMMODATION_SCOUT_API_KEY"),
    "FINANCIAL_AUDITOR_API_KEY": os.getenv("FINANCIAL_AUDITOR_API_KEY"),
}

for name, api_key in keys.items():
    print(f"\nPinging Band.ai with key {name}...")
    try:
        conn = http.client.HTTPSConnection("app.band.ai")
        headers = {
            "X-API-Key": api_key
        }
        conn.request("GET", "/api/v1/agent/me", headers=headers)
        res = conn.getresponse()
        data = res.read().decode("utf-8")
        print(f"Status: {res.status} ({res.reason})")
        print(f"Body: {data}")
    except Exception as e:
        print(f"Error: {e}")
