let staffMembers = JSON.parse(localStorage.getItem('staffMembers')) || [];
let shifts = JSON.parse(localStorage.getItem('shifts')) || [];
let rosters = JSON.parse(localStorage.getItem('rosters')) || [];
let staffIdCounter = parseInt(localStorage.getItem('staffIdCounter')) || 1;
let rosterIdCounter = parseInt(localStorage.getItem('rosterIdCounter')) || 1;

// Holiday Management System Variables
let systemSettings = JSON.parse(localStorage.getItem('systemSettings')) || {
    currentState: 'TAS',
    customHolidays: {}
};
let currentHolidayView = 'upcoming'; // 'upcoming' or 'full'
let currentShiftPage = 1;
const shiftsPerPage = 25;
let filteredShifts = [];

// Add Staff Form Handler
document.getElementById('addStaffForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);

    const staff = {
        id: staffIdCounter++,
        firstName: formData.get('firstName'),
        middleName: formData.get('middleName') || '',
        lastName: formData.get('lastName'),
        dob: formData.get('dob'),
        gender: formData.get('gender'),
        visaStatus: formData.get('visaStatus'),
        // Address Information
        streetAddress: formData.get('streetAddress') || '',
        suburb: formData.get('suburb') || '',
        state: formData.get('state') || '',
        postcode: formData.get('postcode') || '',
        country: formData.get('country') || '',
        // Emergency Contact
        emergencyContactName: formData.get('emergencyContactName') || '',
        emergencyContactNumber: formData.get('emergencyContactNumber') || '',
        // Employment Information
        startDate: formData.get('startDate'),
        role: formData.get('role'),
        status: formData.get('status') || 'active',
        // Pay Rates
        weekdayRate: parseFloat(formData.get('weekdayRate')) || 0,
        saturdayRate: parseFloat(formData.get('saturdayRate')) || 0,
        sundayRate: parseFloat(formData.get('sundayRate')) || 0,
        publicHolidayRate: parseFloat(formData.get('publicHolidayRate')) || 0,
        // Bank Details
        accountName: formData.get('accountName') || '',
        bsb: formData.get('bsb') || '',
        accountNumber: formData.get('accountNumber') || '',
        bankName: formData.get('bankName') || '',
        // Legacy field for compatibility
        hourlyRate: parseFloat(formData.get('weekdayRate')) || 0,
        profilePic: '', // File handling would need backend
        createdAt: new Date().toISOString()
    };

    staffMembers.push(staff);
    localStorage.setItem('staffMembers', JSON.stringify(staffMembers));
    localStorage.setItem('staffIdCounter', staffIdCounter);

    this.reset();
    bootstrap.Modal.getInstance(document.getElementById('addStaffModal')).hide();
    renderStaffTable();
});

// Edit Staff Form Handler
document.getElementById('editStaffForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const staffId = parseInt(formData.get('staffId'));

    const staffIndex = staffMembers.findIndex(s => s.id === staffId);
    if (staffIndex !== -1) {
        staffMembers[staffIndex] = {
            ...staffMembers[staffIndex],
            firstName: formData.get('firstName'),
            middleName: formData.get('middleName') || '',
            lastName: formData.get('lastName'),
            dob: formData.get('dob'),
            gender: formData.get('gender'),
            visaStatus: formData.get('visaStatus'),
            // Address Information
            streetAddress: formData.get('streetAddress') || '',
            suburb: formData.get('suburb') || '',
            state: formData.get('state') || '',
            postcode: formData.get('postcode') || '',
            country: formData.get('country') || '',
            // Emergency Contact
            emergencyContactName: formData.get('emergencyContactName') || '',
            emergencyContactNumber: formData.get('emergencyContactNumber') || '',
            // Employment Information
            startDate: formData.get('startDate'),
            role: formData.get('role'),
            status: formData.get('status') || 'active',
            // Pay Rates
            weekdayRate: parseFloat(formData.get('weekdayRate')) || 0,
            saturdayRate: parseFloat(formData.get('saturdayRate')) || 0,
            sundayRate: parseFloat(formData.get('sundayRate')) || 0,
            publicHolidayRate: parseFloat(formData.get('publicHolidayRate')) || 0,
            // Bank Details
            accountName: formData.get('accountName') || '',
            bsb: formData.get('bsb') || '',
            accountNumber: formData.get('accountNumber') || '',
            bankName: formData.get('bankName') || '',
            // Legacy field for compatibility
            hourlyRate: parseFloat(formData.get('weekdayRate')) || 0
        };

        localStorage.setItem('staffMembers', JSON.stringify(staffMembers));
        bootstrap.Modal.getInstance(document.getElementById('editStaffModal')).hide();
        renderStaffTable();
    }
});

