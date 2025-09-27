document.addEventListener("DOMContentLoaded", initializeKiosk);

function initializeKiosk() {
  // Check for remembered venue first
  const venue = JSON.parse(localStorage.getItem("kioskVenue") || "null");

  if (venue && venue.kiosk_username) {
    // Pre-fill venue name and make it readonly
    const usernameField = document.getElementById("kioskUsername");
    usernameField.value = venue.kiosk_username;
    usernameField.readOnly = true;

    // Focus password field for quick login
    document.getElementById("kioskPassword").focus();
  }

  // Check if kiosk is already logged in (full session)
  const kioskContext = JSON.parse(localStorage.getItem("kioskContext") || "{}");
  if (kioskContext.venue_id && kioskContext.business_id) {
    showKioskPanel();
    loadStaffGrid();
  } else {
    showLoginForm();
  }
}

function showLoginForm() {
  document.getElementById("kioskLogin").style.display = "block";
  document.getElementById("kioskPanel").style.display = "none";
  document.getElementById("venueName").textContent = "Kiosk Login Required";
}

function showKioskPanel() {
  document.getElementById("kioskLogin").style.display = "none";
  document.getElementById("kioskPanel").style.display = "block";
  document.getElementById("logoutBtn").style.display = "block";
}

async function kioskLogin() {
  const username = document.getElementById("kioskUsername").value.trim();
  const password = document.getElementById("kioskPassword").value.trim();
  const errorBox = document.getElementById("kioskLoginError");
  const passwordField = document.getElementById("kioskPassword");

  // Clear previous errors
  errorBox.innerHTML = "";

  if (!username || !password) {
    errorBox.innerHTML = `
      <div class="alert alert-warning" role="alert">
        ⚠️ Please enter both venue code and password
      </div>`;
    passwordField.focus();
    return;
  }

  try {
    const res = await fetch("/api/kiosk/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      // ❌ Show error
      errorBox.innerHTML = `
        <div class="alert alert-danger" role="alert">
          ❌ ${data.error || "Invalid login. Please try again."}
        </div>`;

      // 🔄 Reset + focus password
      passwordField.value = "";
      passwordField.focus();
      return;
    }

    // ✅ Success - Save both session context and venue info
    localStorage.setItem("kioskContext", JSON.stringify({
      venue_id: data.venue_id,
      business_id: data.business_id,
      venue_name: data.venue_name,
      kiosk_username: data.kiosk_username
    }));

    // Save venue info for future logins (remember venue)
    localStorage.setItem("kioskVenue", JSON.stringify({
      venue_id: data.venue_id,
      business_id: data.business_id,
      kiosk_username: data.kiosk_username
    }));

    // Clear form and errors
    document.getElementById("kioskUsername").value = "";
    passwordField.value = "";
    errorBox.innerHTML = "";

    // Show kiosk panel and load staff
    showKioskPanel();
    loadStaffGrid();

  } catch (err) {
    console.error("Error during kiosk login:", err);
    errorBox.innerHTML = `
      <div class="alert alert-danger" role="alert">
        ⚠️ Server error, please try again later.
      </div>`;
    passwordField.value = "";
    passwordField.focus(); // auto-focus for retry
  }
}

async function loadStaffGrid() {
  const ctx = JSON.parse(localStorage.getItem("kioskContext") || "{}");
  if (!ctx.venue_id || !ctx.business_id) {
    console.warn("No kiosk context found");
    showLoginForm();
    return;
  }

  // Show venue name in header
  document.getElementById("venueName").textContent = `Venue: ${ctx.venue_name || ctx.venue_id}`;

  try {
    const response = await fetch(`/api/kiosk/staff?business_id=${ctx.business_id}&venue_id=${ctx.venue_id}`);
    const staff = await response.json();

    // Filter for active staff (safety filter, backend already filters)
    const activeStaff = staff.filter(s => !s.employment_status || s.employment_status === "active");

    const grid = document.getElementById("staffGrid");
    grid.innerHTML = activeStaff.map(s => `
      <div class="staff-card" data-staff-id="${s.id}" data-staff-name="${s.first_name} ${s.last_name}">
        <i class="bi bi-person-circle"></i>
        <div>${s.first_name} ${s.last_name}</div>
      </div>
    `).join("");
  } catch (err) {
    console.error("Error loading staff:", err);
    document.getElementById("staffGrid").innerHTML = "<p class='text-danger'>Failed to load staff</p>";
  }
}

