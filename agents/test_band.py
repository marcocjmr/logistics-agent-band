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
        # Send a reply back to the room mentioning the sender
        sender = msg.sender_name if msg.sender_name else "marcoxc01"
        await tools.send_message(f"Echo from TestAgent: {msg.content}", mentions=[sender])

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
        
        # Run the agent until interrupted (Ctrl+C)
        print("[OK] Band.ai: Agent running. Press Ctrl+C to stop.")
        await agent.run()
        
    except Exception as e:
        print(f"[ERROR] Connection failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
