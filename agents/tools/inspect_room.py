import asyncio
import os
import json
from dotenv import load_dotenv
from thenvoi_rest import AsyncRestClient

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

async def main():
    api_key = os.getenv("BAND_API_KEY")
    client = AsyncRestClient(api_key=api_key)
    
    print("--- Listing Chats ---")
    try:
        chats = await client.agent_api_chats.list_agent_chats()
        for chat in chats.data:
            print(f"Chat Room ID: {chat.id}")
            print(f"  Title: {chat.title}")
            print(f"  Type: {chat.type}")
    except Exception as e:
        print(f"Failed to list chats: {e}")
        
    print("\n--- Listing Participants for Room 'ef62ae22-69a3-4906-8dca-36cdf0a946f0' ---")
    try:
        parts = await client.agent_api_participants.list_agent_chat_participants(chat_id="ef62ae22-69a3-4906-8dca-36cdf0a946f0")
        for p in parts.data:
            print(f"Participant: ID={p.id}, Handle={p.handle}, Name={p.name}")
    except Exception as e:
        print(f"Failed to list participants: {e}")

if __name__ == "__main__":
    asyncio.run(main())
