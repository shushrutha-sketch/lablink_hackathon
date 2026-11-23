# LabLink 🔬
### Modern AI-Powered Campus Laboratory Resource-Sharing Platform with Explainable Fair-Share Allocation

LabLink transforms university laboratory access from chaotic, ad-hoc approvals and siloed equipment into a transparent, campus-wide shared infrastructure. Students discover advanced instruments across electrical, computer science, mechanical, and biomedical departments, extract research requirements using AI, and submit reservations. When competing requests collide on high-demand instruments, LabLink's deterministic Fair-Share Allocation Engine ranks requests transparently and proposes concrete alternatives for remaining applicants.

---

## 🌟 Key Architecture & Principles

1. **Deterministic Core, AI at the Edges**:
   - Gemini understands student project descriptions and explains decisions.
   - Core mathematical rankings, urgency calculations, slot generation, and transactional concurrency are 100% deterministic, transparent, and reproducible.
2. **Works With or Without AI (Demo-Safe Reliability)**:
   - If an API key is provided, Gemini 2.5 Flash powers requirements extraction and natural-language narrative generation.
   - If no key is present or on rate limits, an intelligent keyword NLP fallback engine immediately takes over. The UI clearly labels the engine as **AI (Gemini)** or **Basic matching (Keyword Fallback)**.
3. **Strict Zero-Double-Booking Guarantee**:
   - Approved requests consume equipment unit capacity inside atomic database transactions (`db.transaction`).
   - Slot states: `Free`, `Contested` (pending requests exist), `Booked` (units full), `Past` or `Closed`.
4. **Campus-Local ISO Time Standard**:
   - All dates and times are stored as campus-local ISO strings (`YYYY-MM-DDTHH:mm`), eliminating time zone skew across browsers and server.
5. **One-Click Demo Persona Switcher**:
   - Instant switching between students with varying fairness history, faculty from different departments, and lab administrators without password re-entry.

---

## 📐 Explainable Fair-Share Allocation Formula

When two or more students submit overlapping reservation requests for equipment with limited units, the Fair Allocation Engine computes a transparent 100-point priority score:

$$\text{Priority Score} = 0.35 \times \text{Urgency} + 0.30 \times \text{Suitability} + 0.20 \times \text{Fairness} + 0.15 \times \text{Efficiency}$$

- **Urgency (35%)**: Proximity of student's academic submission deadline to requested reservation date ($\le 1\text{ day} \to 100$, $\le 2\text{ days} \to 95$, $\le 4\text{ days} \to 85$, $\dots$).
- **Suitability (30%)**: Jaccard overlap between extracted capability tags and instrument specifications.
- **Fairness (20%)**: Gives top priority to historically underserved students (evaluated from approved hours in past 30 days: $0\text{ hours} \to 100$, $1-2\text{ hours} \to 90$, $\dots$, $\ge 15\text{ hours} \to 15$).
- **Efficiency (15%)**: Evaluates whether session duration fits equipment constraints and minimizes fragmentation.

Faculty reviewers view the complete factor breakdown alongside concrete alternatives (open alternative slots on the same machine and compatible cross-departmental instruments).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript (strict), Tailwind CSS, Lucide Icons, React Router 7, TanStack Query |
| **Backend** | Node 20/24, Express, TypeScript (`tsx`), CORS, Helmet, Cookie-Parser, JWT, Zod |
| **Database** | SQLite via Node built-in `node:sqlite` (zero C++ compilation issues, synchronous transactions, WAL mode) |
| **GenAI** | `@google/genai` (official Google Gen AI SDK) with deterministic keyword NLP fallback |
| **Testing** | Vitest, Supertest (16 comprehensive tests) |

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v20+ or v24+)
- npm (v10+)

### 2. Install Dependencies
```bash
npm install
npm --prefix server install
npm --prefix client install
```

### 3. Seed Database
Seeds 4 departments, 20 specialized instruments, 6 demo personas, 25 historical approved reservations (30-day realism), and upcoming contested requests:
```bash
npm run seed
```

### 4. Run Development Servers
Runs both Express backend (port 5000) and Vite frontend (port 3000) concurrently:
```bash
npm run dev
```

Visit **http://localhost:3000** in your browser.

### 5. Run Test Suite
```bash
npm test
```

---

## 👥 Demo Personas (1-Click Switchable)

| Persona | Role | Department | Hackathon Demo Purpose |
|---|---|---|---|
| **Alex Chen** | Student | ECE | High past usage (8 hrs). Competing applicant for H100 GPU node. |
| **Maya Patel** | Student | CSE | Urgent thesis deadline (2 days) & low past usage (2 hrs). Recommended winner in H100 conflict. |
| **Jordan Taylor** | Student | MECH | Brand new student with 0 past hours. Receives top fairness ranking (100). |
| **Dr. Sarah Lin** | Faculty | ECE | Department review queue for ECE oscilloscopes, SMUs, and RF spectrum analyzers. |
| **Prof. James Miller** | Faculty | CSE | Department review queue for GPU clusters and robotics systems. |
| **Chief Elena Rostova** | Admin | Campus Core | Full oversight: 30-day utilisation analytics, underutilised assets, status control. |

---

## 📱 Feature Tour

1. **Equipment Discovery (`/discover`)**:
   - Filter by department (ECE, CSE, MECH, BIO), category, and free-text search.
   - Cards show unit capacity, location, specs, and real-time availability.

2. **AI Project Assistant (`/assistant`)**:
   - Natural language description input with sample project prompts.
   - Extracts technical capabilities, suggested categories, and optimal session duration.
   - Clear badge: `AI Powered (Gemini)` or `Basic Matching (Keyword Fallback)`.
   - Ranked matching equipment with match percentage.
   - "Use this equipment" 1-click action pre-fills booking form.

3. **Intelligent Booking (`/equipment/:id`)**:
   - Date picker and 30-minute accessible `<button>` grid (09:00 to 17:00).
   - Clear slot states: `Free`, `Contested`, `Booked`, `Past`, `Closed`.

4. **Faculty Review Cockpit (`/review/:id`)**:
   - Competing requests side-by-side comparison table.
   - Four-pillar score breakdown (Urgency, Suitability, Fairness, Efficiency).
   - Plain-language explanation narrative.
   - Automated alternatives (alternative slots & cross-departmental equipment).
   - 1-click Approve (atomic transaction), Reject, or Request Modifications with comment.

5. **Utilisation & Admin Governance (`/admin`)**:
   - 30-day booked minutes over open operating minutes.
   - Underutilised alerts (<20%) with actionable campus sharing recommendations.
   - Over-subscribed alerts with capacity guidance.
   - 1-click equipment status toggle (`active` $\leftrightarrow$ `maintenance`).
