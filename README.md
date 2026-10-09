# National Executive Guard (NEG) — Personnel & Operations Portal

A complete, centralized command and personnel operations web application built to transition the **National Executive Guard (NEG)** from manual Google Sheets recording into a secure full-stack platform with Role-Based Access Control (RBAC).

---

## 🔐 Authentication & High-Ranking User Management System

### 1. Security Login Gate
* **Authenticated Access**: All operational areas require verification of security clearance credentials.
* **Session Persistence**: Secure token and profile state saved locally with fast one-click logout.
* **Officer Identity in Header**: Displays active guard name, military rank, and assigned security role.

### 2. Administrator User Creation & Credential Provisioning
* **Exclusively High-Ranking (Commander)** accounts can access the **"User Accounts"** tab to provision and manage logins.
* **Link to Guard Roster**: Administrators select an officer from the active personnel directory, assign their username/call-sign, set their initial password, and assign their clearance role.
* **Role Permissions**:
  * 👑 **ADMIN / COMMANDER**: Master administrative privileges, credential provisioning, account suspension/activation, password reset, and access to all operational data.
  * 🛡️ **OFFICER**: Field and tactical duty personnel; access to Daily Presence logging, Escort Mission management, and Roster directory.
  * 🎯 **ARMORER / QUARTERMASTER**: Logistics and vault personnel; custody tracking, ammunition issuance, and weapons returns.
* **Account Controls**: Instant account suspension/reactivation toggle and password reset modal.
* **Export Users CSV**: Download user account registry for administrative audits.

### 🔑 Pre-Configured Test Accounts

| Username | Password | Officer Name & Rank | Assigned Role | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **`commander`** | `NegAdmin2026!` | Alexander Hayes (Commander) | **ADMIN** | **High Ranking Master Admin** — Can create/provision new users, reset passwords, access all operations |
| **`captain.vance`** | `EscortLead2026!` | Marcus Vance (Captain) | **OFFICER** | Tactical Escort Unit Lead — Presence, Escort dispatch, Roster |
| **`guard.brooks`** | `ArmoryGuard2026!` | Gavin Brooks (Senior Guard) | **ARMORER** | Armory Logistics Quartermaster — Weapons issue, ammo custody |

*(The login screen also features 1-click "Quick-Fill" buttons for these accounts so you can test role switching seamlessly!)*

---

## 🛡️ Core Operational Modules (Replacing Google Sheets)

### 1. 📋 Presence Record (Daily Attendance & Roster)
* Records date, shift, name, badge ID, time in, time out, duration (hours and remaining minutes), and escort count.
* Shift is assigned from time in: `Day` from 06:00–17:59 and `Night` from 18:00–05:59.
* Duration is calculated from time in/out, including overnight shifts. Escort count matches assigned personnel and mission time overlap.
* Records without a time out are flagged as incomplete; the owning user or an administrator can enter the time out later to complete the shift.
* Personnel may submit presence, escort, payroll, and armory-issue records only for their own profile; administrators may select any personnel profile.
* **Export Presence CSV** button for spreadsheet archival.

### 2. 💵 Salary Records
* Payroll fields: **Name**, **Rank**, **Salary**, **Salary Date**, and **Week Number**.
* Week number is calculated automatically from the salary date using ISO-8601 week numbering.
* **Export Payroll CSV** button.

### 3. 🎯 Armory Allocation & Weapons Custody Registry
* Serial number tracking and chain-of-custody for firearms and tactical gear (*Sidearms, Tactical Carbines, Submachine Guns, Body Armor, Shotguns, Less-Lethal, Comms*).
* Tracks ammunition allocated, condition, issue date, assigned guard, and expected return date.
* **Issue Weapon / Gear** modal & **Return to Armory** 1-click check-in.
* **Export Armory CSV** button.

### 4. 🚘 VIP Convoy & Escort Operations
* Dignitary close-protection details (*Foreign Ministers, Judges, Diplomatic Envoys*).
* Threat level categorization: `Critical (Level 4)`, `High (Level 3)`, `Medium (Level 2)`, `Low (Level 1)`.
* Convoy vehicle composition, route tracking, and real-time status (`In Transit`, `Scheduled`, `Completed`).
* **Dispatch Escort Mission** form & **Export Escort CSV** button.

### 5. 👥 Guard Personnel Directory & Roster
* Personnel fields: Name, Badge ID, Rank, Join Date, License/Certificate, and Status.
* Ranks: Director, Deputy Director, Master Sergeant, Staff Sergeant, Sergeant, Senior Corporal, Corporal, Senior Officer II, Senior Officer I, Officer II, and Officer I.
* Personnel status is limited to `Active`, `Inactive`, or `Disbanded`.
* Personnel induction form & **Export Personnel CSV** button.

---

## 🚀 Quick Launch Instructions

### Prerequisites
* Python 3.10+
* Node.js v18+ & npm

### Running the Services
* **Backend**: Double-click `start-backend.bat` (or run `.\backend\venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload`).
* **Frontend**: Double-click `start-frontend.bat` (or run `cd frontend && npm run dev`).

### Access Points
* **NEG Operations Portal**: [http://127.0.0.1:5174](http://127.0.0.1:5174)
* **Backend API & Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