function editStaff(staffId) {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) return;

    const form = document.getElementById('editStaffForm');
    form.staffId.value = staff.id;

    // Personal Information
    form.firstName.value = staff.firstName || '';
    form.middleName.value = staff.middleName || '';
    form.lastName.value = staff.lastName || '';
    form.dob.value = staff.dob || '';
    form.gender.value = staff.gender || '';
    form.visaStatus.value = staff.visaStatus || '';

    // Address Information
    form.streetAddress.value = staff.streetAddress || '';
    form.suburb.value = staff.suburb || '';
    form.state.value = staff.state || '';
    form.postcode.value = staff.postcode || '';
    form.country.value = staff.country || '';

    // Emergency Contact
    form.emergencyContactName.value = staff.emergencyContactName || '';
    form.emergencyContactNumber.value = staff.emergencyContactNumber || '';

    // Employment Information
    form.startDate.value = staff.startDate || '';
    form.role.value = staff.role || '';
    form.status.value = staff.status || 'active';

    // Pay Rates (fallback to legacy hourlyRate if new rates don't exist)
    form.weekdayRate.value = staff.weekdayRate || staff.hourlyRate || '';
    form.saturdayRate.value = staff.saturdayRate || '';
    form.sundayRate.value = staff.sundayRate || '';
    form.publicHolidayRate.value = staff.publicHolidayRate || '';

    // Bank Details
    form.accountName.value = staff.accountName || '';
    form.bsb.value = staff.bsb || '';
    form.accountNumber.value = staff.accountNumber || '';
    form.bankName.value = staff.bankName || '';

    new bootstrap.Modal(document.getElementById('editStaffModal')).show();
}

function removeStaff(staffId) {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) return;

    const fullName = `${staff.firstName} ${staff.lastName}`;
    if (confirm(`Are you sure you want to remove ${fullName}?`)) {
        staffMembers = staffMembers.filter(s => s.id !== staffId);
        localStorage.setItem('staffMembers', JSON.stringify(staffMembers));
        renderStaffTable();
    }
}

