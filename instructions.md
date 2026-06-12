# System Instructions for AI Copilot - Band of Agents Hackathon

## 1. Project Context
* **Project Name:** Corporate Logistics & Relocation Orchestrator
* **Hackathon:** Band of Agents (lablab.ai)
* **Track:** Track 1 (Internal Enterprise Workflows)
* **Goal:** Build a multi-agent system that coordinates complex corporate travel, optimizing flights, accommodations, and financial compliance using the Band SDK as the core collaboration layer.
* **Developer Profile:** Solo developer, strong focus on UI/UX, presentation, and orchestrating API logic rather than building complex backend algorithms from scratch.

## 2. Tech Stack & Environment
* **Frontend/Backend Framework:** Next.js (App Router) using React.
* **Styling:** Tailwind CSS (focus on clean, premium, and highly visual components).
* **Core Agent Communication:** Band SDK.
* **LLM Providers (Partner APIs):**
  * **Featherless AI (Open-source models):** Used for fast, low-cost entity extraction and text-to-JSON formatting.
  * **AI/ML API:** Used for deep reasoning, decision-making, and financial evaluation.
* **Deployment:** Vercel.

## 3. Multi-Agent Architecture
The system consists of 4 distinct agents communicating strictly through Band:

1. **Requirements Analyst (Ingesta):**
   * *Engine:* Featherless AI.
   * *Role:* Parses natural language from the user into a structured JSON (dates, cities, purpose). Passes data to the Band room.
2. **Transit Planner (Movilidad):**
   * *Engine:* AI/ML API.
   * *Role:* Receives the JSON via Band. Simulates flight/transit routes optimizing for time. Returns structured transit proposals.
3. **Accommodation Scout (Alojamiento):**
   * *Engine:* AI/ML API.
   * *Role:* Receives destination cities via Band. Proposes lodging options based on corporate proximity standards.
4. **Financial Auditor (Cumplimiento):**
   * *Engine:* AI/ML API.
   * *Role:* The final decision-maker. Evaluates total costs from Transit and Accommodation agents against a mock budget. Approves the itinerary or sends a rejection message through Band demanding cheaper alternatives.

## 4. UI/UX Directives for Copilot
* The interface MUST visibly demonstrate the agents collaborating.
* **Layout Structure:**
  * **Left Panel (Orchestration Console):** A real-time chat/log view showing the structured JSON and messages passing between the 4 agents via Band.
  * **Right Panel (Visual Output):** A dynamic dashboard (timeline, cards, or map) that renders the approved flights and hotels as the agents reach a consensus.

## 5. Development Rules for Copilot
* **Rule 1:** Prioritize the integration of the Band SDK. Do not build custom communication layers; rely entirely on Band for agent-to-agent state and context sharing.
* **Rule 2:** Generate clean, modern Next.js boilerplate. Use server actions and API routes efficiently.
* **Rule 3:** When writing prompt logic for the agents, ensure they are strictly constrained to output JSON or specific structured formats expected by the next agent in the pipeline.
* **Rule 4:** Keep the codebase modular. Separate agent logic, Band connection logic, and UI compo
