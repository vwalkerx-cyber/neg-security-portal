<div align="center">

# 🛡️ NATIONAL EXECUTIVE GUARD (NEG)
### Personnel & Tactical Operations Command Portal

[![React 19](https://img.shields.io/badge/React-19.2.8-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Realtime-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/Clearance-Restricted%20%2F%20Internal-red?style=for-the-badge&logo=shield)](https://github.com/vwalkerx-cyber/neg-security-portal)

<p align="center">
  <b>A centralized, real-time command, logistics, intelligence, and personnel operations platform.</b><br>
  Engineered to transition the National Executive Guard (NEG) from legacy manual spreadsheets into a high-security, full-stack operational headquarters with Role-Based Access Control (RBAC), WebSocket synchronization, and automated chain-of-custody tracking.
</p>

---

</div>

## 📌 Executive Overview

The **National Executive Guard (NEG) Operations Portal** serves as the unified operational headquarters for close protection personnel, tactical escorts, armory logistics, disciplinary governance, and command hierarchy.

Built on **React 19**, **Vite**, and **Supabase (PostgreSQL 15+ & Realtime WebSockets)**, the portal provides instant bi-directional data synchronization, responsive field logging, audit compliance, and strict clearance-level enforcement.

---

## ⚡ Key Highlights & Enterprise Architecture

* **⚡ Real-Time Operational State**: Instant synchronization across on-duty officers via Supabase Realtime Channels. Shifts, mission dispatches, and armory checkouts reflect instantaneously without manual page refreshes.
* **🔐 Multi-Tier Clearance (RBAC)**: Fine-grained security clearance tiers (`ADMIN / High Command`, `OFFICER`, and `ARMORER`), enforcing strict view permissions, approval gates, and sensitive data masking.
* **📦 Egress-Optimized Architecture**: Equipped with selective WebSocket payload routing, in-memory real-time state hydration, explicit column projection, and an automated HTML5 Canvas client-side image compression engine reducing storage and bandwidth by over **85%**.
* **📁 Comprehensive Audit Trail**: Every record modification, login, weapon issuance, and profile update generates a tamper-evident audit event logged with actor identity, role, timestamp, and IP address.
* **📱 Responsive Tactical UI**: High-contrast, dark-mode glassmorphic command center tailored for low-light command post monitors, tactical tablets, and field mobile devices.

---

## 🎯 Operational Modules

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                     NEG COMMAND & OPERATIONS PORTAL                    │
 ├──────────────────┬──────────────────┬──────────────────┬───────────────┤
 │  HQ COMMAND      │  FIELD & TACTICAL│  LOGISTICS & PAY │  GOVERNANCE   │
 ├──────────────────┼──────────────────┼──────────────────┼───────────────┤
 │ • Executive Dash │ • Daily Presence │ • Armory Vault   │ • Infractions │
 │ • Guard Roster   │ • VIP Convoy Ops │ • Depot Stockpile│ • Reprimands  │
 │ • Command Tree   │ • Tactical Comms │ • Payroll Matrix │ • Resignations│
 │ • User Clearances│ • Duty Schedule  │ • CSV Archival   │ • Reinstatements
 └──────────────────┴──────────────────┴──────────────────┴───────────────┘
```

### 1. 📊 Executive Command Dashboard (`OverviewDashboard`)
* **Real-Time Readiness Metrics**: Active guards currently on duty, open escort operations, deployed weaponry, and total department strength.
* **Live Operational Status**: Instant visibility of active shifts, pending resignation proposals, unaddressed disciplinary notices, and armory balance.
* **Quick Operational Shortcuts**: 1-click access to shift sign-in, mission dispatch, armory checkouts, and personnel induction.

### 2. 👥 Personnel & Guard Directory (`PersonnelView`)
* **Officer Dossiers**: Full service profiles including Badge ID (`NEG-XXX`), military rank, assigned division, join date, license numbers, and contact information.
* **Assigned Vehicle Fleet**: Tracking and assignment of service plates across all fleet vehicles (*Riot Van, Patrol Motorcycle, Mercedes-Benz G500, Hyundai Ioniq 4, Presidential Limousine*).
* **Credential Vault**: Encrypted on-demand storage for Officer ID Cards, Driving Licenses, and Expungement Letters with client-side image downscaling.
* **Status Flags**: Live indicators for `Active`, `Inactive`, and `Disbanded` service statuses.

### 3. 📋 Tactical Duty Log & Presence (`PresenceView`)
* **Automated Shift Classification**: Auto-detection of `Day Shift` (06:00–17:59) and `Night Shift` (18:00–05:59) based on check-in timestamp.
* **Duration Engine**: Accurate duty duration computation in hours and minutes, with full support for overnight shifts spanning past midnight.
* **Mission Auto-Correlation**: Dynamically cross-references active escort assignments during the officer's shift to compile verified escort tallies.
* **Chronological Sorting**: Instant sorting by shift date and time with CSV export capability.

### 4. 🚘 VIP Convoy & High-Threat Escort Operations (`EscortView`)
* **Close Protection Details**: Mission dispatching for government officials, diplomats, high-profile dignitaries, and judges.
* **Threat Classification**: Standardized 4-tier threat levels:
  * 🔴 `Critical (Level 4)` — Maximum security, armored convoy & tactical air support
  * 🟠 `High (Level 3)` — Armored vehicle detail with dedicated sweep units
  * 🟡 `Medium (Level 2)` — Standard motorcade & perimeter security
  * 🟢 `Low (Level 1)` — Discrete security escort
* **Convoy Telemetry**: Vehicle composition, route origins/destinations, lead agent assignment, passenger roster, mission notes, and mission screenshot evidence.

### 5. 🎯 Armory Vault & Custody Chain (`ArmoryView`)
* **Serialized Firearm Custody**: Serial number tracking, ammo issue allotments, weapon condition tracking, assignment logs, and return check-ins (*Sidearms, Carbines, SMGs, Shotguns, Less-Lethal, Armor, Comms*).
* **Depot Logistics & Stockpiles**: Bulk inventory tracking across tactical depot reserves:
  * Ammunition boxes, Tactical First-Aid Medkits, Stun / Flashbang Grenades, Smoke Canisters, and Ceramic Armor Plates.
  * Direct issue and return workflow with instant inventory recount.

### 6. 💵 Salary & Compensation Records (`PayrollView`)
* **Standardized Compensation Matrix**: Base salary tracking by officer rank and deployment frequency.
* **ISO-8601 Week Engine**: Automated calculation of payment periods and standardized financial week numbers.
* **One-Click Financial Export**: Dedicated CSV generation for accounting audits.

### 7. ⚖️ Disciplinary Governance & Infractions (`InfractionPointsView` & `DisciplinaryLettersView`)
* **Infraction Catalog**: Pre-configured penalty schedule categorizing minor, moderate, and severe violations with standardized point deductions.
* **Cumulative Points Registry**: Real-time officer points summary triggering automatic command alerts upon reaching threshold boundaries:
  * **Warning Threshold** → Command counseling session
  * **Critical Threshold** → Formal Letter of Reprimand (SP-1 / SP-2 / SP-3)
  * **Maximum Threshold** → Automatic suspension or rank demotion recommendation
* **Official Letter Generator**: Generates formatted, printable disciplinary notices with custom reference numbers, formal command wording, and officer acknowledgment stamps.

### 8. 📝 Resignation & Separation Proposals (`ResignationProposalsView`)
* **Formal Separation Workflow**: Standardized resignation submissions including stated reasons, effective handover dates, and custody return declarations.
* **High Command Review Pipeline**: Executive review gates (`Under Review`, `Approved`, `Rejected`) preventing unauthorized roster departure without asset check-in.

### 9. 🏛️ Organizational Hierarchy (`HierarchyView`)
* **Visual Chain of Command**: Interactive organizational chart depicting rank progression from Director and Deputy Director through Command Sergeants, Corporals, and Field Officers.
* **Division Segmentation**: Filter personnel by functional unit (*Executive Protection Division, Quick Reaction Force, Logistics & Vault, Training Cadre*).

### 10. 💬 Tactical Live Operations Chat
* **Encrypted Dispatch Comms**: Low-latency tactical messaging for on-duty personnel to broadcast convoy updates, sitreps, and perimeter alerts.
* **Independent Channel Architecture**: Chat operates independently from system audit feeds to prevent channel flooding.

### 11. 🔐 Security Clearance & User Administration (`UserManagementView`)
* **Account Provisioning**: High Command portal to create, activate, disband, or suspend user clearance accounts.
* **Registration Approvals**: Approval queue for incoming recruit registration petitions with badge ID and division pre-assignment.
* **Direct Password Management**: Secure administrative credential resets.

### 12. 🕵️ Administrative Real-Time Audit Log (`AdminAuditNotificationsView`)
* **Tamper-Evident System Audit**: Continuous monitoring of all data mutations, logins, logouts, presence updates, and clearance changes.
* **Zero-Egress Realtime Ingestion**: WebSocket change feed with metadata parsing (Actor, Role, Action, Target, IP Address, Timestamp) without polling overhead.

---

## 🔒 Security Clearance Matrix (RBAC)

| Operational Capability | ADMIN / HIGH COMMAND | FIELD OFFICER | ARMORER / QUARTERMASTER |
| :--- | :---: | :---: | :---: |
| **Command Overview Dashboard** | Full Access | Full Access | Full Access |
| **Duty Presence Logging** | Any Officer | Self Only | Self Only |
| **Escort Convoy Dispatch** | Full Access | Full Access | View Only |
| **Armory Issuance & Returns** | Full Access | View Status | Issue / Return / Stockpile |
| **Depot Stockpile Adjustments** | Full Access | ❌ Resticted | Full Access |
| **Personnel Profile Management** | Full Access | View Roster | View Roster |
| **Credential Documents (ID/Licenses)** | View & Manage | View Self | ❌ Restricted |
| **Disciplinary Points & Letters** | Issue / Edit / Revoke | View Self | View Self |
| **Resignation Approval Pipeline** | Approve / Reject | Submit Own | Submit Own |
| **User Clearance & Provisioning** | Full Access | ❌ Restricted | ❌ Restricted |
| **Administrative Audit Logs** | Real-Time Feed | ❌ Restricted | ❌ Restricted |
| **CSV Data Export** | Full Access | Self / Public | Armory Only |

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/) |
| **Iconography & Styling** | [Lucide React](https://lucide.dev/), Tailwind CSS, Glassmorphic Tactical Dark Theme |
| **Client Utilities** | [html2canvas](https://html2canvas.hertzen.com/) (Document/Certificate Exports), HTML5 Canvas Compression Engine |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL 15+, Supabase Client v2) |
| **Realtime Engine** | Supabase Postgres Change Subscriptions (WebSocket Broadcasts) |
| **Security** | Row-Level Security (RLS), SHA-256 / PBKDF2 Password Hashing, Session Token Verification |
| **Build & Tooling** | Vite, Oxlint, Node.js v18+ |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your workstation:
* **Node.js** `v18.0.0` or higher
* **npm** `v9.0.0` or higher

---

### Installation & Local Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/vwalkerx-cyber/neg-security-portal.git
   cd neg-security-portal/frontend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `frontend` root directory:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key
   ```

4. **Launch the Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to: **`http://localhost:5173`** (or the port specified in terminal output).

---

### Production Build

To produce a production-ready, minified build:

```bash
cd frontend
npm run build
```

The optimized static assets will be output to the `frontend/dist/` directory, ready for deployment on **Vercel**, **Cloudflare Pages**, **Netlify**, or **Render**.

To preview the production build locally:
```bash
npm run preview
```

---

## ⚡ Performance & Bandwidth Optimization Engineering

To maintain lightning-fast response times and comply with cloud bandwidth quotas, the portal incorporates dedicated performance optimizations:

* **HTML5 Canvas Client-Side Compression**: Any image uploaded (officer photo, ID card screenshot, driver license, expungement letter, or escort evidence) is automatically downscaled to 1200px max dimensions and compressed to JPEG format before conversion to Base64. This slashes individual record weight from **~1.5 MB down to ~60–120 KB** (over **85% reduction**).
* **On-Demand Credential Loading**: High-weight document fields are excluded from initial roster fetches (`SELECT id, name, badge_id...`) and are only fetched when an authorized officer opens a specific credential inspection modal.
* **Decoupled Real-Time Audit Channel**: System audit events are isolated from tactical operational chat. Realtime WebSocket change payloads are parsed directly in-memory by connected admin clients, eliminating redundant database re-queries.
* **Selective Projection & Pagination**: All list queries enforce explicit column selection and strict row limits (e.g. recent 50 audit logs, top 100 tactical chat messages, 300 attendance records).

---

## 📂 Project Directory Structure

```
neg-security-portal/
├── frontend/
│   ├── public/
│   │   └── favicon.svg              # Tactical portal crest
│   ├── src/
│   │   ├── assets/                  # Static brand assets & badges
│   │   ├── components/              # Modular portal views
│   │   │   ├── AdminAuditNotificationsView.jsx # Live audit event feed
│   │   │   ├── ArmoryView.jsx       # Armory custody & depot inventory
│   │   │   ├── CertificateModal.jsx # Official credentials viewer
│   │   │   ├── ConfirmModal.jsx     # Reusable confirmation dialogs
│   │   │   ├── DisciplinaryLettersView.jsx # Reprimand letter generator
│   │   │   ├── EscortView.jsx       # VIP convoy & mission management
│   │   │   ├── HierarchyView.jsx    # Chain of command visualizer
│   │   │   ├── InfractionPointsView.jsx # Disciplinary points tracker
│   │   │   ├── LoginView.jsx        # Clearance login & registration
│   │   │   ├── OverviewDashboard.jsx# Executive command HQ
│   │   │   ├── PayrollView.jsx      # Salary & compensation matrix
│   │   │   ├── PersonnelView.jsx    # Guard directory & fleet plates
│   │   │   ├── PresenceView.jsx     # Duty log & shift attendance
│   │   │   ├── ResignationProposalsView.jsx # Separation proposal review
│   │   │   ├── Sidebar.jsx          # Tactical navigation menu
│   │   │   ├── TopHeader.jsx        # Clearance badge & user status
│   │   │   ├── TrainingView.jsx     # Academy qualifications & certs
│   │   │   └── UserManagementView.jsx # Clearance user administration
│   │   ├── utils/
│   │   │   ├── imageCompressor.js   # Client-side canvas image optimizer
│   │   │   └── permissions.js       # RBAC permission evaluation engine
│   │   ├── App.jsx                  # Root application router & state
│   │   ├── index.css                # Global tactical styling & variables
│   │   ├── main.jsx                 # Application entrypoint
│   │   └── supabaseClient.js        # Supabase API & Realtime layer
│   ├── index.html                   # HTML template
│   ├── package.json                 # Project dependencies & scripts
│   └── vite.config.js               # Vite bundler configuration
└── README.md                        # Project documentation
```

---

## 📜 Security & Operational Notice

> [!IMPORTANT]
> **RESTRICTED SYSTEM ACCESS**: This software application is engineered strictly for authorized personnel of the **National Executive Guard (NEG)**. Unauthorized access attempts, credential spoofing, or attempts to circumvent clearance barriers are recorded via the automated audit pipeline and subject to disciplinary review.

---

<div align="center">
  <sub>Designed & Maintained by NEG High Command • Tactical Systems & Logistics Division</sub>
</div>
