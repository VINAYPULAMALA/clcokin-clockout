// server.js - Cleaned and aligned with schema.sql
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const db = require("./db");
const { requireRole, restrictVenue, checkSelf } = require('./authMiddleware');

// Import routes
const kioskRoutes = require('./routes/kiosk');
const dashboardRoutes = require('./routes/dashboard');
const masterRoutes = require('./routes/master');
const staffRoutes = require('./routes/staff');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Mount routes
app.use('/api/kiosk', kioskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/staff', staffRoutes);

// Serve the main login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Serve the kiosk page
app.get("/kiosk", (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/kiosk.html'));
});

// Health check API
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running!" });
});

// ==========================
// LOGIN ROUTE
// ==========================
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const sql = `
    SELECT
      u.id AS user_id,
      u.username,
      u.access_level,
      u.status,
      u.staff_id,
      u.venue_id,
      u.business_id,
      s.first_name,
      s.last_name,
      v.venue_name,
      b.name as business_name
    FROM users u
    LEFT JOIN staff s ON u.staff_id = s.id
    LEFT JOIN venues v ON u.venue_id = v.id
    LEFT JOIN businesses b ON u.business_id = b.id
    WHERE u.username = ? AND u.password_hash = ? AND u.status = 'active'
  `;

  db.get(sql, [username, password], (err, row) => {
    if (err) {
      console.error("❌ Login DB error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (!row) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // ✅ Return full user context
    const user = {
      id: row.user_id,
      username: row.username,
      access_level: row.access_level,
      status: row.status,
      staff_id: row.staff_id,
      venue_id: row.venue_id,
      business_id: row.business_id,
      first_name: row.first_name,
      last_name: row.last_name,
      venue_name: row.venue_name,
      business_name: row.business_name
    };

    console.log("✅ Login success, returning user:", user);
    res.json(user);
  });
});

// Get user data by ID
app.get("/api/users/:id", (req, res) => {
  const userId = req.params.id;

  db.get(
    "SELECT id, username, access_level, staff_id, venue_id, business_id FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    }
  );
});

// ==========================
// BUSINESS ROUTES
// ==========================
app.post("/api/businesses", (req, res) => {
  const { name, owner_name, state, location, contact_email } = req.body;

  // Validation
  if (!name || !owner_name || !state || !location || !contact_email) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Check uniqueness
  db.get("SELECT id FROM businesses WHERE name = ? OR contact_email = ?", [name, contact_email], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (row) return res.status(400).json({ error: "Business name or email already exists" });

    // Insert
    const sql = `
      INSERT INTO businesses (name, owner_name, state, location, contact_email)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(sql, [name, owner_name, state, location, contact_email], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
  });
});

app.get("/api/businesses", (req, res) => {
  db.all("SELECT * FROM businesses ORDER BY name", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ data: rows });
  });
});

// ==========================
// VENUE ROUTES
// ==========================
app.post("/api/venues", (req, res) => {
  const { business_id, venue_name, state, location, status } = req.body;

  const sql = `
    INSERT INTO venues (business_id, venue_name, state, location, status)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(sql, [business_id, venue_name, state, location, status || "active"], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.get("/api/venues", (req, res) => {
  const businessId = req.query.business_id;
  let query = `
    SELECT v.*, b.name as business_name
    FROM venues v
    LEFT JOIN businesses b ON v.business_id = b.id
  `;
  let params = [];

  if (businessId) {
    query += " WHERE v.business_id = ?";
    params.push(businessId);
  }

  query += " ORDER BY v.venue_name";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ data: rows });
  });
});

