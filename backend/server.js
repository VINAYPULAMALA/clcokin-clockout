// backend/server.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve the main login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check API
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running!" });
});

// Login route
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ? AND active = 1",
    [username],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      if (password !== user.password_hash) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        staff_id: user.staff_id,
        venue_id: user.venue_id,
        business_id: user.business_id
      });
    }
  );
});

// ---- Staff Routes ----

// Add new staff with all related data
app.post("/api/staff", (req, res) => {
  const staffData = req.body;
  const staffCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Start a transaction to ensure all data is inserted or none
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // Insert main staff record
    db.run(
      `INSERT INTO staff (staff_code, business_id, venue_id, first_name, middle_name, last_name, dob, gender, visa_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        staffCode,
        staffData.business_id || 1,
        staffData.venue_id || 1,
        staffData.first_name,
        staffData.middle_name || '',
        staffData.last_name,
        staffData.dob,
        staffData.gender,
        staffData.visa_status,
        staffData.created_by || 1
      ],
      function (err) {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: "Error creating staff: " + err.message });
        }

        const staffId = this.lastID;

        // Insert contact information
        db.run(
          `INSERT INTO staff_contact (staff_id, address_street, address_suburb, address_state, address_postcode, address_country, emergency_contact_name, emergency_contact_phone)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            staffId,
            staffData.street_address || '',
            staffData.suburb || '',
            staffData.state || '',
            staffData.postcode || '',
            staffData.country || '',
            staffData.emergency_contact_name || '',
            staffData.emergency_contact_phone || ''
          ],
          function (err) {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: "Error creating contact info: " + err.message });
            }

            // Insert employment information
            db.run(
              `INSERT INTO staff_employment (staff_id, role, employment_type, award_level, start_date, employment_status, default_hours_per_week, weekday_rate, saturday_rate, sunday_rate, public_holiday_rate, overtime_rate, pay_frequency)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                staffId,
                staffData.role || '',
                staffData.employment_type || '',
                staffData.award_level || '',
                staffData.start_date || null,
                staffData.employment_status || 'Active',
                staffData.default_hours_per_week || null,
                staffData.weekday_rate || null,
                staffData.saturday_rate || null,
                staffData.sunday_rate || null,
                staffData.public_holiday_rate || null,
                staffData.overtime_rate || null,
                staffData.pay_frequency || 'fortnightly'
              ],
              function (err) {
                if (err) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ error: "Error creating employment info: " + err.message });
                }

                // Insert compliance information
                db.run(
                  `INSERT INTO staff_compliance (staff_id, tfn, super_fund, super_member_id, payroll_ref, bank_account_name, bank_bsb, bank_account_number, bank_name)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    staffId,
                    staffData.tfn || '',
                    staffData.super_fund || '',
                    staffData.super_member_id || '',
                    staffData.payroll_ref || '',
                    staffData.bank_account_name || '',
                    staffData.bank_bsb || '',
                    staffData.bank_account_number || '',
                    staffData.bank_name || ''
                  ],
                  function (err) {
                    if (err) {
                      db.run("ROLLBACK");
                      return res.status(500).json({ error: "Error creating compliance info: " + err.message });
                    }

                    // Insert document information (file paths will be stored here)
                    db.run(
                      `INSERT INTO staff_documents (staff_id, profile_pic, contract_file, tax_form_file, bank_statement_file, other_docs)
                       VALUES (?, ?, ?, ?, ?, ?)`,
                      [
                        staffId,
                        staffData.profile_pic || '',
                        staffData.contract_file || '',
                        staffData.tax_form_file || '',
                        staffData.bank_statement_file || '',
                        staffData.other_docs || ''
                      ],
                      function (err) {
                        if (err) {
                          db.run("ROLLBACK");
                          return res.status(500).json({ error: "Error creating document info: " + err.message });
                        }

                        // Commit the transaction
                        db.run("COMMIT", function (err) {
                          if (err) {
                            return res.status(500).json({ error: "Error committing transaction: " + err.message });
                          }
                          res.json({
                            success: true,
                            staff_id: staffId,
                            staff_code: staffCode,
                            message: "Staff member created successfully with all information"
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
      }
    );
  });
});

// List staff (basic info with employment details)
app.get("/api/staff", (req, res) => {
  const query = `
    SELECT
      s.id,
      s.staff_code,
      s.first_name,
      s.last_name,
      s.gender,
      s.visa_status,
      s.active,
      se.role,
      se.start_date
    FROM staff s
    LEFT JOIN staff_employment se ON s.id = se.staff_id
    ORDER BY s.first_name, s.last_name
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get complete staff data by ID (for editing)
app.get("/api/staff/:id", (req, res) => {
  const staffId = req.params.id;

  const query = `
    SELECT
      s.*,
      sc.address_street,
      sc.address_suburb,
      sc.address_state,
      sc.address_postcode,
      sc.address_country,
      sc.emergency_contact_name,
      sc.emergency_contact_phone,
      se.role,
      se.employment_type,
      se.award_level,
      se.start_date,
      se.employment_status,
      se.default_hours_per_week,
      se.weekday_rate,
      se.saturday_rate,
      se.sunday_rate,
      se.public_holiday_rate,
      se.overtime_rate,
      se.pay_frequency,
      scomp.tfn,
      scomp.super_fund,
      scomp.super_member_id,
      scomp.payroll_ref,
      scomp.bank_account_name,
      scomp.bank_bsb,
      scomp.bank_account_number,
      scomp.bank_name,
      sd.profile_pic,
      sd.contract_file,
      sd.tax_form_file,
      sd.bank_statement_file,
      sd.other_docs
    FROM staff s
    LEFT JOIN staff_contact sc ON s.id = sc.staff_id
    LEFT JOIN staff_employment se ON s.id = se.staff_id
    LEFT JOIN staff_compliance scomp ON s.id = scomp.staff_id
    LEFT JOIN staff_documents sd ON s.id = sd.staff_id
    WHERE s.id = ?
  `;

  db.get(query, [staffId], (err, row) => {
    if (err) {
      console.error('Database error in GET /api/staff/:id:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      console.log('Staff member not found:', staffId);
      return res.status(404).json({ error: "Staff member not found" });
    }


    res.json(row);
  });
});

// Update staff data across all tables
app.put("/api/staff/:id", (req, res) => {
  const staffId = req.params.id;
  const staffData = req.body;


  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // Update main staff record
    db.run(`
      UPDATE staff SET
        first_name = ?, middle_name = ?, last_name = ?, dob = ?,
        gender = ?, visa_status = ?, active = ?
      WHERE id = ?
    `, [
      staffData.firstName, staffData.middleName, staffData.lastName,
      staffData.dob, staffData.gender, staffData.visaStatus,
      staffData.status === 'Active' ? 1 : 0, staffId
    ]);

    // Update or insert contact information
    db.run(`
      INSERT OR REPLACE INTO staff_contact (
        staff_id, address_street, address_suburb, address_state,
        address_postcode, address_country, emergency_contact_name, emergency_contact_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      staffId, staffData.streetAddress, staffData.suburb, staffData.state,
      staffData.postcode, staffData.country, staffData.emergencyContactName,
      staffData.emergencyContactNumber
    ]);

    // Update or insert employment information
    db.run(`
      INSERT OR REPLACE INTO staff_employment (
        staff_id, role, employment_type, award_level, start_date,
        employment_status, default_hours_per_week, weekday_rate, saturday_rate,
        sunday_rate, public_holiday_rate, overtime_rate, pay_frequency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      staffId, staffData.role, staffData.employmentType, staffData.awardLevel,
      staffData.startDate, staffData.status || 'Active',
      staffData.defaultHoursPerWeek, staffData.weekdayRate, staffData.saturdayRate,
      staffData.sundayRate, staffData.publicHolidayRate, staffData.overtimeRate,
      staffData.payFrequency
    ]);

    // Update or insert compliance information
    db.run(`
      INSERT OR REPLACE INTO staff_compliance (
        staff_id, tfn, super_fund, super_member_id, payroll_ref,
        bank_account_name, bank_bsb, bank_account_number, bank_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      staffId, staffData.taxRef, staffData.superFund, staffData.superMemberId,
      staffData.payrollRef, staffData.accountName, staffData.bsb,
      staffData.accountNumber, staffData.bankName
    ]);

    // Update or insert document references
    db.run(`
      INSERT OR REPLACE INTO staff_documents (
        staff_id, profile_pic, contract_file, tax_form_file,
        bank_statement_file, other_docs
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      staffId, staffData.profilePic, staffData.employmentContract,
      staffData.taxDeclaration, staffData.bankDetails, staffData.otherDocuments
    ], function(err) {
      if (err) {
        db.run("ROLLBACK");
        return res.status(500).json({ error: err.message });
      }

      db.run("COMMIT");
      res.json({
        success: true,
        staff_id: staffId,
        message: "Staff member updated successfully"
      });
    });
  });
});

// Delete staff and all related data
app.delete("/api/staff/:id", (req, res) => {
  const staffId = req.params.id;

  // First check if staff member exists
  db.get("SELECT id, first_name, last_name FROM staff WHERE id = ?", [staffId], (err, staff) => {
    if (err) {
      console.error('Database error checking staff existence:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    // Delete all related data in a transaction
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Delete from related tables first (foreign key constraints)
      db.run("DELETE FROM staff_documents WHERE staff_id = ?", [staffId]);
      db.run("DELETE FROM staff_compliance WHERE staff_id = ?", [staffId]);
      db.run("DELETE FROM staff_employment WHERE staff_id = ?", [staffId]);
      db.run("DELETE FROM staff_contact WHERE staff_id = ?", [staffId]);

      // Finally delete from main staff table
      db.run("DELETE FROM staff WHERE id = ?", [staffId], function(err) {
        if (err) {
          console.error('Error deleting staff:', err.message);
          db.run("ROLLBACK");
          return res.status(500).json({ error: err.message });
        }

        db.run("COMMIT");
        console.log(`Staff member deleted: ${staff.first_name} ${staff.last_name} (ID: ${staffId})`);
        res.json({
          success: true,
          message: `Staff member ${staff.first_name} ${staff.last_name} deleted successfully`
        });
      });
    });
  });
});

// ---- Shift Management Routes ----

// Get shifts for a specific staff member
app.get("/api/shifts/:staffId", (req, res) => {
  const staffId = req.params.staffId;

  db.all(
    `SELECT s.*, st.first_name, st.last_name
     FROM staff_shifts s
     JOIN staff st ON s.staff_id = st.id
     WHERE s.staff_id = ?
     ORDER BY s.clock_in DESC`,
    [staffId],
    (err, shifts) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(shifts);
    }
  );
});

// Get all shifts (for admin)
app.get("/api/shifts", (req, res) => {
  db.all(
    `SELECT s.*, st.first_name, st.last_name, se.role
     FROM staff_shifts s
     JOIN staff st ON s.staff_id = st.id
     LEFT JOIN staff_employment se ON s.staff_id = se.staff_id
     ORDER BY s.clock_in DESC`,
    [],
    (err, shifts) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(shifts);
    }
  );
});

// Helper function to determine payday type based on date
function getPaydayType(clockInDate) {
  const date = new Date(clockInDate);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Simple day-based calculation (can be enhanced with public holidays later)
  if (dayOfWeek === 0) return 'Sunday';
  if (dayOfWeek === 6) return 'Saturday';
  return 'Weekday';
}

// Helper function to get hourly rate based on payday type
function getHourlyRate(employment, paydayType) {
  switch (paydayType) {
    case 'Sunday':
      return employment.sunday_rate || employment.weekday_rate || 0;
    case 'Saturday':
      return employment.saturday_rate || employment.weekday_rate || 0;
    case 'PublicHoliday':
      return employment.public_holiday_rate || employment.weekday_rate || 0;
    case 'Overtime':
      return employment.overtime_rate || employment.weekday_rate || 0;
    default: // Weekday
      return employment.weekday_rate || 0;
  }
}

// Clock in - create new shift
app.post("/api/shifts/clock-in", (req, res) => {
  const { staff_id, business_id = 1, venue_id = 1, clock_in } = req.body;

  // Check if staff member already has an active shift
  db.get(
    "SELECT * FROM staff_shifts WHERE staff_id = ? AND clock_out IS NULL",
    [staff_id],
    (err, existingShift) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingShift) {
        return res.status(400).json({ error: "Staff member already has an active shift" });
      }

      // Get staff employment data for pay rates
      db.get(
        "SELECT * FROM staff_employment WHERE staff_id = ?",
        [staff_id],
        (err, employment) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (!employment) {
            return res.status(400).json({ error: "No employment data found for this staff member" });
          }

          // Calculate payday type and hourly rate
          const paydayType = getPaydayType(clock_in);
          const hourlyRate = getHourlyRate(employment, paydayType);

          // Create new shift with calculated pay data
          db.run(
            `INSERT INTO staff_shifts (staff_id, business_id, venue_id, clock_in, payday_type, hourly_rate)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [staff_id, business_id, venue_id, clock_in, paydayType, hourlyRate],
            function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              res.json({
                success: true,
                shift_id: this.lastID,
                payday_type: paydayType,
                hourly_rate: hourlyRate,
                message: "Clock in successful"
              });
            }
          );
        }
      );
    }
  );
});

