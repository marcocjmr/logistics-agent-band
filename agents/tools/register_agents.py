import asyncio
import os
from dotenv import load_dotenv
from thenvoi_rest import AsyncRestClient
from thenvoi_rest.types.agent_register_request import AgentRegisterRequest

load_dotenv()

agents_to_register = [
    {"name": "Requirements Analyst", "description": "Corporate Logistics Requirements Ingestion Analyst"},
    {"name": "Transit Planner", "description": "Corporate Logistics Transit & Route Planner"},
    {"name": "Accommodation Scout", "description": "Corporate Logistics Accommodation Scout"},
    {"name": "Financial Auditor", "description": "Corporate Logistics Financial Auditor"},
]

async def main():
    api_key = os.getenv("BAND_API_KEY")
    client = AsyncRestClient(api_key=api_key)
    
    # First, list current agents to see if we already registered them
    print("Checking current agents...")
    try:
        res = await client.human_api_agents.list_my_agents()
        existing_agents = {a.name: a.id for a in res.data}
        print(f"Currently registered agents: {existing_agents}")
    except Exception as e:
        print(f"Failed to list agents: {str(e)}")
        return

    registered_ids = {}
    for agent_info in agents_to_register:
        name = agent_info["name"]
        desc = agent_info["description"]
        
        if name in existing_agents:
            print(f"Agent '{name}' already exists with ID: {existing_agents[name]}")
            registered_ids[name] = existing_agents[name]
        else:
            print(f"Registering agent '{name}'...")
            try:
                req = AgentRegisterRequest(name=name, description=desc)
                res_reg = await client.human_api_agents.register_my_agent(agent=req)
                agent_id = res_reg.data.agent.id
                print(f"Success! Agent '{name}' registered with ID: {agent_id}")
                registered_ids[name] = agent_id
            except Exception as e:
                print(f"Failed to register '{name}': {str(e)}")

    print("\nAll agent IDs:")
    for name, aid in registered_ids.items():
        print(f"{name.upper().replace(' ', '_')}_ID={aid}")

if __name__ == "__main__":
    asyncio.run(main())
