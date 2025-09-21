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

// Enhanced message display function with toast notifications
function showMessage(message, type) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toastId = 'toast_' + Date.now();
    const toastClass = type === 'success' ? 'bg-success' :
                     type === 'error' ? 'bg-danger' : 'bg-info';

    const icon = type === 'success' ? 'check-circle' :
                type === 'error' ? 'exclamation-triangle' : 'info-circle';

    const toastHTML = `
        <div id="${toastId}" class="toast ${toastClass} text-white" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header ${toastClass} text-white border-0">
                <i class="bi bi-${icon} me-2"></i>
                <strong class="me-auto">${type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info'}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    // Initialize and show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: type === 'error' ? 8000 : 5000
    });

    toast.show();

    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

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

// Wizard Variables
let currentStep = 1;
const totalSteps = 5;
let wizardData = {};

// Wizard Navigation Functions
function updateWizardProgress() {
    const progress = (currentStep / totalSteps) * 100;
    const progressBar = document.getElementById('wizardProgress');
    const stepIndicator = document.getElementById('stepIndicator');
    const stepCounter = document.getElementById('stepCounter');

    if (progressBar) progressBar.style.width = progress + '%';

    const stepNames = [
        'Personal Information',
        'Employment & Pay',
        'Compliance & Banking',
        'Documents',
        'Review & Confirm'
    ];

    if (stepIndicator) stepIndicator.textContent = `Step ${currentStep} of ${totalSteps}: ${stepNames[currentStep - 1]}`;
    if (stepCounter) stepCounter.textContent = `${currentStep}/${totalSteps}`;
}

function showStep(stepNumber) {
    // Hide all steps
    for (let i = 1; i <= totalSteps; i++) {
        const step = document.getElementById(`step${i}`);
        if (step) {
            step.style.display = 'none';
        }
    }

    // Show current step
    const currentStepElement = document.getElementById(`step${stepNumber}`);
    if (currentStepElement) {
        currentStepElement.style.display = 'block';
    }

    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (prevBtn) prevBtn.style.display = stepNumber > 1 ? 'inline-block' : 'none';
    if (nextBtn) nextBtn.style.display = stepNumber < totalSteps ? 'inline-block' : 'none';
    if (submitBtn) submitBtn.style.display = stepNumber === totalSteps ? 'inline-block' : 'none';

    console.log('Button visibility updated');
    updateWizardProgress();
}

function validateCurrentStep() {
    const currentStepElement = document.getElementById(`step${currentStep}`);
    if (!currentStepElement) {
        console.log('Step element not found:', `step${currentStep}`);
        return true;
    }

    let isValid = true;

    // Enhanced validation by step
    if (currentStep === 1) {
        // Step 1: Personal Information validation
        const firstName = currentStepElement.querySelector('[name="firstName"]');
        const lastName = currentStepElement.querySelector('[name="lastName"]');
        const dob = currentStepElement.querySelector('[name="dob"]');

        // Required field validation
        [firstName, lastName].forEach(field => {
            if (field) {
                const value = field.value.trim();
                if (!value) {
                    showFieldError(field, 'This field is required.');
                    isValid = false;
                } else if (value.length < 2) {
                    showFieldError(field, 'Must be at least 2 characters long.');
                    isValid = false;
                } else if (!/^[a-zA-Z\s\-']+$/.test(value)) {
                    showFieldError(field, 'Only letters, spaces, hyphens and apostrophes allowed.');
                    isValid = false;
                } else {
                    showFieldSuccess(field);
                }
            }
        });

        // Date of birth validation
        if (dob && dob.value) {
            const birthDate = new Date(dob.value);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();

            if (age < 14 || age > 100) {
                showFieldError(dob, 'Age must be between 14 and 100 years.');
                isValid = false;
            } else {
                showFieldSuccess(dob);
            }
        }

    } else if (currentStep === 2) {
        // Step 2: Employment validation
        const employmentType = currentStepElement.querySelector('[name="employmentType"]');
        const weekdayRate = currentStepElement.querySelector('[name="weekdayRate"]');
        const saturdayRate = currentStepElement.querySelector('[name="saturdayRate"]');
        const sundayRate = currentStepElement.querySelector('[name="sundayRate"]');

        // Employment type is required
        if (employmentType && !employmentType.value) {
            showFieldError(employmentType, 'Please select an employment type.');
            isValid = false;
        } else if (employmentType) {
            showFieldSuccess(employmentType);
        }

        // Validate pay rates if provided
        [weekdayRate, saturdayRate, sundayRate].forEach(field => {
            if (field && field.value) {
                const rate = parseFloat(field.value);
                if (rate < 15 || rate > 100) {
                    showFieldError(field, 'Pay rate should be between $15 and $100 per hour.');
                    isValid = false;
                } else {
                    showFieldSuccess(field);
                }
            }
        });

    } else if (currentStep === 3) {
        // Step 3: Compliance validation
        const tfn = currentStepElement.querySelector('[name="taxRef"]');
        const bsb = currentStepElement.querySelector('[name="bsb"]');
        const accountNumber = currentStepElement.querySelector('[name="accountNumber"]');

        // TFN validation
        if (tfn && tfn.value) {
            const tfnValue = tfn.value.replace(/\s/g, '');
            if (!/^\d{9}$/.test(tfnValue)) {
                showFieldError(tfn, 'TFN must be exactly 9 digits.');
                isValid = false;
            } else {
                showFieldSuccess(tfn);
            }
        }

        // BSB validation
        if (bsb && bsb.value) {
            const bsbValue = bsb.value.replace(/[-\s]/g, '');
            if (!/^\d{6}$/.test(bsbValue)) {
                showFieldError(bsb, 'BSB must be 6 digits (e.g., 123-456).');
                isValid = false;
            } else {
                showFieldSuccess(bsb);
            }
        }

        // Account number validation
        if (accountNumber && accountNumber.value) {
            const accValue = accountNumber.value.replace(/\s/g, '');
            if (!/^\d{6,10}$/.test(accValue)) {
                showFieldError(accountNumber, 'Account number must be 6-10 digits.');
                isValid = false;
            } else {
                showFieldSuccess(accountNumber);
            }
        }
    } else {
        // For other steps, validate all required fields
        const requiredFields = currentStepElement.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            const value = field.value.trim();
            if (!value) {
                showFieldError(field, 'This field is required.');
                isValid = false;
            } else {
                showFieldSuccess(field);
            }
        });
    }

    return isValid;
}

// Helper functions for field validation feedback
function showFieldError(field, message) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');

    // Remove existing feedback
    const existingFeedback = field.parentNode.querySelector('.invalid-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }

    // Add new error message
    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    feedback.textContent = message;
    field.parentNode.appendChild(feedback);
}

function showFieldSuccess(field) {
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');

    // Remove error message
    const feedback = field.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.remove();
    }
}

function collectStepData() {
    const form = document.getElementById('addStaffForm');
    const formData = new FormData(form);

    // Store all form data in wizardData
    for (let [key, value] of formData.entries()) {
        // Handle file inputs specially
        if (value instanceof File) {
            wizardData[key] = value.name ? value.name : null;
        } else {
            wizardData[key] = value;
        }
    }
}

function generateSummary() {
    const summaryContent = document.getElementById('summaryContent');
    if (!summaryContent) return;

    const summary = `
        <div class="row g-4">
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header bg-primary text-white">
                        <h6 class="mb-0"><i class="bi bi-person"></i> Personal Information</h6>
                    </div>
                    <div class="card-body">
                        <p><strong>Name:</strong> ${wizardData.firstName || ''} ${wizardData.middleName || ''} ${wizardData.lastName || ''}</p>
                        <p><strong>DOB:</strong> ${wizardData.dob || 'Not provided'}</p>
                        <p><strong>Gender:</strong> ${wizardData.gender || 'Not provided'}</p>
                        <p><strong>Visa Status:</strong> ${wizardData.visaStatus || 'Not provided'}</p>
                        <p><strong>Address:</strong> ${wizardData.streetAddress || ''}, ${wizardData.suburb || ''}, ${wizardData.state || ''} ${wizardData.postcode || ''}</p>
                        <p><strong>Emergency Contact:</strong> ${wizardData.emergencyContactName || ''} (${wizardData.emergencyContactNumber || ''})</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header bg-info text-white">
                        <h6 class="mb-0"><i class="bi bi-briefcase"></i> Employment</h6>
                    </div>
                    <div class="card-body">
                        <p><strong>Type:</strong> ${wizardData.employmentType || 'Not provided'}</p>
                        <p><strong>Role:</strong> ${wizardData.role || 'Not provided'}</p>
                        <p><strong>Start Date:</strong> ${wizardData.startDate || 'Not provided'}</p>
                        <p><strong>Award Level:</strong> ${wizardData.awardLevel || 'Not provided'}</p>
                        <p><strong>Hours/Week:</strong> ${wizardData.defaultHoursPerWeek || 'Not provided'}</p>
                        <p><strong>Status:</strong> ${wizardData.status || 'Active'}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header bg-success text-white">
                        <h6 class="mb-0"><i class="bi bi-cash-coin"></i> Financial</h6>
                    </div>
                    <div class="card-body">
                        <p><strong>Weekday Rate:</strong> $${wizardData.weekdayRate || '0.00'}/hr</p>
                        <p><strong>Saturday Rate:</strong> $${wizardData.saturdayRate || '0.00'}/hr</p>
                        <p><strong>Sunday Rate:</strong> $${wizardData.sundayRate || '0.00'}/hr</p>
                        <p><strong>Holiday Rate:</strong> $${wizardData.publicHolidayRate || '0.00'}/hr</p>
                        <p><strong>Overtime Rate:</strong> $${wizardData.overtimeRate || '0.00'}/hr</p>
                        <p><strong>Pay Frequency:</strong> ${wizardData.payFrequency || 'Fortnightly'}</p>
                        <p><strong>TFN:</strong> ${wizardData.taxRef || 'Not provided'}</p>
                        <p><strong>Super Fund:</strong> ${wizardData.superFund || 'Not provided'}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header bg-warning text-dark">
                        <h6 class="mb-0"><i class="bi bi-bank"></i> Banking & Integration</h6>
                    </div>
                    <div class="card-body">
                        <p><strong>Account Name:</strong> ${wizardData.accountName || 'Not provided'}</p>
                        <p><strong>BSB:</strong> ${wizardData.bsb || 'Not provided'}</p>
                        <p><strong>Account Number:</strong> ${wizardData.accountNumber || 'Not provided'}</p>
                        <p><strong>Bank:</strong> ${wizardData.bankName || 'Not provided'}</p>
                        <p><strong>Payroll Ref:</strong> ${wizardData.payrollRef || 'Not provided'}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header bg-secondary text-white">
                        <h6 class="mb-0"><i class="bi bi-file-earmark-text"></i> Documents</h6>
                    </div>
                    <div class="card-body">
                        <p><strong>Profile Picture:</strong> ${wizardData.profilePic ? '✅ Uploaded' : '❌ Not uploaded'}</p>
                        <p><strong>Employment Contract:</strong> ${wizardData.employmentContract ? '✅ Uploaded' : '❌ Not uploaded'}</p>
                        <p><strong>Tax Declaration:</strong> ${wizardData.taxDeclaration ? '✅ Uploaded' : '❌ Not uploaded'}</p>
                        <p><strong>Bank Details:</strong> ${wizardData.bankDetails ? '✅ Uploaded' : '❌ Not uploaded'}</p>
                        <p><strong>Other Documents:</strong> ${wizardData.otherDocuments ? '✅ Uploaded' : '❌ Not uploaded'}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="alert alert-info mt-4">
            <i class="bi bi-info-circle me-2"></i>
            <strong>Ready to Create:</strong> Please review all information above. Click "Create Staff Member" to add this person to your system.
        </div>

        <!-- Print Button -->
        <div class="text-center mt-4 no-print">
            <button type="button" class="btn btn-outline-primary me-3" onclick="printStaffSummary()">
                <i class="bi bi-printer me-2"></i>Print Summary
            </button>
            <button type="button" class="btn btn-outline-success" onclick="printStaffForm()">
                <i class="bi bi-file-earmark-pdf me-2"></i>Print Complete Form
            </button>
        </div>
    `;

    summaryContent.innerHTML = summary;
}

// Real-time validation setup
function setupRealTimeValidation() {
    // Get all form fields that need validation
    const formFields = document.querySelectorAll('#addStaffForm input, #addStaffForm select');

    formFields.forEach(field => {
        // Add input event listener for real-time validation
        field.addEventListener('input', function() {
            validateSingleField(this);
        });

        field.addEventListener('blur', function() {
            validateSingleField(this);
        });
    });
}

// Validate a single field
function validateSingleField(field) {
    const fieldName = field.name;
    const value = field.value.trim();

    // Clear previous validation state
    field.classList.remove('is-valid', 'is-invalid');
    const existingFeedback = field.parentNode.querySelector('.invalid-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }

    // Skip validation if field is empty and not required
    if (!value && !field.hasAttribute('required')) {
        return;
    }

    // Specific validation rules
    switch (fieldName) {
        case 'firstName':
        case 'lastName':
            if (!value) {
                showFieldError(field, 'This field is required.');
            } else if (value.length < 2) {
                showFieldError(field, 'Must be at least 2 characters long.');
            } else if (!/^[a-zA-Z\s\-']+$/.test(value)) {
                showFieldError(field, 'Only letters, spaces, hyphens and apostrophes allowed.');
            } else {
                showFieldSuccess(field);
            }
            break;

        case 'dob':
            if (value) {
                const birthDate = new Date(value);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();

                if (age < 14 || age > 100) {
                    showFieldError(field, 'Age must be between 14 and 100 years.');
                } else {
                    showFieldSuccess(field);
                }
            }
            break;

        case 'employmentType':
            if (field.hasAttribute('required') && !value) {
                showFieldError(field, 'Please select an employment type.');
            } else if (value) {
                showFieldSuccess(field);
            }
            break;

        case 'weekdayRate':
        case 'saturdayRate':
        case 'sundayRate':
        case 'publicHolidayRate':
        case 'overtimeRate':
            if (value) {
                const rate = parseFloat(value);
                if (isNaN(rate) || rate < 15 || rate > 100) {
                    showFieldError(field, 'Pay rate should be between $15 and $100 per hour.');
                } else {
                    showFieldSuccess(field);
                }
            }
            break;

        case 'taxRef':
            if (value) {
                const tfnValue = value.replace(/\s/g, '');
                if (!/^\d{9}$/.test(tfnValue)) {
                    showFieldError(field, 'TFN must be exactly 9 digits.');
                } else {
                    showFieldSuccess(field);
                }
            }
            break;

        case 'bsb':
            if (value) {
                const bsbValue = value.replace(/[-\s]/g, '');
                if (!/^\d{6}$/.test(bsbValue)) {
                    showFieldError(field, 'BSB must be 6 digits (e.g., 123-456).');
                } else {
                    showFieldSuccess(field);
                }
            }
            break;

        case 'accountNumber':
            if (value) {
                const accValue = value.replace(/\s/g, '');
                if (!/^\d{6,10}$/.test(accValue)) {
                    showFieldError(field, 'Account number must be 6-10 digits.');
                } else {
                    showFieldSuccess(field);
                }
            }
            break;

        default:
            // For required fields without specific validation
            if (field.hasAttribute('required') && !value) {
                showFieldError(field, 'This field is required.');
            } else if (value) {
                showFieldSuccess(field);
            }
            break;
    }
}

// Input formatting helpers
function formatTFN(input) {
    // Auto-format TFN with spaces
    let value = input.value.replace(/\D/g, '');
    if (value.length > 9) value = value.substring(0, 9);

    if (value.length > 3 && value.length <= 6) {
        value = value.substring(0, 3) + ' ' + value.substring(3);
    } else if (value.length > 6) {
        value = value.substring(0, 3) + ' ' + value.substring(3, 6) + ' ' + value.substring(6);
    }

    input.value = value;
}

function formatBSB(input) {
    // Auto-format BSB with hyphen
    let value = input.value.replace(/\D/g, '');
    if (value.length > 6) value = value.substring(0, 6);

    if (value.length > 3) {
        value = value.substring(0, 3) + '-' + value.substring(3);
    }

    input.value = value;
}

// Wizard Navigation Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');

    // Add real-time validation to form fields
    setupRealTimeValidation();

    if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const isValid = validateCurrentStep();

            if (isValid) {
                collectStepData();
                if (currentStep < totalSteps) {
                    currentStep++;
                    showStep(currentStep);
                    if (currentStep === totalSteps) {
                        generateSummary();
                    }
                }
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (currentStep > 1) {
                currentStep--;
                showStep(currentStep);
            }
        });
    }

    // Reset wizard when modal is opened
    const addStaffModal = document.getElementById('addStaffModal');
    if (addStaffModal) {
        addStaffModal.addEventListener('show.bs.modal', function() {
            // Only reset if not in edit mode
            if (!isEditMode) {
                currentStep = 1;
                wizardData = {};

                // Clear any previous validation states
                const form = document.getElementById('addStaffForm');
                if (form) {
                    form.reset();
                    const invalidFields = form.querySelectorAll('.is-invalid');
                    invalidFields.forEach(field => {
                        field.classList.remove('is-invalid');
                        field.classList.remove('is-valid');
                    });
                    const feedbacks = form.querySelectorAll('.invalid-feedback');
                    feedbacks.forEach(feedback => feedback.remove());
                }

                // Reset modal title
                const modalTitle = document.querySelector('#addStaffModal .modal-title h5');
                if (modalTitle) {
                    modalTitle.textContent = 'Add New Staff Member';
                }

                showStep(1);
                console.log('Wizard reset complete');
            }
        });
    }

});

// Add Staff Form Handler - Only handle submission on final step
document.getElementById('addStaffForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Only process form submission if we're on the final step
    if (currentStep !== totalSteps) {
        return;
    }
    const formData = new FormData(this);


    // Get current user data for business_id and venue_id
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};

    const staffData = {
        // Main staff table
        business_id: currentUser.business_id || 1,
        venue_id: currentUser.venue_id || 1,
        first_name: formData.get('firstName'),
        middle_name: formData.get('middleName') || '',
        last_name: formData.get('lastName'),
        dob: formData.get('dob'),
        gender: formData.get('gender'),
        visa_status: formData.get('visaStatus'),
        created_by: currentUser.id || 1,

        // Contact information (staff_contact table)
        street_address: formData.get('streetAddress') || '',
        suburb: formData.get('suburb') || '',
        state: formData.get('state') || '',
        postcode: formData.get('postcode') || '',
        country: formData.get('country') || '',
        emergency_contact_name: formData.get('emergencyContactName') || '',
        emergency_contact_phone: formData.get('emergencyContactNumber') || '',

        // Employment information (staff_employment table)
        role: formData.get('role') || '',
        employment_type: formData.get('employmentType') || '',
        award_level: formData.get('awardLevel') || '',
        start_date: formData.get('startDate') || null,
        employment_status: formData.get('status') || 'Active',
        status: formData.get('status') || 'Active', // Main status field for backend logic
        default_hours_per_week: parseFloat(formData.get('defaultHoursPerWeek')) || null,
        weekday_rate: parseFloat(formData.get('weekdayRate')) || null,
        saturday_rate: parseFloat(formData.get('saturdayRate')) || null,
        sunday_rate: parseFloat(formData.get('sundayRate')) || null,
        public_holiday_rate: parseFloat(formData.get('publicHolidayRate')) || null,
        overtime_rate: parseFloat(formData.get('overtimeRate')) || null,
        pay_frequency: formData.get('payFrequency') || 'fortnightly',

        // Compliance information (staff_compliance table)
        tfn: formData.get('taxRef') || '',
        super_fund: formData.get('superFund') || '',
        super_member_id: formData.get('superMemberId') || '',
        payroll_ref: formData.get('payrollRef') || '',
        bank_account_name: formData.get('accountName') || '',
        bank_bsb: formData.get('bsb') || '',
        bank_account_number: formData.get('accountNumber') || '',
        bank_name: formData.get('bankName') || '',

        // Documents (staff_documents table) - for now just store filenames
        profile_pic: formData.get('profilePic') ? formData.get('profilePic').name : '',
        contract_file: formData.get('employmentContract') ? formData.get('employmentContract').name : '',
        tax_form_file: formData.get('taxDeclaration') ? formData.get('taxDeclaration').name : '',
        bank_statement_file: formData.get('bankDetails') ? formData.get('bankDetails').name : '',
        other_docs: formData.get('otherDocuments') ? formData.get('otherDocuments').name : ''
    };

    try {
        // Determine if this is an edit or create operation
        const isEdit = isEditMode && editingStaffId;
        const url = isEdit ? `/api/staff/${editingStaffId}` : '/api/staff';
        const method = isEdit ? 'PUT' : 'POST';

        // Map form field names to backend expected names for updates
        if (isEdit) {
            staffData.firstName = staffData.first_name;
            staffData.middleName = staffData.middle_name;
            staffData.lastName = staffData.last_name;
            staffData.visaStatus = staffData.visa_status;
            staffData.streetAddress = staffData.street_address;
            staffData.emergencyContactName = staffData.emergency_contact_name;
            staffData.emergencyContactNumber = staffData.emergency_contact_phone;
            staffData.employmentType = staffData.employment_type;
            staffData.awardLevel = staffData.award_level;
            staffData.startDate = staffData.start_date;
            staffData.employmentStatus = staffData.employment_status;
            staffData.defaultHoursPerWeek = staffData.default_hours_per_week;
            staffData.weekdayRate = staffData.weekday_rate;
            staffData.saturdayRate = staffData.saturday_rate;
            staffData.sundayRate = staffData.sunday_rate;
            staffData.publicHolidayRate = staffData.public_holiday_rate;
            staffData.overtimeRate = staffData.overtime_rate;
            staffData.payFrequency = staffData.pay_frequency;
            staffData.taxRef = staffData.tfn;
            staffData.superFund = staffData.super_fund;
            staffData.superMemberId = staffData.super_member_id;
            staffData.payrollRef = staffData.payroll_ref;
            staffData.accountName = staffData.bank_account_name;
            staffData.bsb = staffData.bank_bsb;
            staffData.accountNumber = staffData.bank_account_number;
            staffData.bankName = staffData.bank_name;
            staffData.profilePic = staffData.profile_pic;
            staffData.employmentContract = staffData.contract_file;
            staffData.taxDeclaration = staffData.tax_form_file;
            staffData.bankDetails = staffData.bank_statement_file;
            staffData.otherDocuments = staffData.other_docs;
            // Keep the form status value - don't overwrite with employment_status
        }


        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(staffData)
        });

        const result = await response.json();

        if (result.success) {
            // Staff created/updated successfully
            this.reset();
            bootstrap.Modal.getInstance(document.getElementById('addStaffModal')).hide();

            // Reset wizard and edit mode
            currentStep = 1;
            showStep(1);
            wizardData = {};
            isEditMode = false;
            editingStaffId = null;

            // Reset modal title
            const modalTitle = document.querySelector('#addStaffModal .modal-title h5');
            if (modalTitle) {
                modalTitle.textContent = 'Add New Staff Member';
            }

            // Refresh staff table
            await renderStaffTable();

            // Show success message
            const message = isEdit ? 'Staff member updated successfully!' : 'Staff member added successfully!';
            showMessage(message, 'success');
        } else {
            const action = isEdit ? 'updating' : 'creating';
            showMessage(`Error ${action} staff member: ` + result.error, 'error');
        }
    } catch (error) {
        const action = isEdit ? 'updating' : 'creating';
        console.error(`Error ${action} staff:`, error);
        showMessage(`Error connecting to server. Please try again.`, 'error');
    }
});

// Edit Staff Form Handler
document.getElementById('editStaffForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const staffId = parseInt(formData.get('staffId'));

    const staffIndex = staffMembers.findIndex(s => s.id === staffId);
    if (staffIndex !== -1) {
        // Only update the essential fields that are in the simplified edit form
        staffMembers[staffIndex] = {
            ...staffMembers[staffIndex],
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            role: formData.get('role'),
            status: formData.get('status') || 'active',
            visaStatus: formData.get('visaStatus'),
            weekdayRate: parseFloat(formData.get('weekdayRate')) || 0,
            // Legacy field for compatibility
            hourlyRate: parseFloat(formData.get('weekdayRate')) || 0
        };

        localStorage.setItem('staffMembers', JSON.stringify(staffMembers));
        bootstrap.Modal.getInstance(document.getElementById('editStaffModal')).hide();
        await renderStaffTable();
    }
});

let isEditMode = false;
let editingStaffId = null;

async function editStaff(staffId) {
    try {
        // Fetch complete staff data from backend
        const response = await fetch(`/api/staff/${staffId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch staff data');
        }

        const staffData = await response.json();

        // Set edit mode
        isEditMode = true;
        editingStaffId = staffId;

        // Populate the wizard form with existing data
        populateWizardForm(staffData);

        // Update modal title
        const modalTitle = document.querySelector('#addStaffModal .modal-title h5');
        if (modalTitle) {
            modalTitle.textContent = `Edit Staff Member: ${staffData.first_name} ${staffData.last_name}`;
        }

        // Reset to step 1 and show the wizard modal
        currentStep = 1;
        showStep(1);

        new bootstrap.Modal(document.getElementById('addStaffModal')).show();

    } catch (error) {
        console.error('Error fetching staff data:', error);
        alert('Error loading staff data. Please try again.');
    }
}

