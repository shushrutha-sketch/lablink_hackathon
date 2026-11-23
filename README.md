# LabLink 🔬
### Modern GenAI-Powered Campus Laboratory Resource-Sharing Platform with Explainable Fair-Share Allocation & Visual Hardware Explorer

LabLink transforms university laboratory access from chaotic, ad-hoc approvals and siloed equipment into a transparent, campus-wide shared infrastructure. Students discover advanced instruments across electrical, computer science, mechanical, and robotics departments, extract research requirements using AI, view verified hardware photographs and live availability, and submit reservations. When competing requests collide on high-demand instruments, LabLink's deterministic Fair-Share Allocation Engine ranks requests transparently, explains decisions, and proposes concrete alternatives for remaining applicants.

---

## 🌟 Key Architecture & Principles

1. **Deterministic Core, AI at the Edges**:
   - Google Gemini 2.5 Flash powers conversational assistant capabilities and natural-language requirement extraction.
   - Core mathematical rankings, urgency calculations, slot generation, and transactional concurrency are 100% deterministic, transparent, and reproducible.
2. **Works With or Without AI (`DEMO_FORCE_BASIC=true` Ready)**:
   - If a Gemini API key is provided, Gemini powers requirements extraction and natural-language narrative generation.
   - If no key is present or on rate limits, an intelligent keyword NLP fallback engine immediately takes over. The UI clearly labels the engine as **Gemini 2.5** or **Deterministic Rules**.
3. **Visual Equipment Explorer**:
   - 14 verified university laboratory hardware items with real photographs, 4:3 cards, specifications, live availability, department filtering, and fallback icons.
4. **Strict Zero-Double-Booking Guarantee**:
   - Approved requests consume equipment unit capacity inside atomic database transactions (`db.transaction`).
   - Slot states: `Free`, `Contested` (pending requests exist), `Booked` (units full), `Past` or `Closed`.
5. **LabLink Copilot with Grounding Guard**:
   - Conversational assistant with 9 read-only role-gated tools.
   - Grounding guard ensures equipment and times are grounded in database truth.
   - Strict safety invariant: Copilot prepares booking proposals, but never commits bookings autonomously—an explicit student confirmation is required.
6. **Project-to-Prototype Matchmaker & Smart Substitution**:
   - Converts natural-language ideas into structured Prototype Plans (Must/Nice requirements, coverage %, parts to bring).
   - Smart substitution engine computes compatibility scores ($60C + 25P + 15F$), limitation differences, and nearest free slots.
7. **One-Click Demo Persona Switcher**:
   - Instant switching between students with varying fairness history, faculty from different departments, and lab administrators without password re-entry.

---

## 📐 Explainable Fair-Share Allocation Formula (Part III Revision 3)

When two or more students submit overlapping reservation requests for equipment with limited units, the Fair Allocation Engine computes a transparent 100-point priority score:

$$\text{Priority Score} = \text{Urgency (40 pts)} + \text{Suitability (25 pts)} + \text{Fairness (25 pts)} + \text{Efficiency (10 pts)} = 100\text{ pts}$$

- **Deadline Urgency (40 points max)**:
  $$U = 40 \times \max\left(0, 1 - \frac{\min(\text{daysToDeadline}, 14)}{14}\right)$$
  - $\le 0\text{ days} \to 40\text{ pts}$, $7\text{ days} \to 20\text{ pts}$, $\ge 14\text{ days} \to 0\text{ pts}$.
- **Resource Suitability (25 points max)**:
  - Must-have requirements weighted $2.0\times$, Nice-to-have weighted $1.0\times$. Full match $= 1.0$, Partial $= 0.5$, None $= 0.0$.
- **Equitable Fairness (25 points max)**:
  - Usage (20 pts): $20 \times \max\left(0, 1 - \min(\text{approvedHoursLast30Days}, 12) / 12\right)$
  - Wait time (5 pts): $5 \times \min(\text{daysWaiting}, 5) / 5$
- **Session Efficiency (10 points max)**:
  - Linear scaling between minimum and maximum session limits: $10 \times (1 - (\text{duration} - \min) / (\max - \min))$.

