import os
import json
import logging
from band import Agent
from band.core.simple_adapter import SimpleAdapter
from utils import get_aiml_client, extract_json
from preprocessor import CustomPreprocessor

logger = logging.getLogger("FinancialAuditor")
logging.basicConfig(level=logging.INFO)

class FinancialAuditorAdapter(SimpleAdapter):
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
            
        # Trigger condition: Transit proposed, Lodging proposed, Audit pending
        transit_state = state.get("transit", {})
        lodging_state = state.get("lodging", {})
        audit_state = state.get("audit", {})
        
        if (transit_state.get("status") != "proposed" or 
            lodging_state.get("status") != "proposed" or 
            audit_state.get("status") != "pending"):
            return
            
        logger.info("Financial Auditor triggered. Auditing travel plans...")
        await tools.send_message("📊 Financial Auditor: Reviewing cost aggregation and compliance rules...")
        
        client = get_aiml_client()
        model_name = "gpt-4o-mini"
        
        system_prompt = (
            "You are the Financial Auditor agent for a corporate travel multi-agent system.\n"
            "Your task is to audit the proposed transit and lodging costs against the user's corporate budget.\n"
            "Budget is in state.request.budget.\n"
            "Total proposed cost is transit.total_cost + lodging.total_cost.\n\n"
            "Decide on the audit result:\n"
            "1. If Total Cost <= Budget: Set audit.status = 'approved'. Add a professional approval comment.\n"
            "2. If Total Cost > Budget: Set audit.status = 'rejected'. Add a comment explaining the budget excess and set specific target budgets/caps for Transit and Lodging (e.g. 'Transit budget capped at X, Lodging budget capped at Y') to force the planning agents to find cheaper alternatives.\n"
            "   IMPORTANT: If rejected, you MUST reset both transit and lodging status back to 'pending', clear their options, selected_option_id, and total_cost to trigger the planning loop again.\n\n"
            "You must output the COMPLETE updated JSON payload. Maintain the structure exactly:\n"
            "{\n"
            "  \"request\": { ... },\n"
            "  \"transit\": { ... },\n"
            "  \"lodging\": { ... },\n"
            "  \"audit\": {\n"
            "    \"status\": \"approved\" or \"rejected\",\n"
            "    \"total_estimated_cost\": 0.0,\n"
            "    \"comments\": \"...\"\n"
            "  }\n"
            "}\n"
            "Output MUST be the raw JSON only, no markdown formatting."
        )
        
        user_message = f"Current travel state:\n{json.dumps(state, indent=2)}"
        
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.1
            )
            
            response_text = response.choices[0].message.content
            logger.info(f"LLM Response: {response_text}")
            updated_state = extract_json(response_text)
            
            # Send updated JSON to the room
            await tools.send_message(json.dumps(updated_state, indent=2))
            
            # Send a user-friendly summary text message
            new_audit = updated_state.get("audit", {})
            status = new_audit.get("status")
            comments = new_audit.get("comments", "")
            total = new_audit.get("total_estimated_cost", 0.0)
            
            if status == "approved":
                await tools.send_message(f"✅ Audit Approved! Total Cost: ${total} USD. Comments: {comments}")
            else:
                await tools.send_message(f"❌ Audit Rejected! Comments: {comments}. Re-initiating search with budget caps...")
                
        except Exception as e:
            logger.error(f"Error in Financial Auditor: {e}")
            await tools.send_message(f"❌ Financial Auditor Error: {str(e)}")

def get_agent():
    agent_id = os.getenv("BAND_AGENT_ID")
    api_key = os.getenv("BAND_API_KEY")
    return Agent.create(
        adapter=FinancialAuditorAdapter(),
        agent_id=agent_id,
        api_key=api_key,
        preprocessor=CustomPreprocessor()
    )

if __name__ == "__main__":
    import asyncio
    async def test():
        agent = get_agent()
        print("Starting Financial Auditor Agent...")
        await agent.run()
    asyncio.run(test())
