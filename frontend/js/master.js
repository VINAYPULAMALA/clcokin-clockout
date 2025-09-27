// ============================
// MASTER.JS (Frontend)
// Professional Panel with Master API Integration
// ============================
// Purpose:
// - Beautiful sidebar panel design
// - Add businesses via /api/master/business
// - Add venues + system admins via /api/master/venue-with-admin
// - Show live dashboard stats via /api/master/stats
// - List businesses & venues with proper tables

// Sidebar Toggle Functions
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const mobileToggle = document.getElementById('mobileToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

mobileToggle.addEventListener('click', () => {
  sidebar.classList.toggle('mobile-open');
  sidebarOverlay.style.display = sidebar.classList.contains('mobile-open') ? 'block' : 'none';
});

sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('mobile-open');
  sidebarOverlay.style.display = 'none';
});

// Navigation Functions
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.content-section');
const pageTitle = document.getElementById('pageTitle');

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    // Update active nav
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    // Show corresponding section
    const section = link.dataset.section;
    sections.forEach(s => s.style.display = 'none');
    document.getElementById(section + 'Section').style.display = 'block';

    // Update page title
    const titles = {
      dashboard: 'Dashboard',
      businesses: 'Businesses',
      venues: 'Venues',
      users: 'Users'
    };
    pageTitle.textContent = titles[section];

    // Close mobile menu
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('mobile-open');
      sidebarOverlay.style.display = 'none';
    }
  });
});

// Form Show/Hide Functions
function showAddBusinessForm() {
  document.getElementById('addBusinessForm').style.display = 'block';
}

function hideAddBusinessForm() {
  document.getElementById('addBusinessForm').style.display = 'none';
  document.getElementById('businessForm').reset();
}

function showAddVenueForm() {
  document.getElementById('addVenueForm').style.display = 'block';
}

function hideAddVenueForm() {
  document.getElementById('addVenueForm').style.display = 'none';
  document.getElementById('venueSysAdminForm').reset();
}

