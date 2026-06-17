import inspect
from thenvoi_rest.types.agent_register_request import AgentRegisterRequest

print("AgentRegisterRequest parameters/fields:")
sig = inspect.signature(AgentRegisterRequest.__init__)
print(f"Signature: {sig}")