### Deterministic Tie-Breaker Chain
1. Higher Total Score
2. Higher Urgency Score
3. Lower recent approved hours (30-day fairness)
4. Earlier `created_at` timestamp
5. Lower request ID

### Mandatory Faculty Override Reason
The Fair Allocation Engine's ranking is advisory—faculty retain final authority. However, if a faculty reviewer approves a non-recommended request (an override), a mandatory justification reason is enforced by the API.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript (strict), Tailwind CSS, Lucide Icons, React Router 7, TanStack Query |
| **Backend** | Node 20/24, Express, TypeScript (`tsx`), CORS, Helmet, Cookie-Parser, JWT, Zod, Multer |
| **Database** | SQLite via Node built-in `node:sqlite` (`DatabaseSync` synchronous transactions, WAL mode) |
| **GenAI** | `@google/genai` (official Google Gen AI SDK) with deterministic keyword NLP fallback |
| **Testing** | Vitest, Supertest (40 automated tests passing) |

---

## 🚀 Quickstart & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env` in the `server` directory (or copy from `.env.example`):
```env
PORT=3001
JWT_SECRET=lablink-production-jwt-secret-key-2026
CLIENT_URL=http://localhost:5173
NODE_ENV=development
DEMO_MODE=true
DEMO_PASSWORD=password123
DEMO_FORCE_BASIC=false
# GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Seed Database & Verify Images
```bash
# Seed 3 departments, 14 equipment items, 15 capabilities, 6 demo personas, and 24 bookings
npm run seed

# Verify all 14 hardware photographs against manifest
npm run check:images
```

### 4. Run Automated Test Suite
```bash
npm test
```
*Runs 40 automated tests across scoringService, equipment explorer, booking validation, fair allocation, project matchmaker, smart substitution, and copilot.*

### 5. Start Development Server
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`
- Health check: `http://localhost:3001/api/health`

---

## 👥 Demo Personas (One-Click Switcher)

All accounts use the password: `password123`

| Persona | Role | Department | Demonstration Scenario |
|---|---|---|---|
| **Asha Sharma** (`asha@campus.edu`) | Student | ECE | Urgent deadline (2 days away), 0 past hours $\to$ #1 Ranked Candidate |
| **Ravi Patel** (`ravi@campus.edu`) | Student | ECE | Moderate deadline (6 days away), 4 past hours $\to$ #2 Ranked Candidate |
| **Meera Reddy** (`meera@campus.edu`) | Student | ECE | Distant deadline (12 days away), 8 past hours $\to$ #3 Ranked Candidate |
| **Dr. K. Rao** (`dr.rao@campus.edu`) | Faculty | ECE | Reviews competing ECE requests, evaluates fair ranking, executes approval |
| **Prof. Vikram Sen** (`prof.sen@campus.edu`) | Faculty | ME | Reviews Mechanical engineering equipment and robotics requests |
| **Chief Elena Rostova** (`admin@campus.edu`) | Admin | Campus Wide | Governs all 14 assets, views 30-day utilisation analytics & status toggles |

---

## 🎬 6-Minute Demonstration Walkthrough Script

### Minute 1: Visual Equipment Explorer
1. Login as **Asha Sharma** (or click persona switcher).
2. Navigate to **Catalog** (`/discover`).
3. View real 4:3 photographs of all 14 verified university resources.
4. Filter by department (**ECE**, **ME**, **CSE**) and category (**Electronics**, **IoT**, **Robotics**, **Computing**).
5. Toggle **Available Now Only** to view instant live instrument availability.
6. Click into the **Digital Storage Oscilloscope 100MHz 4-Channel** (`/equipment/dso-100mhz-4ch`) to inspect full technical specifications, laboratory location, verified capabilities, and 30-minute slot grid.

### Minute 2: LabLink Copilot
1. Click the floating violet **LabLink Copilot** launcher in the bottom right corner.
2. Ask: *"Is an oscilloscope available tomorrow?"*
   - Copilot checks database schedule, respects 09:00 - 17:00 lab hours, and returns an **Availability Card** with free time slots.
3. Ask: *"What can I use instead of the 100MHz scope?"*
   - Copilot calls `find_substitutes`, returns a **Substitutes Card** showing the Handheld 50MHz Oscilloscope with an 85% compatibility score and limitation chips.