function renderStaffTable() {
    const tbody = document.getElementById('staffTableBody');

    if (staffMembers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted fst-italic py-4">No staff members added yet.</td></tr>';
        return;
    }

    tbody.innerHTML = staffMembers.map(staff => {
        const fullName = `${staff.firstName} ${staff.middleName ? staff.middleName + ' ' : ''}${staff.lastName}`;
        const weekdayRate = staff.weekdayRate ? `$${staff.weekdayRate.toFixed(2)}` : (staff.hourlyRate ? `$${staff.hourlyRate.toFixed(2)}` : '-');
        const startDate = staff.startDate ? new Date(staff.startDate).toLocaleDateString() : '-';
        const status = staff.status || 'active';
        const statusBadge = status === 'active' ?
            '<span class="badge-active">Active</span>' :
            '<span class="badge-inactive">Inactive</span>';

        return `
            <tr>
                <td>${fullName}</td>
                <td>${staff.role || '-'}</td>
                <td>${startDate}</td>
                <td>${weekdayRate}</td>
                <td>${staff.visaStatus || '-'}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" onclick="editStaff(${staff.id})">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="removeStaff(${staff.id})">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderTodayShifts() {
    const today = new Date().toDateString();
    const todayShifts = shifts.filter(shift =>
        new Date(shift.clockIn).toDateString() === today
    );

    const tbody = document.getElementById('shiftsTableBody');

    if (todayShifts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted fst-italic py-4">No shifts recorded for today.</td></tr>';
        return;
    }

    tbody.innerHTML = todayShifts.map(shift => {
        const staff = staffMembers.find(s => s.id === shift.staffId);
        const clockIn = new Date(shift.clockIn).toLocaleTimeString();
        const clockOut = shift.clockOut ? new Date(shift.clockOut).toLocaleTimeString() : '-';
        const status = shift.clockOut ? 'Completed' : 'Active';
        const statusClass = shift.clockOut ? 'status-completed' : 'status-active';

        // Get day type and determine pay rate
        const dayType = getShiftDayType(shift.clockIn);
        let actualPayRate = 0;
        let duration = '-';
        let totalPay = '-';

        if (staff) {
            // Determine pay rate based on day type
            if (dayType.type === 'Public Holiday') {
                actualPayRate = staff.publicHolidayRate || staff.weekdayRate || staff.hourlyRate || 0;
            } else if (dayType.type === 'Sunday') {
                actualPayRate = staff.sundayRate || staff.weekdayRate || staff.hourlyRate || 0;
            } else if (dayType.type === 'Saturday') {
                actualPayRate = staff.saturdayRate || staff.weekdayRate || staff.hourlyRate || 0;
            } else {
                actualPayRate = staff.weekdayRate || staff.hourlyRate || 0;
            }
        }

        if (shift.clockOut && staff) {
            const durationMs = new Date(shift.clockOut) - new Date(shift.clockIn);
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            duration = `${hours}h ${minutes}m`;

            const totalHours = durationMs / (1000 * 60 * 60);
            totalPay = `$${(totalHours * actualPayRate).toFixed(2)}`;
        } else if (!shift.clockOut && staff && actualPayRate > 0) {
            // Show running total for active shifts
            const currentTime = new Date();
            const durationMs = currentTime - new Date(shift.clockIn);
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            duration = `${hours}h ${minutes}m`;

            const totalHours = durationMs / (1000 * 60 * 60);
            totalPay = `$${(totalHours * actualPayRate).toFixed(2)} <small class="text-muted">(running)</small>`;
        }

        const payRateDisplay = actualPayRate > 0 ? `$${actualPayRate.toFixed(2)}` : '-';

        return `
            <tr>
                <td>${shift.staffName}</td>
                <td>${clockIn}</td>
                <td>${clockOut}</td>
                <td>${duration}</td>
                <td>
                    <span class="${dayType.badge}">${dayType.name}</span>
                    ${dayType.type === 'Public Holiday' ? '<br><small class="text-muted">' + dayType.name + '</small>' : ''}
                </td>
                <td>${payRateDisplay}</td>
                <td>${totalPay}</td>
                <td><span class="${statusClass}">${status}</span></td>
            </tr>
        `;
    }).join('');
}

// Add Roster Form Handler
document.getElementById('addRosterForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);

    // Get selected staff IDs
    const selectedStaff = [];
    const checkboxes = document.querySelectorAll('#activeStaffList input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        const staffId = parseInt(checkbox.value);
        const staff = staffMembers.find(s => s.id === staffId);
        if (staff) {
            selectedStaff.push({
                id: staff.id,
                name: `${staff.firstName} ${staff.lastName}`,
                role: staff.role
            });
        }
    });

    if (selectedStaff.length === 0) {
        alert('Please select at least one staff member.');
        return;
    }

    // Validate date (today or future only)
    const rosterDate = new Date(formData.get('rosterDate'));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (rosterDate < today) {
        alert('Roster date must be today or in the future.');
        return;
    }

    // Validate times
    const startTime = formData.get('startTime');
    const endTime = formData.get('endTime');
    if (startTime >= endTime) {
        alert('End time must be after start time.');
        return;
    }

    const roster = {
        id: rosterIdCounter++,
        date: formData.get('rosterDate'),
        jobDescription: formData.get('jobDescription'),
        startTime: startTime,
        endTime: endTime,
        assignedStaff: selectedStaff,
        notes: formData.get('notes') || '',
        status: 'upcoming',
        createdAt: new Date().toISOString()
    };

    rosters.push(roster);
    localStorage.setItem('rosters', JSON.stringify(rosters));
    localStorage.setItem('rosterIdCounter', rosterIdCounter);

    this.reset();
    bootstrap.Modal.getInstance(document.getElementById('addRosterModal')).hide();
    renderRosterTable();
});

// Edit Roster Form Handler
document.getElementById('editRosterForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const rosterId = parseInt(formData.get('rosterId'));

    // Get selected staff IDs
    const selectedStaff = [];
    const checkboxes = document.querySelectorAll('#editActiveStaffList input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        const staffId = parseInt(checkbox.value);
        const staff = staffMembers.find(s => s.id === staffId);
        if (staff) {
            selectedStaff.push({
                id: staff.id,
                name: `${staff.firstName} ${staff.lastName}`,
                role: staff.role
            });
        }
    });

    if (selectedStaff.length === 0) {
        alert('Please select at least one staff member.');
        return;
    }

    // Validate date (today or future only)
    const rosterDate = new Date(formData.get('rosterDate'));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (rosterDate < today) {
        alert('Roster date must be today or in the future.');
        return;
    }

    // Validate times
    const startTime = formData.get('startTime');
    const endTime = formData.get('endTime');
    if (startTime >= endTime) {
        alert('End time must be after start time.');
        return;
    }

    const rosterIndex = rosters.findIndex(r => r.id === rosterId);
    if (rosterIndex !== -1) {
        rosters[rosterIndex] = {
            ...rosters[rosterIndex],
            date: formData.get('rosterDate'),
            jobDescription: formData.get('jobDescription'),
            startTime: startTime,
            endTime: endTime,
            assignedStaff: selectedStaff,
            notes: formData.get('notes') || '',
            status: formData.get('status')
        };

        localStorage.setItem('rosters', JSON.stringify(rosters));
        bootstrap.Modal.getInstance(document.getElementById('editRosterModal')).hide();
        renderRosterTable();
    }
});

function populateActiveStaff(containerId) {
    const container = document.getElementById(containerId);
    const activeStaff = staffMembers.filter(staff => staff.status === 'active');

    if (activeStaff.length === 0) {
        container.innerHTML = '<p class="text-muted">No active staff available.</p>';
        return;
    }

    container.innerHTML = activeStaff.map(staff => {
        const fullName = `${staff.firstName} ${staff.lastName}`;
        return `
            <div class="form-check">
                <input class="form-check-input staff-checkbox" type="checkbox" value="${staff.id}" id="staff-${containerId}-${staff.id}">
                <label class="form-check-label" for="staff-${containerId}-${staff.id}">
                    ${fullName} - ${staff.role || 'No Role'}
                </label>
            </div>
        `;
    }).join('');
}

function editRoster(rosterId) {
    const roster = rosters.find(r => r.id === rosterId);
    if (!roster) return;

    const form = document.getElementById('editRosterForm');
    form.rosterId.value = roster.id;
    form.rosterDate.value = roster.date;
    form.jobDescription.value = roster.jobDescription;
    form.startTime.value = roster.startTime;
    form.endTime.value = roster.endTime;
    form.status.value = roster.status;
    form.notes.value = roster.notes;

    // Populate staff list and pre-select assigned staff
    populateActiveStaff('editActiveStaffList');

    // Pre-select assigned staff
    roster.assignedStaff.forEach(assignedStaff => {
        const checkbox = document.getElementById(`staff-editActiveStaffList-${assignedStaff.id}`);
        if (checkbox) checkbox.checked = true;
    });

    new bootstrap.Modal(document.getElementById('editRosterModal')).show();
}

function removeRoster(rosterId) {
    const roster = rosters.find(r => r.id === rosterId);
    if (!roster) return;

    if (confirm(`Are you sure you want to delete the roster for "${roster.jobDescription}"?`)) {
        rosters = rosters.filter(r => r.id !== rosterId);
        localStorage.setItem('rosters', JSON.stringify(rosters));
        renderRosterTable();
    }
}

function renderRosterTable() {
    const tbody = document.getElementById('rosterTableBody');

    if (rosters.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted fst-italic py-4">No rosters created yet.</td></tr>';
        return;
    }

    // Sort rosters by date (newest first)
    const sortedRosters = [...rosters].sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = sortedRosters.map(roster => {
        const rosterDate = new Date(roster.date).toLocaleDateString();
        const staffNames = roster.assignedStaff.map(staff => staff.name).join(', ');
        const statusBadge = getStatusBadge(roster.status);

        return `
            <tr>
                <td>${rosterDate}</td>
                <td>${roster.jobDescription}</td>
                <td><small>${staffNames}</small></td>
                <td>${roster.startTime}</td>
                <td>${roster.endTime}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" onclick="editRoster(${roster.id})">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="removeRoster(${roster.id})">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatusBadge(status) {
    switch (status) {
        case 'upcoming':
            return '<span class="badge-upcoming">Upcoming</span>';
        case 'completed':
            return '<span class="badge-completed">Completed</span>';
        case 'cancelled':
            return '<span class="badge-cancelled">Cancelled</span>';
        default:
            return '<span class="badge-upcoming">Upcoming</span>';
    }
}

// Set minimum date to today for roster date inputs
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('#addRosterForm input[name="rosterDate"]').min = today;
    document.querySelector('#editRosterForm input[name="rosterDate"]').min = today;
}

// Event listeners for modals
document.getElementById('addRosterModal').addEventListener('show.bs.modal', function() {
    populateActiveStaff('activeStaffList');
    setMinDate();
});

document.getElementById('editRosterModal').addEventListener('show.bs.modal', function() {
    setMinDate();
});

// Initialize page
renderStaffTable();
renderTodayShifts();
renderRosterTable();
initializeShiftHistory();
initializeHolidayManagement();

// Refresh shifts data every 30 seconds
setInterval(renderTodayShifts, 30000);

// Shift History and Analytics Functions

function initializeShiftHistory() {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    document.getElementById('filterFromDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('filterToDate').value = today.toISOString().split('T')[0];

    // Populate staff dropdown
    populateStaffFilter();

    // Load initial data
    applyShiftFilters();
}

function populateStaffFilter() {
    const staffSelect = document.getElementById('filterStaff');
    staffSelect.innerHTML = '<option value="">All Staff</option>';

    staffMembers.forEach(staff => {
        const fullName = `${staff.firstName} ${staff.lastName}`;
        staffSelect.innerHTML += `<option value="${staff.id}">${fullName}</option>`;
    });
}

function applyShiftFilters() {
    const fromDate = document.getElementById('filterFromDate').value;
    const toDate = document.getElementById('filterToDate').value;
    const staffId = document.getElementById('filterStaff').value;
    const status = document.getElementById('filterStatus').value;

    // Filter shifts based on criteria
    filteredShifts = shifts.filter(shift => {
        const shiftDate = new Date(shift.clockIn).toDateString();
        const fromCheck = !fromDate || new Date(shiftDate) >= new Date(fromDate);
        const toCheck = !toDate || new Date(shiftDate) <= new Date(toDate);
        const staffCheck = !staffId || shift.staffId == staffId;
        let statusCheck = true;

        if (status === 'completed') {
            statusCheck = shift.clockOut !== null;
        } else if (status === 'active') {
            statusCheck = shift.clockOut === null;
        }

        return fromCheck && toCheck && staffCheck && statusCheck;
    });

    // Sort by most recent first
    filteredShifts.sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));

    currentShiftPage = 1;
    renderShiftHistory();
    updateShiftAnalytics();
}

