import os
import json
import logging
import urllib.request
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from dotenv import load_dotenv

from utils import (
    get_featherless_client, 
    get_aiml_client, 
    extract_json, 
    create_initial_state, 
    save_local_message
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("SwarmOrchestrator")

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

class SwarmOrchestrator:
    def __init__(self):
        self.api_key = os.getenv("BAND_API_KEY")
        self.room_id = os.getenv("BAND_ROOM_ID")
        self.user_id = os.getenv("REQUIREMENTS_ANALYST_ID")
        self.model_featherless = "Qwen/Qwen2.5-7B-Instruct"
        self.model_aiml = "gpt-4o-mini"
        self.max_loops = 15

    def post_to_band(self, content):
        if not self.api_key or not self.room_id:
            logger.warning("Band API key or Room ID not configured. Skipping post.")
            return
            
        url = f"https://app.band.ai/api/v1/agent/chats/{self.room_id}/messages"
        payload = {
            "message": {
                "content": content,
                "mentions": [{"id": self.user_id}] if self.user_id else []
            }
        }
        
        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                pass
        except Exception as e:
            logger.error(f"Error posting message to Band room: {e}")

    def run_swarm_loop(self, user_query):
        logger.info(f"Starting swarm loop for query: {user_query}")
        
        # --- STEP 1: REQUIREMENTS ANALYST (Ingestion) ---
        logger.info("[Ingestion] Triggered.")
        msg_status = "🔍 Requirements Analyst: Extracting parameters from your request..."
        save_local_message("Requirements Analyst", "Agent", msg_status)
        self.post_to_band(msg_status)
        
        client_featherless = get_featherless_client()
        
        system_prompt_ingest = (
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
            response = client_featherless.chat.completions.create(
                model=self.model_featherless,
                messages=[
                    {"role": "system", "content": system_prompt_ingest},
                    {"role": "user", "content": f"Extract details from this request:\n\n{user_query}"}
                ],
                temperature=0.1
            )
            response_text = response.choices[0].message.content
            logger.info(f"[Ingestion] Response: {response_text}")
            parsed_data = extract_json(response_text)
            
            state = create_initial_state(
                user_query=user_query,
                destination=parsed_data.get("destination", "Unknown"),
                start_date=parsed_data.get("start_date", "2026-06-15"),
                end_date=parsed_data.get("end_date", "2026-06-20"),
                budget=parsed_data.get("budget", 2000.0),
                purpose=parsed_data.get("purpose", "business")
            )
            
            save_local_message("Requirements Analyst", "Agent", json.dumps(state, indent=2))
            self.post_to_band(json.dumps(state, indent=2))
        except Exception as e:
            logger.error(f"[Ingestion] Error: {e}")
            err_msg = f"❌ Ingestion Error: Failed to parse travel request. Details: {str(e)}"
            save_local_message("Requirements Analyst", "Agent", err_msg)
            self.post_to_band(err_msg)
            return

        # Swarm Loop for Planning
        client_aiml = get_aiml_client()
        
        loop_count = 0
        history_logs = []
        
        while loop_count < self.max_loops:
            loop_count += 1
            logger.info(f"Swarm Planning Iteration {loop_count}")
            
            transit_status = state.get("transit", {}).get("status")
            lodging_status = state.get("lodging", {}).get("status")
            
            # --- STEP 2: TRANSIT PLANNER ---
            if transit_status == "pending":
                logger.info("[Transit Planner] Triggered.")
                msg_status = "✈️ Transit Planner: Generating flight and route proposals..."
                save_local_message("Transit Planner", "Agent", msg_status)
                self.post_to_band(msg_status)
                
                history_context = "\n".join(history_logs[-15:])
                system_prompt_transit = (
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
                    response = client_aiml.chat.completions.create(
                        model=self.model_aiml,
                        messages=[
                            {"role": "system", "content": system_prompt_transit},
                            {"role": "user", "content": user_message}
                        ],
                        temperature=0.2
                    )
                    response_text = response.choices[0].message.content
                    logger.info(f"[Transit Planner] Response: {response_text}")
                    state = extract_json(response_text)
                    
                    save_local_message("Transit Planner", "Agent", json.dumps(state, indent=2))
                    self.post_to_band(json.dumps(state, indent=2))
                    history_logs.append(f"[Transit Planner]: Proposed flights.")
                except Exception as e:
                    logger.error(f"[Transit Planner] Error: {e}")
                    err_msg = f"❌ Transit Planner Error: {str(e)}"
                    save_local_message("Transit Planner", "Agent", err_msg)
                    self.post_to_band(err_msg)
                    return
                    
            # --- STEP 3: ACCOMMODATION SCOUT ---
            elif transit_status == "proposed" and lodging_status == "pending":
                logger.info("[Accommodation Scout] Triggered.")
                msg_status = "🏨 Accommodation Scout: Searching for compliant hotel options near corporate zones..."
                save_local_message("Accommodation Scout", "Agent", msg_status)
                self.post_to_band(msg_status)
                
                history_context = "\n".join(history_logs[-15:])
                system_prompt_lodging = (
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
                    response = client_aiml.chat.completions.create(
                        model=self.model_aiml,
                        messages=[
                            {"role": "system", "content": system_prompt_lodging},
                            {"role": "user", "content": user_message}
                        ],
                        temperature=0.2
                    )
                    response_text = response.choices[0].message.content
                    logger.info(f"[Accommodation Scout] Response: {response_text}")
                    state = extract_json(response_text)
                    
                    save_local_message("Accommodation Scout", "Agent", json.dumps(state, indent=2))
                    self.post_to_band(json.dumps(state, indent=2))
                    history_logs.append(f"[Accommodation Scout]: Proposed hotels.")
                except Exception as e:
                    logger.error(f"[Accommodation Scout] Error: {e}")
                    err_msg = f"❌ Accommodation Scout Error: {str(e)}"
                    save_local_message("Accommodation Scout", "Agent", err_msg)
                    self.post_to_band(err_msg)
                    return
    
            # --- STEP 4: FINANCIAL AUDITOR ---
            elif transit_status == "proposed" and lodging_status == "proposed":
                logger.info("[Financial Auditor] Triggered.")
                msg_status = "📊 Financial Auditor: Reviewing cost aggregation and compliance rules..."
                save_local_message("Financial Auditor", "Agent", msg_status)
                self.post_to_band(msg_status)
                
                system_prompt_audit = (
                    "You are the Financial Auditor agent for a corporate travel multi-agent system.\n"
                    "Your task is to audit the proposed transit and lodging costs against the user's corporate budget.\n"
                    "Budget is in state.request.budget.\n"
                    "Total proposed cost is transit.total_cost + lodging.total_cost.\n\n"
                    "Step 1: Read the Budget (request.budget) and calculate the Total Cost (transit.total_cost + lodging.total_cost).\n"
                    "Step 2: Do NOT reject if Total Cost is LESS THAN OR EQUAL TO the Budget. Only reject if Total Cost is strictly greater than the Budget.\n"
                    "Step 3: Decide on the audit result:\n"
                    "   - If Total Cost <= Budget: Set audit.status = 'approved'. Add a professional approval comment including the final total cost.\n"
                    "     IMPORTANT: If approved, you MUST leave the transit and lodging options, status ('proposed'), selected_option_id, and total_cost EXACTLY as they are in the input. Do NOT clear or reset them when approved.\n"
                    "   - If Total Cost > Budget: Set audit.status = 'rejected'. Add a comment explaining the budget excess and set specific target budgets/caps for Transit and Lodging (e.g. 'Transit budget capped at X, Lodging budget capped at Y') to force the planning agents to find cheaper alternatives.\n"
                    "     IMPORTANT: If rejected, you MUST reset both transit and lodging status back to 'pending', clear their options, selected_option_id, and total_cost to trigger the planning loop again.\n\n"
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
                
                # Reset audit block in python state before sending to LLM to prevent LLM from copying previous rejection values
                state["audit"] = {
                    "status": "pending",
                    "total_estimated_cost": 0.0,
                    "comments": ""
                }
                
                user_message = f"Current travel state:\n{json.dumps(state, indent=2)}"
                
                try:
                    response = client_aiml.chat.completions.create(
                        model=self.model_aiml,
                        messages=[
                            {"role": "system", "content": system_prompt_audit},
                            {"role": "user", "content": user_message}
                        ],
                        temperature=0.1
                    )
                    response_text = response.choices[0].message.content
                    logger.info(f"[Financial Auditor] Response: {response_text}")
                    state = extract_json(response_text)
                    
                    save_local_message("Financial Auditor", "Agent", json.dumps(state, indent=2))
                    self.post_to_band(json.dumps(state, indent=2))
                    
                    new_audit = state.get("audit", {})
                    status = new_audit.get("status")
                    comments = new_audit.get("comments", "")
                    total = new_audit.get("total_estimated_cost", 0.0)
                    
                    if status == "approved":
                        audit_msg = f"✅ Financial Auditor: Travel plan approved. Total Cost: ${total} USD. Comments: {comments}"
                        save_local_message("Financial Auditor", "Agent", audit_msg)
                        self.post_to_band(audit_msg)
                        logger.info("Plan Approved! Swarm finished.")
                        break
                    else:
                        audit_msg = f"❌ Financial Auditor: Travel plan rejected. Total Cost: ${total} USD. Comments: {comments}. Re-initiating search with budget caps..."
                        save_local_message("Financial Auditor", "Agent", audit_msg)
                        self.post_to_band(audit_msg)
                        history_logs.append(f"[Financial Auditor]: Rejected plan. comments={comments}")
                except Exception as e:
                    logger.error(f"[Financial Auditor] Error: {e}")
                    err_msg = f"❌ Financial Auditor Error: {str(e)}"
                    save_local_message("Financial Auditor", "Agent", err_msg)
                    self.post_to_band(err_msg)
                    return
            else:
                logger.warning("No matching state condition. Breaking swarm loop to avoid infinite loop.")
                break

class TriggerHandler(BaseHTTPRequestHandler):
    orchestrator = None

    def do_POST(self):
        if self.path == "/trigger":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            user_query = data.get("content", "")
            
            if self.orchestrator:
                # Run the swarm loop in a separate background thread
                threading.Thread(
                    target=self.orchestrator.run_swarm_loop, 
                    args=(user_query,), 
                    daemon=True
                ).start()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def start_server():
    orchestrator = SwarmOrchestrator()
    TriggerHandler.orchestrator = orchestrator
    
    server_address = ('', 5001)
    httpd = HTTPServer(server_address, TriggerHandler)
    logger.info("Local Swarm Trigger Server running on port 5001...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server shutting down...")
        httpd.server_close()

if __name__ == "__main__":
    start_server()
