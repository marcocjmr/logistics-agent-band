import asyncio
import os
from dotenv import load_dotenv
from thenvoi_rest import AsyncRestClient

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

room_id = "41eb9e84-18e5-4235-9610-ea5f83c18080"

async def main():
    api_key = os.getenv("BAND_API_KEY")
    client = AsyncRestClient(api_key=api_key)
    
    print(f"Querying messages in room: {room_id}")
    try:
        res = await client.agent_api_messages.list_agent_messages(chat_id=room_id)
        print("Success!")
        for msg in res.data:
            print(f"[{msg.sender_name or msg.sender_type}]: {msg.content}")
            print("-" * 20)
    except Exception as e:
        print(f"Failed to query messages: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
