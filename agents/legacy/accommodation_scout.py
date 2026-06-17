import os
import json
import logging
from band import Agent
from band.core.simple_adapter import SimpleAdapter
from utils import get_aiml_client, extract_json
from preprocessor import CustomPreprocessor

logger = logging.getLogger("AccommodationScout")
logging.basicConfig(level=logging.INFO)

class AccommodationScoutAdapter(SimpleAdapter):
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
        content = msg.content.strip()
        
        # We only trigger on valid JSON state payload
        if not (content.startswith("{") and '"request"' in content):
            return
            
        try:
            state = json.loads(content)
        except json.JSONDecodeError:
            return
            
        # Sequential trigger: Transit must be proposed, Lodging must be pending
        transit_state = state.get("transit", {})
        lodging_state = state.get("lodging", {})
        
        if transit_state.get("status") != "proposed" or lodging_state.get("status") != "pending":
            return
            
        logger.info("Accommodation Scout triggered. Simulating lodging options...")
        await tools.send_message("🏨 Accommodation Scout: Searching for compliant hotel options near corporate zones...")
        
        client = get_aiml_client()
        model_name = "gpt-4o-mini"
        
        # Format conversation logs for context
        history_logs = []
        for h_msg in (history.raw if history else []):
            sender = h_msg.get("sender_name") or h_msg.get("role") or "Unknown"
            history_logs.append(f"[{sender}]: {h_msg.get('content')}")
            
        history_context = "\n".join(history_logs[-15:])  # Last 15 messages
        
        system_prompt = (
            "You are the Accommodation Scout agent for a corporate travel multi-agent system.\n"
            "Your task is to propose lodging/hotel options based on the request and transit details.\n"
            "If there is history of a rejection from the Financial Auditor, pay CLOSE attention to their budget constraints.\n"
            "Propose 2-3 hotel options. Select one as the optimal option (set selected_option_id).\n"
            "Provide realistic names of hotels (e.g. Hilton, Marriott, Sheraton, or boutique options in the destination city),\n"
            "cost per night in USD, and calculate total_cost = cost_per_night * number of nights.\n"
            "Number of nights is the number of days between start_date and end_date.\n\n"
            "Update the 'lodging' block in the state JSON. Do not touch the 'request', 'transit', or 'audit' blocks.\n"
            "Set lodging.status to 'proposed'.\n"
            "Set lodging.total_cost to the calculated total cost of the selected hotel.\n\n"
            "You must output the COMPLETE updated JSON payload. Maintain the structure exactly:\n"
            "{\n"
            "  \"request\": { ... },\n"
            "  \"transit\": { ... },\n"
            "  \"lodging\": {\n"
            "    \"status\": \"proposed\",\n"
            "    \"options\": [\n"
            "      { \"id\": \"hotel-1\", \"name\": \"...\", \"cost_per_night\": 0.0, \"nights\": 0, \"total_cost\": 0.0, \"details\": \"...\" }\n"
            "    ],\n"
            "    \"selected_option_id\": \"hotel-1\",\n"
            "    \"total_cost\": 0.0,\n"
            "    \"error_message\": \"\"\n"
            "  },\n"
            "  \"audit\": { ... }\n"
            "}\n"
            "Output MUST be the raw JSON only, no markdown formatting."
        )
        
        user_message = (
            f"Current chat history/feedback:\n{history_context}\n\n"
            f"Current travel state:\n{json.dumps(state, indent=2)}"
        )
        
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.2
            )
            
            response_text = response.choices[0].message.content
            logger.info(f"LLM Response: {response_text}")
            updated_state = extract_json(response_text)
            
            # Send updated JSON to the room
            await tools.send_message(json.dumps(updated_state, indent=2))
            
        except Exception as e:
            logger.error(f"Error in Accommodation Scout: {e}")
            await tools.send_message(f"❌ Accommodation Scout Error: {str(e)}")

def get_agent():
    agent_id = os.getenv("BAND_AGENT_ID")
    api_key = os.getenv("BAND_API_KEY")
    return Agent.create(
        adapter=AccommodationScoutAdapter(),
        agent_id=agent_id,
        api_key=api_key,
        preprocessor=CustomPreprocessor()
    )

if __name__ == "__main__":
    import asyncio
    async def test():
        agent = get_agent()
        print("Starting Accommodation Scout Agent...")
        await agent.run()
    asyncio.run(test())