// Create venue with admin in one endpoint
app.post("/api/venues/with-admin", (req, res) => {
  const {
    business_id,
    venue_name,
    state,
    location,
    first_name,
    last_name,
    email,
    kiosk_username,
    kiosk_password
  } = req.body;

  // Validation
  if (!business_id || !venue_name || !state || !location || !first_name || !last_name || !email || !kiosk_username || !kiosk_password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Username validation
  if (!/^[A-Za-z0-9]{8,}$/.test(kiosk_username)) {
    return res.status(400).json({ error: "Username must be at least 8 characters, letters and numbers only" });
  }

  // Password validation
  if (kiosk_password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  // Email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // 1. Create Venue
    db.run(
      `INSERT INTO venues (business_id, venue_name, state, location, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [business_id, venue_name, state, location],
      function (err) {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: "Error creating venue: " + err.message });
        }

        const venueId = this.lastID;

        // 2. Create Staff Record
        db.run(
          `INSERT INTO staff (business_id, venue_id, first_name, last_name, created_by)
           VALUES (?, ?, ?, ?, 1)`,
          [business_id, venueId, first_name, last_name],
          function (err) {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: "Error creating staff: " + err.message });
            }

            const staffId = this.lastID;

            // 3. Create Employment Record
            db.run(
              `INSERT INTO staff_employment (staff_id, employment_type, role_title, start_date, employment_status, pay_frequency)
               VALUES (?, 'full_time', 'System Admin', date('now'), 'active', 'monthly')`,
              [staffId],
              function (err) {
                if (err) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ error: "Error creating employment: " + err.message });
                }

                // 4. Create User Account
                db.run(
                  `INSERT INTO users (username, password_hash, access_level, status, staff_id, venue_id, business_id)
                   VALUES (?, ?, 'system_admin', 'active', ?, ?, ?)`,
                  [kiosk_username, kiosk_password, staffId, venueId, business_id],
                  function (err) {
                    if (err) {
                      db.run("ROLLBACK");
                      return res.status(500).json({ error: "Error creating user: " + err.message });
                    }

                    // Commit the transaction
                    db.run("COMMIT", function (err) {
                      if (err) {
                        return res.status(500).json({ error: "Error committing transaction: " + err.message });
                      }
                      res.json({
                        success: true,
                        venue_id: venueId,
                        staff_id: staffId,
                        user_id: this.lastID,
                        message: "Venue and System Admin created successfully"
                      });
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// Staff routes are now handled by the modular routes/staff.js

// ==========================
// SHIFTS ROUTES
// ==========================

// Clock In - Start a new shift
app.post("/api/shifts/clock-in", (req, res) => {
  const { staff_id, business_id, venue_id, clock_in } = req.body;

  if (!staff_id || !business_id || !venue_id || !clock_in) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = `
    INSERT INTO staff_shifts (staff_id, business_id, venue_id, clock_in)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [staff_id, business_id, venue_id, clock_in], function (err) {
    if (err) {
      console.error("Error clocking in:", err.message);
      return res.status(500).json({ error: "Failed to clock in" });
    }
    res.json({ success: true, shift_id: this.lastID, message: "Clocked in successfully" });
  });
});

// Clock Out - End the active shift (legacy PUT endpoint that works)
app.put("/api/shifts/clock-out", (req, res) => {
  const { staff_id, clock_out } = req.body;

  db.get(
    `SELECT * FROM staff_shifts WHERE staff_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1`,
    [staff_id],
    (err, shift) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!shift) return res.status(404).json({ error: "No active shift found" });

      const durationMs = new Date(clock_out) - new Date(shift.clock_in);
      const durationHours = durationMs / (1000 * 60 * 60);
      const totalPay = durationHours * (shift.hourly_rate || 0);

      db.run(
        `UPDATE staff_shifts SET clock_out = ?, duration = ?, total_pay = ? WHERE id = ?`,
        [clock_out, durationHours, totalPay, shift.id],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });

          // Return shift details for summary display
          res.json({
            success: true,
            message: "Clocked out successfully",
            shift: {
              clock_in: shift.clock_in,
              clock_out: clock_out,
              duration_hours: durationHours.toFixed(2)
            }
          });
        }
      );
    }
  );
});

// Get active shift status for a staff member
app.get("/api/shifts/status/:staffId", (req, res) => {
  const staffId = req.params.staffId;
  const { business_id, venue_id } = req.query;

  const sql = `
    SELECT *
    FROM staff_shifts
    WHERE staff_id = ? AND business_id = ? AND venue_id = ? AND clock_out IS NULL
    ORDER BY clock_in DESC
    LIMIT 1
  `;

  db.get(sql, [staffId, business_id, venue_id], (err, row) => {
    if (err) {
      console.error("Error checking shift status:", err.message);
      return res.status(500).json({ error: "Failed to check status" });
    }
    if (row) {
      return res.json({ active: true, clock_in: row.clock_in });
    } else {
      return res.json({ active: false });
    }
  });
});