function clearShiftFilters() {
    document.getElementById('filterFromDate').value = '';
    document.getElementById('filterToDate').value = '';
    document.getElementById('filterStaff').value = '';
    document.getElementById('filterStatus').value = '';

    filteredShifts = [...shifts].sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));
    currentShiftPage = 1;
    renderShiftHistory();
    updateShiftAnalytics();
}

function renderShiftHistory() {
    const tbody = document.getElementById('shiftHistoryTableBody');
    const startIndex = (currentShiftPage - 1) * shiftsPerPage;
    const endIndex = startIndex + shiftsPerPage;
    const paginatedShifts = filteredShifts.slice(startIndex, endIndex);

    if (paginatedShifts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted fst-italic py-4">No shifts found for the selected criteria.</td></tr>';
        updateResultsInfo(0, 0, 0);
        renderPagination(0);
        return;
    }

    tbody.innerHTML = paginatedShifts.map(shift => {
        const staff = staffMembers.find(s => s.id === shift.staffId);
        const shiftDate = new Date(shift.clockIn).toLocaleDateString();
        const clockInTime = new Date(shift.clockIn).toLocaleTimeString();
        const clockOutTime = shift.clockOut ? new Date(shift.clockOut).toLocaleTimeString() : '-';
        const staffRole = staff ? staff.role || '-' : '-';

        // Get day type and determine pay rate
        const dayType = getShiftDayType(shift.clockIn);
        let actualPayRate = 0;
        let duration = '-';
        let totalPay = '-';

        if (staff) {
            // Determine pay rate based on day type
            if (dayType.type === 'Public Holiday') {
                actualPayRate = staff.publicHolidayRate || staff.weekdayRate || staff.hourlyRate || 0;
            } else if (dayType.type === 'Sunday') {
                actualPayRate = staff.sundayRate || staff.weekdayRate || staff.hourlyRate || 0;
            } else if (dayType.type === 'Saturday') {
                actualPayRate = staff.saturdayRate || staff.weekdayRate || staff.hourlyRate || 0;
            } else {
                actualPayRate = staff.weekdayRate || staff.hourlyRate || 0;
            }
        }

        if (shift.clockOut && staff) {
            const durationMs = new Date(shift.clockOut) - new Date(shift.clockIn);
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            duration = `${hours}h ${minutes}m`;

            const totalHours = durationMs / (1000 * 60 * 60);
            totalPay = `$${(totalHours * actualPayRate).toFixed(2)}`;
        }

        const payRateDisplay = actualPayRate > 0 ? `$${actualPayRate.toFixed(2)}` : '-';

        return `
            <tr>
                <td>${shiftDate}</td>
                <td>${shift.staffName}</td>
                <td>${staffRole}</td>
                <td>${clockInTime}</td>
                <td>${clockOutTime}</td>
                <td>${duration}</td>
                <td>
                    <span class="${dayType.badge}">${dayType.name}</span>
                    ${dayType.type === 'Public Holiday' ? '<br><small class="text-muted">' + dayType.name + '</small>' : ''}
                </td>
                <td>${payRateDisplay}</td>
                <td>${totalPay}</td>
            </tr>
        `;
    }).join('');

    updateResultsInfo(startIndex + 1, Math.min(endIndex, filteredShifts.length), filteredShifts.length);
    renderPagination(filteredShifts.length);
}

