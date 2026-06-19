```
graph LR
    UserQuery[User Request] --> Ingestion[Requirements Analyst <br/> Qwen-2.5 via Featherless AI]
    Ingestion --> StateInit[Initialize JSON State]
    StateInit --> Transit[Transit Planner <br/> GPT-4o-mini via AI/ML API]
    Transit --> Lodging[Accommodation Scout <br/> GPT-4o-mini via AI/ML API]
    Lodging --> Auditor{Financial Auditor <br/> GPT-4o-mini via AI/ML API}
    Auditor -- "Total Cost <= Budget" --> Approved[Approved & Saved]
    Auditor -- "Total Cost > Budget" --> Rejected[Rejected: Calculate & Apply Budget Caps]
    Rejected --> StatePending[Reset State & Feed Back Caps]
    StatePending --> Transit
```