// ============================
// Create Business
// POST /api/master/business
// ============================
async function createBusiness(event) {
  event.preventDefault();
  const form = event.target;

  const payload = {
    name: form.name.value,
    owner_name: form.owner_name.value,
    state: form.state.value,
    location: form.location.value,
    contact_email: form.contact_email.value,
  };

  try {
    const res = await fetch("/api/master/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok || !data.success) throw new Error(data.error || "Failed to create business");

    alert(`✅ Business "${payload.name}" created successfully!`);
    form.reset();
    hideAddBusinessForm();
    loadBusinesses();
    loadDashboardStats();
  } catch (err) {
    console.error("Business creation error:", err);
    alert("❌ Failed to create business: " + err.message);
  }
}

// ============================
// Create Venue + SysAdmin
// POST /api/master/venue-with-admin
// ============================
async function createVenueAndSysAdmin(event) {
  event.preventDefault();
  const form = event.target;

  const payload = {
    business_id: form.business_id.value,
    venue_name: form.venue_name.value,
    state: form.state.value,
    location: form.location.value,
    contact_email: form.contact_email.value,
    kiosk_username: form.kiosk_username.value,
    kiosk_password: form.kiosk_password.value,
    first_name: form.first_name.value,
    last_name: form.last_name.value,
    email: form.email.value,
    password: form.password.value,
  };

  try {
    const res = await fetch("/api/master/venue-with-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok || !data.success) throw new Error(data.error || "Failed to create venue + sysadmin");

    alert(`✅ Venue "${data.venue.venue_name}" created with SysAdmin ${data.sysAdmin.email}!`);
    form.reset();
    hideAddVenueForm();
    loadVenues();
    loadBusinesses(); // refresh dropdown
    loadDashboardStats();
  } catch (err) {
    console.error("Venue + SysAdmin creation error:", err);
    alert("❌ Failed to create venue + sysadmin: " + err.message);
  }
}

// ============================
// Load Businesses
// GET /api/master/businesses
// ============================
async function loadBusinesses() {
  try {
    const res = await fetch("/api/master/businesses");
    const data = await res.json();
    const tableContent = document.querySelector('#businessList .table-content');
    const dropdown = document.querySelector('#venueSysAdminForm select[name="business_id"]');

    if (res.ok && data.success && data.data.length > 0) {
      // Fill table
      tableContent.innerHTML = `
        <table class="data-grid">
          <thead>
            <tr>
              <th>ID</th>
              <th>Business Name</th>
              <th>Owner</th>
              <th>State</th>
              <th>Location</th>
              <th>Contact Email</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${data.data.map(b => `
              <tr>
                <td>${b.id}</td>
                <td><strong>${b.name}</strong></td>
                <td>${b.owner_name}</td>
                <td>${b.state}</td>
                <td>${b.location}</td>
                <td>${b.contact_email}</td>
                <td>${new Date(b.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      // Fill dropdown
      dropdown.innerHTML = '<option value="">Select Business</option>' +
        data.data.map(b =>
          `<option value="${b.id}">${b.name} (${b.state})</option>`
        ).join('');
    } else {
      tableContent.innerHTML = '<p class="text-muted text-center py-4">No businesses found</p>';
      dropdown.innerHTML = '<option value="">No businesses available</option>';
    }
  } catch (err) {
    console.error("Error loading businesses:", err);
    document.querySelector('#businessList .table-content').innerHTML = '<p class="text-muted text-center py-4">❌ Error loading businesses</p>';
  }
}

// ============================
// Load Venues
// GET /api/master/venues
// ============================
async function loadVenues() {
  try {
    const res = await fetch("/api/master/venues");
    const data = await res.json();
    const tableContent = document.querySelector('#venueList .table-content');

    if (res.ok && data.success && data.data.length > 0) {
      tableContent.innerHTML = `
        <table class="data-grid">
          <thead>
            <tr>
              <th>ID</th>
              <th>Venue Name</th>
              <th>Business</th>
              <th>State</th>
              <th>Location</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${data.data.map(v => `
              <tr>
                <td>${v.id}</td>
                <td><strong>${v.venue_name}</strong></td>
                <td>${v.business_name || 'N/A'}</td>
                <td>${v.state}</td>
                <td>${v.location}</td>
                <td><span class="badge ${v.status === 'active' ? 'bg-success' : 'bg-secondary'}">${v.status}</span></td>
                <td>${new Date(v.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      tableContent.innerHTML = '<p class="text-muted text-center py-4">No venues found</p>';
    }
  } catch (err) {
    console.error("Error loading venues:", err);
    document.querySelector('#venueList .table-content').innerHTML = '<p class="text-muted text-center py-4">❌ Error loading venues</p>';
  }
}

// ============================
// Load Dashboard Stats
// GET /api/master/stats
// ============================
function calcGrowth(current, last) {
  if (!last && current) return { text: "+∞%", class: "positive" };
  if (!last && !current) return { text: "0%", class: "neutral" };
  const diff = current - last;
  const pct = ((diff / last) * 100).toFixed(1);
  const text = `${diff >= 0 ? '+' : ''}${pct}%`;
  const className = diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral";
  return { text, class: className };
}

function updateStatCard(elementId, mainValue, subText, growth) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const statInfo = element.closest('.stat-card').querySelector('.stat-info');
  const h3 = statInfo.querySelector('h3');
  const p = statInfo.querySelector('p');

  h3.textContent = mainValue;

  // Update or create growth indicator
  let growthElement = statInfo.querySelector('.stat-growth');
  if (!growthElement) {
    growthElement = document.createElement('div');
    growthElement.className = 'stat-growth';
    statInfo.appendChild(growthElement);
  }

  if (subText) {
    growthElement.textContent = `${subText} (${growth.text})`;
    growthElement.className = `stat-growth ${growth.class}`;
    growthElement.style.display = 'block';
  } else {
    growthElement.style.display = 'none';
  }
}

async function loadDashboardStats() {
  try {
    const res = await fetch("/api/master/stats");
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error("Failed to load stats");

    const stats = data.data;

    // Update stat cards with growth indicators
    updateStatCard('statBusinesses', stats.total_businesses,
      `This month: ${stats.businesses_this_month}`,
      calcGrowth(stats.businesses_this_month, stats.businesses_last_month));

    updateStatCard('statVenues', stats.total_venues,
      `This month: ${stats.venues_this_month}`,
      calcGrowth(stats.venues_this_month, stats.venues_last_month));

    updateStatCard('statStaff', stats.total_staff,
      `This month: ${stats.staff_this_month}`,
      calcGrowth(stats.staff_this_month, stats.staff_last_month));

    updateStatCard('statHours', (stats.hours_this_month || 0).toFixed(1),
      `hours this month`,
      calcGrowth(stats.hours_this_month, stats.hours_last_month));

    // Update venues by state table
    const tbody = document.getElementById('venuesByState');
    if (tbody && stats.venues_by_state && stats.venues_by_state.length > 0) {
      tbody.innerHTML = stats.venues_by_state.map(r =>
        `<tr><td>${r.state}</td><td>${r.venues_per_state}</td></tr>`
      ).join('');
    } else if (tbody) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No venues yet</td></tr>';
    }

  } catch (err) {
    console.error("Dashboard stats error:", err);
    // Show sample data if API fails
    showSampleDashboardData();
  }
}

function showSampleDashboardData() {
  // Fallback to sample data if API is not available
  document.getElementById('statBusinesses').textContent = '0';
  document.getElementById('statVenues').textContent = '0';
  document.getElementById('statStaff').textContent = '0';
  document.getElementById('statHours').textContent = '0';
  document.getElementById('venuesByState').innerHTML = '<tr><td colspan="2" class="text-center text-muted">Unable to load data</td></tr>';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Load dashboard stats first
  loadDashboardStats();

  // Load other data
  loadBusinesses();
  loadVenues();

  // Setup event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Business form controls
  const showAddBusinessBtn = document.getElementById('showAddBusinessBtn');
  if (showAddBusinessBtn) {
    showAddBusinessBtn.addEventListener('click', showAddBusinessForm);
  }

  const hideAddBusinessBtn = document.getElementById('hideAddBusinessBtn');
  if (hideAddBusinessBtn) {
    hideAddBusinessBtn.addEventListener('click', hideAddBusinessForm);
  }

  const cancelAddBusinessBtn = document.getElementById('cancelAddBusinessBtn');
  if (cancelAddBusinessBtn) {
    cancelAddBusinessBtn.addEventListener('click', hideAddBusinessForm);
  }

  const businessForm = document.getElementById('businessForm');
  if (businessForm) {
    businessForm.addEventListener('submit', createBusiness);
  }

  // Venue form controls
  const showAddVenueBtn = document.getElementById('showAddVenueBtn');
  if (showAddVenueBtn) {
    showAddVenueBtn.addEventListener('click', showAddVenueForm);
  }

  const hideAddVenueBtn = document.getElementById('hideAddVenueBtn');
  if (hideAddVenueBtn) {
    hideAddVenueBtn.addEventListener('click', hideAddVenueForm);
  }

  const cancelAddVenueBtn = document.getElementById('cancelAddVenueBtn');
  if (cancelAddVenueBtn) {
    cancelAddVenueBtn.addEventListener('click', hideAddVenueForm);
  }

  const venueSysAdminForm = document.getElementById('venueSysAdminForm');
  if (venueSysAdminForm) {
    venueSysAdminForm.addEventListener('submit', createVenueAndSysAdmin);
  }
}