function updateResultsInfo(start, end, total) {
    document.getElementById('shiftResultsInfo').textContent = total > 0 ? `${start}-${end} of ${total} results` : `0 results`;
}

function renderPagination(totalItems) {
    const pagination = document.getElementById('shiftPagination');
    const totalPages = Math.ceil(totalItems / shiftsPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    if (currentShiftPage > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeShiftPage(${currentShiftPage - 1})">Previous</a></li>`;
    }

    // Page numbers
    const startPage = Math.max(1, currentShiftPage - 2);
    const endPage = Math.min(totalPages, currentShiftPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentShiftPage ? 'active' : '';
        paginationHTML += `<li class="page-item ${activeClass}"><a class="page-link" href="#" onclick="changeShiftPage(${i})">${i}</a></li>`;
    }

    // Next button
    if (currentShiftPage < totalPages) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeShiftPage(${currentShiftPage + 1})">Next</a></li>`;
    }

    pagination.innerHTML = paginationHTML;
}

function changeShiftPage(page) {
    currentShiftPage = page;
    renderShiftHistory();
}

function updateShiftAnalytics() {
    const completedShifts = filteredShifts.filter(shift => shift.clockOut);
    const activeShifts = filteredShifts.filter(shift => !shift.clockOut);

    // Total shifts
    document.getElementById('totalShiftsCount').textContent = filteredShifts.length;

    // Active shifts
    document.getElementById('activeShiftsCount').textContent = activeShifts.length;

    // Calculate total hours, payroll, and analytics
    let totalHours = 0;
    let totalPayroll = 0;
    let totalPayableHours = 0; // Hours with valid pay rates

    completedShifts.forEach(shift => {
        const staff = staffMembers.find(s => s.id === shift.staffId);
        const durationMs = new Date(shift.clockOut) - new Date(shift.clockIn);
        const hours = durationMs / (1000 * 60 * 60);
        totalHours += hours;

        if (staff) {
            // Get day type and determine pay rate
            const dayType = getShiftDayType(shift.clockIn);
            let actualPayRate = 0;

            if (dayType.type === 'Public Holiday') {
                actualPayRate = staff.publicHolidayRate || staff.weekdayRate || staff.hourlyRate || 0;
            } else if (dayType.type === 'Sunday') {
                actualPayRate = staff.sundayRate || staff.weekdayRate || staff.hourlyRate || 0;
            } else if (dayType.type === 'Saturday') {
                actualPayRate = staff.saturdayRate || staff.weekdayRate || staff.hourlyRate || 0;
            } else {
                actualPayRate = staff.weekdayRate || staff.hourlyRate || 0;
            }

            if (actualPayRate > 0) {
                totalPayroll += hours * actualPayRate;
                totalPayableHours += hours;
            }
        }
    });

    // Format and display values
    const totalHoursFormatted = totalHours > 0 ? `${Math.floor(totalHours)}h ${Math.floor((totalHours % 1) * 60)}m` : '0h';
    document.getElementById('totalHoursWorked').textContent = totalHoursFormatted;

    const avgHours = completedShifts.length > 0 ? totalHours / completedShifts.length : 0;
    const avgHoursFormatted = avgHours > 0 ? `${Math.floor(avgHours)}h ${Math.floor((avgHours % 1) * 60)}m` : '0h';
    document.getElementById('avgShiftLength').textContent = avgHoursFormatted;

    // Payroll calculations
    const totalPayrollFormatted = totalPayroll > 0 ? `$${totalPayroll.toFixed(2)}` : '$0';
    document.getElementById('totalPayroll').textContent = totalPayrollFormatted;

    const avgHourlyRate = totalPayableHours > 0 ? totalPayroll / totalPayableHours : 0;
    const avgHourlyRateFormatted = avgHourlyRate > 0 ? `$${avgHourlyRate.toFixed(2)}` : '$0';
    document.getElementById('avgHourlyRate').textContent = avgHourlyRateFormatted;
}