// Get shifts (role-based: sysadmin, manager, supervisor, employee)
app.get("/api/shifts",
  requireRole(["system_admin", "manager", "supervisor", "employee"]),
  checkSelf("staff_id"),
  (req, res) => {
    const { business_id, venue_id, access_level, staff_id } = req.query;

    if (!business_id) {
      return res.status(400).json({ error: "business_id is required" });
    }

    let sql = `
      SELECT sh.*, s.first_name, s.last_name, v.venue_name
      FROM staff_shifts sh
      LEFT JOIN staff s ON s.id = sh.staff_id
      LEFT JOIN venues v ON v.id = s.venue_id
      WHERE sh.business_id = ?
    `;
    let params = [business_id];

    if (["manager", "supervisor"].includes(access_level)) {
      sql += " AND sh.venue_id = ?";
      params.push(venue_id);
    }

    if (access_level === "employee") {
      // Only own staff_id
      sql += " AND sh.staff_id = ?";
      params.push(staff_id);

      // Return exactly: last, today, next
      const today = new Date().toISOString().split("T")[0];

      const sqlEmployee = `
        SELECT * FROM (
          SELECT sh.*, s.first_name, s.last_name, v.venue_name, 'today' as shift_type
          FROM staff_shifts sh
          LEFT JOIN staff s ON s.id = sh.staff_id
          LEFT JOIN venues v ON v.id = s.venue_id
          WHERE sh.business_id = ? AND sh.staff_id = ? AND date(sh.clock_in) = date(?)
          UNION
          SELECT sh.*, s.first_name, s.last_name, v.venue_name, 'last' as shift_type
          FROM staff_shifts sh
          LEFT JOIN staff s ON s.id = sh.staff_id
          LEFT JOIN venues v ON v.id = s.venue_id
          WHERE sh.business_id = ? AND sh.staff_id = ? AND date(sh.clock_in) < date(?)
          ORDER BY sh.clock_in DESC LIMIT 1
          UNION
          SELECT sh.*, s.first_name, s.last_name, v.venue_name, 'next' as shift_type
          FROM staff_shifts sh
          LEFT JOIN staff s ON s.id = sh.staff_id
          LEFT JOIN venues v ON v.id = s.venue_id
          WHERE sh.business_id = ? AND sh.staff_id = ? AND date(sh.clock_in) > date(?)
          ORDER BY sh.clock_in ASC LIMIT 1
        )
      `;

      db.all(sqlEmployee, [business_id, staff_id, today, business_id, staff_id, today, business_id, staff_id, today], (err, rows) => {
        if (err) {
          console.error("Error fetching employee shifts:", err.message);
          return res.status(500).json({ error: "Failed to fetch shifts" });
        }

        // Calculate total hours worked
        const sqlHours = `
          SELECT IFNULL(SUM(
            (julianday(clock_out) - julianday(clock_in)) * 24
          ), 0) as total_hours
          FROM staff_shifts
          WHERE business_id = ? AND staff_id = ? AND clock_out IS NOT NULL
        `;

        db.get(sqlHours, [business_id, staff_id], (err, result) => {
          if (err) {
            console.error("Error calculating hours:", err.message);
            return res.status(500).json({ error: "Failed to calculate hours" });
          }
          return res.json({ shifts: rows, total_hours: result.total_hours });
        });
      });
      return; // stop here for employees
    }

    // For managers, supervisors, system_admin → fetch normally
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error("Error fetching shifts:", err.message);
        return res.status(500).json({ error: "Failed to fetch shifts" });
      }
      res.json(rows);
    });
  }
);

app.get("/api/shifts/:staffId/active", (req, res) => {
  const staffId = req.params.staffId;
  db.get(
    `SELECT * FROM staff_shifts WHERE staff_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1`,
    [staffId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || null);
    }
  );
});

