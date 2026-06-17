import asyncio
import os
from dotenv import load_dotenv
from thenvoi_rest import AsyncRestClient
from thenvoi_rest.types.chat_room_request import ChatRoomRequest
from thenvoi_rest.types.participant_request import ParticipantRequest

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

agent_ids = {
    "Requirements Analyst": os.getenv("REQUIREMENTS_ANALYST_ID"),
    "Transit Planner": os.getenv("TRANSIT_PLANNER_ID"),
    "Accommodation Scout": os.getenv("ACCOMMODATION_SCOUT_ID"),
    "Financial Auditor": os.getenv("FINANCIAL_AUDITOR_ID")
}

async def main():
    api_key = os.getenv("BAND_API_KEY")
    client = AsyncRestClient(api_key=api_key)
    
    print("Creating a new travel logistics chatroom...")
    try:
        # Create chatroom
        req = ChatRoomRequest()
        res = await client.agent_api_chats.create_agent_chat(chat=req)
        room_id = res.data.chat_room.id
        print(f"Success! Chatroom created with ID: {room_id}")
        
        # Add all 4 agents as members
        for name, aid in agent_ids.items():
            if not aid:
                print(f"Skipping {name} (no ID found in .env)")
                continue
            print(f"Adding agent '{name}' ({aid}) to the room...")
            try:
                part_req = ParticipantRequest(participant_id=aid, role="member")
                await client.agent_api_participants.add_agent_chat_participant(
                    chat_id=room_id,
                    participant=part_req
                )
                print(f"Agent '{name}' added successfully.")
            except Exception as e:
                print(f"Failed to add '{name}': {str(e)}")
                
        print(f"\nAll set! Test Room ID is: {room_id}")
        print("You can use this Room ID to run test messages or stream logs on the dashboard.")
        
    except Exception as e:
        print(f"Failed to create chatroom: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
