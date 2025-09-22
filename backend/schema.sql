PRAGMA foreign_keys = ON;

CREATE TABLE businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_code INTEGER UNIQUE,
  name TEXT NOT NULL,
  abn TEXT,
  owner_name TEXT,
  state TEXT,
  location TEXT,
  contact_email TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME
);

CREATE TABLE venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_code INTEGER UNIQUE,
  business_id INTEGER NOT NULL,
  venue_name TEXT NOT NULL,
  state TEXT NOT NULL,
  location TEXT NOT NULL,
  subscription_status TEXT NOT NULL DEFAULT 'active',
  subscription_plan TEXT NOT NULL DEFAULT 'standard',
  subscription_expiry DATE NOT NULL,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_code INTEGER UNIQUE,
  business_id INTEGER NOT NULL,
  venue_id INTEGER NOT NULL,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  dob DATE,
  gender TEXT,
  visa_status TEXT,
  full_address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME,
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT,
  status TEXT,
  staff_id INTEGER,
  venue_id INTEGER,
  business_id INTEGER,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME,
  UNIQUE (business_id, username),
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE staff_employment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER UNIQUE NOT NULL,
  employment_type TEXT,
  role_title TEXT,
  award_level TEXT,
  start_date DATE,
  employment_status TEXT,
  default_hours_per_week INTEGER,
  weekday_rate REAL,
  saturday_rate REAL,
  sunday_rate REAL,
  public_holiday_rate REAL,
  overtime_rate REAL,
  pay_frequency TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE TABLE staff_compliance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER UNIQUE NOT NULL,
  tfn TEXT,
  superfund_name TEXT,
  super_member_id TEXT,
  payroll_ref TEXT,
  bank_account_name TEXT,
  bank_bsb TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE TABLE staff_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER UNIQUE NOT NULL,
  contract_file TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE TABLE staff_shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  venue_id INTEGER NOT NULL,
  clock_in DATETIME,
  clock_out DATETIME,
  duration REAL,
  payday_type TEXT,
  hourly_rate REAL,
  total_pay REAL,
  approved_by INTEGER,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME,
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);
