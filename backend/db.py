import sqlite3
import json
import os
from datetime import datetime, timedelta, date

DB_PATH = os.path.join(os.path.dirname(__file__), "neg_security.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Personnel Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS personnel (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            badge_id TEXT NOT NULL,
            rank TEXT NOT NULL,
            join_date TEXT NOT NULL,
            license_certificate TEXT NOT NULL,
            status TEXT NOT NULL,
            division TEXT DEFAULT 'Unassigned'
        )
    """)

    # Migration: add division & credentials columns if missing in existing table
    cursor.execute("PRAGMA table_info(personnel)")
    cols = [r[1] for r in cursor.fetchall()]
    if "division" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN division TEXT DEFAULT 'Unassigned'")
    if "id_card_number" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN id_card_number TEXT DEFAULT ''")
    if "id_card_expiry" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN id_card_expiry TEXT DEFAULT ''")
    if "driving_license_number" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN driving_license_number TEXT DEFAULT ''")
    if "driving_license_expiry" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN driving_license_expiry TEXT DEFAULT ''")
    if "expungement_letter_number" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN expungement_letter_number TEXT DEFAULT ''")
    if "expungement_letter_expiry" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN expungement_letter_expiry TEXT DEFAULT ''")
    if "id_card_image" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN id_card_image TEXT DEFAULT ''")
    if "driving_license_image" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN driving_license_image TEXT DEFAULT ''")
    if "expungement_letter_image" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN expungement_letter_image TEXT DEFAULT ''")
    if "plate_riot_van" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN plate_riot_van TEXT DEFAULT ''")
    if "plate_patrol_motorcycle" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN plate_patrol_motorcycle TEXT DEFAULT ''")
    if "plate_g500" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN plate_g500 TEXT DEFAULT ''")
    if "plate_ioniq_4" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN plate_ioniq_4 TEXT DEFAULT ''")
    if "plate_presidential_limo" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN plate_presidential_limo TEXT DEFAULT ''")
    if "discord_id" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN discord_id TEXT DEFAULT ''")
    if "discord_username" not in cols:
        cursor.execute("ALTER TABLE personnel ADD COLUMN discord_username TEXT DEFAULT ''")

    # Migrate any existing plates from department_vehicles table if it exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='department_vehicles'")
    if cursor.fetchone():
        try:
            cursor.execute("""
                SELECT personnel_id, model, plate_number 
                FROM department_vehicles 
                WHERE personnel_id IS NOT NULL AND personnel_id != ''
            """)
            for row in cursor.fetchall():
                pid, model, plate = row[0], row[1], row[2]
                if not plate:
                    continue
                if model == "Armored Riot Van":
                    cursor.execute("UPDATE personnel SET plate_riot_van = ? WHERE id = ? AND (plate_riot_van IS NULL OR plate_riot_van = '')", (plate, pid))
                elif model == "Patrol Motorcycle":
                    cursor.execute("UPDATE personnel SET plate_patrol_motorcycle = ? WHERE id = ? AND (plate_patrol_motorcycle IS NULL OR plate_patrol_motorcycle = '')", (plate, pid))
                elif model == "G500":
                    cursor.execute("UPDATE personnel SET plate_g500 = ? WHERE id = ? AND (plate_g500 IS NULL OR plate_g500 = '')", (plate, pid))
                elif model == "Hyundai IONIQ 4":
                    cursor.execute("UPDATE personnel SET plate_ioniq_4 = ? WHERE id = ? AND (plate_ioniq_4 IS NULL OR plate_ioniq_4 = '')", (plate, pid))
                elif model == "Presidential Limo":
                    cursor.execute("UPDATE personnel SET plate_presidential_limo = ? WHERE id = ? AND (plate_presidential_limo IS NULL OR plate_presidential_limo = '')", (plate, pid))
        except Exception:
            pass

    # 2. Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE COLLATE NOCASE NOT NULL,
            password TEXT NOT NULL,
            personnel_id TEXT,
            name TEXT NOT NULL,
            rank TEXT NOT NULL,
            role TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            created_by TEXT NOT NULL,
            last_login TEXT,
            discord_id TEXT DEFAULT '',
            discord_username TEXT DEFAULT '',
            discord_avatar TEXT DEFAULT ''
        )
    """)

    cursor.execute("PRAGMA table_info(users)")
    u_cols = [r[1] for r in cursor.fetchall()]
    if "discord_id" not in u_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN discord_id TEXT DEFAULT ''")
    if "discord_username" not in u_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN discord_username TEXT DEFAULT ''")
    if "discord_avatar" not in u_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN discord_avatar TEXT DEFAULT ''")

    # 3. Presence Records Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS presence (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            shift TEXT NOT NULL,
            personnel_id TEXT NOT NULL,
            name TEXT NOT NULL,
            badge_id TEXT,
            time_in TEXT NOT NULL,
            time_out TEXT,
            escort_count INTEGER DEFAULT 0,
            notes TEXT DEFAULT ''
        )
    """)

    # 4. Payroll Records Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payroll (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            personnel_id TEXT NOT NULL,
            name TEXT NOT NULL,
            rank TEXT NOT NULL,
            salary REAL NOT NULL,
            salary_date TEXT NOT NULL,
            week_number INTEGER NOT NULL,
            notes TEXT DEFAULT ''
        )
    """)

    # 5. Armory Inventory Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS armory (
            id TEXT PRIMARY KEY,
            restock_date TEXT,
            name TEXT,
            item_type TEXT NOT NULL,
            item TEXT NOT NULL,
            serial_number TEXT,
            quantity INTEGER NOT NULL DEFAULT 1,
            condition TEXT,
            status TEXT NOT NULL,
            assigned_to TEXT,
            issue_date TEXT,
            expected_return TEXT,
            notes TEXT DEFAULT ''
        )
    """)

    # 6. Bulk Depot Stockpiles Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS depot_stockpiles (
            item_type TEXT NOT NULL,
            item TEXT NOT NULL,
            stock INTEGER NOT NULL,
            PRIMARY KEY (item_type, item)
        )
    """)

    # 7. Escort Missions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS escort_missions (
            id TEXT PRIMARY KEY,
            principal TEXT NOT NULL,
            threat_level TEXT NOT NULL,
            mission_type TEXT NOT NULL,
            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            destinations_json TEXT,
            lead_agent TEXT NOT NULL,
            lead_agent_id TEXT,
            team_size INTEGER NOT NULL DEFAULT 2,
            assigned_personnel_json TEXT,
            vehicle_convoy TEXT NOT NULL,
            start_time TEXT NOT NULL,
            estimated_completion TEXT NOT NULL,
            status TEXT NOT NULL,
            notes TEXT DEFAULT ''
        )
    """)

    # 8. Training & Certifications Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS training_certifications (
            id TEXT PRIMARY KEY,
            cert_number TEXT NOT NULL,
            personnel_id TEXT NOT NULL,
            name TEXT NOT NULL,
            course_title TEXT NOT NULL,
            category TEXT NOT NULL,
            issuing_authority TEXT NOT NULL,
            issue_date TEXT NOT NULL,
            expiry_date TEXT NOT NULL,
            proficiency_score TEXT NOT NULL,
            status TEXT NOT NULL,
            notes TEXT DEFAULT ''
        )
    """)

    # 9. Hierarchy Custom State Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hierarchy_state (
            id TEXT PRIMARY KEY,
            tree_data TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            updated_by TEXT
        )
    """)

    # 10. Disciplinary Decrees & Letters Table (Warning & Dismissal)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS disciplinary_letters (
            id TEXT PRIMARY KEY,
            letter_number TEXT NOT NULL UNIQUE,
            letter_type TEXT NOT NULL,
            personnel_id TEXT NOT NULL,
            recipient_name TEXT NOT NULL,
            badge_id TEXT,
            rank TEXT,
            issue_date TEXT NOT NULL,
            effective_date TEXT NOT NULL,
            violation_category TEXT NOT NULL,
            severity TEXT NOT NULL,
            incident_summary TEXT NOT NULL,
            sanctions TEXT NOT NULL,
            authorized_by TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Active',
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    """)

    # 11. Infraction Points Table (SS-SOP-ETH-001 Demerit Scoring Model)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS infractions (
            id TEXT PRIMARY KEY,
            personnel_id TEXT NOT NULL,
            recipient_name TEXT NOT NULL,
            badge_id TEXT,
            rank TEXT,
            infraction_code TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            points INTEGER NOT NULL,
            description TEXT NOT NULL,
            location TEXT DEFAULT '',
            incident_date TEXT NOT NULL,
            issued_by TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Active',
            decay_date TEXT,
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    """)

    conn.commit()

    # Seed tables if personnel is empty
    cursor.execute("SELECT COUNT(*) as cnt FROM personnel")
    if cursor.fetchone()["cnt"] == 0:
        _seed_initial_data(conn)

    # Seed initial disciplinary letter if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM disciplinary_letters")
    if cursor.fetchone()["cnt"] == 0:
        cursor.execute("""
            INSERT OR IGNORE INTO disciplinary_letters (
                id, letter_number, letter_type, personnel_id, recipient_name, badge_id, rank,
                issue_date, effective_date, violation_category, severity,
                incident_summary, sanctions, authorized_by, status, notes, created_at
            ) VALUES (
                'DIS-001', 'NEG/DIR/WARN-1/2026/001', 'First Written Warning', 'NEG-001', 'Nathan Ganji W Romanov', 'SS-001', 'Director',
                '2026-10-01', '2026-10-01', 'Breach of Protocol', 'Moderate',
                'Operational oversight regarding uncoordinated patrol boundary transitions during VIP transit route evaluation.',
                'Formal 1st Written Warning & Mandatory Protocol Recertification',
                'Executive Disciplinary Tribunal', 'Active', 'Standard probationary compliance review in 30 days.',
                '2026-10-01 10:00:00'
            )
        """)
        cursor.execute("UPDATE users SET status = 'Inactive' WHERE status = 'Suspended'")
        cursor.execute("UPDATE personnel SET status = 'Inactive' WHERE status = 'Suspended'")
        conn.commit()

    # Seed sample infraction points if empty
    # 12. Tactical Operations & Dispatch Chat Messages Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            personnel_id TEXT,
            sender_name TEXT NOT NULL,
            sender_rank TEXT NOT NULL,
            sender_role TEXT NOT NULL,
            badge_id TEXT,
            message TEXT NOT NULL,
            message_type TEXT DEFAULT 'Standard',
            created_at TEXT NOT NULL
        )
    """)

    conn.commit()

    # Seed sample chat messages if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM chat_messages")
    if cursor.fetchone()["cnt"] == 0:
        cursor.execute("""
            INSERT OR IGNORE INTO chat_messages (
                id, user_id, personnel_id, sender_name, sender_rank, sender_role,
                badge_id, message, message_type, created_at
            ) VALUES 
            (
                'MSG-001', 'USR-001', 'NEG-001', 'Nathan Ganji W Romanov', 'Director', 'ADMIN',
                'SS-001', 'ATTN ALL UNITS: Heightened vigilance protocol DEFCON 4 in effect. Maintain perimeter integrity across all sectors.',
                'Priority', '2026-10-09 08:00:00'
            ),
            (
                'MSG-002', 'USR-001', 'NEG-001', 'Operations Command', 'Directorate', 'ADMIN',
                'SS-HQ', 'Central Dispatch online. Log all shift arrivals and escort convoy departures immediately upon transit initiation.',
                'Standard', '2026-10-09 08:30:00'
            )
        """)
        conn.commit()

    # 13. Department Vehicles Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS department_vehicles (
            id TEXT PRIMARY KEY,
            model TEXT NOT NULL,
            plate_number TEXT NOT NULL,
            personnel_id TEXT,
            assigned_to TEXT,
            badge_id TEXT,
            division TEXT DEFAULT 'Motor Pool',
            status TEXT NOT NULL DEFAULT 'Available',
            assigned_date TEXT,
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.commit()

    # Seed department fleet vehicles if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM department_vehicles")
    if cursor.fetchone()["cnt"] == 0:
        cursor.execute("""
            INSERT OR IGNORE INTO department_vehicles (
                id, model, plate_number, personnel_id, assigned_to, badge_id, division, status, assigned_date, notes, created_at, updated_at
            ) VALUES 
            ('VEH-001', 'Armored Riot Van', 'NEG-ARV-01', NULL, 'Unassigned / Motor Pool', '-', 'Special Operation Division', 'Available', '2026-10-01', 'Tactical heavy armor, reinforced ballistic chassis, crowd dispersion unit.', '2026-10-01 08:00:00', '2026-10-01 08:00:00'),
            ('VEH-002', 'Patrol Motorcycle', 'NEG-MOTO-01', NULL, 'Unassigned / Motor Pool', '-', 'Patrol Division', 'Available', '2026-10-01', 'Rapid response pursuit and recon motorcycle.', '2026-10-01 08:00:00', '2026-10-01 08:00:00'),
            ('VEH-003', 'G500', 'NEG-G500-01', 'NEG-001', 'Nathan Ganji W Romanov', 'SS-001', 'Protective Detail Division', 'Assigned', '2026-10-01', 'Director tactical command SUV with armored run-flat tires.', '2026-10-01 08:00:00', '2026-10-01 08:00:00'),
            ('VEH-004', 'Hyundai IONIQ 4', 'NEG-EV-04', NULL, 'Unassigned / Motor Pool', '-', 'Motor Pool', 'Available', '2026-10-01', 'All-electric low-signature executive administrative transport.', '2026-10-01 08:00:00', '2026-10-01 08:00:00'),
            ('VEH-005', 'Presidential Limo', 'NEG-01', 'NEG-001', 'Nathan Ganji W Romanov', 'SS-001', 'Protective Detail Division', 'Assigned', '2026-10-01', 'Executive presidential convoy flagship, state-level ballistic shielding.', '2026-10-01 08:00:00', '2026-10-01 08:00:00')
        """)
        conn.commit()

    # 14. Resignation Proposals Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS resignation_proposals (
            id TEXT PRIMARY KEY,
            proposal_number TEXT NOT NULL UNIQUE,
            personnel_id TEXT NOT NULL,
            officer_name TEXT NOT NULL,
            badge_id TEXT NOT NULL,
            rank TEXT NOT NULL,
            division TEXT NOT NULL,
            submission_date TEXT NOT NULL,
            effective_date TEXT NOT NULL,
            reason_category TEXT NOT NULL,
            reason_details TEXT NOT NULL,
            handover_notes TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Pending',
            reviewed_by TEXT DEFAULT '',
            reviewed_by_rank TEXT DEFAULT '',
            review_date TEXT DEFAULT '',
            review_notes TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()

    # 15. Reinstatement Requests Table (Accessible ONLY by disbanded units/officers)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reinstatement_requests (
            id TEXT PRIMARY KEY,
            request_number TEXT NOT NULL UNIQUE,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            personnel_id TEXT NOT NULL,
            officer_name TEXT NOT NULL,
            badge_id TEXT NOT NULL,
            prior_rank TEXT NOT NULL,
            prior_division TEXT NOT NULL,
            appeal_reason TEXT NOT NULL,
            commitment_statement TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            reviewed_by TEXT DEFAULT '',
            reviewed_by_rank TEXT DEFAULT '',
            review_date TEXT DEFAULT '',
            review_notes TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()

    conn.close()

    # Automatically check attendance and update inactive statuses
    auto_sync_inactivity()