function populateWizardForm(staffData) {
    const form = document.getElementById('addStaffForm');
    if (!form) return;

    // Step 1: Personal Information
    const setFieldValue = (name, value) => {
        const field = form.querySelector(`[name="${name}"]`);
        if (field) {
            // Skip file inputs - they can't be programmatically set for security reasons
            if (field.type === 'file') {
                return;
            }
            field.value = value || '';
        }
    };

    // Personal Information
    setFieldValue('firstName', staffData.first_name);
    setFieldValue('middleName', staffData.middle_name);
    setFieldValue('lastName', staffData.last_name);
    setFieldValue('dob', staffData.dob);
    setFieldValue('gender', staffData.gender);
    setFieldValue('visaStatus', staffData.visa_status);

    // Address Information
    setFieldValue('streetAddress', staffData.address_street);
    setFieldValue('suburb', staffData.address_suburb);
    setFieldValue('state', staffData.address_state);
    setFieldValue('postcode', staffData.address_postcode);
    setFieldValue('country', staffData.address_country);

    // Emergency Contact
    setFieldValue('emergencyContactName', staffData.emergency_contact_name);
    setFieldValue('emergencyContactNumber', staffData.emergency_contact_phone);

    // Step 2: Employment & Pay
    setFieldValue('startDate', staffData.start_date);
    setFieldValue('role', staffData.role);
    // Use the main staff.active field for the status dropdown, not employment_status
    setFieldValue('status', staffData.active ? 'Active' : 'Inactive');
    setFieldValue('employmentType', staffData.employment_type);
    setFieldValue('awardLevel', staffData.award_level);
    setFieldValue('defaultHoursPerWeek', staffData.default_hours_per_week);
    setFieldValue('weekdayRate', staffData.weekday_rate);
    setFieldValue('saturdayRate', staffData.saturday_rate);
    setFieldValue('sundayRate', staffData.sunday_rate);
    setFieldValue('publicHolidayRate', staffData.public_holiday_rate);
    setFieldValue('overtimeRate', staffData.overtime_rate);
    setFieldValue('payFrequency', staffData.pay_frequency);

    // Step 3: Compliance & Banking
    setFieldValue('taxRef', staffData.tfn);
    setFieldValue('superFund', staffData.super_fund);
    setFieldValue('superMemberId', staffData.super_member_id);
    setFieldValue('payrollRef', staffData.payroll_ref);
    setFieldValue('accountName', staffData.bank_account_name);
    setFieldValue('bsb', staffData.bank_bsb);
    setFieldValue('accountNumber', staffData.bank_account_number);
    setFieldValue('bankName', staffData.bank_name);

    // Step 4: Documents (file references)
    setFieldValue('profilePic', staffData.profile_pic);
    setFieldValue('employmentContract', staffData.contract_file);
    setFieldValue('taxDeclaration', staffData.tax_form_file);
    setFieldValue('bankDetails', staffData.bank_statement_file);
    setFieldValue('otherDocuments', staffData.other_docs);
}

