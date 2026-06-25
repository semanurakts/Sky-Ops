```text
SKYOPS/
├── .vscode/                 # VS Code workspace configuration settings
├── images/                  # Static images used in the project
│   └── bulten.jpeg          # Background image used on the login page
├── node_modules/            # Project dependencies installed via npm
├── .gitignore               # Directories to be excluded from Git version control
├── .prettierignore          # Files exempted from code formatter rules
├── arsiv.html / .js         # Cold Archive module (flights older than 30 days)
├── bilet.html / .js         # Dynamic boarding pass page
├── db.json                  # JSON Server main data repository
├── index.html               # Admin portal Dashboard page
├── login.html / .js         # User login portal (Admin & Passenger)
├── package.json / -lock     # Dependency configurations and npm scripts
├── personel.html / .js      # Crew planning and fatigue score module
├── raporlar.html / .js      # Graphical analysis and PDF report generation module
├── script.js                # Dashboard business logic (KPI, charts, synchronization)
├── style.css                # Global CSS rules shared across all pages
├── ucus.html / .js          # Operational flight CRUD and status update processes
└── yolcu.html / .js         # Passenger flight search, seat selection, and ticketing interface




User Action
      ↓
JavaScript Business Logic (Validation + Data Preparation)
      ↓
Fetch API → HTTP Request (GET / POST / PATCH / DELETE)
      ↓
JSON Server → db.json file is read/written
      ↓
JSON Response → Returns to JavaScript
      ↓
DOM Update → User interface is updated in real-time
```
