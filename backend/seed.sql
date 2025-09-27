-- ==========================
-- RESET EXISTING DATA
-- ==========================
DELETE FROM payroll;
DELETE FROM rosters;
DELETE FROM staff_shifts;
DELETE FROM staff_employment;
DELETE FROM users;
DELETE FROM staff;
DELETE FROM venues;
DELETE FROM businesses;

-- Reset AUTOINCREMENT counters
DELETE FROM sqlite_sequence WHERE name IN ('payroll','rosters','staff_shifts','staff_employment','users','staff','venues','businesses');

-- ==========================
-- DEMO SEED DATA
-- ==========================

-- Business
INSERT INTO businesses (business_code, name, owner_name, state, location, contact_email)
VALUES (1001, 'Demo Co', 'Vinny', 'NSW', 'Sydney', 'demo@demo.co');

-- Venue (with kiosk login)
INSERT INTO venues (
  venue_code, business_id, venue_name, state, location, contact_email,
  kiosk_username, kiosk_password, status
)
VALUES (
  2001, 1, 'Demo Venue', 'NSW', 'Sydney', 'venue@demo.co',
  'kiosk_demo', 'kiosk123', 'active'
);

-- Staff (System Admin)
INSERT INTO staff (staff_code, business_id, venue_id, first_name, last_name, created_by)
VALUES (3001, 1, 1, 'Alice', 'Admin', 1);

-- Employment record for Alice
INSERT INTO staff_employment (
  staff_id, employment_type, role_title, start_date, employment_status,
  default_hours_per_week, weekday_rate, saturday_rate, sunday_rate,
  public_holiday_rate, overtime_rate, pay_frequency
)
VALUES (
  1, 'full_time', 'System Admin', date('now'), 'active',
  40, 30, 45, 60, 90, 45, 'monthly'
);

-- User login for Alice (Admin Panel)
INSERT INTO users (
  username, password_hash, access_level, status, staff_id, venue_id, business_id
)
VALUES (
  'alice.admin', 'admin123', 'system_admin', 'active', 1, 1, 1
);

-- Sample manager staff
INSERT INTO staff (staff_code, business_id, venue_id, first_name, last_name, created_by)
VALUES (3002, 1, 1, 'Bob', 'Manager', 1);

INSERT INTO staff_employment (
  staff_id, employment_type, role_title, start_date, employment_status,
  default_hours_per_week, weekday_rate, saturday_rate, sunday_rate,
  public_holiday_rate, overtime_rate, pay_frequency
)
VALUES (
  2, 'full_time', 'Manager', date('now'), 'active',
  38, 28, 42, 56, 84, 42, 'monthly'
);

INSERT INTO users (
  username, password_hash, access_level, status, staff_id, venue_id, business_id
)
VALUES (
  'bob.manager', 'manager123', 'manager', 'active', 2, 1, 1
);

-- Sample employee staff
INSERT INTO staff (staff_code, business_id, venue_id, first_name, middle_name, last_name, created_by)
VALUES (3003, 1, 1, 'Charlie', 'J', 'Worker', 1);

INSERT INTO staff_employment (
  staff_id, employment_type, role_title, start_date, employment_status,
  default_hours_per_week, weekday_rate, saturday_rate, sunday_rate,
  public_holiday_rate, overtime_rate, pay_frequency
)
VALUES (
  3, 'part_time', 'Floor Staff', date('now'), 'active',
  25, 22, 33, 44, 66, 33, 'weekly'
);

INSERT INTO users (
  username, password_hash, access_level, status, staff_id, venue_id, business_id
)
VALUES (
  'charlie.worker', 'worker123', 'employee', 'active', 3, 1, 1
);