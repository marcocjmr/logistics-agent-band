import asyncio
import os
from dotenv import load_dotenv
from thenvoi_rest import AsyncRestClient

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

async def main():
    api_key = os.getenv("BAND_API_KEY")
    client = AsyncRestClient(api_key=api_key)
    
    print("Listing agent peers...")
    try:
        res = await client.agent_api_peers.list_agent_peers()
        print("Success!")
        for peer in res.data:
            print(f"  Name: {peer.name}, Handle: {peer.handle}, ID: {peer.id}, Type: {peer.type}")
    except Exception as e:
        print(f"Failed to list peers: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
