PRAGMA foreign_keys = ON;

-- ==============================
-- Businesses
-- ==============================
CREATE TABLE businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_code INTEGER UNIQUE,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  state TEXT NOT NULL,
  location TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

-- ==============================
-- Venues (with kiosk login)
-- ==============================
CREATE TABLE venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_code INTEGER UNIQUE,
  business_id INTEGER NOT NULL,
  venue_name TEXT NOT NULL,
  state TEXT NOT NULL,
  location TEXT NOT NULL,
  contact_email TEXT,
  kiosk_username TEXT NOT NULL,
  kiosk_password TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- ==============================
-- Staff
-- ==============================
CREATE TABLE staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_code INTEGER UNIQUE,
  business_id INTEGER NOT NULL,
  venue_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  dob TEXT,
  gender TEXT,
  full_address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- ==============================
-- Staff Employment
-- ==============================
CREATE TABLE staff_employment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  employment_type TEXT DEFAULT 'full_time',
  role_title TEXT,
  start_date DATE NOT NULL,
  employment_status TEXT DEFAULT 'active',
  default_hours_per_week INTEGER DEFAULT 40,
  pay_frequency TEXT DEFAULT 'monthly',
  weekday_rate REAL DEFAULT 0,
  saturday_rate REAL DEFAULT 0,
  sunday_rate REAL DEFAULT 0,
  public_holiday_rate REAL DEFAULT 0,
  overtime_rate REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- ==============================
-- Users (Admin + Staff logins)
-- ==============================
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  access_level TEXT NOT NULL, -- system_admin, manager, supervisor, employee
  status TEXT DEFAULT 'active',
  staff_id INTEGER,
  venue_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  UNIQUE (venue_id, username)
);

-- ==============================
-- Staff Shifts (Kiosk clock-in/out)
-- ==============================
CREATE TABLE staff_shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  venue_id INTEGER NOT NULL,
  clock_in DATETIME,
  clock_out DATETIME,
  payday TEXT,
  hours_worked REAL,
  total_pay REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- ==============================
-- Rosters (scheduling)
-- ==============================
CREATE TABLE rosters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  venue_id INTEGER NOT NULL,
  shift_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- ==============================
-- Payroll (future-proof, optional)
-- ==============================
CREATE TABLE payroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  venue_id INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  hours_worked REAL DEFAULT 0,
  total_pay REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);