// ==========================
// ROSTER ROUTES
// ==========================
app.post("/api/rosters", (req, res) => {
  const { staff_id, business_id, venue_id, shift_date, start_time, end_time } = req.body;
  const sql = `INSERT INTO rosters (staff_id, business_id, venue_id, shift_date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [staff_id, business_id, venue_id, shift_date, start_time, end_time], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ rosterId: this.lastID, message: "Roster created successfully" });
  });
});

app.get("/api/rosters/:venueId", (req, res) => {
  db.all(
    `SELECT r.*, s.first_name, s.last_name, se.role_title
     FROM rosters r
     LEFT JOIN staff s ON r.staff_id = s.id
     LEFT JOIN staff_employment se ON s.id = se.staff_id
     WHERE r.venue_id = ?
     ORDER BY r.shift_date, r.start_time`,
    [req.params.venueId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get rosters (system_admin, manager, supervisor, employee)
app.get("/api/rosters",
  requireRole(["system_admin", "manager", "supervisor", "employee"]),
  checkSelf("staff_id"),
  (req, res) => {
    const { business_id, venue_id, access_level, staff_id } = req.query;

    if (!business_id) {
      return res.status(400).json({ error: "business_id is required" });
    }

    if (access_level === "employee") {
      // Employee: only upcoming rosters
      const sqlEmployee = `
        SELECT r.*, s.first_name, s.last_name, v.venue_name
        FROM rosters r
        LEFT JOIN staff s ON s.id = r.staff_id
        LEFT JOIN venues v ON v.id = r.venue_id
        WHERE r.business_id = ? AND r.staff_id = ? AND date(r.shift_date) >= date('now')
        ORDER BY r.shift_date ASC
        LIMIT 5
      `;
      db.all(sqlEmployee, [business_id, staff_id], (err, rows) => {
        if (err) {
          console.error("Error fetching employee rosters:", err.message);
          return res.status(500).json({ error: "Failed to fetch rosters" });
        }
        return res.json(rows);
      });
      return;
    }

    // For system_admin, manager, supervisor
    let sql = `
      SELECT r.*, s.first_name, s.last_name, v.venue_name
      FROM rosters r
      LEFT JOIN staff s ON s.id = r.staff_id
      LEFT JOIN venues v ON v.id = r.venue_id
      WHERE r.business_id = ?
    `;
    let params = [business_id];

    if (["manager", "supervisor"].includes(access_level)) {
      sql += " AND r.venue_id = ?";
      params.push(venue_id);
    }

    sql += " ORDER BY r.shift_date, r.start_time";

    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error("Error fetching rosters:", err.message);
        return res.status(500).json({ error: "Failed to fetch rosters" });
      }
      res.json(rows);
    });
  }
);

app.put("/api/rosters/:id", (req, res) => {
  const { start_time, end_time, status } = req.body;
  db.run(
    `UPDATE rosters SET start_time = ?, end_time = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
    [start_time, end_time, status, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes > 0, message: "Roster updated successfully" });
    }
  );
});

app.delete("/api/rosters/:id", (req, res) => {
  db.run(`DELETE FROM rosters WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes > 0, message: "Roster deleted successfully" });
  });
});

// ==========================
// USERS ROUTES
// ==========================
app.post("/api/users", (req, res) => {
  const { username, password_hash, access_level, status, staff_id, venue_id, business_id } = req.body;

  // Username format validation
  if (!/^[A-Za-z0-9]{8,}$/.test(username)) {
    return res.status(400).json({ error: "Invalid username format" });
  }

  // Check if username already exists
  db.get("SELECT id FROM users WHERE username = ?", [username], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: "Username already exists" });

    // Proceed with insert
    const sql = `INSERT INTO users (username, password_hash, access_level, status, staff_id, venue_id, business_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [username, password_hash, access_level, status, staff_id, venue_id, business_id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ userId: this.lastID });
    });
  });
});

// ==========================
// SECURE DELETE ROUTES WITH ROLE ENFORCEMENT
// ==========================

// Delete staff by ID
app.delete("/api/staff/:id",
  requireRole(["system_admin", "manager"]),
  restrictVenue(),
  (req, res) => {
    const staffId = req.params.id;

    const sqlCheck = `SELECT venue_id FROM staff WHERE id = ?`;
    db.get(sqlCheck, [staffId], (err, staff) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!staff) return res.status(404).json({ error: "Staff not found" });

      if (req.currentUser.access_level === "manager" && staff.venue_id !== req.currentUser.venue_id) {
        return res.status(403).json({ error: "Managers can only delete staff in their own venue" });
      }

      // Safe to delete
      db.run("DELETE FROM staff WHERE id = ?", [staffId], function (err) {
        if (err) return res.status(500).json({ error: "Failed to delete staff" });
        res.json({ success: true, message: "Staff deleted" });
      });
    });
  }
);

