import os
import http.client
import json
from dotenv import load_dotenv

# Load .env file from the root directory
load_dotenv()

print("=== Verifying Environment Variables ===")

keys = {
    "BAND_API_KEY": os.getenv("BAND_API_KEY"),
    "BAND_AGENT_ID": os.getenv("BAND_AGENT_ID"),
    "AIML_API_KEY": os.getenv("AIML_API_KEY"),
    "FEATHERLESS_API_KEY": os.getenv("FEATHERLESS_API_KEY")
}

all_configured = True
for name, val in keys.items():
    if not val or "_aqui" in val:
        print(f"[MISSING] {name} is not configured or has the default value.")
        all_configured = False
    else:
        # Mask API key in console output for security
        masked_val = f"{val[:6]}...{val[-4:]}" if len(val) > 10 else "..."
        print(f"[OK] {name} is configured: \"{masked_val}\"")

if not all_configured:
    print("\n[WARNING] Please edit your `.env` file at the root of the project to set your real keys.")

def test_aiml_api():
    api_key = keys["AIML_API_KEY"]
    if not api_key or "_aqui" in api_key:
        return
    print("\nPinging AI/ML API...")
    try:
        conn = http.client.HTTPSConnection("api.aimlapi.com")
        headers = {
            "Authorization": f"Bearer {api_key}"
        }
        conn.request("GET", "/v1/models", headers=headers)
        res = conn.getresponse()
        data = res.read().decode("utf-8")
        if res.status == 200:
            print("[OK] AI/ML API: Connection successful! Valid key.")
        else:
            print(f"[ERROR] AI/ML API failed with status: {res.status} ({res.reason})")
            print(f"Detail: {data}")
    except Exception as e:
        print(f"[ERROR] AI/ML API: Network or connection error: {str(e)}")

def test_featherless_api():
    api_key = keys["FEATHERLESS_API_KEY"]
    if not api_key or "_aqui" in api_key:
        return
    print("\nPinging Featherless AI...")
    try:
        conn = http.client.HTTPSConnection("api.featherless.ai")
        headers = {
            "Authorization": f"Bearer {api_key}"
        }
        conn.request("GET", "/v1/models", headers=headers)
        res = conn.getresponse()
        data = res.read().decode("utf-8")
        if res.status == 200:
            print("[OK] Featherless AI: Connection successful! Valid key.")
        else:
            print(f"[ERROR] Featherless AI failed with status: {res.status} ({res.reason})")
            print(f"Detail: {data}")
    except Exception as e:
        print(f"[ERROR] Featherless AI: Network or connection error: {str(e)}")

def test_band_api():
    api_key = keys["BAND_API_KEY"]
    if not api_key or "_aqui" in api_key:
        return
    print("\nPinging Band.ai API...")
    try:
        conn = http.client.HTTPSConnection("app.band.ai")
        headers = {
            "X-API-Key": api_key
        }
        conn.request("GET", "/api/v1/me", headers=headers)
        res = conn.getresponse()
        data = res.read().decode("utf-8")
        if res.status == 200:
            print("[OK] Band.ai API: Connection successful! Valid key.")
        elif res.status in (401, 403):
            print(f"[WARNING] Band.ai API returned: {res.status} (Key might be invalid or needs other permissions).")
        else:
            print(f"[INFO] Band.ai API responded with status: {res.status} ({res.reason}).")
    except Exception as e:
        print(f"[ERROR] Band.ai API: Network or connection error: {str(e)}")

if all_configured:
    print("\n=== Running Connection Tests ===")
    test_aiml_api()
    test_featherless_api()
    test_band_api()