def _seed_initial_data(conn):
    cursor = conn.cursor()

    # Sole Initial Personnel: Nathan Ganji W Romanov
    cursor.execute("""
        INSERT OR REPLACE INTO personnel (id, name, badge_id, rank, join_date, license_certificate, status)
        VALUES ('NEG-001', 'Nathan Ganji W Romanov', 'SS-001', 'Director', '2026-06-15', 'Executive Security Director Clearance', 'Active')
    """)

    # Sole Initial User: Nathan Ganji W Romanov
    cursor.execute("""
        INSERT OR REPLACE INTO users (id, username, password, personnel_id, name, rank, role, status, created_at, created_by, last_login)
        VALUES ('USR-001', 'commander', 'NegAdmin2026!', 'NEG-001', 'Nathan Ganji W Romanov', 'Director', 'ADMIN', 'Active', '2026-10-01 08:00', 'System Provisioning', '2026-10-08 00:01')
    """)

    # Depot Stockpiles (Catalog template with 0 stock, ready for admin allocation)
    depot_items = [
        # Ammunition
        ("Ammunition", "Pistol Ammo", 0),
        ("Ammunition", "Shotgun Police Ammo", 0),
        ("Ammunition", "9mm Police Ammo", 0),
        ("Ammunition", "Rifle Police Ammo", 0),
        ("Ammunition", "44mm", 0),
        # Armor & Medical
        ("Armor & Medical", "Police Heavy Armor", 0),
        ("Armor & Medical", "Body Booster", 0),
        # Equipment
        ("Equipment", "Bodycam", 0),
        ("Equipment", "Badge", 0),
        ("Equipment", "Handcuff", 0),
        ("Equipment", "Cuff Keys", 0),
        ("Equipment", "Ziptie", 0),
        ("Equipment", "Flush Cutter", 0),
        ("Equipment", "Gas Mask", 0),
        # Attachments
        ("Attachments", "Extended Police Rifle Clip", 0),
        ("Attachments", "Police Light Suppressor", 0),
        ("Attachments", "Extended Police SMG Clip", 0),
        ("Attachments", "Police Heavy Suppressor", 0),
        ("Attachments", "Extended Police Pistol Clip", 0),
        ("Attachments", "Police Tactical Flashlight", 0),
    ]
    for cat, item, stock in depot_items:
        cursor.execute("""
            INSERT OR REPLACE INTO depot_stockpiles (item_type, item, stock)
            VALUES (?, ?, ?)
        """, (cat, item, stock))

    conn.commit()


