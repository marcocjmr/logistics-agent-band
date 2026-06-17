import asyncio
import os
from dotenv import load_dotenv
from thenvoi_rest import AsyncRestClient
from thenvoi_rest.types.agent_register_request import AgentRegisterRequest

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

agents_to_register = [
    {"name": "Requirements Analyst", "description": "Corporate Logistics Requirements Ingestion Analyst", "env_prefix": "REQUIREMENTS_ANALYST"},
    {"name": "Transit Planner", "description": "Corporate Logistics Transit & Route Planner", "env_prefix": "TRANSIT_PLANNER"},
    {"name": "Accommodation Scout", "description": "Corporate Logistics Accommodation Scout", "env_prefix": "ACCOMMODATION_SCOUT"},
    {"name": "Financial Auditor", "description": "Corporate Logistics Financial Auditor", "env_prefix": "FINANCIAL_AUDITOR"},
]

async def main():
    api_key = os.getenv("BAND_API_KEY")
    client = AsyncRestClient(api_key=api_key)
    
    # 1. List current agents
    print("Checking current agents...")
    try:
        res = await client.human_api_agents.list_my_agents()
        existing_agents = {a.name: a.id for a in res.data}
        print(f"Currently registered agents: {existing_agents}")
    except Exception as e:
        print(f"Failed to list agents: {str(e)}")
        return

    # 2. Delete existing agents with the matching names to start fresh
    for agent_info in agents_to_register:
        name = agent_info["name"]
        if name in existing_agents:
            aid = existing_agents[name]
            print(f"Deleting existing agent '{name}' ({aid})...")
            try:
                await client.human_api_agents.delete_my_agent(id=aid, force=True)
                print(f"Deleted '{name}'.")
            except Exception as e:
                print(f"Failed to delete '{name}': {str(e)}")

    # 3. Register fresh agents and grab both ID and API Key!
    env_lines = []
    for agent_info in agents_to_register:
        name = agent_info["name"]
        desc = agent_info["description"]
        prefix = agent_info["env_prefix"]
        
        print(f"Registering fresh agent '{name}'...")
        try:
            req = AgentRegisterRequest(name=name, description=desc)
            res_reg = await client.human_api_agents.register_my_agent(agent=req)
            
            agent_id = res_reg.data.agent.id
            agent_key = res_reg.data.credentials.api_key
            
            print(f"Success! Agent '{name}' registered.")
            print(f"  ID: {agent_id}")
            print(f"  Key: {agent_key[:10]}...{agent_key[-5:]}")
            
            env_lines.append(f"{prefix}_ID={agent_id}")
            env_lines.append(f"{prefix}_API_KEY={agent_key}")
        except Exception as e:
            print(f"Failed to register '{name}': {str(e)}")

    print("\n--- Copy these environment lines to your .env file ---")
    for line in env_lines:
        print(line)

if __name__ == "__main__":
    asyncio.run(main())
