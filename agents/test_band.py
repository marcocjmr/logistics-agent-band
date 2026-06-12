import asyncio
import os
from dotenv import load_dotenv
from band import Agent
from band.core.simple_adapter import SimpleAdapter

# Load .env file from the root directory
load_dotenv()

class TestAdapter(SimpleAdapter):
    async def on_message(
        self,
        msg,
        tools,
        history,
        participants_msg,
        contacts_msg,
        *,
        is_session_bootstrap,
        room_id
    ):
        print(f"[INFO] Message received in room {room_id}: {msg.content}")
        # Send a reply back to the room
        await tools.send_message(f"Echo from TestAgent: {msg.content}")

async def main():
    print("=== Band.ai Connection Test ===")
    
    agent_id = os.getenv("BAND_AGENT_ID")
    api_key = os.getenv("BAND_API_KEY")
    
    if not agent_id or "_aqui" in agent_id:
        print("[ERROR] BAND_AGENT_ID is not configured in .env.")
        return
        
    if not api_key or "_aqui" in api_key:
        print("[ERROR] BAND_API_KEY is not configured in .env.")
        return

    print(f"[INFO] Initializing agent with ID: {agent_id[:6]}...{agent_id[-4:]}")
    
    try:
        # Create the agent using the simple adapter
        agent = Agent.create(
            adapter=TestAdapter(),
            agent_id=agent_id,
            api_key=api_key
        )
        
        # Start the agent (checks credentials and connects websocket)
        print("[INFO] Starting agent...")
        await agent.start()
        print("[OK] Band.ai: Agent connected successfully!")
        
        # Keep running for 5 seconds to verify connection stability
        print("[INFO] Waiting 5 seconds to verify connection stability...")
        await asyncio.sleep(5)
        
        # Stop the agent
        print("[INFO] Stopping agent...")
        await agent.stop()
        print("[OK] Band.ai: Agent stopped successfully!")
        
    except Exception as e:
        print(f"[ERROR] Connection failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