# =========================================================================
# DATA ACCESS FUNCTIONS
# =========================================================================

# ----------------- Automated Attendance & Inactivity Engine -----------------
def parse_date_safely(date_val):
    if not date_val:
        return None
    s = str(date_val).strip().split(" ")[0].split("T")[0]
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None

def auto_sync_inactivity():
    """
    Attendance rule enforcement:
    - Users/personnel are automatically updated to 'Inactive' after not updating presence
      for 7 days after their latest presence or joining the force.
    - If they have updated presence within the last 7 days and are Inactive, they are restored to 'Active'.
    - 'Disbanded' status is a permanent dismissal/termination state and is never modified.
    """
    with get_connection() as conn:
        today = datetime.now().date()

        # 1. Check personnel records (exclude Disbanded and Pending)
        personnel_rows = conn.execute("SELECT id, join_date, status FROM personnel WHERE status NOT IN ('Disbanded', 'Pending')").fetchall()

        pres_rows = conn.execute("SELECT personnel_id, MAX(date) FROM presence GROUP BY personnel_id").fetchall()
        latest_presence = {r[0]: r[1] for r in pres_rows if r[1]}

        for p in personnel_rows:
            p_id = p["id"]
            current_status = p["status"]
            ref_date_str = latest_presence.get(p_id) or p["join_date"]
            ref_date = parse_date_safely(ref_date_str)
            if not ref_date:
                continue

            days_elapsed = (today - ref_date).days
            if days_elapsed >= 7:
                if current_status != "Inactive":
                    conn.execute("UPDATE personnel SET status = 'Inactive' WHERE id = ?", (p_id,))
                conn.execute("UPDATE users SET status = 'Inactive' WHERE personnel_id = ? AND status NOT IN ('Disbanded', 'Pending')", (p_id,))
            else:
                if current_status != "Active":
                    conn.execute("UPDATE personnel SET status = 'Active' WHERE id = ?", (p_id,))
                conn.execute("UPDATE users SET status = 'Active' WHERE personnel_id = ? AND status NOT IN ('Disbanded', 'Pending')", (p_id,))

        # 2. Check standalone users without personnel_id (exclude Disbanded and Pending)
        standalone_users = conn.execute("SELECT id, created_at, status FROM users WHERE (personnel_id IS NULL OR personnel_id = '') AND status NOT IN ('Disbanded', 'Pending')").fetchall()
        for u in standalone_users:
            u_id = u["id"]
            current_status = u["status"]
            u_date = parse_date_safely(u["created_at"])
            if not u_date:
                continue
            days_elapsed = (today - u_date).days
            if days_elapsed >= 7 and current_status == "Active":
                conn.execute("UPDATE users SET status = 'Inactive' WHERE id = ?", (u_id,))
            elif days_elapsed < 7 and current_status == "Inactive":
                conn.execute("UPDATE users SET status = 'Active' WHERE id = ?", (u_id,))

        conn.commit()


# ----------------- Personnel -----------------
def get_all_personnel():
    auto_sync_inactivity()
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM personnel ORDER BY id ASC").fetchall()
        return [dict(r) for r in rows]

def get_personnel_by_id(pid):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM personnel WHERE id = ?", (pid,)).fetchone()
        return dict(row) if row else None

def create_personnel(data):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO personnel (
                id, name, badge_id, rank, join_date, license_certificate, status, division,
                id_card_number, id_card_expiry, driving_license_number, driving_license_expiry,
                expungement_letter_number, expungement_letter_expiry,
                id_card_image, driving_license_image, expungement_letter_image,
                plate_riot_van, plate_patrol_motorcycle, plate_g500, plate_ioniq_4, plate_presidential_limo,
                discord_id, discord_username
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["id"], data["name"], data["badge_id"], data["rank"], data["join_date"], 
            data["license_certificate"], data["status"], data.get("division", "Unassigned"),
            data.get("id_card_number", ""), data.get("id_card_expiry", ""),
            data.get("driving_license_number", ""), data.get("driving_license_expiry", ""),
            data.get("expungement_letter_number", ""), data.get("expungement_letter_expiry", ""),
            data.get("id_card_image", ""), data.get("driving_license_image", ""),
            data.get("expungement_letter_image", ""),
            data.get("plate_riot_van", "").strip().upper(),
            data.get("plate_patrol_motorcycle", "").strip().upper(),
            data.get("plate_g500", "").strip().upper(),
            data.get("plate_ioniq_4", "").strip().upper(),
            data.get("plate_presidential_limo", "").strip().upper(),
            str(data.get("discord_id", "")).strip(),
            str(data.get("discord_username", "")).strip()
        ))
        conn.commit()
    return get_personnel_by_id(data["id"])

def update_personnel(pid, data):
    with get_connection() as conn:
        conn.execute("""
            UPDATE personnel SET 
                name = ?, badge_id = ?, rank = ?, join_date = ?, license_certificate = ?, status = ?, division = ?,
                id_card_number = ?, id_card_expiry = ?, driving_license_number = ?, driving_license_expiry = ?,
                expungement_letter_number = ?, expungement_letter_expiry = ?,
                id_card_image = ?, driving_license_image = ?, expungement_letter_image = ?,
                plate_riot_van = ?, plate_patrol_motorcycle = ?, plate_g500 = ?, plate_ioniq_4 = ?, plate_presidential_limo = ?,
                discord_id = coalesce(nullif(?, ''), discord_id),
                discord_username = coalesce(nullif(?, ''), discord_username)
            WHERE id = ?
        """, (
            data["name"], data["badge_id"], data["rank"], data["join_date"], data["license_certificate"], 
            data["status"], data.get("division", "Unassigned"),
            data.get("id_card_number", ""), data.get("id_card_expiry", ""),
            data.get("driving_license_number", ""), data.get("driving_license_expiry", ""),
            data.get("expungement_letter_number", ""), data.get("expungement_letter_expiry", ""),
            data.get("id_card_image", ""), data.get("driving_license_image", ""),
            data.get("expungement_letter_image", ""),
            data.get("plate_riot_van", "").strip().upper(),
            data.get("plate_patrol_motorcycle", "").strip().upper(),
            data.get("plate_g500", "").strip().upper(),
            data.get("plate_ioniq_4", "").strip().upper(),
            data.get("plate_presidential_limo", "").strip().upper(),
            str(data.get("discord_id", "")).strip(),
            str(data.get("discord_username", "")).strip(),
            pid
        ))
        if data.get("status"):
            conn.execute("UPDATE users SET status = ? WHERE personnel_id = ? AND status != 'Disbanded'", (data["status"], pid))
        conn.commit()
    return get_personnel_by_id(pid)

