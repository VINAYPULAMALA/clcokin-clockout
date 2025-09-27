const express = require("express");
const router = express.Router();
const db = require("../db");
const { HolidayCalculator } = require("../public-holidays-config");

// Utility: auto-close long shifts (max 8h)
function autoCloseShift(shift, cb) {
  const maxHours = 8;
  const now = new Date();
  const start = new Date(shift.clock_in);
  const durationMs = now - start;
  const hoursWorked = durationMs / (1000 * 60 * 60);

  if (hoursWorked > maxHours) {
    const autoClockOut = new Date(start.getTime() + maxHours * 60 * 60 * 1000);
    const payday = autoClockOut.toISOString().split("T")[0];

    // Get pay rates for proper calculation
    db.get(`SELECT * FROM staff_employment WHERE staff_id = ?`, [shift.staff_id], (err, emp) => {
      if (err) return cb(err, null);

      let totalPay = 0;
      if (emp) {
        // Use weekday rate as default for auto-close (could be enhanced later)
        totalPay = maxHours * (emp.weekday_rate || 0);
      }

      db.run(
        `UPDATE staff_shifts SET clock_out = ?, hours_worked = ?, total_pay = ?, payday = ? WHERE id = ?`,
        [autoClockOut.toISOString(), maxHours, totalPay, payday, shift.id],
        function (err) {
          if (err) return cb(err, null);
          shift.clock_out = autoClockOut.toISOString();
          shift.hours_worked = maxHours;
          shift.total_pay = totalPay;
          shift.payday = payday;
          console.log(`✅ Auto-closed shift ID ${shift.id} for staff ${shift.staff_id}: ${hoursWorked.toFixed(2)}h → ${maxHours}h`);
          cb(null, shift);
        }
      );
    });
  } else {
    cb(null, shift);
  }
}

// Kiosk login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  const sql = `SELECT id, business_id, venue_name, kiosk_username, kiosk_password
               FROM venues
               WHERE kiosk_username = ? AND kiosk_password = ?`;

  db.get(sql, [username, password], (err, row) => {
    if (err) {
      console.error('Error during kiosk login:', err.message);
      return res.status(500).json({ error: 'Login failed' });
    }
    if (!row) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Success → return venue + business context
    res.json({
      success: true,
      venue_id: row.id,
      business_id: row.business_id,
      venue_name: row.venue_name,
      kiosk_username: row.kiosk_username
    });
  });
});

// Get staff for kiosk display (venue-specific)
router.get("/staff", (req, res) => {
  const { business_id, venue_id } = req.query;

  if (!business_id || !venue_id) {
    return res.status(400).json({ error: "business_id and venue_id are required" });
  }

  const sql = `
    SELECT s.id, s.first_name, s.last_name, s.venue_id, s.business_id
    FROM staff s
    LEFT JOIN staff_employment se ON s.id = se.staff_id
    WHERE s.business_id = ? AND s.venue_id = ? AND se.employment_status = 'active'
    ORDER BY s.first_name, s.last_name
  `;

  db.all(sql, [business_id, venue_id], (err, rows) => {
    if (err) {
      console.error("Error fetching kiosk staff:", err.message);
      return res.status(500).json({ error: "Failed to fetch staff" });
    }
    res.json(rows);
  });
});

// Clock In - Start a new shift
router.post("/clock-in", (req, res) => {
  const { staff_id, business_id, venue_id, clock_in } = req.body;

  if (!staff_id || !business_id || !venue_id || !clock_in) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Check if staff is already clocked in
  db.get(
    `SELECT id FROM staff_shifts WHERE staff_id = ? AND clock_out IS NULL`,
    [staff_id],
    (err, existingShift) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      if (existingShift) {
        return res.status(400).json({ error: "Staff member is already clocked in" });
      }

      // Create new shift
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
    }
  );
});

// Clock Out - End the active shift with automatic pay calculation
router.post("/clock-out", (req, res) => {
  const { staff_id, clock_out } = req.body;

  if (!staff_id || !clock_out) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Find the latest active shift
  db.get(
    `SELECT * FROM staff_shifts WHERE staff_id = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1`,
    [staff_id],
    (err, shift) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!shift) return res.status(404).json({ error: "No active shift found" });

      const start = new Date(shift.clock_in);
      const end = new Date(clock_out);
      const durationMs = end - start;
      const hoursWorked = durationMs / (1000 * 60 * 60);

      // Get pay rates from staff_employment
      db.get(`SELECT * FROM staff_employment WHERE staff_id = ?`, [staff_id], (err, emp) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!emp) return res.status(404).json({ error: "No pay settings found for staff" });

        let rate = emp.weekday_rate;

        // Weekend override
        const day = start.getDay(); // 0 = Sunday, 6 = Saturday
        if (day === 0) rate = emp.sunday_rate;
        else if (day === 6) rate = emp.saturday_rate;

        // Public holiday override - check if start date is a public holiday
        if (HolidayCalculator.isPublicHoliday(start)) {
          rate = emp.public_holiday_rate;
        }

        // Calculate pay - handle overtime
        let totalPay = hoursWorked * rate;
        if (emp.default_hours_per_week && hoursWorked > (emp.default_hours_per_week / 5)) {
          // Assuming default_hours_per_week is spread over 5 working days
          const dailyHours = emp.default_hours_per_week / 5;
          if (hoursWorked > dailyHours) {
            const overtimeHours = hoursWorked - dailyHours;
            totalPay = dailyHours * rate + overtimeHours * emp.overtime_rate;
          }
        }

        const payday = end.toISOString().split("T")[0];

        db.run(
          `UPDATE staff_shifts
           SET clock_out = ?, hours_worked = ?, total_pay = ?, payday = ?
           WHERE id = ?`,
          [clock_out, hoursWorked, totalPay, payday, shift.id],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });

            console.log("Clock-out successful for shift ID:", shift.id);
            res.json({
              success: true,
              message: "Clocked out successfully",
              shift: {
                clock_in: shift.clock_in,
                clock_out: clock_out,
                hours_worked: hoursWorked.toFixed(2),
                rate: rate,
                total_pay: totalPay.toFixed(2),
                payday: payday,
                is_holiday: HolidayCalculator.isPublicHoliday(start),
                is_weekend: day === 0 || day === 6
              }
            });
          }
        );
      });
    }
  );
});

// Get active shift status for a staff member (with auto-close)
router.get("/status/:staffId", (req, res) => {
  const { staffId } = req.params;
  const { business_id, venue_id } = req.query;

  if (!business_id || !venue_id) {
    return res.status(400).json({ error: "business_id and venue_id are required" });
  }

  db.get(
    `SELECT * FROM staff_shifts
     WHERE staff_id = ? AND business_id = ? AND venue_id = ?
     AND clock_out IS NULL
     ORDER BY clock_in DESC LIMIT 1`,
    [staffId, business_id, venue_id],
    (err, shift) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!shift) {
        return res.json({ active: false });
      }

      // Auto-close if over 8 hours
      autoCloseShift(shift, (err, updatedShift) => {
        if (err) return res.status(500).json({ error: err.message });

        if (updatedShift.clock_out) {
          return res.json({ active: false, autoClosed: true, shift: updatedShift });
        }

        res.json({
          active: true,
          clock_in: shift.clock_in,
          business_id: shift.business_id,
          venue_id: shift.venue_id
        });
      });
    }
  );
});

module.exports = router;