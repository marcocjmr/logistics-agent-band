import os
import json
import logging
import asyncio
from dotenv import load_dotenv
from band import Agent
from band.core.simple_adapter import SimpleAdapter
from utils import get_featherless_client, get_aiml_client, extract_json, create_initial_state, save_local_message

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("Orchestrator")

class RelocationOrchestratorAdapter(SimpleAdapter):
    async def send_logged_message(self, tools, sender_name, sender_type, content):
        save_local_message(sender_name, sender_type, content)
        await tools.send_message(content)

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
        
        # 1. Determine if this is a user query (natural language) or a JSON state message
        is_json = content.startswith("{") and '"request"' in content
        
        if not is_json:
            # Save user query locally so it registers on the dashboard
            save_local_message("User", "User", content)
            
            # --- ROLE 1: REQUIREMENTS ANALYST (Ingestion) ---
            logger.info(f"[Ingestion] Parsing user query: {content}")
            await self.send_logged_message(tools, "Requirements Analyst", "Agent", "🔍 Requirements Analyst: Extracting parameters from your request...")
            
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
                logger.info(f"[Ingestion] LLM Response: {response_text}")
                parsed_data = extract_json(response_text)
                
                initial_state = create_initial_state(
                    user_query=content,
                    destination=parsed_data.get("destination", "Unknown"),
                    start_date=parsed_data.get("start_date", "2026-06-15"),
                    end_date=parsed_data.get("end_date", "2026-06-20"),
                    budget=parsed_data.get("budget", 2000.0),
                    purpose=parsed_data.get("purpose", "business")
                )
                
                await self.send_logged_message(tools, "Requirements Analyst", "Agent", json.dumps(initial_state, indent=2))
            except Exception as e:
                logger.error(f"[Ingestion] Error: {e}")
                await self.send_logged_message(tools, "Requirements Analyst", "Agent", f"❌ Ingestion Error: Failed to parse travel request. Details: {str(e)}")
            return

        # It's a JSON payload! Let's parse it.
        try:
            state = json.loads(content)
        except json.JSONDecodeError:
            return

        # Get status variables
        transit_status = state.get("transit", {}).get("status")
        lodging_status = state.get("lodging", {}).get("status")
        audit_status = state.get("audit", {}).get("status")

        # --- ROLE 2: TRANSIT PLANNER ---
        if transit_status == "pending":
            logger.info("[Transit Planner] Triggered.")
            await self.send_logged_message(tools, "Transit Planner", "Agent", "✈️ Transit Planner: Generating flight and route proposals...")
            
            client = get_aiml_client()
            model_name = "gpt-4o-mini"
            
            # Format history to look for previous rejections
            history_logs = []
            for h_msg in (history.raw if history else []):
                sender = h_msg.get("sender_name") or h_msg.get("role") or "Unknown"
                history_logs.append(f"[{sender}]: {h_msg.get('content')}")
            history_context = "\n".join(history_logs[-15:])
            
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
                logger.info(f"[Transit Planner] LLM Response: {response_text}")
                updated_state = extract_json(response_text)
                await self.send_logged_message(tools, "Transit Planner", "Agent", json.dumps(updated_state, indent=2))
            except Exception as e:
                logger.error(f"[Transit Planner] Error: {e}")
                await self.send_logged_message(tools, "Transit Planner", "Agent", f"❌ Transit Planner Error: {str(e)}")
            return

        # --- ROLE 3: ACCOMMODATION SCOUT ---
        if transit_status == "proposed" and lodging_status == "pending":
            logger.info("[Accommodation Scout] Triggered.")
            await self.send_logged_message(tools, "Accommodation Scout", "Agent", "🏨 Accommodation Scout: Searching for compliant hotel options near corporate zones...")
            
            client = get_aiml_client()
            model_name = "gpt-4o-mini"
            
            history_logs = []
            for h_msg in (history.raw if history else []):
                sender = h_msg.get("sender_name") or h_msg.get("role") or "Unknown"
                history_logs.append(f"[{sender}]: {h_msg.get('content')}")
            history_context = "\n".join(history_logs[-15:])
            
            system_prompt = (
                "You are the Accommodation Scout agent for a corporate travel multi-agent system.\n"
                "You propose lodging/hotel options based on the request and transit details.\n"
                "If there is history of a rejection from the Financial Auditor, pay CLOSE attention to their budget constraints.\n"
                "Propose 2-3 hotel options. Select one as the optimal option (set selected_option_id).\n"
                "Provide realistic names of hotels, cost per night in USD, and calculate total_cost = cost_per_night * number of nights.\n"
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
                logger.info(f"[Accommodation Scout] LLM Response: {response_text}")
                updated_state = extract_json(response_text)
                await self.send_logged_message(tools, "Accommodation Scout", "Agent", json.dumps(updated_state, indent=2))
            except Exception as e:
                logger.error(f"[Accommodation Scout] Error: {e}")
                await self.send_logged_message(tools, "Accommodation Scout", "Agent", f"❌ Accommodation Scout Error: {str(e)}")
            return

        # --- ROLE 4: FINANCIAL AUDITOR ---
        if transit_status == "proposed" and lodging_status == "proposed" and audit_status == "pending":
            logger.info("[Financial Auditor] Triggered.")
            await self.send_logged_message(tools, "Financial Auditor", "Agent", "📊 Financial Auditor: Reviewing cost aggregation and compliance rules...")
            
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
                "    \"comments\": \"\"\n"
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
                logger.info(f"[Financial Auditor] LLM Response: {response_text}")
                updated_state = extract_json(response_text)
                
                # Post the JSON state
                await self.send_logged_message(tools, "Financial Auditor", "Agent", json.dumps(updated_state, indent=2))
                
                # Post user friendly status text
                new_audit = updated_state.get("audit", {})
                status = new_audit.get("status")
                comments = new_audit.get("comments", "")
                total = new_audit.get("total_estimated_cost", 0.0)
                
                if status == "approved":
                    await self.send_logged_message(tools, "Financial Auditor", "Agent", f"✅ Financial Auditor: Travel plan approved. Total Cost: ${total} USD. Comments: {comments}")
                else:
                    await self.send_logged_message(tools, "Financial Auditor", "Agent", f"❌ Financial Auditor: Travel plan rejected. Total Cost: ${total} USD. Comments: {comments}. Re-initiating search with budget caps...")
            except Exception as e:
                logger.error(f"[Financial Auditor] Error: {e}")
                await self.send_logged_message(tools, "Financial Auditor", "Agent", f"❌ Financial Auditor Error: {str(e)}")
            return

def get_agent():
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))
    agent_id = os.getenv("BAND_AGENT_ID")
    api_key = os.getenv("BAND_API_KEY")
    
    # We use our CustomPreprocessor to allow the agent to receive its own messages
    from preprocessor import CustomPreprocessor
    return Agent.create(
        adapter=RelocationOrchestratorAdapter(),
        agent_id=agent_id,
        api_key=api_key,
        preprocessor=CustomPreprocessor()
    )

if __name__ == "__main__":
    async def main():
        agent = get_agent()
        print("=== Starting Single-Agent Multi-Role Relocation Orchestrator ===")
        print(f"Agent ID: {agent.runtime.agent_id[:6]}...{agent.runtime.agent_id[-4:]}")
        print("Press Ctrl+C to stop.")
        await agent.run()
        
    asyncio.run(main())