def update_personnel_vehicle_plates(pid, data):
    with get_connection() as conn:
        conn.execute("""
            UPDATE personnel SET
                plate_riot_van = ?,
                plate_patrol_motorcycle = ?,
                plate_g500 = ?,
                plate_ioniq_4 = ?,
                plate_presidential_limo = ?
            WHERE id = ?
        """, (
            (data.get("plate_riot_van") or "").strip().upper(),
            (data.get("plate_patrol_motorcycle") or "").strip().upper(),
            (data.get("plate_g500") or "").strip().upper(),
            (data.get("plate_ioniq_4") or "").strip().upper(),
            (data.get("plate_presidential_limo") or "").strip().upper(),
            pid
        ))
        conn.commit()
    return get_personnel_by_id(pid)

def delete_personnel(pid):
    with get_connection() as conn:
        conn.execute("DELETE FROM personnel WHERE id = ?", (pid,))
        conn.commit()
    return True

# ----------------- Users -----------------
def get_all_users():
    auto_sync_inactivity()
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM users ORDER BY id ASC").fetchall()
        return [dict(r) for r in rows]

def get_user_by_username(username):
    auto_sync_inactivity()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ? COLLATE NOCASE", (username,)).fetchone()
        return dict(row) if row else None

def get_user_by_id(uid):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
        return dict(row) if row else None

def get_user_by_discord_id(discord_id):
    if not discord_id or not str(discord_id).strip():
        return None
    auto_sync_inactivity()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE discord_id = ?", (str(discord_id).strip(),)).fetchone()
        return dict(row) if row else None

def get_user_by_discord_username(discord_username):
    if not discord_username or not str(discord_username).strip():
        return None
    auto_sync_inactivity()
    with get_connection() as conn:
        clean_tag = str(discord_username).strip()
        row = conn.execute("SELECT * FROM users WHERE discord_username = ? COLLATE NOCASE", (clean_tag,)).fetchone()
        return dict(row) if row else None

def create_user(data):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO users (
                id, username, password, personnel_id, name, rank, role, status, 
                created_at, created_by, last_login, discord_id, discord_username, discord_avatar
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["id"], data["username"], data["password"], data.get("personnel_id"), 
            data["name"], data["rank"], data["role"], data["status"], 
            data["created_at"], data["created_by"], data.get("last_login", "--"),
            str(data.get("discord_id", "")).strip(),
            str(data.get("discord_username", "")).strip(),
            str(data.get("discord_avatar", "")).strip()
        ))
        conn.commit()
    return get_user_by_id(data["id"])

def update_user(uid, data):
    with get_connection() as conn:
        # Build dynamic fields
        current = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
        if not current:
            return None
        current = dict(current)
        
        role = data.get("role", current["role"])
        status = data.get("status", current["status"])
        name = data.get("name", current["name"])
        rank = data.get("rank", current["rank"])
        username = data.get("username", current["username"])
        discord_id = data.get("discord_id", current.get("discord_id", ""))
        discord_username = data.get("discord_username", current.get("discord_username", ""))
        discord_avatar = data.get("discord_avatar", current.get("discord_avatar", ""))

        conn.execute("""
            UPDATE users SET 
                username = ?, role = ?, status = ?, name = ?, rank = ?,
                discord_id = ?, discord_username = ?, discord_avatar = ?
            WHERE id = ?
        """, (str(username).strip(), role, status, name, rank, str(discord_id).strip(), str(discord_username).strip(), str(discord_avatar).strip(), uid))
        
        p_id = current.get("personnel_id")
        if p_id:
            # If manually activated, bump join_date/presence to today so auto_sync_inactivity doesn't immediately mark them Inactive again
            if status == "Active":
                conn.execute("""
                    UPDATE personnel SET 
                        status = ?, name = ?, rank = ?, join_date = ?,
                        discord_id = coalesce(nullif(?, ''), discord_id),
                        discord_username = coalesce(nullif(?, ''), discord_username)
                    WHERE id = ?
                """, (status, name, rank, date.today().isoformat(), str(discord_id).strip(), str(discord_username).strip(), p_id))
            else:
                conn.execute("""
                    UPDATE personnel SET 
                        status = ?, name = ?, rank = ?,
                        discord_id = coalesce(nullif(?, ''), discord_id),
                        discord_username = coalesce(nullif(?, ''), discord_username)
                    WHERE id = ?
                """, (status, name, rank, str(discord_id).strip(), str(discord_username).strip(), p_id))
        conn.commit()
    return get_user_by_id(uid)

def update_user_discord(uid, discord_id, discord_username, discord_avatar=""):
    with get_connection() as conn:
        conn.execute("""
            UPDATE users SET 
                discord_id = ?, discord_username = ?, discord_avatar = ?
            WHERE id = ?
        """, (str(discord_id).strip(), str(discord_username).strip(), str(discord_avatar).strip(), uid))
        
        user_row = conn.execute("SELECT personnel_id FROM users WHERE id = ?", (uid,)).fetchone()
        if user_row and user_row["personnel_id"]:
            conn.execute("""
                UPDATE personnel SET discord_id = ?, discord_username = ? WHERE id = ?
            """, (str(discord_id).strip(), str(discord_username).strip(), user_row["personnel_id"]))
        conn.commit()
    return get_user_by_id(uid)

def approve_user(uid):
    with get_connection() as conn:
        conn.execute("UPDATE users SET status = 'Active' WHERE id = ?", (uid,))
        user_row = conn.execute("SELECT personnel_id FROM users WHERE id = ?", (uid,)).fetchone()
        if user_row and user_row["personnel_id"]:
            conn.execute("UPDATE personnel SET status = 'Active' WHERE id = ?", (user_row["personnel_id"],))
        conn.commit()
    return get_user_by_id(uid)

def reject_user(uid, delete_records=True):
    with get_connection() as conn:
        user_row = conn.execute("SELECT personnel_id FROM users WHERE id = ?", (uid,)).fetchone()
        p_id = user_row["personnel_id"] if user_row else None
        if delete_records:
            conn.execute("DELETE FROM users WHERE id = ?", (uid,))
            if p_id:
                conn.execute("DELETE FROM personnel WHERE id = ?", (p_id,))
        else:
            conn.execute("UPDATE users SET status = 'Disbanded' WHERE id = ?", (uid,))
            if p_id:
                conn.execute("UPDATE personnel SET status = 'Disbanded' WHERE id = ?", (p_id,))
        conn.commit()
    return True

def toggle_user_status(uid):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
        if not row:
            return None
        # Toggle between Disbanded and Active
        new_status = "Active" if row["status"] == "Disbanded" else "Disbanded"
        conn.execute("UPDATE users SET role = ?, status = ? WHERE id = ?", (row["role"], new_status, uid))
        if row["personnel_id"]:
            conn.execute("UPDATE personnel SET status = ? WHERE id = ?", (new_status, row["personnel_id"]))
        conn.commit()
    return get_user_by_id(uid)

def update_user_password(uid, new_password):
    with get_connection() as conn:
        conn.execute("UPDATE users SET password = ? WHERE id = ?", (new_password, uid))
        conn.commit()
    return True

def update_last_login(uid, login_time):
    with get_connection() as conn:
        conn.execute("UPDATE users SET last_login = ? WHERE id = ?", (login_time, uid))
        conn.commit()

def delete_user(uid):
    with get_connection() as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (uid,))
        conn.commit()
    return True

# ----------------- Presence -----------------
def get_all_presence():
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM presence ORDER BY id DESC").fetchall()
        return [dict(r) for r in rows]

def get_presence_by_id(pid):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM presence WHERE id = ?", (pid,)).fetchone()
        return dict(row) if row else None

def create_presence(data):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO presence (date, shift, personnel_id, name, badge_id, time_in, time_out, escort_count, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (data["date"], data["shift"], data["personnel_id"], data["name"], data.get("badge_id", "-"), data["time_in"], data.get("time_out"), data.get("escort_count", 0), data.get("notes", "")))
        new_id = cursor.lastrowid

        # Users and personnel are automatically active after inputting a new presence
        pid = data["personnel_id"]
        conn.execute("UPDATE personnel SET status = 'Active' WHERE id = ? AND status = 'Inactive'", (pid,))
        conn.execute("UPDATE users SET status = 'Active' WHERE personnel_id = ? AND status = 'Inactive'", (pid,))

        conn.commit()
    return get_presence_by_id(new_id)

