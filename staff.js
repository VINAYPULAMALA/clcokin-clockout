let staffMembers = JSON.parse(localStorage.getItem('staffMembers')) || [];
let selectedStaff = null;
let currentShift = null;

function getInitials(firstName, lastName, middleName = '') {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function selectStaff(staffId) {
    selectedStaff = staffMembers.find(s => s.id === staffId);
    if (!selectedStaff) return;

    // Hide staff grid and stats cards, show clock section
    document.getElementById('staffGrid').style.display = 'none';
    const statsRow = document.querySelector('.row.g-3.mb-4');
    if (statsRow) statsRow.style.display = 'none';
    document.getElementById('clockSection').classList.remove('hidden');

    // Update selected staff name
    const fullName = `${selectedStaff.firstName} ${selectedStaff.middleName ? selectedStaff.middleName + ' ' : ''}${selectedStaff.lastName}`;
    document.getElementById('selectedStaffName').textContent = fullName;

    // Set default time to current time (but restrict to today)
    setCurrentTime();
    updateStatus();
}

function backToStaffList() {
    document.getElementById('staffGrid').style.display = 'grid';
    const statsRow = document.querySelector('.row.g-3.mb-4');
    if (statsRow) statsRow.style.display = 'flex';
    document.getElementById('clockSection').classList.add('hidden');
    selectedStaff = null;
    currentShift = null;
}

function setCurrentTime() {
    const now = new Date();
    const timeString = now.toISOString().slice(0, 16);
    document.getElementById('clockTime').value = timeString;

    // Set min to start of today, max to current time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().slice(0, 16);

    document.getElementById('clockTime').min = todayString;
    document.getElementById('clockTime').max = timeString;
}

function updateStatus() {
    if (!selectedStaff) return;

    const shifts = JSON.parse(localStorage.getItem('shifts')) || [];
    const today = new Date().toDateString();

    // Find today's active shift for this staff member
    currentShift = shifts.find(shift =>
        shift.staffId === selectedStaff.id &&
        new Date(shift.clockIn).toDateString() === today &&
        !shift.clockOut
    );

    const statusDisplay = document.getElementById('statusDisplay');
    const clockInBtn = document.getElementById('clockInBtn');
    const clockOutBtn = document.getElementById('clockOutBtn');
    const shiftInfo = document.getElementById('shiftInfo');
    const shiftDetails = document.getElementById('shiftDetails');

    if (currentShift) {
        statusDisplay.textContent = `Currently Clocked In`;
        statusDisplay.className = 'status-display status-in';

        clockInBtn.disabled = true;
        clockOutBtn.disabled = false;

        // Show shift info
        const clockInTime = new Date(currentShift.clockIn);
        const duration = Date.now() - clockInTime.getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

        shiftDetails.innerHTML = `
            <strong>Clock In:</strong> ${clockInTime.toLocaleString()}<br>
            <strong>Duration:</strong> ${hours}h ${minutes}m
        `;
        shiftInfo.classList.remove('hidden');
    } else {
        statusDisplay.textContent = `Currently Clocked Out`;
        statusDisplay.className = 'status-display status-out';

        clockInBtn.disabled = false;
        clockOutBtn.disabled = true;

        shiftInfo.classList.add('hidden');
    }
}

function validateTime() {
    const selectedTime = new Date(document.getElementById('clockTime').value);
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (selectedTime < todayStart) {
        showMessage('You can only select times from today', 'error');
        return false;
    }

    if (selectedTime > now) {
        showMessage('You cannot select a future time', 'error');
        return false;
    }

    return true;
}

function clockIn() {
    if (!selectedStaff || !validateTime()) return;

    const selectedTime = new Date(document.getElementById('clockTime').value);
    const shifts = JSON.parse(localStorage.getItem('shifts')) || [];

    const newShift = {
        id: Date.now(),
        staffId: selectedStaff.id,
        staffName: `${selectedStaff.firstName} ${selectedStaff.lastName}`,
        clockIn: selectedTime.toISOString(),
        clockOut: null
    };

    shifts.push(newShift);
    localStorage.setItem('shifts', JSON.stringify(shifts));

    showMessage(`Clocked in successfully at ${selectedTime.toLocaleTimeString()}!`, 'success');
    updateStatus();
    updateClockedInCount();
}

function clockOut() {
    if (!selectedStaff || !currentShift || !validateTime()) return;

    const selectedTime = new Date(document.getElementById('clockTime').value);
    const clockInTime = new Date(currentShift.clockIn);

    if (selectedTime <= clockInTime) {
        showMessage('Clock out time must be after clock in time', 'error');
        return;
    }

    const shifts = JSON.parse(localStorage.getItem('shifts')) || [];
    const shiftIndex = shifts.findIndex(shift => shift.id === currentShift.id);

    if (shiftIndex !== -1) {
        shifts[shiftIndex].clockOut = selectedTime.toISOString();
        localStorage.setItem('shifts', JSON.stringify(shifts));

        showMessage(`Clocked out successfully at ${selectedTime.toLocaleTimeString()}!`, 'success');
        updateStatus();
        updateClockedInCount();
    }
}

function updateClockedInCount() {
    const clockedInStaffCount = document.getElementById('clockedInStaffCount');
    const allShifts = JSON.parse(localStorage.getItem('shifts')) || [];
    const today = new Date().toDateString();

    const clockedInStaff = allShifts.filter(shift =>
        new Date(shift.clockIn).toDateString() === today &&
        (!shift.clockOut || shift.clockOut === null || shift.clockOut === '') &&
        staffMembers.find(staff => String(staff.id) === String(shift.staffId) && (staff.status || 'active') === 'active')
    );

    clockedInStaffCount.textContent = clockedInStaff.length;
}

function showMessage(text, type) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.className = `message ${type}`;
    message.classList.remove('hidden');

    setTimeout(() => {
        message.classList.add('hidden');
    }, 5000);
}

function updateCurrentTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleString();

    // Update max time to current time
    const timeString = now.toISOString().slice(0, 16);
    document.getElementById('clockTime').max = timeString;
}

function renderStaffGrid() {
    const staffGrid = document.getElementById('staffGrid');
    const activeStaffCount = document.getElementById('activeStaffCount');
    const clockedInStaffCount = document.getElementById('clockedInStaffCount');
    const totalStaffCount = document.getElementById('totalStaffCount');

    // Filter only active staff and sort alphabetically by first name
    const activeStaff = staffMembers
        .filter(staff => (staff.status || 'active') === 'active')
        .sort((a, b) => a.firstName.localeCompare(b.firstName));

    // Calculate clocked in staff
    const shiftsData = JSON.parse(localStorage.getItem('shifts')) || [];
    const today = new Date().toDateString();
    const clockedInStaff = shiftsData.filter(shift =>
        new Date(shift.clockIn).toDateString() === today &&
        (!shift.clockOut || shift.clockOut === null || shift.clockOut === '') &&
        staffMembers.find(staff => String(staff.id) === String(shift.staffId) && (staff.status || 'active') === 'active')
    );

    // Update stats
    activeStaffCount.textContent = activeStaff.length;
    clockedInStaffCount.textContent = clockedInStaff.length;
    totalStaffCount.textContent = staffMembers.length;

    if (activeStaff.length === 0) {
        staffGrid.innerHTML = `
            <div class="no-staff">
                <i class="bi bi-person-x"></i>
                <h3>No Active Staff</h3>
                <p>No active staff members found. Add staff members in the admin panel.</p>
            </div>
        `;
        return;
    }

    // Get shifts data once outside the map
    const allShiftsData = JSON.parse(localStorage.getItem('shifts')) || [];

    staffGrid.innerHTML = activeStaff.map(staff => {
        const fullName = `${staff.firstName} ${staff.middleName ? staff.middleName + ' ' : ''}${staff.lastName}`;
        const initials = getInitials(staff.firstName, staff.lastName, staff.middleName);

        // Removed clocked-in indicator as requested
        const clockedInIndicator = '';

        return `
            <div class="staff-card" onclick="selectStaff(${staff.id})">
                ${clockedInIndicator}
                <div class="staff-avatar">${initials}</div>
                <div class="staff-info">
                    <div class="staff-name">${fullName}</div>
                    <div class="staff-role">${staff.role || 'Staff Member'}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Initialize page
renderStaffGrid();
updateCurrentTime();

// Update current time every second
setInterval(updateCurrentTime, 1000);

// Update shift duration every minute
setInterval(() => {
    if (currentShift) {
        updateStatus();
    }
}, 60000);

// Refresh data every 30 seconds in case staff data is updated in admin
setInterval(() => {
    staffMembers = JSON.parse(localStorage.getItem('staffMembers')) || [];
    if (!selectedStaff) {
        renderStaffGrid();
    }
}, 30000);