// Clock out - update existing shift
app.put("/api/shifts/clock-out", (req, res) => {
  const { staff_id, clock_out } = req.body;

  // Find the active shift
  db.get(
    "SELECT * FROM staff_shifts WHERE staff_id = ? AND clock_out IS NULL",
    [staff_id],
    (err, shift) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!shift) {
        return res.status(400).json({ error: "No active shift found for this staff member" });
      }

      // Calculate duration in hours
      const clockInTime = new Date(shift.clock_in);
      const clockOutTime = new Date(clock_out);
      const durationMs = clockOutTime - clockInTime;
      const durationHours = durationMs / (1000 * 60 * 60);

      // Calculate total pay
      const totalPay = durationHours * (shift.hourly_rate || 0);

      // Update shift with clock out time, duration, and total pay
      db.run(
        `UPDATE staff_shifts
         SET clock_out = ?, duration = ?, total_pay = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [clock_out, durationHours, totalPay, shift.id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.json({
            success: true,
            shift_id: shift.id,
            duration: durationHours,
            hourly_rate: shift.hourly_rate,
            total_pay: totalPay,
            message: "Clock out successful"
          });
        }
      );
    }
  );
});

// Get active shift for a staff member
app.get("/api/shifts/:staffId/active", (req, res) => {
  const staffId = req.params.staffId;

  db.get(
    `SELECT s.*, st.first_name, st.last_name
     FROM staff_shifts s
     JOIN staff st ON s.staff_id = st.id
     WHERE s.staff_id = ? AND s.clock_out IS NULL`,
    [staffId],
    (err, shift) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(shift || null);
    }
  );
});

// ---- Business API Endpoints ----

// LIST businesses with pagination
app.get('/api/businesses', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // Get total count for pagination info
  db.get('SELECT COUNT(*) as total FROM businesses', [], (countErr, countResult) => {
    if (countErr) {
      console.error('Error counting businesses:', countErr);
      return res.status(500).json({ error: countErr.message });
    }

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Get paginated data
    db.all('SELECT * FROM businesses ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
      if (err) {
        console.error('Error fetching businesses:', err);
        return res.status(500).json({ error: err.message });
      }

      res.json({
        data: rows,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    });
  });
});

// CREATE business
app.post('/api/businesses', (req, res) => {
  const { business_name, abn, owner_name, state, location, contact_email } = req.body;

  if (!business_name) {
    return res.status(400).json({ error: 'business_name is required' });
  }

  db.run(
    `INSERT INTO businesses (name, abn, owner_name, state, location, contact_email) VALUES (?, ?, ?, ?, ?, ?)`,
    [business_name, abn || null, owner_name || null, state || null, location || null, contact_email || null],
    function (err) {
      if (err) {
        console.error('Error creating business:', err);
        return res.status(500).json({ error: err.message });
      }

      const id = this.lastID;
      const code = 10000000 + id;

      // Set business code (triggers should handle this, but this ensures it's set)
      db.run('UPDATE businesses SET business_code = ?, updated_at = datetime("now") WHERE id = ?', [code, id], function (uerr) {
        if (uerr) {
          console.error('Error updating business code:', uerr);
          return res.status(500).json({ error: uerr.message });
        }

        // Return the created business
        db.get('SELECT * FROM businesses WHERE id = ?', [id], (gerr, row) => {
          if (gerr) {
            console.error('Error fetching created business:', gerr);
            return res.status(500).json({ error: gerr.message });
          }
          res.json(row);
        });
      });
    }
  );
});

// UPDATE business
app.put('/api/businesses/:id', (req, res) => {
  const id = Number(req.params.id);
  const { business_name, abn, owner_name, state, location, contact_email } = req.body;

  db.run(
    `UPDATE businesses SET name = ?, abn = ?, owner_name = ?, state = ?, location = ?, contact_email = ?, updated_at = datetime('now') WHERE id = ?`,
    [business_name, abn, owner_name, state, location, contact_email, id],
    function (err) {
      if (err) {
        console.error('Error updating business:', err);
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT * FROM businesses WHERE id = ?', [id], (gerr, row) => {
        if (gerr) {
          console.error('Error fetching updated business:', gerr);
          return res.status(500).json({ error: gerr.message });
        }
        res.json(row);
      });
    }
  );
});

// DELETE business
app.delete('/api/businesses/:id', (req, res) => {
  const id = Number(req.params.id);

  db.run('DELETE FROM businesses WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting business:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, id });
  });
});

// ---- Venues API Endpoints ----

// LIST venues with pagination (optionally filter by business_id)
app.get('/api/venues', (req, res) => {
  const businessId = req.query.business_id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // Build SQL queries based on business_id filter
  const countSql = businessId ? 'SELECT COUNT(*) as total FROM venues WHERE business_id = ?' : 'SELECT COUNT(*) as total FROM venues';
  const dataSql = businessId ? 'SELECT * FROM venues WHERE business_id = ? ORDER BY id DESC LIMIT ? OFFSET ?' : 'SELECT * FROM venues ORDER BY id DESC LIMIT ? OFFSET ?';
  const countParams = businessId ? [businessId] : [];
  const dataParams = businessId ? [businessId, limit, offset] : [limit, offset];

  // Get total count for pagination info
  db.get(countSql, countParams, (countErr, countResult) => {
    if (countErr) {
      console.error('Error counting venues:', countErr);
      return res.status(500).json({ error: countErr.message });
    }

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Get paginated data
    db.all(dataSql, dataParams, (err, rows) => {
      if (err) {
        console.error('Error fetching venues:', err);
        return res.status(500).json({ error: err.message });
      }

      res.json({
        data: rows,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    });
  });
});

// CREATE venue (all fields required)
app.post('/api/venues', (req, res) => {
  const { business_id, venue_name, state, location, subscription_plan, subscription_expiry, subscription_status } = req.body;

  if (!business_id || !venue_name || !state || !location || !subscription_plan || !subscription_expiry) {
    return res.status(400).json({ error: 'All venue fields are required: business_id, venue_name, state, location, subscription_plan, subscription_expiry' });
  }

  // Verify business exists
  db.get('SELECT id FROM businesses WHERE id = ?', [business_id], (err, businessRow) => {
    if (err) {
      console.error('Error checking business:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!businessRow) {
      return res.status(400).json({ error: 'Business not found' });
    }

    db.run(
      `INSERT INTO venues (business_id, venue_name, state, location, subscription_plan, subscription_expiry, subscription_status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [business_id, venue_name, state, location, subscription_plan, subscription_expiry, subscription_status || 'active'],
      function (ierr) {
        if (ierr) {
          console.error('Error creating venue:', ierr);
          return res.status(500).json({ error: ierr.message });
        }

        const id = this.lastID;
        const vcode = 20000000 + id;

        // Set venue code (triggers should handle this, but this ensures it's set)
        db.run('UPDATE venues SET venue_code = ?, updated_at = datetime("now") WHERE id = ?', [vcode, id], function (uerr) {
          if (uerr) {
            console.error('Error updating venue code:', uerr);
            return res.status(500).json({ error: uerr.message });
          }

          // Return the created venue
          db.get('SELECT * FROM venues WHERE id = ?', [id], (gerr, row) => {
            if (gerr) {
              console.error('Error fetching created venue:', gerr);
              return res.status(500).json({ error: gerr.message });
            }
            res.json(row);
          });
        });
      }
    );
  });
});

// UPDATE venue
app.put('/api/venues/:id', (req, res) => {
  const id = Number(req.params.id);
  const { venue_name, state, location, subscription_status, subscription_plan, subscription_expiry } = req.body;

  db.run(
    `UPDATE venues SET venue_name = ?, state = ?, location = ?, subscription_status = ?, subscription_plan = ?, subscription_expiry = ?, updated_at = datetime('now') WHERE id = ?`,
    [venue_name, state, location, subscription_status, subscription_plan, subscription_expiry, id],
    function (err) {
      if (err) {
        console.error('Error updating venue:', err);
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT * FROM venues WHERE id = ?', [id], (gerr, row) => {
        if (gerr) {
          console.error('Error fetching updated venue:', gerr);
          return res.status(500).json({ error: gerr.message });
        }
        res.json(row);
      });
    }
  );
});

// DELETE venue
app.delete('/api/venues/:id', (req, res) => {
  const id = Number(req.params.id);

  db.run('DELETE FROM venues WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting venue:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, id });
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
