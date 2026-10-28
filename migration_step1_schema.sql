-- =========================================================================
-- STEP 1 (PERFECT SCHEMA): EXACT DATABASE DEFINITIONS
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS public.hierarchy_state CASCADE;
DROP TABLE IF EXISTS public.disciplinary_letters CASCADE;
DROP TABLE IF EXISTS public.reinstatement_requests CASCADE;
DROP TABLE IF EXISTS public.resignation_proposals CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.infractions CASCADE;
DROP TABLE IF EXISTS public.training_certifications CASCADE;
DROP TABLE IF EXISTS public.department_vehicles CASCADE;
DROP TABLE IF EXISTS public.escort_missions CASCADE;
DROP TABLE IF EXISTS public.depot_stockpiles CASCADE;
DROP TABLE IF EXISTS public.armory CASCADE;
DROP TABLE IF EXISTS public.payroll CASCADE;
DROP TABLE IF EXISTS public.presence CASCADE;
DROP TABLE IF EXISTS public.personnel CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 1. USERS
CREATE TABLE public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT,
  personnel_id TEXT,
  name TEXT,
  rank TEXT DEFAULT 'Officer I',
  role TEXT DEFAULT 'OFFICER',
  status TEXT DEFAULT 'Active',
  division TEXT,
  badge_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  last_login TIMESTAMPTZ,
  discord_id TEXT,
  discord_username TEXT,
  discord_avatar TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PERSONNEL
CREATE TABLE public.personnel (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  badge_id TEXT,
  rank TEXT DEFAULT 'Officer I',
  join_date TEXT,
  license_certificate TEXT,
  status TEXT DEFAULT 'Active',
  division TEXT,
  phone_number TEXT,
  id_card_number TEXT,
  id_card_expiry TEXT,
  driving_license_number TEXT,
  driving_license_expiry TEXT,
  expungement_letter_number TEXT,
  expungement_letter_expiry TEXT,
  id_card_image TEXT,
  driving_license_image TEXT,
  expungement_letter_image TEXT,
  plate_riot_van TEXT,
  plate_patrol_motorcycle TEXT,
  plate_g500 TEXT,
  plate_ioniq_4 TEXT,
  plate_presidential_limo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRESENCE
CREATE TABLE public.presence (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  shift TEXT,
  personnel_id TEXT,
  name TEXT NOT NULL,
  badge_id TEXT,
  rank TEXT,
  division TEXT,
  time_in TEXT,
  time_out TEXT,
  duration TEXT,
  escort_count INTEGER DEFAULT 0,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PAYROLL
CREATE TABLE public.payroll (
  id TEXT PRIMARY KEY,
  personnel_id TEXT,
  name TEXT NOT NULL,
  rank TEXT,
  salary NUMERIC DEFAULT 0,
  salary_date TEXT,
  week_number INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ARMORY
CREATE TABLE public.armory (
  id TEXT PRIMARY KEY,
  restock_date TEXT,
  name TEXT,
  item_type TEXT,
  item TEXT NOT NULL,
  serial_number TEXT,
  quantity INTEGER DEFAULT 1,
  condition TEXT DEFAULT 'Operational',
  status TEXT DEFAULT 'Available',
  assigned_to TEXT,
  issue_date TEXT,
  expected_return TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. DEPOT STOCKPILES
CREATE TABLE public.depot_stockpiles (
  item_type TEXT NOT NULL,
  item TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  PRIMARY KEY (item_type, item)
);

-- 7. ESCORT MISSIONS
CREATE TABLE public.escort_missions (
  id TEXT PRIMARY KEY,
  principal TEXT,
  threat_level TEXT DEFAULT 'Low (Level 1)',
  mission_type TEXT,
  origin TEXT,
  destination TEXT,
  destinations_json TEXT,
  lead_agent TEXT,
  lead_agent_id TEXT,
  team_size INTEGER DEFAULT 1,
  assigned_personnel_json TEXT,
  vehicle_convoy TEXT,
  start_time TEXT,
  estimated_completion TEXT,
  status TEXT DEFAULT 'Scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DEPARTMENT VEHICLES
CREATE TABLE public.department_vehicles (
  id TEXT PRIMARY KEY,
  vehicle_name TEXT NOT NULL,
  vehicle_type TEXT,
  plate_number TEXT UNIQUE NOT NULL,
  assigned_to_id TEXT,
  assigned_to_name TEXT,
  assigned_to_rank TEXT,
  status TEXT DEFAULT 'Available',
  assigned_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TRAINING & CERTIFICATIONS
CREATE TABLE public.training_certifications (
  id TEXT PRIMARY KEY,
  personnel_id TEXT,
  officer_name TEXT,
  certification_name TEXT,
  status TEXT DEFAULT 'Certified',
  issued_date TEXT,
  expiry_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. INFRACTIONS
CREATE TABLE public.infractions (
  id TEXT PRIMARY KEY,
  officer_id TEXT NOT NULL,
  officer_name TEXT,
  badge_id TEXT,
  code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  points INTEGER DEFAULT 0,
  issued_by TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- 11. CHAT MESSAGES & SYSTEM AUDIT
CREATE TABLE public.chat_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT,
  sender_name TEXT,
  sender_rank TEXT,
  sender_avatar TEXT,
  message TEXT NOT NULL,
  channel TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. RESIGNATION PROPOSALS
CREATE TABLE public.resignation_proposals (
  id TEXT PRIMARY KEY,
  proposal_number TEXT UNIQUE,
  officer_id TEXT,
  officer_name TEXT,
  rank TEXT,
  reason TEXT,
  status TEXT DEFAULT 'Pending Review',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. REINSTATEMENT REQUESTS
CREATE TABLE public.reinstatement_requests (
  id TEXT PRIMARY KEY,
  officer_id TEXT,
  officer_name TEXT,
  badge_id TEXT,
  rank TEXT,
  reason TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. DISCIPLINARY LETTERS
CREATE TABLE public.disciplinary_letters (
  id TEXT PRIMARY KEY,
  letter_number TEXT UNIQUE,
  letter_type TEXT,
  personnel_id TEXT,
  recipient_name TEXT,
  badge_id TEXT,
  rank TEXT,
  issue_date TEXT,
  effective_date TEXT,
  violation_category TEXT,
  severity TEXT,
  incident_summary TEXT,
  sanctions TEXT,
  authorized_by TEXT,
  status TEXT DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. HIERARCHY STATE
CREATE TABLE public.hierarchy_state (
  id TEXT PRIMARY KEY,
  tree_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- REALTIME CONFIGURATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escort_missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.personnel;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll;
ALTER PUBLICATION supabase_realtime ADD TABLE public.armory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.infractions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resignation_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- DISABLE RLS FOR APPLICATION ACCESS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.armory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.depot_stockpiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.escort_missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_certifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.infractions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.resignation_proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reinstatement_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_letters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hierarchy_state DISABLE ROW LEVEL SECURITY;