4. Ask: *"Help me book the oscilloscope tomorrow at 10:00"*.
   - Copilot prepares an **Explicit Booking Proposal Card**.
   - Note the safety invariant: Copilot cannot book directly. Click **Confirm Reservation** to submit.

### Minute 3: Project-to-Prototype Matchmaker
1. Navigate to **AI Assistant** (`/assistant`).
2. Select sample prompt: *"I want to build a smart agriculture IoT node with ESP32, capacitive soil moisture sensor, and WiFi cloud dashboard."*
3. Click **Generate Prototype Plan**.
4. View extracted:
   - **1-Sentence Project Summary**
   - **Hardware Coverage Percentage** (e.g. 100%)
   - **Must-Have Capabilities** (`microcontroller-programming`, `wifi-iot`)
   - **Nice-To-Have Capabilities** (`sensor-interfacing`)
   - **External Parts to Bring Yourself** (Breadboard, capacitive soil moisture probe, USB-C cable)
   - **Ranked Equipment Recommendations** with 4:3 photographs and 1-click **Book with Plan** button.

### Minute 4: Smart Equipment Substitution
1. View the **Handheld Oscilloscope** as a substitute for the **DSO 100MHz**.
2. Notice the mathematically computed compatibility score ($60C + 25P + 15F = 85\%$).
3. Review the specification difference table:
   - Bandwidth: 100 MHz $\to$ 50 MHz ($-50\text{ MHz}$)
   - Channels: 4 channels $\to$ 2 channels ($-2\text{ ch}$)
4. Notice the mandatory student acknowledgement checkbox when requesting a substitute.

### Minute 5: Faculty Review & Fair Allocation Conflict Resolution
1. Use the persona switcher in the top right to switch to **Dr. K. Rao** (Faculty).
2. Navigate to **Review Queue** (`/review`).
3. Click on the contested request cluster for the **Digital Storage Oscilloscope 100MHz**.
4. View the **Resource Contention Detected** banner (3 students competing for 1 unit).
5. Inspect the **Explainable Fair Allocation Ranking Table**:
   - **#1 Asha Sharma**: Score 82.86 (Deadline in 2 days, 0 past hours $\to$ Recommended Winner)
   - **#2 Ravi Patel**: Score 54.29 (Deadline in 6 days, 4 past hours $\to$ Offer Alternative)
   - **#3 Meera Reddy**: Score 34.29 (Deadline in 12 days, 8 past hours $\to$ Offer Alternative)
6. Test Faculty Override: Attempt to approve Ravi (#2) without a comment $\to$ System blocks approval and enforces a mandatory override justification!
7. Add an override reason: *"Approved due to urgent paper presentation deadline confirmed with supervisor."* $\to$ Approval succeeds transactionally.

### Minute 6: Laboratory Administration & Utilisation Analytics
1. Switch persona to **Chief Elena Rostova** (Admin).
2. Navigate to **Administration** (`/admin`).
3. Review the **30-Day Empirical Utilisation Metrics**:
   - Total Equipment: 14 items
   - Active Count: 14 active, 0 maintenance
   - Average Utilisation: 38%
4. Inspect the **Underutilised Equipment (<20%)** alert card with actionable resource-sharing recommendations.
5. Inspect the **Oversubscribed Equipment (>70% or multiple conflicts)** alert card.
6. Toggle an equipment item's status from `Active` to `Maintenance` $\to$ Instant update reflected in the database and audit logs.

---

## 🔒 Security & Quality Standards

- **Grounding Guard**: Ensures AI responses only mention verified database equipment and operating hours.
- **Role-Based Access Control (RBAC)**: Strict role gating on Student, Faculty, and Admin endpoints.
- **Anti-Overbooking Transaction**: Enforced at the SQLite transaction level (`BEGIN TRANSACTION` / `COMMIT`), preventing double-bookings.
- **Self-Hosted Typography**: Self-hosted Sora and Inter fonts with zero external CDN dependencies.
- **Verified Photograph Manifest**: All 14 equipment photographs verified with `npm run check:images`.
- **40 Automated Tests**: Vitest + Supertest testing scoring, booking, substitution, and copilot flows.