async function selectStaff(staffId, staffName) {
  document.getElementById("staffGrid").classList.add("hidden");
  document.getElementById("clockSection").classList.remove("hidden");
  document.getElementById("selectedStaffName").textContent = staffName;
  localStorage.setItem("selectedStaffId", staffId);

  await refreshStatus(staffId);
}

function backToStaffList() {
  document.getElementById("staffGrid").classList.remove("hidden");
  document.getElementById("clockSection").classList.add("hidden");
}

async function refreshStatus(staffId) {
  const ctx = JSON.parse(localStorage.getItem("kioskContext") || "{}");
  try {
    const res = await fetch(`/api/kiosk/status/${staffId}?business_id=${ctx.business_id}&venue_id=${ctx.venue_id}`);
    const data = await res.json();

    const statusEl = document.getElementById("statusDisplay");

    if (data.autoClosed) {
      statusEl.className = "alert alert-warning text-center";
      statusEl.textContent = `⚠️ Shift auto-closed after 8 hours (Clock-out at ${new Date(data.shift.clock_out).toLocaleTimeString()})`;
      document.getElementById("clockInBtn").disabled = false;
      document.getElementById("clockOutBtn").disabled = true;
      return;
    }

    if (data.active) {
      statusEl.className = "alert alert-success text-center";
      statusEl.textContent = `✅ Currently clocked in since ${new Date(data.clock_in).toLocaleTimeString()}`;
      document.getElementById("clockInBtn").disabled = true;
      document.getElementById("clockOutBtn").disabled = false;
    } else {
      statusEl.className = "alert alert-info text-center";
      statusEl.textContent = "Not clocked in";
      document.getElementById("clockInBtn").disabled = false;
      document.getElementById("clockOutBtn").disabled = true;
    }
  } catch (err) {
    console.error("Error fetching shift status:", err);
  }
}

async function clockIn() {
  const ctx = JSON.parse(localStorage.getItem("kioskContext") || "{}");
  const staffId = localStorage.getItem("selectedStaffId");
  const time = new Date().toISOString();

  try {
    const response = await fetch("/api/kiosk/clock-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staff_id: staffId,
        business_id: ctx.business_id,
        venue_id: ctx.venue_id,
        clock_in: time
      })
    });

    const data = await response.json();
    if (response.ok) {
      showMessage("✅ Clock-in successful!", "success");
      await refreshStatus(staffId);
    } else {
      showMessage("❌ " + (data.error || "Clock-in failed"), "error");
    }
  } catch (err) {
    console.error("Clock-in error:", err);
    showMessage("⚠️ Connection error", "error");
  }
}

async function clockOut() {
  const ctx = JSON.parse(localStorage.getItem("kioskContext") || "{}");
  const staffId = localStorage.getItem("selectedStaffId");
  const time = new Date().toISOString();

  try {
    const response = await fetch("/api/kiosk/clock-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staff_id: staffId,
        clock_out: time
      })
    });

    const data = await response.json();
    if (response.ok && data.shift) {
      // Show shift summary
      showShiftSummary(data.shift);
      await refreshStatus(staffId);
    } else if (response.ok) {
      showMessage("✅ Clock-out successful!", "success");
      await refreshStatus(staffId);
    } else {
      showMessage("❌ " + (data.error || "Clock-out failed"), "error");
    }
  } catch (err) {
    console.error("Clock-out error:", err);
    showMessage("⚠️ Connection error", "error");
  }
}

