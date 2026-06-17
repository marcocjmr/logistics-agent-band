import os
import json
import logging
from band import Agent
from band.core.simple_adapter import SimpleAdapter
from utils import get_aiml_client, extract_json
from preprocessor import CustomPreprocessor

logger = logging.getLogger("TransitPlanner")
logging.basicConfig(level=logging.INFO)

class TransitPlannerAdapter(SimpleAdapter):
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
            
        # Check if transit is pending
        transit_state = state.get("transit", {})
        if transit_state.get("status") != "pending":
            logger.info("Transit status is not 'pending'. Skipping.")
            return
            
        logger.info("Transit Planner triggered. Simulating transit options...")
        await tools.send_message("✈️ Transit Planner: Generating flight and route proposals...")
        
        client = get_aiml_client()
        model_name = "gpt-4o-mini"
        
        # Format conversation logs for context (if financial auditor rejected options previously)
        history_logs = []
        for h_msg in (history.raw if history else []):
            sender = h_msg.get("sender_name") or h_msg.get("role") or "Unknown"
            history_logs.append(f"[{sender}]: {h_msg.get('content')}")
            
        history_context = "\n".join(history_logs[-15:])  # Last 15 messages for context
        
        system_prompt = (
            "You are the Transit Planner agent for a corporate travel multi-agent system.\n"
            "Your task is to propose flight or transit options for a business trip based on the request.\n"
            "If there is history of a rejection from the Financial Auditor, pay CLOSE attention to their budget constraints.\n"
            "Propose 2-3 flight options. Select one as the optimal option (set selected_option_id).\n"
            "Provide realistic names of carriers (e.g. Aeromexico, Delta, United, etc.), departure and arrival times, and cost in USD.\n\n"
            "Update the 'transit' block in the state JSON. Do not touch the 'request', 'lodging', or 'audit' blocks.\n"
            "Set transit.status to 'proposed'.\n"
            "Set transit.total_cost to the cost of the selected option.\n\n"
            "You must output the COMPLETE updated JSON payload. Maintain the structure exactly:\n"
            "{\n"
            "  \"request\": { ... },\n"
            "  \"transit\": {\n"
            "    \"status\": \"proposed\",\n"
            "    \"options\": [\n"
            "      { \"id\": \"flight-1\", \"type\": \"flight\", \"carrier\": \"...\", \"origin\": \"...\", \"destination\": \"...\", \"departure_time\": \"...\", \"arrival_time\": \"...\", \"cost\": 0.0, \"details\": \"...\" }\n"
            "    ],\n"
            "    \"selected_option_id\": \"flight-1\",\n"
            "    \"total_cost\": 0.0,\n"
            "    \"error_message\": \"\"\n"
            "  },\n"
            "  \"lodging\": { ... },\n"
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
            logger.error(f"Error in Transit Planner: {e}")
            await tools.send_message(f"❌ Transit Planner Error: {str(e)}")

def get_agent():
    agent_id = os.getenv("BAND_AGENT_ID")
    api_key = os.getenv("BAND_API_KEY")
    return Agent.create(
        adapter=TransitPlannerAdapter(),
        agent_id=agent_id,
        api_key=api_key,
        preprocessor=CustomPreprocessor()
    )

if __name__ == "__main__":
    import asyncio
    async def test():
        agent = get_agent()
        print("Starting Transit Planner Agent...")
        await agent.run()
    asyncio.run(test())
