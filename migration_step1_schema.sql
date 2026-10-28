-- =========================================================================
-- STEP 1: SCHEMA, TABLES, EXTENSIONS, REALTIME & RLS SETUP
-- Paste into Supabase SQL Editor and click RUN.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing if needed
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
  name TEXT,
  role TEXT DEFAULT 'OFFICER',
  badge_id TEXT,
  rank TEXT DEFAULT 'Officer I',
  personnel_id TEXT,
  status TEXT DEFAULT 'Active',
  division TEXT,
  discord_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  id_card_image TEXT,
  driving_license_number TEXT,
  driving_license_expiry TEXT,
  driving_license_image TEXT,
  expungement_letter_number TEXT,
  expungement_letter_expiry TEXT,
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
  name TEXT NOT NULL,
  badge_id TEXT,
  time_in TEXT,
  time_out TEXT,
  duration TEXT,
  escort_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PAYROLL
CREATE TABLE public.payroll (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rank TEXT,
  salary NUMERIC DEFAULT 0,
  salary_date TEXT,
  week_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ARMORY
CREATE TABLE public.armory (
  id TEXT PRIMARY KEY,
  item TEXT NOT NULL,
  category TEXT,
  serial_number TEXT,
  allocated_to TEXT,
  status TEXT DEFAULT 'Available',
  condition TEXT DEFAULT 'Operational',
  quantity INTEGER DEFAULT 1,
  ammo_allocated TEXT,
  issue_date TEXT,
  return_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. DEPOT STOCKPILES
CREATE TABLE public.depot_stockpiles (
  id TEXT PRIMARY KEY,
  item_key TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT,
  stockpile INTEGER DEFAULT 0,
  issued INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'units',
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  model_name TEXT NOT NULL,
  plate_number TEXT UNIQUE NOT NULL,
  assigned_to TEXT,
  assigned_officer_id TEXT,
  status TEXT DEFAULT 'Available',
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  recipient_id TEXT,
  recipient_name TEXT,
  recipient_badge TEXT,
  recipient_rank TEXT,
  letter_type TEXT,
  content TEXT,
  issued_by TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. HIERARCHY STATE
CREATE TABLE public.hierarchy_state (
  id TEXT PRIMARY KEY,
  state_json TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
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

-- DISABLE RLS FOR SEAMLESS APPLICATION ACCESS
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