function showShiftSummary(shift) {
  const startTime = new Date(shift.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const endTime = new Date(shift.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  // Build shift details
  let shiftDetails = `
    <div class="text-center">
      <h4>✅ Shift Ended</h4>
      <p><strong>Started:</strong> ${startTime}</p>
      <p><strong>Ended:</strong> ${endTime}</p>
      <p><strong>Duration:</strong> ${shift.hours_worked || shift.duration_hours} hours</p>
  `;

  // Add pay info if available
  if (shift.total_pay && shift.rate) {
    shiftDetails += `
      <p><strong>Rate:</strong> $${shift.rate}/hour</p>
      <p><strong>Total Pay:</strong> $${shift.total_pay}</p>
    `;

    // Add special rate indicators
    if (shift.is_holiday) {
      shiftDetails += `<p class="text-warning"><i class="bi bi-star"></i> Holiday Rate Applied</p>`;
    } else if (shift.is_weekend) {
      shiftDetails += `<p class="text-info"><i class="bi bi-calendar-week"></i> Weekend Rate Applied</p>`;
    }
  }

  shiftDetails += `</div>`;

  const msgEl = document.getElementById("message");
  msgEl.innerHTML = shiftDetails;
  msgEl.className = "alert mt-3 alert-success";
  msgEl.classList.remove("hidden");

  // Auto-return to staff list after 7 seconds (longer to show pay info)
  setTimeout(() => {
    backToStaffList();
    msgEl.classList.add("hidden");
  }, 7000);
}

function showMessage(text, type) {
  const msgEl = document.getElementById("message");
  msgEl.textContent = text;
  msgEl.className = `alert mt-3 alert-${type === "success" ? "success" : "danger"}`;
  msgEl.classList.remove("hidden");
}

function kioskLogout() {
  // Clear current session (staff grid access)
  localStorage.removeItem("kioskContext");

  // Hide logout button and show login form
  document.getElementById("logoutBtn").style.display = "none";
  document.getElementById("kioskPanel").style.display = "none";
  document.getElementById("kioskLogin").style.display = "block";

  // Reset password field and focus it
  const passwordField = document.getElementById("kioskPassword");
  passwordField.value = "";
  passwordField.focus();

  // Clear error messages
  document.getElementById("kioskLoginError").innerHTML = "";

  // Reset venue name in header
  document.getElementById("venueName").textContent = "Kiosk Login Required";

  // Keep venue remembered (username field stays pre-filled and readonly)
}

// Setup event listeners for kiosk functionality
function setupEventListeners() {
    // Kiosk login button
    const kioskLoginButton = document.getElementById("kioskLoginButton");
    if (kioskLoginButton) {
        kioskLoginButton.addEventListener("click", kioskLogin);
    }

    // Logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", kioskLogout);
    }

    // Back to staff list button
    const backToStaffListBtn = document.getElementById("backToStaffListBtn");
    if (backToStaffListBtn) {
        backToStaffListBtn.addEventListener("click", backToStaffList);
    }

    // Clock In button
    const clockInBtn = document.getElementById("clockInBtn");
    if (clockInBtn) {
        clockInBtn.addEventListener("click", clockIn);
    }

    // Clock Out button
    const clockOutBtn = document.getElementById("clockOutBtn");
    if (clockOutBtn) {
        clockOutBtn.addEventListener("click", clockOut);
    }

    // Staff card selection (event delegation)
    document.body.addEventListener("click", (e) => {
        const staffCard = e.target.closest(".staff-card");
        if (staffCard) {
            const staffId = staffCard.dataset.staffId;
            const staffName = staffCard.dataset.staffName;
            if (staffId && staffName) {
                selectStaff(staffId, staffName);
            }
        }
    });
}

// Initialize event listeners
setupEventListeners();