// Delete roster by ID
app.delete("/api/rosters/:id",
  requireRole(["system_admin", "manager"]),
  restrictVenue(),
  (req, res) => {
    const rosterId = req.params.id;

    const sqlCheck = `SELECT venue_id FROM rosters WHERE id = ?`;
    db.get(sqlCheck, [rosterId], (err, roster) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!roster) return res.status(404).json({ error: "Roster not found" });

      if (req.currentUser.access_level === "manager" && roster.venue_id !== req.currentUser.venue_id) {
        return res.status(403).json({ error: "Managers can only delete rosters in their own venue" });
      }

      db.run("DELETE FROM rosters WHERE id = ?", [rosterId], function (err) {
        if (err) return res.status(500).json({ error: "Failed to delete roster" });
        res.json({ success: true, message: "Roster deleted" });
      });
    });
  }
);

// Delete shift by ID
app.delete("/api/shifts/:id",
  requireRole(["system_admin", "manager"]),
  restrictVenue(),
  (req, res) => {
    const shiftId = req.params.id;

    const sqlCheck = `SELECT venue_id FROM staff_shifts WHERE id = ?`;
    db.get(sqlCheck, [shiftId], (err, shift) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!shift) return res.status(404).json({ error: "Shift not found" });

      if (req.currentUser.access_level === "manager" && shift.venue_id !== req.currentUser.venue_id) {
        return res.status(403).json({ error: "Managers can only delete shifts in their own venue" });
      }

      db.run("DELETE FROM staff_shifts WHERE id = ?", [shiftId], function (err) {
        if (err) return res.status(500).json({ error: "Failed to delete shift" });
        res.json({ success: true, message: "Shift deleted" });
      });
    });
  }
);

// ==========================
// AUTO-CLOSE SHIFTS AFTER 8H
// ==========================
const cron = require("node-cron");

// Run every 15 minutes
cron.schedule("*/15 * * * *", () => {
  console.log("⏱️ Running auto-close job for long shifts...");

  db.all(`SELECT * FROM staff_shifts WHERE clock_out IS NULL`, [], (err, shifts) => {
    if (err) {
      console.error("❌ Cleanup query failed:", err.message);
      return;
    }

    const now = new Date();

    shifts.forEach(shift => {
      const start = new Date(shift.clock_in);
      const durationMs = now - start;
      const hoursWorked = durationMs / (1000 * 60 * 60);

      if (hoursWorked > 8) {
        const autoClockOut = new Date(start.getTime() + 8 * 60 * 60 * 1000);
        const payday = autoClockOut.toISOString().split("T")[0];

        // Get pay rates for proper calculation
        db.get(`SELECT * FROM staff_employment WHERE staff_id = ?`, [shift.staff_id], (err, emp) => {
          let totalPay = 0;
          if (!err && emp) {
            // Use weekday rate as default for auto-close
            totalPay = 8 * (emp.weekday_rate || 0);
          }

          db.run(
            `UPDATE staff_shifts
             SET clock_out = ?, hours_worked = ?, total_pay = ?, payday = ?
             WHERE id = ?`,
            [autoClockOut.toISOString(), 8, totalPay, payday, shift.id],
            function (err) {
              if (err) {
                console.error(`❌ Failed to auto-close shift ID ${shift.id}:`, err.message);
              } else {
                console.log(`✅ Auto-closed shift ID ${shift.id} for staff ${shift.staff_id}: ${hoursWorked.toFixed(2)}h → 8h (Pay: $${totalPay.toFixed(2)})`);
              }
            }
          );
        });
      }
    });
  });
});

// ==========================
// GLOBAL ERROR HANDLER
// ==========================
app.use((err, req, res, next) => {
  console.error("❌ Global error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ==========================
// START SERVER
// ==========================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("⏱️ Auto-close job scheduled to run every 15 minutes");
});

module.exports = app;