# Agents Module

This directory contains the Python multi-agent system coordinating Corporate Logistics & Relocation.

## Directory Structure

* **`run_agents.py`**: Launcher script that initializes the orchestrator and starts the trigger server.
* **`swarm_orchestrator.py`**: Core class-based orchestrator (`SwarmOrchestrator`) that manages the multi-agent logic, sequential LLM invocation, and the local HTTP trigger handler on port `5001`.
* **`orchestrator.py`**: WebSocket-based Band adapter that runs the multi-agent loop over a Band.ai channel.
* **`utils.py` / `preprocessor.py`**: Helper scripts for LLM client configurations, regex parsing, and custom message pre-processing.
* **`tools/`**: Helper utilities for room management, inspecting rooms, listing peers, registering agents, and setup on the Band platform.
* **`legacy/`**: Standalone agent scripts (`transit_planner.py`, `accommodation_scout.py`, etc.) and test files.

## Swarm Agents & Models

1. **Requirements Analyst (Ingestion)**
   * **Role:** Parses unstructured natural language input from the user.
   * **Provider:** Featherless AI (`Qwen/Qwen2.5-7B-Instruct`).
2. **Transit Planner (Mobility)**
   * **Role:** Simulates flight routes and optimizes travel schedules.
   * **Provider:** AI/ML API (`gpt-4o-mini`).
3. **Accommodation Scout (Lodging)**
   * **Role:** Proposes corporate hotel options.
   * **Provider:** AI/ML API (`gpt-4o-mini`).
4. **Financial Auditor (Compliance)**
   * **Role:** Reviews aggregated costs against mock budgets, triggering re-planning loops if exceeded.
   * **Provider:** AI/ML API (`gpt-4o-mini`).