async function removeStaff(staffId) {
    try {
        // First, get staff details for confirmation
        const response = await fetch(`/api/staff/${staffId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch staff details');
        }

        const staff = await response.json();
        const fullName = `${staff.first_name} ${staff.last_name}`;

        if (confirm(`Are you sure you want to remove ${fullName}?\n\nThis will permanently delete all staff information including:\n- Personal details\n- Employment records\n- Banking information\n- Document references\n\nThis action cannot be undone.`)) {

            // Delete staff from database
            const deleteResponse = await fetch(`/api/staff/${staffId}`, {
                method: 'DELETE'
            });

            const result = await deleteResponse.json();

            if (result.success) {
                // Refresh staff table
                await renderStaffTable();
                showMessage(`${fullName} removed successfully`, 'success');
            } else {
                showMessage('Error removing staff member: ' + result.error, 'error');
            }
        }
    } catch (error) {
        console.error('Error removing staff:', error);
        showMessage('Error connecting to server. Please try again.', 'error');
    }
}

async function renderStaffTable() {
    const tbody = document.getElementById('staffTableBody');

    try {
        const response = await fetch('/api/staff');
        const staffMembers = await response.json();

        if (staffMembers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted fst-italic py-4">No staff members added yet.</td></tr>';
            return;
        }

        tbody.innerHTML = staffMembers.map(staff => {
            const fullName = `${staff.first_name} ${staff.last_name}`;
            const status = staff.active ? 'active' : 'inactive';
            const statusBadge = status === 'active' ?
                '<span class="badge-active">Active</span>' :
                '<span class="badge-inactive">Inactive</span>';

            // Format start date
            const startDate = staff.start_date ? new Date(staff.start_date).toLocaleDateString() : '-';

            return `
                <tr>
                    <td>${fullName}</td>
                    <td>${staff.role || '-'}</td>
                    <td>${startDate}</td>
                    <td>${staff.visa_status || '-'}</td>
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
    } catch (error) {
        console.error('Error fetching staff:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Error loading staff data. Please try again.</td></tr>';
    }
}

async function renderTodayShifts() {
    const tbody = document.getElementById('shiftsTableBody');

    try {
        // Fetch shifts from database API
        const response = await fetch('/api/shifts');
        if (!response.ok) {
            throw new Error('Failed to fetch shifts');
        }

        const allShifts = await response.json();
        const today = new Date().toDateString();

        // Filter for today's shifts
        const todayShifts = allShifts.filter(shift =>
            new Date(shift.clock_in).toDateString() === today
        );

        if (todayShifts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted fst-italic py-4">No shifts recorded for today.</td></tr>';
            return;
        }

        tbody.innerHTML = todayShifts.map(shift => {
            // Use database field names (first_name, last_name, staff_id, clock_in, clock_out)
            const staffName = `${shift.first_name} ${shift.last_name}`;
            const clockIn = new Date(shift.clock_in).toLocaleTimeString();
            const clockOut = shift.clock_out ? new Date(shift.clock_out).toLocaleTimeString() : '-';
            const status = shift.clock_out ? 'Completed' : 'Active';
            const statusClass = shift.clock_out ? 'status-completed' : 'status-active';

            // Use database-calculated values
            const actualPayRate = shift.hourly_rate || 0;
            const payRateDisplay = actualPayRate > 0 ? `$${actualPayRate.toFixed(2)}` : '-';

            let duration = '-';
            let totalPay = '-';

            if (shift.clock_out) {
                // Completed shift - use database duration and total_pay
                const hours = Math.floor(shift.duration || 0);
                const minutes = Math.floor(((shift.duration || 0) % 1) * 60);
                duration = `${hours}h ${minutes}m`;
                totalPay = shift.total_pay ? `$${shift.total_pay.toFixed(2)}` : '-';
            } else {
                // Active shift - calculate running duration
                const currentTime = new Date();
                const durationMs = currentTime - new Date(shift.clock_in);
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                duration = `${hours}h ${minutes}m`;

                if (actualPayRate > 0) {
                    const totalHours = durationMs / (1000 * 60 * 60);
                    totalPay = `$${(totalHours * actualPayRate).toFixed(2)} <small class="text-muted">(running)</small>`;
                }
            }

            // Determine display name for payday type
            const dayTypeDisplay = shift.payday_type || 'Weekday';

            return `
                <tr>
                    <td>${staffName}</td>
                    <td>${clockIn}</td>
                    <td>${clockOut}</td>
                    <td>${duration}</td>
                    <td>
                        <span class="badge bg-${dayTypeDisplay === 'Sunday' ? 'warning' : dayTypeDisplay === 'Saturday' ? 'info' : 'secondary'}">${dayTypeDisplay}</span>
                    </td>
                    <td>${payRateDisplay}</td>
                    <td>${totalPay}</td>
                    <td><span class="${statusClass}">${status}</span></td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading today\'s shifts:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Error loading shifts. Please refresh the page.</td></tr>';
    }
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
(async function initializePage() {
    await renderStaffTable();
    await renderTodayShifts();
    renderRosterTable();
    initializeShiftHistory();
    initializeHolidayManagement();
})();

// Refresh shifts data every 30 seconds
setInterval(async () => {
    await renderTodayShifts();
}, 30000);

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


// Print Functions
function printStaffSummary() {
    // Create a new window with just the summary content
    const printWindow = window.open('', '_blank');
    const summaryContent = document.getElementById('summaryContent').innerHTML;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Staff Summary</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css" rel="stylesheet">
            <style>
                @media print {
                    .no-print { display: none !important; }
                    body { margin: 0; }
                    .card { page-break-inside: avoid; margin-bottom: 1rem; }
                }
                body { padding: 20px; font-family: Arial, sans-serif; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: bold; color: #333; }
                .document-title { font-size: 18px; color: #666; margin-top: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">Staff Management System</div>
                <div class="document-title">Employee Information Summary</div>
                <div class="text-muted">Generated on ${new Date().toLocaleDateString()}</div>
            </div>
            <div class="container-fluid">
                ${summaryContent}
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
}

function printStaffForm() {
    // Create a comprehensive printable form
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Staff Information Form</title>
            <style>
                @media print {
                    .no-print { display: none !important; }
                    body { margin: 0; }
                    .page-break { page-break-before: always; }
                }
                body { padding: 20px; font-family: Arial, sans-serif; line-height: 1.4; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 20px; }
                .company-name { font-size: 28px; font-weight: bold; color: #333; }
                .form-title { font-size: 20px; color: #666; margin-top: 10px; }
                .section { margin-bottom: 25px; border: 1px solid #ddd; padding: 15px; }
                .section-title { font-size: 16px; font-weight: bold; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 15px; }
                .field-row { display: flex; margin-bottom: 10px; }
                .field-label { width: 200px; font-weight: bold; color: #555; }
                .field-value { flex: 1; border-bottom: 1px dotted #ccc; min-height: 20px; padding-bottom: 2px; }
                .signature-section { margin-top: 40px; }
                .signature-box { border: 1px solid #333; height: 60px; width: 300px; margin: 10px 0; }
                .date-line { border-bottom: 1px solid #333; width: 150px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">Staff Management System</div>
                <div class="form-title">Employee Information Form</div>
                <div style="color: #666; margin-top: 10px;">Generated on ${new Date().toLocaleDateString()}</div>
            </div>

            <div class="section">
                <div class="section-title">📋 Personal Information</div>
                <div class="field-row">
                    <div class="field-label">First Name:</div>
                    <div class="field-value">${wizardData.firstName || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Middle Name:</div>
                    <div class="field-value">${wizardData.middleName || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Last Name:</div>
                    <div class="field-value">${wizardData.lastName || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Date of Birth:</div>
                    <div class="field-value">${wizardData.dob || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Gender:</div>
                    <div class="field-value">${wizardData.gender || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Visa Status:</div>
                    <div class="field-value">${wizardData.visaStatus || ''}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">🏠 Contact Information</div>
                <div class="field-row">
                    <div class="field-label">Street Address:</div>
                    <div class="field-value">${wizardData.streetAddress || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Suburb:</div>
                    <div class="field-value">${wizardData.suburb || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">State:</div>
                    <div class="field-value">${wizardData.state || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Postcode:</div>
                    <div class="field-value">${wizardData.postcode || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Country:</div>
                    <div class="field-value">${wizardData.country || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Emergency Contact:</div>
                    <div class="field-value">${wizardData.emergencyContactName || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Emergency Phone:</div>
                    <div class="field-value">${wizardData.emergencyContactNumber || ''}</div>
                </div>
            </div>

            <div class="section page-break">
                <div class="section-title">💼 Employment Information</div>
                <div class="field-row">
                    <div class="field-label">Role:</div>
                    <div class="field-value">${wizardData.role || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Employment Type:</div>
                    <div class="field-value">${wizardData.employmentType || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Award Level:</div>
                    <div class="field-value">${wizardData.awardLevel || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Start Date:</div>
                    <div class="field-value">${wizardData.startDate || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Default Hours/Week:</div>
                    <div class="field-value">${wizardData.defaultHoursPerWeek || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Employment Status:</div>
                    <div class="field-value">${wizardData.status || 'Active'}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">💰 Pay Rates</div>
                <div class="field-row">
                    <div class="field-label">Weekday Rate:</div>
                    <div class="field-value">$${wizardData.weekdayRate || '0.00'} per hour</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Saturday Rate:</div>
                    <div class="field-value">$${wizardData.saturdayRate || '0.00'} per hour</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Sunday Rate:</div>
                    <div class="field-value">$${wizardData.sundayRate || '0.00'} per hour</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Public Holiday Rate:</div>
                    <div class="field-value">$${wizardData.publicHolidayRate || '0.00'} per hour</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Overtime Rate:</div>
                    <div class="field-value">$${wizardData.overtimeRate || '0.00'} per hour</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Pay Frequency:</div>
                    <div class="field-value">${wizardData.payFrequency || 'Fortnightly'}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">🏦 Banking & Compliance</div>
                <div class="field-row">
                    <div class="field-label">Tax File Number:</div>
                    <div class="field-value">${wizardData.taxRef || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Superannuation Fund:</div>
                    <div class="field-value">${wizardData.superFund || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Super Member ID:</div>
                    <div class="field-value">${wizardData.superMemberId || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Payroll Reference:</div>
                    <div class="field-value">${wizardData.payrollRef || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Bank Account Name:</div>
                    <div class="field-value">${wizardData.accountName || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">BSB:</div>
                    <div class="field-value">${wizardData.bsb || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Account Number:</div>
                    <div class="field-value">${wizardData.accountNumber || ''}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Bank Name:</div>
                    <div class="field-value">${wizardData.bankName || ''}</div>
                </div>
            </div>

            <div class="signature-section">
                <div class="section-title">✍️ Signatures & Approvals</div>
                <br>
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <div><strong>Employee Signature:</strong></div>
                        <div class="signature-box"></div>
                        <div>Date: <span class="date-line"></span></div>
                    </div>
                    <div>
                        <div><strong>Manager Approval:</strong></div>
                        <div class="signature-box"></div>
                        <div>Date: <span class="date-line"></span></div>
                    </div>
                </div>
                <br><br>
                <div style="text-align: center; color: #666; font-size: 12px;">
                    This document contains confidential employee information - Handle with care
                </div>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
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
window.printStaffSummary = printStaffSummary;
window.printStaffForm = printStaffForm;