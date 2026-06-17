# Corporate Logistics & Relocation Orchestrator

This project is a multi-agent corporate travel planning system developed for the **Band of Agents Hackathon (lablab.ai)** under Track 1 (Internal Enterprise Workflows). It automates the ingestion, routing, lodging search, and compliance auditing of business trips using the **Band SDK** as the collaboration layer, combined with **Featherless AI** and **AI/ML API**.

---

## 🚀 System Architecture & Agent Roles

The system coordinates four autonomous agents to plan and audit corporate travel without human intervention:

1. **Requirements Analyst (Ingestion)**
   * **Engine:** `Qwen/Qwen2.5-7B-Instruct` via Featherless AI (serverless open-source models).
   * **Role:** Parses unstructured natural language requests from the user, extracts key parameters (destination, dates, budget, purpose), and formats them into a structured JSON state.
2. **Transit Planner**
   * **Engine:** `gpt-4o-mini` via AI/ML API.
   * **Role:** Evaluates flight options to the destination and selects the most efficient route, updating the transit block of the JSON state.
3. **Accommodation Scout**
   * **Engine:** `gpt-4o-mini` via AI/ML API.
   * **Role:** Simulates and proposes corporate-compliant hotel options near workspace zones, calculating total accommodation costs.
4. **Financial Auditor**
   * **Engine:** `gpt-4o-mini` via AI/ML API.
   * **Role:** Evaluates the aggregate cost against the travel budget. If approved, it locks the proposed plan. If rejected, it applies budget caps, resets transit/lodging states back to pending, and triggers a cheap-planning loop.

---

## 🎨 Dual-Panel Frontend Dashboard

Built with **Next.js (App Router)** and **Tailwind CSS**, the dashboard is designed to make agent collaboration visible:

* **Left Panel (Orchestration Console):** Streams live agent communication logs and highlights the consensuated JSON payload passing between the agents in real-time.
* **Right Panel (Itinerary Consensuator):** Displays a visual timeline of the consensuated flights, accommodation cards, budget breakdown graphs, and the auditor's evaluation status.

---

## 🔄 State Sync & Band Integration

To bypass API limitations (such as rate limits, outbound message visibility filters, and self-mention errors), the system uses a **Double-Synchronization Layer**:
1. **Band.ai Integration:** The orchestrator posts real-time progress and structured JSON states directly to the Band room using HTTP POST requests (formatted with standard user-agent headers to bypass Cloudflare protection).
2. **Local Dashboard Sync:** Agent logs and intermediate state updates are written to a shared `shared_messages.json` file, which the Next.js frontend polls. This ensures high-performance rendering of the dual panels.

---

## 🛠️ Installation & Setup

### 1. Prerequisites
* **Python** (v3.9 or higher)
* **Node.js** (v18 or higher) and npm

### 2. Environment Configuration
Copy `.env.example` in the root folder to `.env`:
```bash
cp .env.example .env
```
Fill in your API keys:
* `BAND_API_KEY`, `BAND_AGENT_ID`, `BAND_ROOM_ID` (and agent IDs/handles if applicable).
* `AIML_API_KEY` (for Transit, Lodging, and Auditor).
* `FEATHERLESS_API_KEY` (for Requirements Analyst).

### 3. Start the Local Swarm Orchestrator
Initialize the Python virtual environment and run the trigger server:
```bash
cd agents
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run_agents.py
```
*The trigger server runs locally on port `5001`.*

### 4. Start the Frontend Dashboard
Install frontend dependencies and launch the Next.js development server:
```bash
cd frontend
npm install
npm run dev
```
*The dashboard is available at `http://localhost:3000`.*

---

## 🎯 Verification & Core Loops

The orchestrator supports two core execution loops:

### Scenario A: High Budget (Immediate Approval)
* **Query:** "Necesito viajar a Monterrey del 15 al 20 de julio de 2026 para una conferencia de tecnología. Presupuesto $1500 USD."
* **Consensus:** Flight Selected ($600) + Hotel Selected ($500) = **$1100 USD**. Approved instantly.

### Scenario B: Budget Constraint (Re-planning Loop)
* **Query:** "Necesito viajar a Monterrey del 15 al 20 de julio de 2026 para una conferencia de tecnología. Presupuesto $800 USD."
* **Loop:** First proposal ($1200) rejected by Auditor. Swarm re-planned with budget caps, proposing Aeromexico flight ($400) and Hotel Plaza Monterrey ($350) for a total of **$750 USD**, which was approved on the second audit.