def update_presence_timeout(presence_id, time_out):
    with get_connection() as conn:
        conn.execute("UPDATE presence SET time_out = ? WHERE id = ?", (time_out, presence_id))
        row = conn.execute("SELECT personnel_id FROM presence WHERE id = ?", (presence_id,)).fetchone()
        if row and row["personnel_id"]:
            officer_id = row["personnel_id"]
            conn.execute("UPDATE personnel SET status = 'Active' WHERE id = ? AND status = 'Inactive'", (officer_id,))
            conn.execute("UPDATE users SET status = 'Active' WHERE personnel_id = ? AND status = 'Inactive'", (officer_id,))
        conn.commit()
    return get_presence_by_id(presence_id)

def delete_presence(pid):
    with get_connection() as conn:
        conn.execute("DELETE FROM presence WHERE id = ?", (pid,))
        conn.commit()
    return True

# ----------------- Payroll -----------------
def get_all_payroll():
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM payroll ORDER BY id DESC").fetchall()
        return [dict(r) for r in rows]

def create_payroll(data):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO payroll (personnel_id, name, rank, salary, salary_date, week_number, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (data["personnel_id"], data["name"], data["rank"], data["salary"], data["salary_date"], data["week_number"], data.get("notes", "")))
        new_id = cursor.lastrowid
        conn.commit()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM payroll WHERE id = ?", (new_id,)).fetchone()
        return dict(row)

# ----------------- Armory & Bulk Depot -----------------
def get_all_armory():
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM armory ORDER BY id ASC").fetchall()
        return [dict(r) for r in rows]

def get_armory_by_id(aid):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM armory WHERE id = ?", (aid,)).fetchone()
        return dict(row) if row else None

def create_armory_item(data):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO armory (id, restock_date, name, item_type, item, serial_number, quantity, condition, status, assigned_to, issue_date, expected_return, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (data["id"], data.get("restock_date"), data.get("name"), data["item_type"], data["item"], data.get("serial_number", "-"), data.get("quantity", 1), data.get("condition", "Serviceable - Excellent"), data["status"], data.get("assigned_to", "--"), data.get("issue_date", "--"), data.get("expected_return", "--"), data.get("notes", "")))
        conn.commit()
    return get_armory_by_id(data["id"])

def update_armory_item(aid, data):
    with get_connection() as conn:
        conn.execute("""
            UPDATE armory SET
                status = ?,
                assigned_to = ?,
                issue_date = ?,
                expected_return = ?
            WHERE id = ?
        """, (data["status"], data.get("assigned_to", "--"), data.get("issue_date", "--"), data.get("expected_return", "--"), aid))
        conn.commit()
    return get_armory_by_id(aid)

def get_depot_stockpiles():
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM depot_stockpiles").fetchall()
        stockpiles = {}
        for r in rows:
            cat = r["item_type"]
            it = r["item"]
            stock = r["stock"]
            if cat not in stockpiles:
                stockpiles[cat] = {}
            stockpiles[cat][it] = stock
        return stockpiles

def adjust_depot_stock(item_type, item, delta):
    with get_connection() as conn:
        row = conn.execute("SELECT stock FROM depot_stockpiles WHERE item_type = ? AND item = ?", (item_type, item)).fetchone()
        if not row:
            curr = 500
            conn.execute("INSERT INTO depot_stockpiles (item_type, item, stock) VALUES (?, ?, ?)", (item_type, item, curr))
        else:
            curr = row["stock"]
        
        new_val = max(0, curr + delta)
        conn.execute("UPDATE depot_stockpiles SET stock = ? WHERE item_type = ? AND item = ?", (new_val, item_type, item))
        conn.commit()
        return new_val

def restock_depot(item_type, item, quantity):
    return adjust_depot_stock(item_type, item, quantity)

def set_depot_stock(item_type, item, exact_stock):
    with get_connection() as conn:
        new_val = max(0, int(exact_stock))
        conn.execute("""
            INSERT OR REPLACE INTO depot_stockpiles (item_type, item, stock)
            VALUES (?, ?, ?)
        """, (item_type, item, new_val))
        conn.commit()
        return new_val


# ----------------- Escort Missions -----------------
def get_all_escort_missions():
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM escort_missions ORDER BY id DESC").fetchall()
        result = []
        for r in rows:
            d = dict(r)
            if d.get("destinations_json"):
                try:
                    d["destinations"] = json.loads(d["destinations_json"])
                except Exception:
                    d["destinations"] = [d["destination"]]
            else:
                d["destinations"] = [d["destination"]]
            
            if d.get("assigned_personnel_json"):
                try:
                    d["assigned_personnel"] = json.loads(d["assigned_personnel_json"])
                except Exception:
                    d["assigned_personnel"] = [d["lead_agent"]]
            else:
                d["assigned_personnel"] = [d["lead_agent"]]
            result.append(d)
        return result

def get_escort_mission_by_id(eid):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM escort_missions WHERE id = ?", (eid,)).fetchone()
        if not row:
            return None
        d = dict(row)
        if d.get("destinations_json"):
            try:
                d["destinations"] = json.loads(d["destinations_json"])
            except Exception:
                d["destinations"] = [d["destination"]]
        else:
            d["destinations"] = [d["destination"]]
        
        if d.get("assigned_personnel_json"):
            try:
                d["assigned_personnel"] = json.loads(d["assigned_personnel_json"])
            except Exception:
                d["assigned_personnel"] = [d["lead_agent"]]
        else:
            d["assigned_personnel"] = [d["lead_agent"]]
        return d

def create_escort_mission(data):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO escort_missions (
                id, principal, threat_level, mission_type, origin, destination,
                destinations_json, lead_agent, lead_agent_id, team_size,
                assigned_personnel_json, vehicle_convoy, start_time, estimated_completion, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["id"], data["principal"], data["threat_level"], data["mission_type"],
            data["origin"], data["destination"], data.get("destinations_json"),
            data["lead_agent"], data.get("lead_agent_id"), data.get("team_size", 2),
            data.get("assigned_personnel_json"), data["vehicle_convoy"],
            data["start_time"], data["estimated_completion"], data["status"], data.get("notes", "")
        ))
        conn.commit()
    return get_escort_mission_by_id(data["id"])

def update_escort_mission_status(eid, status, notes=None):
    with get_connection() as conn:
        if notes:
            conn.execute("UPDATE escort_missions SET status = ?, notes = ? WHERE id = ?", (status, notes, eid))
        else:
            conn.execute("UPDATE escort_missions SET status = ? WHERE id = ?", (status, eid))
        conn.commit()
    return get_escort_mission_by_id(eid)

# ----------------- Training & Certifications -----------------
def get_all_training():
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM training_certifications ORDER BY id DESC").fetchall()
        return [dict(r) for r in rows]

def get_training_by_id(tid):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM training_certifications WHERE id = ?", (tid,)).fetchone()
        return dict(row) if row else None

def create_training(data):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO training_certifications (
                id, cert_number, personnel_id, name, course_title, category,
                issuing_authority, issue_date, expiry_date, proficiency_score, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["id"], data["cert_number"], data["personnel_id"], data["name"],
            data["course_title"], data["category"], data["issuing_authority"],
            data["issue_date"], data["expiry_date"], data["proficiency_score"],
            data["status"], data.get("notes", "")
        ))
        conn.commit()
    return get_training_by_id(data["id"])

def update_training(tid, data):
    fields = []
    values = []
    for k, v in data.items():
        if v is not None:
            fields.append(f"{k} = ?")
            values.append(v)
    if not fields:
        return get_training_by_id(tid)
    values.append(tid)
    with get_connection() as conn:
        conn.execute(f"UPDATE training_certifications SET {', '.join(fields)} WHERE id = ?", tuple(values))
        conn.commit()
    return get_training_by_id(tid)

def delete_training(tid):
    with get_connection() as conn:
        conn.execute("DELETE FROM training_certifications WHERE id = ?", (tid,))
        conn.commit()
    return True

# -------------------------------------------------------------
# Hierarchy Custom State Helpers
# -------------------------------------------------------------
def get_hierarchy_tree():
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM hierarchy_state WHERE id = 'current_tree'").fetchone()
        if row and row["tree_data"]:
            try:
                return json.loads(row["tree_data"])
            except Exception:
                return None
        return None

