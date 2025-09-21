// Logout functionality
function logout() {
    // Clear all session data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user'); // Clear the auto-login user data

    // Redirect to login page
    window.location.href = '/index.html';
}

let staffMembers = [];
let selectedStaff = null;
let currentShift = null;

// Load staff from backend API
async function loadStaffMembers(silent = false) {
    try {
        const response = await fetch('/api/staff');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to fetch staff data`);
        }
        const newStaffData = await response.json();

        // Only update if we have valid data
        if (Array.isArray(newStaffData)) {
            staffMembers = newStaffData;
            renderStaffGrid();

            if (!silent) {
                console.log(`Loaded ${staffMembers.length} staff members from API`);
            }
        } else {
            throw new Error('Invalid staff data received from API');
        }
    } catch (error) {
        console.error('Error loading staff:', error);
        if (!silent) {
            showMessage('Error loading staff data. Please refresh the page.', 'error');
        }

        // If we have no staff data at all, show the no-staff message
        if (!staffMembers || staffMembers.length === 0) {
            const staffGrid = document.getElementById('staffGrid');
            if (staffGrid) {
                staffGrid.innerHTML = `
                    <div class="no-staff text-center py-5">
                        <i class="bi bi-person-x display-1 text-muted mb-3"></i>
                        <h5 class="text-muted">Connection Error</h5>
                        <p class="text-muted mb-3">Unable to load staff data. Please check your connection and refresh.</p>
                        <button class="btn btn-primary" onclick="loadStaffMembers()">
                            <i class="bi bi-arrow-clockwise me-2"></i>
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadStaffMembers();
    updateCurrentTime();
});

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
    const fullName = `${selectedStaff.first_name} ${selectedStaff.middle_name ? selectedStaff.middle_name + ' ' : ''}${selectedStaff.last_name}`;
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

async function updateStatus() {
    if (!selectedStaff) return;

    try {
        // Get active shift from API
        const response = await fetch(`/api/shifts/${selectedStaff.id}/active`);
        if (!response.ok) {
            throw new Error('Failed to fetch active shift');
        }

        currentShift = await response.json();

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
            const clockInTime = new Date(currentShift.clock_in);
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
    } catch (error) {
        console.error('Error updating status:', error);
        // Fallback to showing clocked out status
        const statusDisplay = document.getElementById('statusDisplay');
        const clockInBtn = document.getElementById('clockInBtn');
        const clockOutBtn = document.getElementById('clockOutBtn');
        const shiftInfo = document.getElementById('shiftInfo');

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

async function clockIn() {
    if (!selectedStaff || !validateTime()) return;

    const selectedTime = new Date(document.getElementById('clockTime').value);

    try {
        const response = await fetch('/api/shifts/clock-in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                staff_id: selectedStaff.id,
                business_id: 1,
                venue_id: 1,
                clock_in: selectedTime.toISOString()
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`Clocked in successfully at ${selectedTime.toLocaleTimeString()}!`, 'success');
            await updateStatus();
            await updateClockedInCount();
        } else {
            showMessage(data.error || 'Failed to clock in', 'error');
        }
    } catch (error) {
        console.error('Error clocking in:', error);
        showMessage('Connection error. Please try again.', 'error');
    }
}

async function clockOut() {
    if (!selectedStaff || !currentShift || !validateTime()) return;

    const selectedTime = new Date(document.getElementById('clockTime').value);
    const clockInTime = new Date(currentShift.clock_in);

    if (selectedTime <= clockInTime) {
        showMessage('Clock out time must be after clock in time', 'error');
        return;
    }

    try {
        const response = await fetch('/api/shifts/clock-out', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                staff_id: selectedStaff.id,
                clock_out: selectedTime.toISOString()
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`Clocked out successfully at ${selectedTime.toLocaleTimeString()}!`, 'success');
            await updateStatus();
            await updateClockedInCount();
        } else {
            showMessage(data.error || 'Failed to clock out', 'error');
        }
    } catch (error) {
        console.error('Error clocking out:', error);
        showMessage('Connection error. Please try again.', 'error');
    }
}

async function updateClockedInCount() {
    const clockedInStaffCount = document.getElementById('clockedInStaffCount');

    try {
        // Get all shifts from API
        const response = await fetch('/api/shifts');
        if (!response.ok) {
            throw new Error('Failed to fetch shifts');
        }

        const allShifts = await response.json();
        const today = new Date().toDateString();

        // Count active shifts for today
        const clockedInStaff = allShifts.filter(shift =>
            new Date(shift.clock_in).toDateString() === today &&
            !shift.clock_out &&
            staffMembers.find(staff => String(staff.id) === String(shift.staff_id))
        );

        clockedInStaffCount.textContent = clockedInStaff.length;
    } catch (error) {
        console.error('Error updating clocked in count:', error);
        clockedInStaffCount.textContent = '0';
    }
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
        .filter(staff => staff.active === 1)
        .sort((a, b) => a.first_name.localeCompare(b.first_name));

    // Calculate clocked in staff
    const shiftsData = JSON.parse(localStorage.getItem('shifts')) || [];
    const today = new Date().toDateString();
    const clockedInStaff = shiftsData.filter(shift =>
        new Date(shift.clockIn).toDateString() === today &&
        (!shift.clockOut || shift.clockOut === null || shift.clockOut === '') &&
        staffMembers.find(staff => String(staff.id) === String(shift.staffId) && staff.active === 1)
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
        const fullName = `${staff.first_name} ${staff.middle_name ? staff.middle_name + ' ' : ''}${staff.last_name}`;
        const initials = getInitials(staff.first_name, staff.last_name, staff.middle_name);

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
setInterval(async () => {
    if (!selectedStaff) {
        await loadStaffMembers(true); // Silent mode for background updates
    }
}, 30000);