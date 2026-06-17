import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

url = "http://127.0.0.1:3000/api/messages"
payload = {
    "content": "Necesito viajar a Monterrey del 15 al 20 de julio de 2026 para una conferencia de tecnología. Mi presupuesto es de $1500 USD.",
    "roomId": os.getenv("BAND_ROOM_ID")
}

headers = {
    "Content-Type": "application/json"
}

req = urllib.request.Request(
    url, 
    data=json.dumps(payload).encode("utf-8"), 
    headers=headers,
    method="POST"
)

print("Sending travel request query to local Next.js API...")
try:
    with urllib.request.urlopen(req) as response:
        status = response.getcode()
        body = response.read().decode("utf-8")
        print(f"Status: {status}")
        print(f"Response Body: {body}")
except Exception as e:
    print(f"Error triggering request: {e}")
