// frontend/js/staff.js
// Staff management functionality for admin panel

// Utility function to close modals safely without ARIA warnings
function closeModalAndBlur(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    const modalInstance = bootstrap.Modal.getInstance(modal);
    if (modalInstance) {
      modalInstance.hide();
      // Clear focus to avoid aria-hidden warning
      document.activeElement.blur();
    }
  }
}

async function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user") || localStorage.getItem("currentUser") || "{}"
    );
  } catch {
    return {};
  }
}

// Load staff list and render table
async function loadStaffList() {
  const user = await getCurrentUser();
  if (!user.business_id) {
    console.warn("No business_id found in user context");
    showStaffTableError("No user context found. Please log in again.");
    return;
  }

  const params = new URLSearchParams({
    business_id: user.business_id,
    venue_id: user.venue_id,        // ✅ ensure venue_id is always sent
    access_level: user.access_level,
    staff_id: user.staff_id,
  });

  try {
    const res = await fetch("/api/staff?" + params.toString());
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch staff");

    renderStaffTable(data.data || []);
  } catch (err) {
    console.error("Error loading staff", err);
    showStaffTableError("Error loading staff: " + err.message);
  }
}

function renderStaffTable(rows) {
  // Use the new admin.html structure with staffList element
  const staffList = document.getElementById("staffList");
  if (!staffList) return;

  if (!rows || rows.length === 0) {
    staffList.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-people display-1 mb-3"></i>
        <h5>No staff members found</h5>
        <p>Get started by using the "Add Staff" button above</p>
      </div>
    `;
    return;
  }

  // Create table structure with improved styling
  staffList.innerHTML = `
    <table class="table table-dark table-striped table-hover">
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Access</th>
          <th>Status</th>
          <th>Venue</th>
          <th>Start Date</th>
          <th>Weekday Rate</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="staffTableBody">
      </tbody>
    </table>
  `;

  const tbody = document.getElementById("staffTableBody");
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted py-4">
          <i class="bi bi-people display-6 mb-3 d-block"></i>
          <h5>No staff members found</h5>
          <p>Get started by adding your first staff member</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows
    .map((s) => {
      const fullName = [s.first_name, s.middle_name, s.last_name]
        .filter(Boolean)
        .join(" ");

      return `
        <tr data-staff-id="${s.id}">
          <td><strong>${fullName}</strong></td>
          <td>${s.role_title || "-"}</td>
          <td>
            <span class="badge bg-${getAccessLevelColor(s.access_level)}">
              ${s.access_level || ""}
            </span>
          </td>
          <td>
            <span class="badge ${s.employment_status === 'active' ? 'bg-success' : 'bg-secondary'}">
              ${s.employment_status || 'active'}
            </span>
          </td>
          <td>${s.venue_name || ""}</td>
          <td>${formatDate(s.start_date)}</td>
          <td>$${parseFloat(s.weekday_rate || 0).toFixed(2)}</td>
          <td>
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-warning edit-staff-btn" data-staff-id="${s.id}" title="Edit Full Profile">
                <i class="bi bi-pencil-square"></i> Edit
              </button>
              <button class="btn btn-outline-danger delete-staff-btn" data-staff-id="${s.id}" title="Delete">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function getAccessLevelColor(level) {
  switch (level) {
    case 'system_admin': return 'danger';
    case 'manager': return 'warning';
    case 'supervisor': return 'info';
    case 'employee': return 'secondary';
    default: return 'light';
  }
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-AU');
  } catch {
    return dateStr;
  }
}

function showStaffTableError(message) {
  const staffList = document.getElementById("staffList");
  if (staffList) {
    staffList.innerHTML = `
      <div class="text-center text-danger py-4">
        <i class="bi bi-exclamation-triangle display-6 mb-3"></i>
        <p>${message}</p>
        <button class="btn btn-outline-primary btn-sm" onclick="loadStaffList()">
          <i class="bi bi-arrow-clockwise me-1"></i>Retry
        </button>
      </div>
    `;
  }
}

// Handle Add Staff form submission
async function handleAddStaff(event) {
  if (event) {
    event.preventDefault();
  }

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

  const form = document.getElementById('addStaffForm');
  if (!form) return;

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  // ✅ Add context from current user (using the same currentUser from above)
  if (currentUser.business_id) {
    payload.business_id = currentUser.business_id;
  }
  if (currentUser.venue_id) {
    payload.venue_id = currentUser.venue_id;
  }
  if (currentUser.access_level) {
    // DON'T override the form's access_level - that's for the NEW staff member
    payload.created_by_role = currentUser.access_level;  // For audit trail
  }
  if (currentUser.staff_id) {
    payload.created_by_staff = currentUser.staff_id;
  }


  // Build query params for auth (current user's details)
  const authParams = new URLSearchParams({
    access_level: currentUser.access_level,
    staff_id: currentUser.staff_id,
    venue_id: currentUser.venue_id,
    business_id: currentUser.business_id
  });


  try {
    const res = await fetch(`/api/staff?${authParams}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add staff");

    // Success
    showMessage("Staff member added successfully!", "success");
    form.reset();

    // Close modal safely
    closeModalAndBlur("addStaffModal");

    // Reload staff list
    loadStaffList();

  } catch (err) {
    console.error("Error adding staff:", err);
    showMessage("Error adding staff: " + err.message, "danger");
  }
}

// Edit staff function - loads full profile for editing
async function editStaff(staffId) {
  try {
    const user = await getCurrentUser();
    const params = new URLSearchParams({
      business_id: user.business_id,
      venue_id: user.venue_id,
      access_level: user.access_level,
      staff_id: user.staff_id,
    });

    const res = await fetch(`/api/staff/${staffId}?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to fetch staff details");

    const staff = data.data || data; // Handle different response formats

    // ✅ Fill modal fields
    document.getElementById("editStaffId").value = staff.id || staffId;
    document.getElementById("editFirstName").value = staff.first_name || "";
    document.getElementById("editMiddleName").value = staff.middle_name || "";
    document.getElementById("editLastName").value = staff.last_name || "";
    document.getElementById("editUsername").value = staff.username || "";
    document.getElementById("editPassword").value = ""; // leave blank
    document.getElementById("editAccessLevel").value = staff.access_level || "employee";
    document.getElementById("editRoleTitle").value = staff.role_title || "";
    document.getElementById("editStartDate").value = staff.start_date || "";
    document.getElementById("editEmploymentStatus").value = staff.employment_status || "active";
    document.getElementById("editPayFrequency").value = staff.pay_frequency || "weekly";
    document.getElementById("editHoursPerWeek").value = staff.default_hours_per_week || "";
    document.getElementById("editWeekdayRate").value = staff.weekday_rate || "";
    document.getElementById("editSaturdayRate").value = staff.saturday_rate || "";
    document.getElementById("editSundayRate").value = staff.sunday_rate || "";
    document.getElementById("editPublicHolidayRate").value = staff.public_holiday_rate || "";
    document.getElementById("editOvertimeRate").value = staff.overtime_rate || "";
    document.getElementById("editDob").value = staff.dob || "";
    document.getElementById("editGender").value = staff.gender || "";
    document.getElementById("editAddress").value = staff.full_address || "";
    document.getElementById("editEmergencyName").value = staff.emergency_contact_name || "";
    document.getElementById("editEmergencyPhone").value = staff.emergency_contact_phone || "";
    document.getElementById("editEmploymentType").value = staff.employment_type || "full_time";

    // Show modal
    const modal = document.getElementById('editStaffModal');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }

  } catch (err) {
    console.error("Error loading staff details:", err);
    showMessage("Error loading staff details: " + err.message, "danger");
  }
}

// Submit edit staff form
async function submitEditStaff(event) {
  event.preventDefault();
  const form = event.target;
  const staffId = document.getElementById("editStaffId").value;

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());


  // ✅ Add context from current user
  const currentUser = await getCurrentUser();
  if (currentUser.business_id) {
    payload.business_id = currentUser.business_id;
  }
  if (currentUser.venue_id) {
    payload.venue_id = currentUser.venue_id;
  }
  if (currentUser.access_level) {
    // DON'T override the form's access_level - that's for the staff being edited
    payload.updated_by_role = currentUser.access_level;  // For audit trail
  }
  if (currentUser.staff_id) {
    payload.updated_by_staff = currentUser.staff_id;
  }

  // Build query params for auth (current user's details)
  const authParams = new URLSearchParams({
    access_level: currentUser.access_level,
    staff_id: currentUser.staff_id,
    venue_id: currentUser.venue_id,
    business_id: currentUser.business_id
  });

  try {
    const res = await fetch(`/api/staff/${staffId}?${authParams}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to update staff");

    // Success - close modal and refresh
    showMessage("✅ Staff profile updated successfully!", "success");

    // Close modal safely
    closeModalAndBlur("editStaffModal");

    // Reload staff list
    loadStaffList();

  } catch (err) {
    console.error("Error updating staff:", err);
    showMessage("Error updating staff: " + err.message, "danger");
  }
}

async function deleteStaff(staffId) {
  if (!confirm('Are you sure you want to deactivate this staff member? Their history will remain.')) return;

  try {
    const user = await getCurrentUser();
    const params = new URLSearchParams({
      business_id: user.business_id,
      venue_id: user.venue_id,
      access_level: user.access_level,
      staff_id: user.staff_id,
    });

    const res = await fetch(`/api/staff/${staffId}?${params.toString()}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) {
      showMessage('Staff member deactivated successfully', 'success');
      loadStaffList();
    } else {
      showMessage('Error deactivating staff: ' + (data.error || 'Unknown error'), 'danger');
    }
  } catch (err) {
    console.error('Delete error:', err);
    showMessage('Network error deactivating staff', 'danger');
  }
}

// Utility function to show messages
function showMessage(message, type = 'info') {
  // Create a temporary toast/alert
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.body.appendChild(alertDiv);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 4000);
}

// Initialize staff management when DOM is ready
document.addEventListener("DOMContentLoaded", function() {
  // Load initial staff list
  loadStaffList();

  // Hook up the add staff form if it exists
  const addStaffForm = document.getElementById("addStaffForm");
  if (addStaffForm) {
    addStaffForm.addEventListener("submit", handleAddStaff);
  }

  // Hook up Edit Staff form
  const editStaffForm = document.getElementById("editStaffForm");
  if (editStaffForm) {
    editStaffForm.addEventListener("submit", submitEditStaff);
  }

  // Hook up Edit + Delete buttons via event delegation
  document.body.addEventListener("click", (e) => {
    if (e.target.closest(".edit-staff-btn")) {
      const id = e.target.closest(".edit-staff-btn").dataset.staffId;
      if (id) editStaff(id);
    }

    if (e.target.closest(".delete-staff-btn")) {
      const id = e.target.closest(".delete-staff-btn").dataset.staffId;
      if (id) deleteStaff(id);
    }
  });
});