const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

/**
 * GET /api/dashboard/stats
 * Returns comprehensive dashboard statistics with month-over-month comparisons
 */
router.get('/stats', (req, res) => {
  const results = {};

  // Serialize database queries to avoid concurrent access issues
  db.serialize(() => {
    let completedQueries = 0;
    const totalQueries = 11; // Total number of queries to execute

    const checkComplete = () => {
      completedQueries++;
      if (completedQueries === totalQueries) {
        res.json({ success: true, data: results });
      }
    };

    // Total Businesses
    db.get(`SELECT COUNT(*) AS total_businesses FROM businesses`, (err, row) => {
      if (err) console.error('Total businesses query error:', err);
      results.total_businesses = row?.total_businesses || 0;
      checkComplete();
    });

    // Businesses This Month
    db.get(`SELECT COUNT(*) AS businesses_this_month
            FROM businesses
            WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`, (err, row) => {
      if (err) console.error('Businesses this month query error:', err);
      results.businesses_this_month = row?.businesses_this_month || 0;
      checkComplete();
    });

    // Businesses Last Month
    db.get(`SELECT COUNT(*) AS businesses_last_month
            FROM businesses
            WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')`, (err, row) => {
      if (err) console.error('Businesses last month query error:', err);
      results.businesses_last_month = row?.businesses_last_month || 0;
      checkComplete();
    });

    // Total Venues
    db.get(`SELECT COUNT(*) AS total_venues FROM venues`, (err, row) => {
      if (err) console.error('Total venues query error:', err);
      results.total_venues = row?.total_venues || 0;
      checkComplete();
    });

    // Venues This Month
    db.get(`SELECT COUNT(*) AS venues_this_month
            FROM venues
            WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`, (err, row) => {
      if (err) console.error('Venues this month query error:', err);
      results.venues_this_month = row?.venues_this_month || 0;
      checkComplete();
    });

    // Venues Last Month
    db.get(`SELECT COUNT(*) AS venues_last_month
            FROM venues
            WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')`, (err, row) => {
      if (err) console.error('Venues last month query error:', err);
      results.venues_last_month = row?.venues_last_month || 0;
      checkComplete();
    });

    // Total Staff
    db.get(`SELECT COUNT(*) AS total_staff FROM staff`, (err, row) => {
      if (err) console.error('Total staff query error:', err);
      results.total_staff = row?.total_staff || 0;
      checkComplete();
    });

    // Staff This Month
    db.get(`SELECT COUNT(*) AS staff_this_month
            FROM staff
            WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`, (err, row) => {
      if (err) console.error('Staff this month query error:', err);
      results.staff_this_month = row?.staff_this_month || 0;
      checkComplete();
    });

    // Staff Last Month
    db.get(`SELECT COUNT(*) AS staff_last_month
            FROM staff
            WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')`, (err, row) => {
      if (err) console.error('Staff last month query error:', err);
      results.staff_last_month = row?.staff_last_month || 0;
      checkComplete();
    });

    // Working Hours This Month
    db.get(`SELECT COALESCE(SUM((JULIANDAY(clock_out) - JULIANDAY(clock_in)) * 24), 0) AS hours_this_month
            FROM staff_shifts
            WHERE clock_in IS NOT NULL AND clock_out IS NOT NULL
              AND strftime('%Y-%m', clock_in) = strftime('%Y-%m', 'now')`, (err, row) => {
      if (err) console.error('Hours this month query error:', err);
      results.hours_this_month = row?.hours_this_month || 0;
      checkComplete();
    });

    // Working Hours Last Month
    db.get(`SELECT COALESCE(SUM((JULIANDAY(clock_out) - JULIANDAY(clock_in)) * 24), 0) AS hours_last_month
            FROM staff_shifts
            WHERE clock_in IS NOT NULL AND clock_out IS NOT NULL
              AND strftime('%Y-%m', clock_in) = strftime('%Y-%m', 'now', '-1 month')`, (err, row) => {
      if (err) console.error('Hours last month query error:', err);
      results.hours_last_month = row?.hours_last_month || 0;
      checkComplete();
    });

    // Venues by State (last query - triggers response)
    // Note: This query completes the response when done
    db.all(`SELECT state, COUNT(*) AS venues_per_state
            FROM venues
            GROUP BY state
            ORDER BY venues_per_state DESC`, (err, rows) => {
      if (err) {
        console.error('Venues by state query error:', err);
        results.venues_by_state = [];
      } else {
        results.venues_by_state = rows || [];
      }
      checkComplete();
    });
  });
});

/**
 * GET /api/dashboard/quick-stats
 * Returns just the basic counts for quick loading
 */
router.get('/quick-stats', (req, res) => {
  const results = {};
  let completedQueries = 0;
  const totalQueries = 4;

  const checkComplete = () => {
    completedQueries++;
    if (completedQueries === totalQueries) {
      res.json({ success: true, data: results });
    }
  };

  db.serialize(() => {
    // Quick counts only
    db.get(`SELECT COUNT(*) AS total_businesses FROM businesses`, (err, row) => {
      results.total_businesses = row?.total_businesses || 0;
      checkComplete();
    });

    db.get(`SELECT COUNT(*) AS total_venues FROM venues`, (err, row) => {
      results.total_venues = row?.total_venues || 0;
      checkComplete();
    });

    db.get(`SELECT COUNT(*) AS total_staff FROM staff`, (err, row) => {
      results.total_staff = row?.total_staff || 0;
      checkComplete();
    });

    db.get(`SELECT COALESCE(SUM((JULIANDAY(clock_out) - JULIANDAY(clock_in)) * 24), 0) AS total_hours
            FROM staff_shifts
            WHERE clock_in IS NOT NULL AND clock_out IS NOT NULL
              AND strftime('%Y-%m', clock_in) = strftime('%Y-%m', 'now')`, (err, row) => {
      results.total_hours = row?.total_hours || 0;
      checkComplete();
    });
  });
});

module.exports = router;