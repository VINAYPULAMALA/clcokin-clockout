let selectedRole = '';

document.addEventListener("DOMContentLoaded", () => {
  const authForm = document.getElementById("authForm");
  const loginBtn = authForm?.querySelector("button[type='submit']");
  const errorBox = document.getElementById("loginMessage");

  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = authForm.username.value.trim();
      const password = authForm.password.value.trim();

      // Basic validation
      if (!username || !password) {
        showError("Please enter both username and password.");
        return;
      }

      try {
        // Disable button while waiting
        if (loginBtn) {
          loginBtn.disabled = true;
          loginBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Signing in...`;
        }

        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Login failed");
        }

        // ✅ Success: clear old session and save new user in localStorage
        localStorage.clear();
        localStorage.setItem("currentUser", JSON.stringify(data));

        // Blur active element to avoid aria-hidden warnings
        document.activeElement.blur();

        // Redirect based on role
        switch (data.access_level) {
          case "system_admin":
          case "manager":
          case "supervisor":
            window.location.href = "/admin.html";
            break;
          case "employee":
            window.location.href = "/kiosk.html";
            break;
          default:
            window.location.href = "/master.html";
        }
      } catch (err) {
        console.error("Login error:", err);
        showError(err.message || "Something went wrong while logging in");
      } finally {
        // Re-enable button
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i>Sign In`;
        }
      }
    });
  }

  function showError(message) {
    if (errorBox) {
      errorBox.innerHTML = `<div class="alert alert-danger p-2 mb-2">${message}</div>`;
      errorBox.classList.remove('d-none');
    } else {
      alert("❌ " + message);
    }
  }

  // Setup other event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Role selection buttons (event delegation)
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('[data-role]')) {
      const role = e.target.closest('[data-role]').dataset.role;
      selectRole(role);
    }
  });

  // Staff kiosk button
  const staffKioskButton = document.getElementById('staffKioskButton');
  if (staffKioskButton) {
    staffKioskButton.addEventListener('click', goToStaffConsole);
  }

  // Back to role selection button
  const backToRoleButton = document.getElementById('backToRoleButton');
  if (backToRoleButton) {
    backToRoleButton.addEventListener('click', backToRoleSelection);
  }
}

function selectRole(role) {
  selectedRole = role;

  // Update subtitle and show login form
  const subtitle = document.getElementById('loginSubtitle');
  const roleSelection = document.getElementById('roleSelection');
  const loginForm = document.getElementById('loginForm');
  const errorBox = document.getElementById("loginMessage");

  // Clear any previous errors
  if (errorBox) {
    errorBox.classList.add('d-none');
    errorBox.innerHTML = '';
  }

  if (role === 'admin') {
    subtitle.textContent = 'Admin Console Login';
    // Hide role selection, show login form
    roleSelection.classList.add('d-none');
    loginForm.classList.remove('d-none');

    // Focus on username field
    setTimeout(() => {
      const usernameField = document.getElementById('username');
      if (usernameField) {
        usernameField.focus();
      }
    }, 100);
  }
}

function goToStaffConsole() {
  // Direct access to staff console without login
  window.location.href = 'kiosk.html';
}

function backToRoleSelection() {
  const subtitle = document.getElementById('loginSubtitle');
  const roleSelection = document.getElementById('roleSelection');
  const loginForm = document.getElementById('loginForm');
  const errorBox = document.getElementById("loginMessage");
  const authForm = document.getElementById("authForm");

  // Clear any previous errors
  if (errorBox) {
    errorBox.classList.add('d-none');
    errorBox.innerHTML = '';
  }

  // Reset form
  if (authForm) {
    authForm.reset();
  }

  // Reset UI
  subtitle.textContent = 'Choose your console to continue';
  roleSelection.classList.remove('d-none');
  loginForm.classList.add('d-none');
  selectedRole = '';
}