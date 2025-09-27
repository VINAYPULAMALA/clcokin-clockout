// ============================
// MASTER ROUTES (backend)
// Dev-only bootstrap endpoints
// ============================

const express = require("express");
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// ----------------------------
// CREATE BUSINESS
// POST /api/master/business
// ----------------------------
router.post("/business", (req, res) => {
  const { name, owner_name, state, location, contact_email } = req.body;

  if (!name || !owner_name || !state || !location || !contact_email) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  const sql = `
    INSERT INTO businesses (name, owner_name, state, location, contact_email)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.run(sql, [name, owner_name, state, location, contact_email], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// ----------------------------
// CREATE VENUE + SYSADMIN
// POST /api/master/venue-with-admin
// ----------------------------
router.post("/venue-with-admin", (req, res) => {
  const {
    business_id,
    venue_name,
    state,
    location,
    contact_email,
    kiosk_username,
    kiosk_password,
    first_name,
    last_name,
    email,
    password,
  } = req.body;

  if (!business_id || !venue_name || !state || !location || !contact_email || !kiosk_username || !kiosk_password || !first_name || !last_name || !email || !password) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  // Validation
  if (!/^[A-Za-z0-9]{8,}$/.test(kiosk_username)) {
    return res.status(400).json({ success: false, error: "Kiosk username must be at least 8 characters, letters and numbers only" });
  }

  if (kiosk_password.length < 8) {
    return res.status(400).json({ success: false, error: "Kiosk password must be at least 8 characters" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: "Invalid email format for System Admin" });
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // Insert Venue
    db.run(
      `INSERT INTO venues (business_id, venue_name, state, location, contact_email, kiosk_username, kiosk_password, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [business_id, venue_name, state, location, contact_email, kiosk_username, kiosk_password],
      function (err) {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ success: false, error: err.message });
        }

        const venueId = this.lastID;

        // Insert System Admin Staff
        db.run(
          `INSERT INTO staff (business_id, venue_id, first_name, last_name, created_by)
           VALUES (?, ?, ?, ?, 1)`,
          [business_id, venueId, first_name, last_name],
          function (err2) {
            if (err2) {
              db.run("ROLLBACK");
              return res.status(500).json({ success: false, error: err2.message });
            }

            const staffId = this.lastID;

            // Insert Employment Record
            db.run(
              `INSERT INTO staff_employment (staff_id, employment_type, role_title, start_date, employment_status, pay_frequency)
               VALUES (?, 'full_time', 'System Admin', date('now'), 'active', 'monthly')`,
              [staffId],
              function (err3) {
                if (err3) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ success: false, error: err3.message });
                }

                // Create User Account
                db.run(
                  `INSERT INTO users (username, password_hash, access_level, status, staff_id, venue_id, business_id)
                   VALUES (?, ?, 'system_admin', 'active', ?, ?, ?)`,
                  [email, password, staffId, venueId, business_id],
                  function (err4) {
                    if (err4) {
                      db.run("ROLLBACK");
                      return res.status(500).json({ success: false, error: err4.message });
                    }

                    db.run("COMMIT");
                    res.json({
                      success: true,
                      venue: { id: venueId, venue_name },
                      sysAdmin: { id: staffId, email },
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

// ----------------------------
// GET BUSINESSES
// GET /api/master/businesses
// ----------------------------
router.get("/businesses", (req, res) => {
  db.all(`SELECT id, name, owner_name, state, location, contact_email, created_at FROM businesses ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: rows });
  });
});

// ----------------------------
// GET VENUES
// GET /api/master/venues
// ----------------------------
router.get("/venues", (req, res) => {
  const sql = `
    SELECT v.*, b.name as business_name
    FROM venues v
    LEFT JOIN businesses b ON v.business_id = b.id
    ORDER BY v.created_at DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: rows });
  });
});

// ----------------------------
// DASHBOARD STATS
// GET /api/master/stats
// ----------------------------
router.get("/stats", (req, res) => {
  const results = {};
  let completedQueries = 0;
  const totalQueries = 11;

  const checkComplete = () => {
    completedQueries++;
    if (completedQueries === totalQueries) {
      res.json({ success: true, data: results });
    }
  };

  db.serialize(() => {
    // Businesses
    db.get(`SELECT COUNT(*) AS total_businesses FROM businesses`, (err, row) => {
      results.total_businesses = row?.total_businesses || 0;
      checkComplete();
    });
    db.get(`SELECT COUNT(*) AS businesses_this_month FROM businesses WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
      (err, row) => {
        results.businesses_this_month = row?.businesses_this_month || 0;
        checkComplete();
      }
    );
    db.get(`SELECT COUNT(*) AS businesses_last_month FROM businesses WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','-1 month')`,
      (err, row) => {
        results.businesses_last_month = row?.businesses_last_month || 0;
        checkComplete();
      }
    );

    // Venues
    db.get(`SELECT COUNT(*) AS total_venues FROM venues`, (err, row) => {
      results.total_venues = row?.total_venues || 0;
      checkComplete();
    });
    db.get(`SELECT COUNT(*) AS venues_this_month FROM venues WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
      (err, row) => {
        results.venues_this_month = row?.venues_this_month || 0;
        checkComplete();
      }
    );
    db.get(`SELECT COUNT(*) AS venues_last_month FROM venues WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','-1 month')`,
      (err, row) => {
        results.venues_last_month = row?.venues_last_month || 0;
        checkComplete();
      }
    );

    // Staff
    db.get(`SELECT COUNT(*) AS total_staff FROM staff`, (err, row) => {
      results.total_staff = row?.total_staff || 0;
      checkComplete();
    });
    db.get(`SELECT COUNT(*) AS staff_this_month FROM staff WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
      (err, row) => {
        results.staff_this_month = row?.staff_this_month || 0;
        checkComplete();
      }
    );
    db.get(`SELECT COUNT(*) AS staff_last_month FROM staff WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now','-1 month')`,
      (err, row) => {
        results.staff_last_month = row?.staff_last_month || 0;
        checkComplete();
      }
    );

    // Working hours this month
    db.get(
      `SELECT COALESCE(SUM((JULIANDAY(clock_out) - JULIANDAY(clock_in)) * 24), 0) AS hours_this_month
       FROM staff_shifts
       WHERE clock_in IS NOT NULL AND clock_out IS NOT NULL
         AND strftime('%Y-%m', clock_in) = strftime('%Y-%m', 'now')`,
      (err, row) => {
        results.hours_this_month = row?.hours_this_month || 0;
        checkComplete();
      }
    );

    // Working hours last month
    db.get(
      `SELECT COALESCE(SUM((JULIANDAY(clock_out) - JULIANDAY(clock_in)) * 24), 0) AS hours_last_month
       FROM staff_shifts
       WHERE clock_in IS NOT NULL AND clock_out IS NOT NULL
         AND strftime('%Y-%m', clock_in) = strftime('%Y-%m', 'now','-1 month')`,
      (err, row) => {
        results.hours_last_month = row?.hours_last_month || 0;
        checkComplete();
      }
    );

    // Venues by state
    db.all(`SELECT state, COUNT(*) AS venues_per_state FROM venues GROUP BY state ORDER BY venues_per_state DESC`, (err, rows) => {
      results.venues_by_state = rows || [];
      checkComplete();
    });
  });
});

module.exports = router;