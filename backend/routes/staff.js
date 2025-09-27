// backend/routes/staff.js
const express = require("express");
const db = require("../db");
const { requireRole, restrictVenue, checkSelf } = require("../authMiddleware");

const router = express.Router();

// ==========================
// GET ALL STAFF (system_admin, manager, supervisor)
// ==========================
router.get("/",
  requireRole(["system_admin", "manager", "supervisor"]),
  restrictVenue(),
  (req, res) => {
    try {
      console.log("📋 Staff list request:", {
        currentUser: req.currentUser,
        query: req.query
      });

      const { business_id, venue_id, access_level } = req.currentUser || {};

      if (!business_id) {
        return res.status(400).json({ error: "Missing business_id" });
      }

      // Build query safely
      let sql = `
        SELECT s.*, se.role_title, se.start_date, se.employment_status,
               se.weekday_rate, u.access_level, v.venue_name
        FROM staff s
        LEFT JOIN staff_employment se ON s.id = se.staff_id
        LEFT JOIN users u ON s.id = u.staff_id
        LEFT JOIN venues v ON s.venue_id = v.id
        WHERE s.business_id = ?
      `;
      const params = [business_id];

      if (access_level === "manager" && venue_id) {
        sql += " AND s.venue_id = ?";
        params.push(venue_id);
      }

      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error("❌ Staff query error:", err.message);
          return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ data: rows });
      });

    } catch (err) {
      console.error("❌ Staff GET crash:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ==========================
// GET STAFF BY ID
// ==========================
router.get("/:id",
  requireRole(["system_admin", "manager", "supervisor", "employee"]),
  checkSelf("id"),
  (req, res) => {

    const { business_id } = req.currentUser;
    const staffId = req.params.id;

    if (!business_id) {
      return res.status(400).json({ error: "business_id is required" });
    }

    const sql = `
      SELECT s.*, se.*, u.access_level, v.venue_name
      FROM staff s
      LEFT JOIN staff_employment se ON s.id = se.staff_id
      LEFT JOIN users u ON u.staff_id = s.id
      LEFT JOIN venues v ON v.id = s.venue_id
      WHERE s.id = ? AND s.business_id = ?
    `;

    db.get(sql, [staffId, business_id], (err, row) => {
      if (err) {
        console.error("❌ Error fetching staff by ID:", err.message);
        return res.status(500).json({ error: "Database error: " + err.message });
      }
      if (!row) {
        return res.status(404).json({ error: "Staff not found" });
      }

      res.json(row);
    });
  }
);

// ==========================
// CREATE STAFF with System Admin Per-Venue Constraints
// ==========================
router.post("/",
  requireRole(["system_admin", "manager"]),
  restrictVenue(),
  (req, res) => {
    const {
      first_name, middle_name, last_name, dob, gender, full_address,
      emergency_contact_name, emergency_contact_phone,
      employment_type, role_title, start_date, employment_status,
      default_hours_per_week, weekday_rate, saturday_rate,
      sunday_rate, public_holiday_rate, overtime_rate, pay_frequency,
      username, password_hash, access_level
    } = req.body;

    const { business_id, venue_id } = req.currentUser;

    if (!first_name || !last_name || !username || !password_hash || !access_level) {
      return res.status(400).json({ error: "Missing required fields: first_name, last_name, username, password_hash, access_level" });
    }

    // Additional validation
    if (username.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters long" });
    }

    if (password_hash.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    if (!['employee', 'supervisor', 'manager', 'system_admin'].includes(access_level)) {
      return res.status(400).json({ error: "Invalid access level" });
    }

    // Function to actually create the staff record
    const createStaffRecord = () => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Insert staff
        db.run(
          `INSERT INTO staff (business_id, venue_id, first_name, middle_name, last_name, dob, gender, full_address, emergency_contact_name, emergency_contact_phone, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [business_id, venue_id, first_name, middle_name, last_name, dob, gender, full_address, emergency_contact_name, emergency_contact_phone],
          function (err) {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: "Error creating staff: " + err.message });
            }

            const staffId = this.lastID;

            // Insert employment
            db.run(
              `INSERT INTO staff_employment (staff_id, employment_type, role_title, start_date, employment_status, default_hours_per_week, weekday_rate, saturday_rate, sunday_rate, public_holiday_rate, overtime_rate, pay_frequency)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [staffId, employment_type, role_title, start_date, employment_status, default_hours_per_week, weekday_rate, saturday_rate, sunday_rate, public_holiday_rate, overtime_rate, pay_frequency],
              function (err2) {
                if (err2) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ error: "Error creating employment: " + err2.message });
                }

                // Insert user
                db.run(
                  `INSERT INTO users (username, password_hash, access_level, status, staff_id, venue_id, business_id)
                   VALUES (?, ?, ?, 'active', ?, ?, ?)`,
                  [username, password_hash, access_level, staffId, venue_id, business_id],
                  function (err3) {
                    if (err3) {
                      db.run("ROLLBACK");
                      return res.status(500).json({ error: "Error creating user: " + err3.message });
                    }

                    db.run("COMMIT", () => {
                      res.json({ success: true, staff_id: staffId, message: "Staff created successfully" });
                    });
                  }
                );
              }
            );
          }
        );
      });
    };

    // 🚫 Check if a System Admin already exists for this venue
    if (access_level === "system_admin") {
      db.get(
        `SELECT COUNT(*) as cnt
         FROM users
         WHERE venue_id = ? AND access_level = 'system_admin'`,
        [venue_id],
        (err, row) => {
          if (err) {
            return res.status(500).json({ error: "Database error checking system admin: " + err.message });
          }
          if (row && row.cnt > 0) {
            return res.status(403).json({ error: "Each venue can only have 1 System Admin" });
          }

          // ✅ Proceed to insert staff after validation
          createStaffRecord();
        }
      );
    } else {
      // ✅ Not a system admin, proceed directly
      createStaffRecord();
    }
  }
);