def save_hierarchy_tree(tree_dict, updated_by="admin"):
    with get_connection() as conn:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        tree_json = json.dumps(tree_dict)
        conn.execute("""
            INSERT INTO hierarchy_state (id, tree_data, updated_at, updated_by)
            VALUES ('current_tree', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                tree_data = excluded.tree_data,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by
        """, (tree_json, now_str, updated_by))
        conn.commit()
    return get_hierarchy_tree()

def reset_hierarchy_tree():
    with get_connection() as conn:
        conn.execute("DELETE FROM hierarchy_state WHERE id = 'current_tree'")
        conn.commit()
    return True

# -------------------------------------------------------------
# Disciplinary Letters & Decrees (Warning & Dismissal)
# -------------------------------------------------------------
def get_all_letters():
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM disciplinary_letters ORDER BY issue_date DESC, id DESC").fetchall()
        return [dict(r) for r in rows]

def get_letter_by_id(lid):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM disciplinary_letters WHERE id = ?", (lid,)).fetchone()
        return dict(row) if row else None

def create_letter(data):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO disciplinary_letters (
                id, letter_number, letter_type, personnel_id, recipient_name, badge_id, rank,
                issue_date, effective_date, violation_category, severity,
                incident_summary, sanctions, authorized_by, status, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["id"], data["letter_number"], data["letter_type"], data["personnel_id"],
            data["recipient_name"], data.get("badge_id", "-"), data.get("rank", "-"),
            data["issue_date"], data["effective_date"], data["violation_category"],
            data["severity"], data["incident_summary"], data["sanctions"],
            data["authorized_by"], data.get("status", "Active"), data.get("notes", ""),
            data.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        ))
        conn.commit()
    return get_letter_by_id(data["id"])

def update_letter_status(lid, status, notes=None):
    with get_connection() as conn:
        if notes is not None:
            conn.execute("UPDATE disciplinary_letters SET status = ?, notes = ? WHERE id = ?", (status, notes, lid))
        else:
            conn.execute("UPDATE disciplinary_letters SET status = ? WHERE id = ?", (status, lid))
        conn.commit()
    return get_letter_by_id(lid)

def delete_letter(lid):
    with get_connection() as conn:
        conn.execute("DELETE FROM disciplinary_letters WHERE id = ?", (lid,))
        conn.commit()
    return True


# -------------------------------------------------------------
# Infraction Point System (SS-SOP-ETH-001 Demerit Scoring Model)
# -------------------------------------------------------------

STANDARD_INFRACTION_CATALOG = [
    # Category I: Minor (1-3 Points)
    {"code": "I-01", "category": "Category I", "title": "Uniform & Grooming Irregularity", "points": 1, "default_decay_days": 90, "description": "Wrinkled suit, non-compliant necktie, missing formal leather shoes, dirty tactical uniform, or non-authorized accessories."},
    {"code": "I-02", "category": "Category I", "title": "Minor Shift Tardiness", "points": 1, "default_decay_days": 90, "description": "Reporting between 5 and 15 minutes late to pre-deployment briefings or post handovers without prior authorization."},
    {"code": "I-03", "category": "Category I", "title": "Administrative Logging Failure", "points": 1, "default_decay_days": 90, "description": "Failure to log session check-in, check-out, or escort count in the Central Duty Attendance System within two hours."},
    {"code": "I-04", "category": "Category I", "title": "Tactical Radio Protocol Laxity", "points": 2, "default_decay_days": 90, "description": "Using excessive banter, personal conversations, unauthorized slang, or unapproved communication channels during active transit."},
    {"code": "I-05", "category": "Category I", "title": "Equipment Neglect", "points": 3, "default_decay_days": 90, "description": "Deploying without completed firearm function checks, missing extra magazine, depleted radio battery, or failure to inspect vehicle fluid/fuel levels."},
    
    # Category II: Moderate (4-8 Points)
    {"code": "II-01", "category": "Category II", "title": "Unauthorized Absence / Post Abandonment (Ring 3)", "points": 4, "default_decay_days": 180, "description": "Leaving an outer perimeter post, gate barrier, or sentry station unattended for over 15 minutes without arranged relief."},
    {"code": "II-02", "category": "Category II", "title": "Unprofessional Civilian Conduct", "points": 5, "default_decay_days": 180, "description": "Engaging in heated verbal altercations, displaying rude conduct, or exhibiting abusive demeanor toward the public while in uniform."},
    {"code": "II-03", "category": "Category II", "title": "Motorcade Spacing / Convoy Driving Breach", "points": 5, "default_decay_days": 180, "description": "Careless driving, exceeding assigned convoy speeds, tailgating closer than tactical safety limits, or allowing civilian vehicles into the motorcade gap."},
    {"code": "II-04", "category": "Category II", "title": "Negligent Discharge (No Injury/Property Damage)", "points": 6, "default_decay_days": 180, "description": "Accidental weapon discharge during clearing barrel procedures or unholstering that does not result in personal injury or severe property damage."},
    {"code": "II-05", "category": "Category II", "title": "Failure to Report Security Anomaly", "points": 6, "default_decay_days": 180, "description": "Neglecting to report suspicious persons, perimeter tampering, unverified vehicles, or route obstacles observed during advance surveys."},
    {"code": "II-06", "category": "Category II", "title": "Minor Insubordination", "points": 8, "default_decay_days": 180, "description": "Hesitating, arguing, or delaying the execution of non-tactical administrative directives issued by supervisory non-commissioned officers."},
    
    # Category III: Severe (9-14 Points)
    {"code": "III-01", "category": "Category III", "title": "Tactical Insubordination", "points": 10, "default_decay_days": 365, "description": "Blatant refusal or willful defiance of a direct tactical command issued by the Detail Leader (COMMAND ONE) during an active mission."},
    {"code": "III-02", "category": "Category III", "title": "Unauthorized Release of Departmental Documents", "points": 10, "default_decay_days": 365, "description": "Sharing non-classified administrative memos, duty rosters, or internal guidelines with outside individuals without clearance."},
    {"code": "III-03", "category": "Category III", "title": "Abandonment of Ring 1 Close Protection Post", "points": 12, "default_decay_days": 365, "description": "Vacating immediate personal protective coverage around the Protectee without direct orders from the Detail Leader."},
    {"code": "III-04", "category": "Category III", "title": "Impairment on Duty / Alcohol & Substance Abuse", "points": 12, "default_decay_days": 365, "description": "Reporting for active shift or carrying department weapons with detectable blood alcohol content or under the influence of narcotics."},
    {"code": "III-05", "category": "Category III", "title": "Unjustified Escalation & Force Violation", "points": 12, "default_decay_days": 365, "description": "Drawing a firearm, discharging a Taser, or utilizing physical violence against a subject outside the authorized Rules of Engagement continuum."},
    {"code": "III-06", "category": "Category III", "title": "Negligent Weapon Discharge Resulting in Injury", "points": 14, "default_decay_days": 365, "description": "Accidental discharge causing personal bodily injury, requiring immediate suspension and mandatory formal court of inquiry."},
    
    # Category IV: Critical Breaches / Gross Misconduct (15+ Points / Immediate Expulsion)
    {"code": "IV-01", "category": "Category IV", "title": "Treason, Espionage, and Hostile Collusion", "points": 15, "default_decay_days": 0, "description": "Communicating with, aiding, or providing intelligence to hostile factions, criminals, or enemy organizations."},
    {"code": "IV-02", "category": "Category IV", "title": "Compromising Live Itineraries / Secret Routes", "points": 15, "default_decay_days": 0, "description": "Intentionally or recklessly disclosing real-time motorcade routes, departure timestamps, radio ciphers, or safehouse coordinates."},
    {"code": "IV-03", "category": "Category IV", "title": "Cowardice and Abandonment of Protectee Under Fire", "points": 15, "default_decay_days": 0, "description": "Fleeing, hiding, or abandoning the Protectee during an active armed ambush or assassination attempt instead of executing Shield and Extract drills."},
    {"code": "IV-04", "category": "Category IV", "title": "Unlawful Lethal Force", "points": 15, "default_decay_days": 0, "description": "Intentionally discharging a weapon resulting in the unjustified death or severe maiming of an unarmed non-combatant."},
    {"code": "IV-05", "category": "Category IV", "title": "Mutiny or Armed Threat Against Superior Officers", "points": 15, "default_decay_days": 0, "description": "Drawing weapons, inciting revolt, or threatening bodily harm against the Director, Deputy Director, or supervisory commanders."},
    
    # Merit Offsets (Good-Conduct Deductions)
    {"code": "M-01", "category": "Merit Deduction", "title": "Tactical Commendation", "points": -3, "default_decay_days": 0, "description": "Demonstrating extraordinary defensive courage, taking fire to shield a Protectee, or neutralizing an active ambush (Reduces active penalty points by 3 to 5 Points upon Director approval)."},
    {"code": "M-02", "category": "Merit Deduction", "title": "Voluntary Extra Deployments", "points": -2, "default_decay_days": 0, "description": "Completing twenty (20) voluntary, unblemished high-risk night shift escorts (Reduces active penalty points by 2 Points)."}
]