function exportShiftData() {
    if (filteredShifts.length === 0) {
        alert('No data to export.');
        return;
    }

    // Create CSV content with smart pay calculations
    const headers = ['Date', 'Staff Name', 'Role', 'Clock In', 'Clock Out', 'Duration (Hours)', 'Day Type', 'Holiday Name', 'Status', 'Pay Rate Used', 'Total Pay'];
    let csvContent = headers.join(',') + '\n';

    filteredShifts.forEach(shift => {
        const staff = staffMembers.find(s => s.id === shift.staffId);
        const shiftDate = new Date(shift.clockIn).toLocaleDateString();
        const clockInTime = new Date(shift.clockIn).toLocaleTimeString();
        const clockOutTime = shift.clockOut ? new Date(shift.clockOut).toLocaleTimeString() : '';
        const status = shift.clockOut ? 'Completed' : 'Active';
        const staffRole = staff ? staff.role || '' : '';

        // Get day type and determine pay rate
        const dayType = getShiftDayType(shift.clockIn);
        let actualPayRate = 0;
        let durationHours = '';
        let totalPay = '';

        if (staff) {
            // Determine pay rate based on day type
            if (dayType.type === 'Public Holiday') {
                actualPayRate = staff.publicHolidayRate || staff.weekdayRate || staff.hourlyRate || 0;
            } else if (dayType.type === 'Sunday') {
                actualPayRate = staff.sundayRate || staff.weekdayRate || staff.hourlyRate || 0;
            } else if (dayType.type === 'Saturday') {
                actualPayRate = staff.saturdayRate || staff.weekdayRate || staff.hourlyRate || 0;
            } else {
                actualPayRate = staff.weekdayRate || staff.hourlyRate || 0;
            }
        }

        if (shift.clockOut) {
            const durationMs = new Date(shift.clockOut) - new Date(shift.clockIn);
            durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);

            if (staff && actualPayRate > 0) {
                totalPay = (durationHours * actualPayRate).toFixed(2);
            }
        }

        const payRateUsed = actualPayRate > 0 ? actualPayRate.toFixed(2) : '';
        const holidayName = dayType.type === 'Public Holiday' ? dayType.name : '';

        const row = [
            shiftDate,
            `"${shift.staffName}"`,
            `"${staffRole}"`,
            clockInTime,
            clockOutTime,
            durationHours,
            `"${dayType.type}"`,
            `"${holidayName}"`,
            status,
            payRateUsed,
            totalPay
        ];

        csvContent += row.join(',') + '\n';
    });

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Holiday Management System

function initializeHolidayManagement() {

    // Set current state in dropdown
    document.getElementById('holidayState').value = systemSettings.currentState;

    // Set current year
    const currentYear = new Date().getFullYear();
    document.getElementById('holidayYear').value = currentYear;

    // Set today's date in checker
    document.getElementById('checkDate').value = new Date().toISOString().split('T')[0];

    // Load initial calendar - start with upcoming holidays
    showUpcomingHolidays();
}

function updateHolidayState() {
    const selectedState = document.getElementById('holidayState').value;
    systemSettings.currentState = selectedState;
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
    loadHolidayCalendar();
}

function loadHolidayCalendar() {
    if (currentHolidayView === 'upcoming') {
        showUpcomingHolidays();
    } else {
        showFullYearCalendar();
    }
}

