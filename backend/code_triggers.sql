PRAGMA foreign_keys = ON;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_set_business_code;
DROP TRIGGER IF EXISTS trg_set_venue_code;
DROP TRIGGER IF EXISTS trg_set_staff_code;

-- Create trigger for business code generation
CREATE TRIGGER trg_set_business_code AFTER INSERT ON businesses
BEGIN
  UPDATE businesses
  SET business_code = 10000000 + NEW.id,
      updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- Create trigger for venue code generation
CREATE TRIGGER trg_set_venue_code AFTER INSERT ON venues
BEGIN
  UPDATE venues
  SET venue_code = 20000000 + NEW.id,
      updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- Create trigger for staff code generation
CREATE TRIGGER trg_set_staff_code AFTER INSERT ON staff
BEGIN
  UPDATE staff
  SET staff_code = 30000000 + NEW.id,
      updated_at = datetime('now')
  WHERE id = NEW.id;
END;