def get_threshold_info(active_points: int):
    points = max(0, active_points)
    if points <= 2:
        return {
            "tier": 0,
            "status_label": "Clean / Monitored",
            "badge_color": "#10b981",
            "badge_bg": "rgba(16, 185, 129, 0.15)",
            "sanction_summary": "Standard operational standing. Under routine supervisory monitoring.",
            "recommended_letter": None,
        }
    elif points <= 5:
        return {
            "tier": 1,
            "status_label": "Formal Counseling",
            "badge_color": "#0ea5e9",
            "badge_bg": "rgba(14, 165, 233, 0.15)",
            "sanction_summary": "Formal Supervisory Counseling Record. 40 hours remedial static gate sentry duty (Ring 3).",
            "recommended_letter": "Counseling Record",
        }
    elif points <= 9:
        return {
            "tier": 2,
            "status_label": "Warning Notice 1 (Probation)",
            "badge_color": "#f59e0b",
            "badge_bg": "rgba(245, 158, 11, 0.15)",
            "sanction_summary": "Disciplinary Warning Notice Level 1 (DWN-01). 14-day operational probation & disqualified from Ring 1 / CHARIOT.",
            "recommended_letter": "First Written Warning",
        }
    elif points <= 14:
        return {
            "tier": 3,
            "status_label": "Warning Notice 2 (Suspension)",
            "badge_color": "#f97316",
            "badge_bg": "rgba(249, 115, 22, 0.15)",
            "sanction_summary": "Disciplinary Warning Notice Level 2 (DWN-02). 30-day suspension without deployment & qualification demotion.",
            "recommended_letter": "Second Written Warning",
        }
    else:
        return {
            "tier": 4,
            "status_label": "Dismissal Decree (DISBANDED)",
            "badge_color": "#ef4444",
            "badge_bg": "rgba(239, 68, 68, 0.15)",
            "sanction_summary": "Decree of Member Dismissal (DMD). Revocation of credentials, badges, firearms, and permanent dishonorable discharge.",
            "recommended_letter": "Dismissal / Termination Letter",
        }

def auto_decay_infractions():
    today_str = date.today().isoformat()
    with get_connection() as conn:
        conn.execute("""
            UPDATE infractions 
            SET status = 'Decayed' 
            WHERE status = 'Active' 
              AND decay_date IS NOT NULL 
              AND decay_date != '' 
              AND decay_date < ?
        """, (today_str,))
        conn.commit()

def get_all_infractions():
    auto_decay_infractions()
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM infractions ORDER BY incident_date DESC, created_at DESC").fetchall()
        return [dict(r) for r in rows]

def get_infractions_by_personnel(personnel_id: str):
    auto_decay_infractions()
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM infractions WHERE personnel_id = ? ORDER BY incident_date DESC, created_at DESC", (personnel_id,)).fetchall()
        return [dict(r) for r in rows]

def get_infraction_by_id(iid: str):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM infractions WHERE id = ?", (iid,)).fetchone()
        return dict(row) if row else None

def create_infraction(data: dict):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO infractions (
                id, personnel_id, recipient_name, badge_id, rank,
                infraction_code, category, title, points, description,
                location, incident_date, issued_by, status, decay_date, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["id"], data["personnel_id"], data["recipient_name"], data.get("badge_id", "-"),
            data.get("rank", "-"), data["infraction_code"], data["category"], data["title"],
            int(data["points"]), data["description"], data.get("location", ""),
            data["incident_date"], data["issued_by"], data.get("status", "Active"),
            data.get("decay_date"), data.get("notes", ""),
            data.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        ))
        conn.commit()
    return get_infraction_by_id(data["id"])

def update_infraction_status(iid: str, status: str, notes: str = None):
    with get_connection() as conn:
        if notes is not None:
            conn.execute("UPDATE infractions SET status = ?, notes = ? WHERE id = ?", (status, notes, iid))
        else:
            conn.execute("UPDATE infractions SET status = ? WHERE id = ?", (status, iid))
        conn.commit()
    return get_infraction_by_id(iid)

def delete_infraction(iid: str):
    with get_connection() as conn:
        conn.execute("DELETE FROM infractions WHERE id = ?", (iid,))
        conn.commit()
    return True

def get_single_personnel_infraction_summary(personnel_id: str):
    auto_decay_infractions()
    personnel = get_personnel_by_id(personnel_id)
    if not personnel:
        return None
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM infractions WHERE personnel_id = ?", (personnel_id,)).fetchall()
        inf_list = [dict(r) for r in rows]
    
    active_points = sum(r["points"] for r in inf_list if r["status"] == "Active")
    active_points = max(0, active_points)
    
    active_count = len([r for r in inf_list if r["status"] == "Active"])
    decayed_count = len([r for r in inf_list if r["status"] == "Decayed"])
    threshold_info = get_threshold_info(active_points)
    
    return {
        "personnel_id": personnel["id"],
        "name": personnel["name"],
        "badge_id": personnel.get("badge_id", "-"),
        "rank": personnel.get("rank", "-"),
        "status": personnel.get("status", "Active"),
        "division": personnel.get("division", "Unassigned"),
        "active_points": active_points,
        "total_records": len(inf_list),
        "active_records_count": active_count,
        "decayed_records_count": decayed_count,
        "threshold_info": threshold_info,
    }

def get_all_personnel_infraction_summaries():
    auto_decay_infractions()
    all_p = get_all_personnel()
    with get_connection() as conn:
        all_infs = conn.execute("SELECT * FROM infractions").fetchall()
        all_infs_dict = [dict(r) for r in all_infs]
    
    summaries = []
    for p in all_p:
        p_infs = [r for r in all_infs_dict if r["personnel_id"] == p["id"]]
        active_points = sum(r["points"] for r in p_infs if r["status"] == "Active")
        active_points = max(0, active_points)
        threshold_info = get_threshold_info(active_points)
        summaries.append({
            "personnel_id": p["id"],
            "name": p["name"],
            "badge_id": p.get("badge_id", "-"),
            "rank": p.get("rank", "-"),
            "status": p.get("status", "Active"),
            "division": p.get("division", "Unassigned"),
            "active_points": active_points,
            "total_records": len(p_infs),
            "active_records_count": len([r for r in p_infs if r["status"] == "Active"]),
            "decayed_records_count": len([r for r in p_infs if r["status"] == "Decayed"]),
            "threshold_info": threshold_info,
        })
    # Sort by highest active points first
    summaries.sort(key=lambda s: s["active_points"], reverse=True)
    return summaries


# -------------------------------------------------------------
# Tactical Operations & Dispatch Chat Messages
# -------------------------------------------------------------

def get_chat_messages(limit: int = 60):
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM chat_messages ORDER BY created_at DESC, id DESC LIMIT ?",
            (limit,)
        ).fetchall()
        return [dict(r) for r in rows]

def get_chat_message_by_id(mid: str):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM chat_messages WHERE id = ?", (mid,)).fetchone()
        return dict(row) if row else None

def create_chat_message(data: dict):
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO chat_messages (
                id, user_id, personnel_id, sender_name, sender_rank,
                sender_role, badge_id, message, message_type, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["id"], data.get("user_id"), data.get("personnel_id"),
            data["sender_name"], data["sender_rank"], data["sender_role"],
            data.get("badge_id", "-"), data["message"],
            data.get("message_type", "Standard"),
            data.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        ))
        conn.commit()
    return get_chat_message_by_id(data["id"])

def delete_chat_message(mid: str):
    with get_connection() as conn:
        conn.execute("DELETE FROM chat_messages WHERE id = ?", (mid,))
        conn.commit()
    return True


