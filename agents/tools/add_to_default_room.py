import asyncio
import os
from dotenv import load_dotenv
from thenvoi_rest import AsyncRestClient
from thenvoi_rest.types.participant_request import ParticipantRequest

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

room_id = "ef62ae22-69a3-4906-8dca-36cdf0a946f0"
user_id = "1781286707-1601369796"

async def main():
    api_key = os.getenv("BAND_API_KEY")
    client = AsyncRestClient(api_key=api_key)
    
    print(f"Adding user {user_id} to default room: {room_id}...")
    try:
        part_req = ParticipantRequest(participant_id=user_id, role="member")
        await client.agent_api_participants.add_agent_chat_participant(
            chat_id=room_id,
            participant=part_req
        )
        print("User added successfully.")
    except Exception as e:
        print(f"Failed to add user: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
