# Agents Module

This directory contains the logic, tools, and configurations for the four corporate logistics and relocation agents collaborating via Band.ai.

## Architecture

1. **Requirements Analyst (Ingestion)**
   - Role: Parses unstructured natural language input from the user.
   - Output: Structured JSON containing dates, cities, and travel requirements.
   - Provider: Featherless AI.

2. **Transit Planner (Mobility)**
   - Role: Simulates flight routes and optimizes travel schedules.
   - Output: Route recommendations and cost estimates.
   - Provider: AI/ML API.

3. **Accommodation Scout (Lodging)**
   - Role: Selects lodging options based on proximity standards and corporate policies.
   - Output: Lodging proposals and cost estimates.
   - Provider: AI/ML API.

4. **Financial Auditor (Compliance)**
   - Role: Reviews aggregated transit and lodging costs against mock corporate budgets.
   - Output: Approval decision or structured rejection request for cheaper options.
   - Provider: AI/ML API.

## Setup Instructions

To be finalized based on runtime language selection (Node.js or Python).
