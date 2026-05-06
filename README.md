# ROP Renewal Risk Dashboard — Starter Repo

This is the starter repo for the Jr. Full Stack Engineer take-home test.

**Please see docs/SPEC.md for project instructions.**

## Submission Details

## 1. Docker Confirmation

`docker-compose up --build` has been verified and works correctly. All services (Frontend, Backend, Database, and Mock RMS) start up and communicate as expected.

- **Database:** PostgreSQL initializes with seed data on port `5432`.
- **Backend:** Express API accessible on `http://localhost:3003`.
- **Frontend:** React/Vite dashboard accessible on `http://localhost:5173`.
- **Mock RMS:** Webhook service accessible on `http://localhost:3001`.

### 2. How to Use

1.  **Navigate to the Dashboard:** Open [http://localhost:5173](http://localhost:5173) and click on "Park Meadows Apartments".
2.  **Calculate Risk:** Click the **"Calculate Risk Scores"** button at the top right. This triggers the backend scoring engine and saves results to the database.
3.  **Analyze Results:**
    - **Filter:** Use the "Filter by Risk" dropdown to narrow down residents by High, Medium, or Low risk.
    - **Expand Details:** Click on any resident's row to "drop down" the detailed **Risk Signal Breakdown**. This shows exactly why a resident received their score (Days to Expiry, Payment History, Renewal Offer Status, and Rent vs. Market).
4.  **Trigger Renewal Event:** Click the **"Trigger RMS"** button in any row to send the risk data to the Mock RMS service. A "✓ Sent" indicator will confirm success.

## 3. Technical Implementation Details

### **Backend: Risk Scoring**

- **Single-Trip SQL Logic:** Instead of performing an "N+1" query pattern (fetching residents and then looping to check individual delinquency or pricing), I implemented a single, highly optimized SQL query using `JOIN`, `EXISTS`, and `COALESCE`. This minimizes database round-trips and ensures the 0-100 score is calculated on fresh data.
- **Postgres Date Arithmetic:** Leveraged native Postgres date subtraction (`DATE - DATE`) for the "Days to Expiry" signal to ensure precision. This resolved an initial `500 Internal Server Error` caused by attempting to use `EXTRACT(EPOCH)` on simple integer differences.
- **Atomic Transactions:** Wrapped the `renewal_risk_scores` inserts in a transaction block (`BEGIN`/`COMMIT`) to maintain data integrity.

### **Frontend: Residents' Dashboard**

- **State Management:** Managed loading, error, and partial success states (per-row RMS triggers) using React hooks.
- **Navigation:** Added a back-navigation link to the main properties list to resolve a "dead-end" UX issue in the starter repo.
- **UX Features:** Implemented expandable rows to provide transparency into the "why" behind each score, showing the specific signals (Days To Expiry, Payment History, Renewal Offer, Rent vs. Market) that contributed to the risk tier.

### 4. Decisions & Assumptions

- **Database Transactions:** In the backend, I used a database transaction to ensure that the batch calculation and saving of risk scores are atomic. If any insert fails, none of the results are committed.
- **Real-time Response:** The `calculate` endpoint both calculates/saves and returns the full dataset immediately. This simplifies the frontend logic by avoiding a separate GET call after calculation.
- **UX/UI Priority:** For the "Nice to Have" features, I focused on making the risk signals visually distinct (color-coding badges) within the expanded row to help property managers quickly digest the "why" behind a score.

* **Event Propagation:** Implemented `e.stopPropagation()` on action buttons to prevent the row from expanding/collapsing when clicking "Trigger RMS".
* **Modular Architecture:** Divided the `RenewalRiskPage.tsx` into a modular structure. Created a `components/renewal-risk/` directory to house sub-components.

### 5. Improvements with More Time

- **Batch Triggering:** Add a feature to trigger renewal events for all "High Risk" residents at once.
- **Historical Tracking:** Add a chart or "trend" indicator to show if a resident's risk score is increasing or decreasing over time based on previous calculations.
- **Pagination:** Although the current dataset is small, I would implement server-side pagination for properties with hundreds of residents.
- **Robust Error Handling:** Add more granular error messages on the frontend.
- **Modular Architecture & Refactoring:** I would move the scoring logic into a dedicated service layer on the backend and extract the dashboard's sub-components (e.g., `RiskTableRow`, `RiskSignalBreakdown`) into separate files. This would improve readability and make the codebase easier for a team to maintain.
- **Unit & Integration Testing:** I would implement a testing suite using Vitest. Specifically, I’d add unit tests for the scoring formula to ensure edge cases (like score capping at 100) are handled, and integration tests to prevent regression bugs when new features are being developed.

## 6. AI-Assisted Development

This project was developed using a collaborative AI workflow involving **Gemini CLI** and **Gemini 3 Pro**.

- **Gemini CLI Contributions:**
  - **Feature Implementation:** Provided the implementation for the "Nice to Have" frontend features, including the Filter by Risk Tier and the Expandable Signal Breakdown Rows.
  - **Frontend Modularization:** Refactored the monolithic `RenewalRiskPage.tsx` into a modular structure. Created a `components/renewal-risk/` directory to house sub-components (`RiskTable`, `ResidentRow`, etc.), which reduced the main page size from 500+ lines to under 200 lines and improved code reusability.
  - **Documentation:** Created the initial draft for the README documentation and submission structure to ensure all rubric requirements were addressed.

- **Gemini 3 Pro Contributions:**
  - **Backend & SQL Logic:** Architected the high-performance SQL query for risk signals, ensuring strict adherence to the weighted formula and compounding interaction bonuses in a single database trip.
  - **Frontend Logic:** Built the core `RenewalRiskPage` React component from scratch, including state management for calculations, error handling, and the Bonus Task (RMS integration).
  - **Bug Resolution:** Diagnosed a PostgreSQL date extraction error and provided the fix using native date subtraction.

- **Human Refinement:** Verified all risk calculation mathematical formulas against the business spec and ensured the Tailwind styling remained functional, clear, and professional.

---

### **Time Log**

Started at 9:30 AM CST and finished at 11:30 AM CST

- **Schema & Spec Review:** 15 minutes
- **Backend Development (API & SQL Logic):** 30 minutes
- **Frontend Development (Dashboard & UI Logic):** 45 minutes
- **Feature Polish (Filtering, Sorting, Nav):** 15 minutes
- **Documentation & Final Testing:** 15 minutes
- **Total Time:** **2 Hours**

### **Extra Time Log**

I was given extra time for cleaning the code and making it more modular.<br><br>
Started at 11:45 AM CST

- **Frontend Development Component Refactor:** 15 minutes

- **Total Time:** **Not known yet**

## Quick Start

```bash
docker-compose up --build
```

This starts four services:

| Service      | URL                   | Description                       |
| ------------ | --------------------- | --------------------------------- |
| **Frontend** | http://localhost:5173 | React app (your dashboard)        |
| **Backend**  | http://localhost:3003 | Express API                       |
| **Database** | localhost:5432        | PostgreSQL (user: rop, pass: rop) |
| **Mock RMS** | http://localhost:3001 | Receives webhook POSTs (bonus)    |

## Verify It Works

After `docker-compose up`, check:

1. **Backend health:** http://localhost:3003/api/health — should return `{ "status": "ok" }`
2. **Frontend:** http://localhost:5173 — should show the property list with "Park Meadows Apartments"
3. **Click the property** to navigate to the Renewal Risk Dashboard page (your workspace)

## What's Provided

### Database (fully set up — do not modify the schema)

- `db/init.sql` — Creates all tables (properties, units, residents, leases, ledger, renewal offers, renewal risk scores)
- `db/seed.sql` — Seeds 1 property, 15 units, 12 residents with varied risk scenarios

### Backend (`backend/`)

- Express + TypeScript server running on port 3003
- Database connection configured (`src/db.ts`)
- Health check endpoint (`GET /api/health`)
- Properties list endpoint (`GET /api/v1/properties`)
- **TODO:** Implement `POST /api/v1/properties/:propertyId/renewal-risk/calculate`

### Frontend (`frontend/`)

- React + TypeScript + Tailwind CSS
- Routing configured (React Router)
- Home page lists properties with links to their dashboards
- **TODO:** Build the dashboard at `src/pages/RenewalRiskPage.tsx`

### Mock RMS (`mock-rms/`)

- Simple Node.js server that accepts POST to `/webhook`
- Logs received payloads to the console
- Available at `http://mock-rms:3001/webhook` from within Docker (or `http://localhost:3001/webhook` from your machine)
- Used for the bonus "Trigger Renewal Event" feature

## Environment Variables

The backend has these pre-configured in `docker-compose.yml`:

| Variable       | Value                            |
| -------------- | -------------------------------- |
| `DATABASE_URL` | `postgres://rop:rop@db:5432/rop` |
| `PORT`         | `3003`                           |
| `MOCK_RMS_URL` | `http://mock-rms:3001/webhook`   |

## Seed Data Scenarios

The seed data includes 12 residents with different risk profiles:

| Resident        | Unit | Days to Expiry | Delinquent | Renewal Offer  | Rent Gap | Expected Risk |
| --------------- | ---- | -------------- | ---------- | -------------- | -------- | ------------- |
| Jane Doe        | 101  | 30             | No         | No             | 20%      | **High**      |
| Marcus Chen     | 102  | 45             | Yes        | No             | 5%       | **High**      |
| Sarah Kim       | 103  | 75             | No         | No             | ~3%      | **Medium**    |
| David Rodriguez | 104  | 120            | Yes        | Yes            | ~5%      | **Medium**    |
| Alice Johnson   | 201  | 200            | No         | Yes            | ~3%      | **Low**       |
| Bob Williams    | 202  | 250            | No         | Yes (accepted) | ~2%      | **Low**       |
| Priya Patel     | 105  | 60             | Yes        | Yes            | 12%      | **Medium**    |
| Tom Baker       | 106  | 20             | Yes        | No             | 15%      | **High**      |
| Lisa Tran       | 107  | 190            | No         | Yes            | ~2%      | **Low**       |
| Mike Brown      | 108  | 90             | No         | No             | ~3%      | **Medium**    |
| Emma Wilson     | 203  | 300            | No         | Yes (accepted) | ~2%      | **Low**       |
| Carlos Mendez   | 109  | 55             | No         | No             | ~7%      | **Medium**    |

## Project Structure

```
starter-repo/
├── docker-compose.yml          # Starts all services
├── db/
│   ├── init.sql                # Schema (DO NOT modify)
│   └── seed.sql                # Test data
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            # Express app — add your routes here
│       └── db.ts               # Database connection (ready to use)
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts          # Proxies /api to backend
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx            # Router setup (done)
│       ├── App.tsx             # Property list page (done)
│       └── pages/
│           └── RenewalRiskPage.tsx  # YOUR WORKSPACE — build here
├── mock-rms/
│   ├── Dockerfile
│   └── server.js               # Logs webhook payloads (for bonus)
└── README.md
```

## Useful Commands

```bash
# Start everything
docker-compose up --build

# Rebuild after changes (if hot-reload isn't picking up)
docker-compose up --build backend frontend

# Connect to the database directly
docker-compose exec db psql -U rop -d rop

# View mock RMS logs (for bonus webhook task)
docker-compose logs -f mock-rms

# Tear down and reset (removes data)
docker-compose down -v
```

## Tips

- The frontend proxies `/api` requests to the backend, so you can use relative URLs like `fetch("/api/v1/properties/...")` in your React code
- The `pool` export from `backend/src/db.ts` is ready to use for queries
- Don't spend more than 15 minutes on styling — functional beats pretty
- If something is ambiguous, make a decision and document it in your README

Good luck.