# -------------------------------------------------------------
# Department Vehicles Fleet & Ownership
# -------------------------------------------------------------

VALID_VEHICLE_MODELS = [
    "Armored Riot Van",
    "Patrol Motorcycle",
    "G500",
    "Hyundai IONIQ 4",
    "Presidential Limo"
]

def get_all_vehicles():
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM department_vehicles ORDER BY id ASC").fetchall()
        return [dict(r) for r in rows]

def get_vehicle_by_id(vid: str):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM department_vehicles WHERE id = ?", (vid,)).fetchone()
        return dict(row) if row else None

def get_vehicles_by_personnel_id(pid: str):
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM department_vehicles WHERE personnel_id = ? ORDER BY id ASC", (pid,)).fetchall()
        return [dict(r) for r in rows]

def create_vehicle(data: dict):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        # Determine ID if not specified
        vid = data.get("id")
        if not vid:
            # find next available VEH-XXX number
            rows = conn.execute("SELECT id FROM department_vehicles").fetchall()
            max_num = 0
            for r in rows:
                m_match = re.search(r"VEH-(\d+)", r["id"] or "")
                if m_match:
                    num = int(m_match.group(1))
                    if num > max_num:
                        max_num = num
            vid = f"VEH-{(max_num + 1):03d}"

        conn.execute("""
            INSERT INTO department_vehicles (
                id, model, plate_number, personnel_id, assigned_to, badge_id, division,
                status, assigned_date, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            vid,
            data["model"],
            data["plate_number"].strip().upper(),
            data.get("personnel_id") if data.get("personnel_id") else None,
            data.get("assigned_to", "Unassigned / Motor Pool"),
            data.get("badge_id", "-"),
            data.get("division", "Motor Pool"),
            data.get("status", "Available"),
            data.get("assigned_date", date.today().isoformat()),
            data.get("notes", ""),
            now_str,
            now_str
        ))
        conn.commit()
    return get_vehicle_by_id(vid)

def update_vehicle(vid: str, data: dict):
    existing = get_vehicle_by_id(vid)
    if not existing:
        return None
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    model = data.get("model", existing["model"])
    plate_number = data.get("plate_number", existing["plate_number"]).strip().upper()
    personnel_id = data.get("personnel_id") if data.get("personnel_id") is not None else existing.get("personnel_id")
    # If personnel_id is empty string, convert to None
    if personnel_id == "":
        personnel_id = None

    assigned_to = data.get("assigned_to", existing.get("assigned_to", "Unassigned / Motor Pool"))
    badge_id = data.get("badge_id", existing.get("badge_id", "-"))
    division = data.get("division", existing.get("division", "Motor Pool"))
    status = data.get("status", existing.get("status", "Available"))
    assigned_date = data.get("assigned_date", existing.get("assigned_date"))
    notes = data.get("notes", existing.get("notes", ""))

    with get_connection() as conn:
        conn.execute("""
            UPDATE department_vehicles
            SET model = ?, plate_number = ?, personnel_id = ?, assigned_to = ?,
                badge_id = ?, division = ?, status = ?, assigned_date = ?,
                notes = ?, updated_at = ?
            WHERE id = ?
        """, (
            model, plate_number, personnel_id, assigned_to, badge_id,
            division, status, assigned_date, notes, now_str, vid
        ))
        conn.commit()
    return get_vehicle_by_id(vid)

def delete_vehicle(vid: str):
    with get_connection() as conn:
        conn.execute("DELETE FROM department_vehicles WHERE id = ?", (vid,))
        conn.commit()
    return True

# -------------------------------------------------------------
# Resignation Proposals DB Helpers
# -------------------------------------------------------------

def get_all_resignation_proposals():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM resignation_proposals ORDER BY created_at DESC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_resignation_proposal_by_id(proposal_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM resignation_proposals WHERE id = ? OR proposal_number = ?", (proposal_id, proposal_id))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_pending_resignation_by_personnel_id(personnel_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM resignation_proposals WHERE personnel_id = ? AND status = 'Pending'", (personnel_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_resignation_proposal(data: dict):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO resignation_proposals (
            id, proposal_number, personnel_id, officer_name, badge_id, rank, division,
            submission_date, effective_date, reason_category, reason_details, handover_notes,
            status, reviewed_by, reviewed_by_rank, review_date, review_notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["id"],
        data["proposal_number"],
        data["personnel_id"],
        data["officer_name"],
        data["badge_id"],
        data["rank"],
        data.get("division", "Unassigned"),
        data["submission_date"],
        data["effective_date"],
        data["reason_category"],
        data["reason_details"],
        data.get("handover_notes", ""),
        data.get("status", "Pending"),
        data.get("reviewed_by", ""),
        data.get("reviewed_by_rank", ""),
        data.get("review_date", ""),
        data.get("review_notes", ""),
        data["created_at"],
    ))
    conn.commit()
    conn.close()
    return data

def review_resignation_proposal(proposal_id: str, status: str, reviewed_by: str, reviewed_by_rank: str, review_notes: str, review_date: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE resignation_proposals
        SET status = ?, reviewed_by = ?, reviewed_by_rank = ?, review_notes = ?, review_date = ?
        WHERE id = ?
    """, (status, reviewed_by, reviewed_by_rank, review_notes, review_date, proposal_id))
    conn.commit()
    conn.close()
    return get_resignation_proposal_by_id(proposal_id)

def withdraw_resignation_proposal(proposal_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE resignation_proposals
        SET status = 'Withdrawn'
        WHERE id = ? AND status = 'Pending'
    """, (proposal_id,))
    conn.commit()
    conn.close()
    return get_resignation_proposal_by_id(proposal_id)

def discharge_personnel_resignation(pid: str):
    with get_connection() as conn:
        conn.execute("UPDATE personnel SET status = 'Disbanded' WHERE id = ?", (pid,))
        conn.execute("UPDATE users SET status = 'Disbanded' WHERE personnel_id = ?", (pid,))
        conn.execute("""
            UPDATE department_vehicles
            SET personnel_id = NULL, assigned_to = 'Unassigned / Motor Pool', badge_id = '-', status = 'Available'
            WHERE personnel_id = ?
        """, (pid,))
        conn.commit()
    return True

# -------------------------------------------------------------
# Reinstatement Requests DB Helpers (For Disbanded Units Only)
# -------------------------------------------------------------

def get_all_reinstatement_requests():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reinstatement_requests ORDER BY created_at DESC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_reinstatement_request_by_id(req_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reinstatement_requests WHERE id = ? OR request_number = ?", (req_id, req_id))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_pending_reinstatement_by_user_id(user_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reinstatement_requests WHERE user_id = ? AND status = 'Pending'", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_reinstatement_request(data: dict):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reinstatement_requests (
            id, request_number, user_id, username, personnel_id, officer_name,
            badge_id, prior_rank, prior_division, appeal_reason, commitment_statement,
            status, reviewed_by, reviewed_by_rank, review_date, review_notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["id"],
        data["request_number"],
        data["user_id"],
        data["username"],
        data["personnel_id"],
        data["officer_name"],
        data["badge_id"],
        data["prior_rank"],
        data["prior_division"],
        data["appeal_reason"],
        data["commitment_statement"],
        data.get("status", "Pending"),
        data.get("reviewed_by", ""),
        data.get("reviewed_by_rank", ""),
        data.get("review_date", ""),
        data.get("review_notes", ""),
        data["created_at"],
    ))
    conn.commit()
    conn.close()
    return data

def review_reinstatement_request(req_id: str, status: str, reviewed_by: str, reviewed_by_rank: str, review_notes: str, review_date: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE reinstatement_requests
        SET status = ?, reviewed_by = ?, reviewed_by_rank = ?, review_notes = ?, review_date = ?
        WHERE id = ?
    """, (status, reviewed_by, reviewed_by_rank, review_notes, review_date, req_id))
    conn.commit()
    conn.close()
    return get_reinstatement_request_by_id(req_id)

def reinstate_disbanded_personnel(user_id: str, pid: str):
    with get_connection() as conn:
        conn.execute("UPDATE users SET status = 'Active' WHERE id = ?", (user_id,))
        if pid:
            conn.execute("UPDATE personnel SET status = 'Active' WHERE id = ?", (pid,))
        conn.commit()
    return True