// ==========================
// UPDATE STAFF with System Admin Protection
// ==========================
router.put("/:id",
  requireRole(["system_admin", "manager"]),
  checkSelf("id"),
  (req, res) => {
    const staffId = req.params.id;
    const {
      first_name, middle_name, last_name, dob, gender, full_address,
      emergency_contact_name, emergency_contact_phone,
      employment_type, role_title, start_date, employment_status,
      default_hours_per_week, weekday_rate, saturday_rate,
      sunday_rate, public_holiday_rate, overtime_rate, pay_frequency
    } = req.body;

    // 🚫 Check if staff is a System Admin before update to prevent deactivation
    db.get(
      `SELECT u.access_level, u.venue_id, s.first_name, s.last_name,
              (SELECT COUNT(*) FROM users WHERE venue_id = u.venue_id AND access_level = 'system_admin') as admin_count
       FROM users u
       JOIN staff s ON u.staff_id = s.id
       WHERE s.id = ?`,
      [staffId],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: "Database error checking staff role: " + err.message });
        }
        if (!user) {
          return res.status(404).json({ error: "Staff not found" });
        }

        // Block any update that tries to deactivate the only System Admin in a venue
        if (user.access_level === "system_admin" &&
            user.admin_count === 1 &&
            employment_status === "inactive") {
          return res.status(403).json({
            error: `Venue must always have at least 1 System Admin. ${user.first_name} ${user.last_name} cannot be deactivated.`
          });
        }

        // Proceed with update
        db.serialize(() => {
          db.run("BEGIN TRANSACTION");

          db.run(
            `UPDATE staff SET first_name=?, middle_name=?, last_name=?, dob=?, gender=?, full_address=?, emergency_contact_name=?, emergency_contact_phone=?, updated_at=datetime('now') WHERE id=?`,
            [first_name, middle_name, last_name, dob, gender, full_address, emergency_contact_name, emergency_contact_phone, staffId],
            function (err) {
              if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: "Error updating staff: " + err.message });
              }

              db.run(
                `UPDATE staff_employment SET employment_type=?, role_title=?, start_date=?, employment_status=?, default_hours_per_week=?, weekday_rate=?, saturday_rate=?, sunday_rate=?, public_holiday_rate=?, overtime_rate=?, pay_frequency=?, updated_at=datetime('now') WHERE staff_id=?`,
                [employment_type, role_title, start_date, employment_status, default_hours_per_week, weekday_rate, saturday_rate, sunday_rate, public_holiday_rate, overtime_rate, pay_frequency, staffId],
                function (err2) {
                  if (err2) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: "Error updating employment: " + err2.message });
                  }

                  db.run("COMMIT", () => {
                    res.json({ success: true, message: "Staff updated successfully" });
                  });
                }
              );
            }
          );
        });
      }
    );
  }
);

// ==========================
// DEACTIVATE STAFF (SOFT DELETE) with System Admin Protection
// ==========================
router.delete("/:id",
  requireRole(["system_admin", "manager"]),
  restrictVenue(),
  (req, res) => {
    const staffId = req.params.id;

    // First check if this staff is a system admin and if they're the only one in the venue
    db.get(
      `SELECT u.access_level, u.venue_id, s.first_name, s.last_name,
              (SELECT COUNT(*) FROM users WHERE venue_id = u.venue_id AND access_level = 'system_admin') as admin_count
       FROM users u
       JOIN staff s ON u.staff_id = s.id
       WHERE s.id = ?`,
      [staffId],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: "Database error checking staff role: " + err.message });
        }
        if (!user) {
          return res.status(404).json({ error: "Staff not found" });
        }

        // 🚫 Prevent deactivating the only System Admin in a venue
        if (user.access_level === "system_admin" && user.admin_count === 1) {
          return res.status(403).json({
            error: `Venue must always have at least 1 System Admin. ${user.first_name} ${user.last_name} cannot be deactivated.`
          });
        }

        // Proceed with soft delete
        db.serialize(() => {
          db.run("BEGIN TRANSACTION");

          // 1. Update employment status
          db.run(
            `UPDATE staff_employment
             SET employment_status='inactive', updated_at=datetime('now')
             WHERE staff_id=?`,
            [staffId],
            function (err2) {
              if (err2) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: "Error deactivating staff employment: " + err2.message });
              }

              // 2. Downgrade user role → employee (but keep status active so login works)
              db.run(
                `UPDATE users
                 SET access_level='employee', status='active', updated_at=datetime('now')
                 WHERE staff_id=?`,
                [staffId],
                function (err3) {
                  if (err3) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: "Error updating user: " + err3.message });
                  }

                  db.run("COMMIT", () => {
                    res.json({
                      success: true,
                      message: "Staff deactivated successfully (soft delete)"
                    });
                  });
                }
              );
            }
          );
        });
      }
    );
  }
);

module.exports = router;