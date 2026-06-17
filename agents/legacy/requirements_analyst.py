import os
import json
import logging
from band import Agent
from band.core.simple_adapter import SimpleAdapter
from utils import get_featherless_client, extract_json, create_initial_state
from preprocessor import CustomPreprocessor

logger = logging.getLogger("RequirementsAnalyst")
logging.basicConfig(level=logging.INFO)

class RequirementsAnalystAdapter(SimpleAdapter):
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
        
        # Avoid processing if this is already a JSON state payload
        if content.startswith("{") and '"request"' in content:
            logger.info("Ignoring JSON payload message.")
            return

        # It's a natural language request! Let's process it.
        logger.info(f"Processing user query: {content}")
        
        # Notify the room we are analyzing the requirements
        await tools.send_message("🔍 Analyst: Parsing your request and extracting travel parameters...")
        
        client = get_featherless_client()
        model_name = "meta-llama/Llama-3.1-8B-Instruct"
        
        system_prompt = (
            "You are the Requirements Analyst agent for a corporate travel multi-agent system.\n"
            "Your task is to parse the user's natural language travel request and extract the following parameters:\n"
            "1. Destination (City and Country/State if possible)\n"
            "2. Start Date (YYYY-MM-DD format)\n"
            "3. End Date (YYYY-MM-DD format)\n"
            "4. Budget (Numeric float, default to 2000.0 if not specified or not clear)\n"
            "5. Purpose (Purpose of travel, e.g., conference, meeting, team building)\n\n"
            "Note: The current date is 2026-06-14. Resolve relative dates relative to 2026-06-14.\n\n"
            "Output MUST be a single raw JSON object matching this schema:\n"
            "{\n"
            "  \"destination\": \"...\",\n"
            "  \"start_date\": \"...\",\n"
            "  \"end_date\": \"...\",\n"
            "  \"budget\": 0.0,\n"
            "  \"purpose\": \"...\"\n"
            "}\n"
            "Do not output any markdown code blocks, conversational text or explanation. Only return the raw JSON."
        )
        
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Extract details from this request:\n\n{content}"}
                ],
                temperature=0.1
            )
            
            response_text = response.choices[0].message.content
            logger.info(f"LLM Raw Response: {response_text}")
            parsed_data = extract_json(response_text)
            
            # Create the initial system state
            initial_state = create_initial_state(
                user_query=content,
                destination=parsed_data.get("destination", "Unknown"),
                start_date=parsed_data.get("start_date", "2026-06-15"),
                end_date=parsed_data.get("end_date", "2026-06-20"),
                budget=parsed_data.get("budget", 2000.0),
                purpose=parsed_data.get("purpose", "business")
            )
            
            # Send the initial state JSON to the room
            json_payload = json.dumps(initial_state, indent=2)
            logger.info("Requirements Analysts is posting initial state JSON.")
            await tools.send_message(json_payload)
            
        except Exception as e:
            logger.error(f"Error processing requirements: {e}")
            await tools.send_message(f"❌ Ingestion Error: Failed to parse travel request details. Details: {str(e)}")

def get_agent():
    agent_id = os.getenv("BAND_AGENT_ID")
    api_key = os.getenv("BAND_API_KEY")
    return Agent.create(
        adapter=RequirementsAnalystAdapter(),
        agent_id=agent_id,
        api_key=api_key,
        preprocessor=CustomPreprocessor()
    )

if __name__ == "__main__":
    import asyncio
    async def test():
        agent = get_agent()
        print("Starting Requirements Analyst Agent...")
        await agent.run()
    asyncio.run(test())
