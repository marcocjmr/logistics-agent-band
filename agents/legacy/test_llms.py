import os
from dotenv import load_dotenv
from openai import OpenAI

# Load .env file from the root directory
load_dotenv()

print("=== LLM Providers Connection Test ===")

aiml_api_key = os.getenv("AIML_API_KEY")
featherless_api_key = os.getenv("FEATHERLESS_API_KEY")

def test_aiml_api():
    if not aiml_api_key or "_aqui" in aiml_api_key:
        print("[SKIP] AI/ML API key is not configured in .env.")
        return
        
    print("\nTesting AI/ML API...")
    try:
        # AI/ML API is OpenAI-compatible
        client = OpenAI(
            base_url="https://api.aimlapi.com/v1",
            api_key=aiml_api_key
        )
        
        # We can list the models to check authentication
        print("[INFO] Fetching model list from AI/ML API...")
        models = client.models.list()
        # Get the first few models
        model_names = [m.id for m in list(models.data)[:5]]
        print("[OK] AI/ML API: Connection successful! Valid key.")
        print(f"[INFO] Sample available models: {model_names}")
        
    except Exception as e:
        print(f"[ERROR] AI/ML API failed: {str(e)}")

def test_featherless_api():
    if not featherless_api_key or "_aqui" in featherless_api_key:
        print("[SKIP] Featherless AI key is not configured in .env.")
        return
        
    print("\nTesting Featherless AI...")
    try:
        # Featherless AI is OpenAI-compatible
        client = OpenAI(
            base_url="https://api.featherless.ai/v1",
            api_key=featherless_api_key
        )
        
        # We can list the models to check authentication
        print("[INFO] Fetching model list from Featherless AI...")
        models = client.models.list()
        # Get the first few models
        model_names = [m.id for m in list(models.data)[:5]]
        print("[OK] Featherless AI: Connection successful! Valid key.")
        print(f"[INFO] Sample available models: {model_names}")
        
    except Exception as e:
        print(f"[ERROR] Featherless AI failed: {str(e)}")

if __name__ == "__main__":
    test_aiml_api()
    test_featherless_api()