function showUpcomingHolidays() {
    currentHolidayView = 'upcoming';
    const state = document.getElementById('holidayState').value;

    document.getElementById('holidayCalendarTitle').textContent = 'Upcoming Holidays';
    document.getElementById('holidayCalendarYear').textContent = `(${state})`;


    // Get upcoming holidays
    const upcomingHolidays = getUpcomingHolidays(3);

    const tbody = document.getElementById('holidayCalendarBody');

    if (upcomingHolidays.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted fst-italic py-4">No upcoming holidays found.</td></tr>';
        return;
    }

    tbody.innerHTML = upcomingHolidays.map(holiday => {
        const dayOfWeek = holiday.date.toLocaleDateString('en-AU', { weekday: 'long' });
        const formattedDate = holiday.date.toLocaleDateString('en-AU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        const daysUntil = getDaysUntilHoliday(holiday.date);

        // Determine urgency class
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((holiday.date - today) / (1000 * 60 * 60 * 24));

        let urgencyBadge = '';
        if (diffDays === 0) {
            urgencyBadge = '<span class="badge bg-danger ms-2">TODAY</span>';
        } else if (diffDays === 1) {
            urgencyBadge = '<span class="badge bg-warning text-dark ms-2">TOMORROW</span>';
        } else if (diffDays <= 7) {
            urgencyBadge = '<span class="badge bg-info ms-2">THIS WEEK</span>';
        }

        // Check if it's a weekend
        const isWeekend = holiday.date.getDay() === 0 || holiday.date.getDay() === 6;
        const weekendBadge = isWeekend ? ' <span class="badge bg-warning text-dark">Weekend</span>' : '';

        return `
            <tr>
                <td><strong>${formattedDate}</strong></td>
                <td>
                    ${holiday.name}
                    ${weekendBadge}
                    ${urgencyBadge}
                </td>
                <td><strong>${daysUntil}</strong></td>
                <td>${dayOfWeek}</td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" onclick="editHoliday('${holiday.date.toISOString().split('T')[0]}', '${holiday.name}')">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function showFullYearCalendar() {
    currentHolidayView = 'full';
    const state = document.getElementById('holidayState').value;
    const year = parseInt(document.getElementById('holidayYear').value);

    document.getElementById('holidayCalendarTitle').textContent = 'Full Year Calendar';
    document.getElementById('holidayCalendarYear').textContent = `(${year} - ${state})`;

    // Get holidays for the selected year and state
    const holidays = HolidayCalculator.getHolidaysForYear(state, year);

    const tbody = document.getElementById('holidayCalendarBody');

    if (holidays.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted fst-italic py-4">No holidays configured for this year.</td></tr>';
        return;
    }

    tbody.innerHTML = holidays.map(holiday => {
        const dayOfWeek = holiday.date.toLocaleDateString('en-AU', { weekday: 'long' });
        const formattedDate = holiday.date.toLocaleDateString('en-AU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        // Determine holiday type
        let holidayType = 'Standard';
        if (holiday.name.includes('Easter')) holidayType = 'Easter-based';
        if (holiday.name.includes('Day') && (dayOfWeek === 'Monday' || dayOfWeek === 'Tuesday')) holidayType = 'Long Weekend';
        if (holiday.name.includes('Christmas') || holiday.name.includes('Boxing')) holidayType = 'Christmas Period';

        // Check if it's a weekend
        const isWeekend = holiday.date.getDay() === 0 || holiday.date.getDay() === 6;
        const weekendBadge = isWeekend ? ' <span class="badge bg-warning text-dark">Weekend</span>' : '';

        // Calculate days until for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((holiday.date - today) / (1000 * 60 * 60 * 24));
        const daysUntilText = daysUntil >= 0 ? getDaysUntilHoliday(holiday.date) : 'Past';

        return `
            <tr>
                <td><strong>${formattedDate}</strong></td>
                <td>
                    ${holiday.name}
                    ${weekendBadge}
                </td>
                <td>${daysUntilText}</td>
                <td>${dayOfWeek}</td>
                <td>
                    <small class="text-muted">${holidayType}</small>
                    <button class="btn btn-sm btn-outline-warning ms-2" onclick="editHoliday('${holiday.date.toISOString().split('T')[0]}', '${holiday.name}')">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function checkHolidayStatus() {
    const checkDate = document.getElementById('checkDate').value;
    const state = document.getElementById('holidayState').value;

    if (!checkDate) {
        document.getElementById('holidayCheckResult').className = 'alert alert-warning';
        document.getElementById('holidayCheckResult').innerHTML = '<strong>Please select a date to check.</strong>';
        document.getElementById('holidayCheckResult').classList.remove('d-none');
        return;
    }

    const date = new Date(checkDate);
    const isHoliday = HolidayCalculator.isPublicHoliday(date, state);
    const holidayDetails = HolidayCalculator.getHolidayDetails(date, state);

    const resultDiv = document.getElementById('holidayCheckResult');

    if (isHoliday && holidayDetails) {
        resultDiv.className = 'alert alert-success';
        resultDiv.innerHTML = `
            <strong><i class="bi bi-check-circle"></i> Public Holiday!</strong><br>
            <strong>${holidayDetails.name}</strong><br>
            Date: ${date.toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}<br>
            <small>This date will use Public Holiday pay rates.</small>
        `;
    } else {
        const dayOfWeek = date.getDay();
        let dayType = 'Weekday';
        if (dayOfWeek === 6) dayType = 'Saturday';
        if (dayOfWeek === 0) dayType = 'Sunday';

        resultDiv.className = 'alert alert-secondary';
        resultDiv.innerHTML = `
            <strong><i class="bi bi-calendar"></i> Regular Day</strong><br>
            This is a regular <strong>${dayType.toLowerCase()}</strong>.<br>
            <small>Will use ${dayType} pay rates.</small>
        `;
    }

    resultDiv.classList.remove('d-none');
}

function editHoliday(dateString, holidayName) {
    const newName = prompt(`Edit holiday name for ${dateString}:`, holidayName);
    if (newName && newName !== holidayName) {
        // Store custom holiday override
        const year = new Date(dateString).getFullYear();
        const state = document.getElementById('holidayState').value;

        if (!systemSettings.customHolidays[year]) {
            systemSettings.customHolidays[year] = {};
        }
        if (!systemSettings.customHolidays[year][state]) {
            systemSettings.customHolidays[year][state] = [];
        }

        // Update or add custom holiday
        const existingIndex = systemSettings.customHolidays[year][state].findIndex(h => h.date === dateString);
        if (existingIndex >= 0) {
            systemSettings.customHolidays[year][state][existingIndex].name = newName;
        } else {
            systemSettings.customHolidays[year][state].push({
                date: dateString,
                name: newName,
                custom: true
            });
        }

        localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
        loadHolidayCalendar();

        alert(`Holiday updated successfully!\n\nNote: This is a local override. For official changes, update the configuration file.`);
    }
}

// Enhanced shift calculation with holiday detection
function calculateShiftPay(staff, clockIn, clockOut) {
    if (!clockOut) return 0;

    const startDate = new Date(clockIn);
    const endDate = new Date(clockOut);
    const durationMs = endDate - startDate;
    const hours = durationMs / (1000 * 60 * 60);

    // Determine pay rate based on day type
    let hourlyRate = staff.weekdayRate || staff.hourlyRate || 0;

    // Check if it's a public holiday
    if (HolidayCalculator.isPublicHoliday(startDate, systemSettings.currentState)) {
        hourlyRate = staff.publicHolidayRate || hourlyRate;
    } else {
        // Check day of week
        const dayOfWeek = startDate.getDay();
        if (dayOfWeek === 0) { // Sunday
            hourlyRate = staff.sundayRate || hourlyRate;
        } else if (dayOfWeek === 6) { // Saturday
            hourlyRate = staff.saturdayRate || hourlyRate;
        }
    }

    return hours * hourlyRate;
}

// Enhanced shift display with pay rate information
function getShiftDayType(date) {
    const checkDate = new Date(date);

    // Check if it's a public holiday first
    if (HolidayCalculator.isPublicHoliday(checkDate, systemSettings.currentState)) {
        const holidayDetails = HolidayCalculator.getHolidayDetails(checkDate, systemSettings.currentState);
        return {
            type: 'Public Holiday',
            name: holidayDetails ? holidayDetails.name : 'Public Holiday',
            badge: 'badge bg-danger'
        };
    }

    // Check day of week
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek === 0) {
        return { type: 'Sunday', name: 'Sunday', badge: 'badge bg-info' };
    } else if (dayOfWeek === 6) {
        return { type: 'Saturday', name: 'Saturday', badge: 'badge bg-primary' };
    } else {
        return { type: 'Weekday', name: 'Weekday', badge: 'badge bg-secondary' };
    }
}

// Upcoming Holidays Helper Functions
function getUpcomingHolidays(count = 3) {
    const currentState = systemSettings.currentState;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison

    const currentYear = today.getFullYear();
    const nextYear = currentYear + 1;


    // Check if HolidayCalculator is available
    if (typeof HolidayCalculator === 'undefined') {
        console.error('HolidayCalculator not found - public-holidays-config.js may not be loaded');
        return [];
    }

    try {
        // Get holidays for current and next year
        const currentYearHolidays = HolidayCalculator.getHolidaysForYear(currentState, currentYear);
        const nextYearHolidays = HolidayCalculator.getHolidaysForYear(currentState, nextYear);

        // Combine and filter future holidays
        const allHolidays = [...currentYearHolidays, ...nextYearHolidays];

        const upcomingHolidays = allHolidays
            .filter(holiday => holiday.date >= today)
            .sort((a, b) => a.date - b.date)
            .slice(0, count);

        return upcomingHolidays;
    } catch (error) {
        console.error('Error getting upcoming holidays:', error);
        console.error('Error details:', error.stack);
        return [];
    }
}

function getDaysUntilHoliday(holidayDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holiday = new Date(holidayDate);
    holiday.setHours(0, 0, 0, 0);

    const diffTime = holiday - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays <= 30) return `In ${diffDays} days`;

    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''}`;
}

function loadUpcomingHolidays() {
    const upcomingHolidays = getUpcomingHolidays(3);
    const container = document.getElementById('upcomingHolidaysContainer');
    const stateDisplay = document.getElementById('upcomingHolidaysState');

    // Update state display
    stateDisplay.textContent = systemSettings.currentState;

    if (upcomingHolidays.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-white-50">
                <i class="bi bi-calendar-x"></i> No upcoming holidays found
            </div>
        `;
        return;
    }

    // Create holiday cards
    container.innerHTML = upcomingHolidays.map(holiday => {
        const formattedDate = holiday.date.toLocaleDateString('en-AU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
        const dayOfWeek = holiday.date.toLocaleDateString('en-AU', { weekday: 'long' });
        const daysUntil = getDaysUntilHoliday(holiday.date);

        // Determine urgency class
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((holiday.date - today) / (1000 * 60 * 60 * 24));

        let urgencyClass = 'bg-light';
        let textClass = 'text-dark';
        if (diffDays <= 1) {
            urgencyClass = 'bg-danger';
            textClass = 'text-white';
        } else if (diffDays <= 7) {
            urgencyClass = 'bg-warning';
            textClass = 'text-dark';
        } else if (diffDays <= 14) {
            urgencyClass = 'bg-info';
            textClass = 'text-white';
        }

        return `
            <div class="col-md-4 mb-2">
                <div class="card ${urgencyClass} border-0" style="background: rgba(255,255,255,0.9);">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="card-title mb-1 ${textClass}" style="font-size: 0.9rem;">${holiday.name}</h6>
                                <p class="card-text mb-0">
                                    <small class="${textClass}" style="opacity: 0.8;">
                                        <i class="bi bi-calendar3"></i> ${formattedDate}
                                    </small>
                                </p>
                                <p class="card-text mb-0">
                                    <small class="${textClass}" style="opacity: 0.8;">
                                        <i class="bi bi-clock"></i> ${daysUntil}
                                    </small>
                                </p>
                            </div>
                            <div class="text-end">
                                <span class="badge bg-dark">${dayOfWeek}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function initializeUpcomingHolidays() {
    loadUpcomingHolidays();

    // Auto-refresh at midnight to update "days until" calculations
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow - now;

    setTimeout(() => {
        loadUpcomingHolidays();
        // Then refresh every 24 hours
        setInterval(loadUpcomingHolidays, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
}

// Make functions globally available
window.editStaff = editStaff;
window.removeStaff = removeStaff;
window.editRoster = editRoster;
window.removeRoster = removeRoster;
window.applyShiftFilters = applyShiftFilters;
window.clearShiftFilters = clearShiftFilters;
window.changeShiftPage = changeShiftPage;
window.exportShiftData = exportShiftData;
window.updateHolidayState = updateHolidayState;
window.loadHolidayCalendar = loadHolidayCalendar;
window.checkHolidayStatus = checkHolidayStatus;
window.editHoliday = editHoliday;
window.showUpcomingHolidays = showUpcomingHolidays;
window.showFullYearCalendar = showFullYearCalendar;