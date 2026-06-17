import inspect
from thenvoi_rest import AsyncRestClient

async_client = AsyncRestClient(api_key="dummy")

print("agent_api_messages properties:")
for name, obj in inspect.getmembers(async_client.agent_api_messages):
    if not name.startswith("_"):
        print(f"  {name}: {type(obj)}")
        try:
            print(f"    Signature: {inspect.signature(obj)}")
        except:
            pass

print("\nagent_api_context properties:")
for name, obj in inspect.getmembers(async_client.agent_api_context):
    if not name.startswith("_"):
        print(f"  {name}: {type(obj)}")
        try:
            print(f"    Signature: {inspect.signature(obj)}")
        except:
            pass
