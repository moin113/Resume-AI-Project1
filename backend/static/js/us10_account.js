// Dr. Resume US-10 Account Settings JavaScript

document.addEventListener('DOMContentLoaded', function () {
    console.log('🩺 Dr. Resume Account Settings Loaded (US-10)');

    // Check authentication
    checkAuthentication();

    // Load user info
    loadUserInfo();

    // Load account information
    loadAccountInfo();

    // Set up form handlers
    setupFormHandlers();

    // Add navigation event listeners
    addNavigationListeners();
});

async function checkAuthentication() {
    const token = localStorage.getItem('dr_resume_token');

    if (!token) {
        console.log('❌ No token found, redirecting to login');
        window.location.href = '/login';
        return;
    }

    try {
        // Verify token by calling protected endpoint
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include credentials for CORS
        });
        if (!response.ok) {
            if (response.status === 401) {
                alert('Session expired. Please log in again.');
                localStorage.removeItem('dr_resume_token');
                localStorage.removeItem('dr_resume_refresh_token');
                window.location.href = '/login';
                return;
            }
            throw new Error('Token verification failed');
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error('Invalid token response');
        }
        console.log('✅ Token verified successfully');
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        localStorage.removeItem('dr_resume_token');
        localStorage.removeItem('dr_resume_refresh_token');
        window.location.href = '/login';
    }
}

async function loadUserInfo() {
    const token = localStorage.getItem('dr_resume_token');

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include credentials for CORS
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success && result.user) {
                const user = result.user;
                document.getElementById('welcomeMessage').textContent = `Welcome, ${user.first_name}`;

                // Also update header greeting if it exists
                const headerGreeting = document.querySelector('.user-greeting');
                if (headerGreeting) {
                    headerGreeting.textContent = `Hi, ${user.first_name}!`;
                }
            }
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

async function loadAccountInfo() {
    const token = localStorage.getItem('dr_resume_token');

    try {
        const response = await fetch(`${API_BASE_URL}/api/account_info`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include credentials for CORS
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success && result.user) {
                populateAccountForm(result.user);
            }
        } else {
            showAlert('Failed to load account information', 'error');
        }
    } catch (error) {
        console.error('Error loading account info:', error);
        showAlert('Error loading account information', 'error');
    }
}

function populateAccountForm(user) {
    // Populate personal info form
    document.getElementById('firstName').value = user.first_name || '';
    document.getElementById('lastName').value = user.last_name || '';
    document.getElementById('email').value = user.email || '';

    // Populate account status
    document.getElementById('accountType').textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Basic';
    document.getElementById('memberSince').textContent = user.created_at ? formatDate(user.created_at) : '-';
    document.getElementById('lastLogin').textContent = user.last_login ? formatDate(user.last_login) : 'Never';
    document.getElementById('totalResumes').textContent = user.resume_count || 0;

    // Show upgrade section if user is basic
    if (user.role === 'basic') {
        document.getElementById('upgradeSection').style.display = 'block';
    }
}

function setupFormHandlers() {
    // Personal info form
    document.getElementById('personalInfoForm').addEventListener('submit', handlePersonalInfoUpdate);

    // Password form
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);

    // Delete form
    document.getElementById('deleteForm').addEventListener('submit', function (e) {
        e.preventDefault();
        deleteAccount();
    });

    // Add input validation
    addInputValidation();
}

function addInputValidation() {
    // Real-time password validation
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', validatePassword);
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }

    // Email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('input', validateEmail);
    }
}

function validatePassword() {
    const password = document.getElementById('newPassword').value;
    const helpText = document.querySelector('#newPassword + .form-help');

    if (!helpText) return;

    if (password.length < 8) {
        helpText.style.color = '#ef4444';
        helpText.textContent = 'Password must be at least 8 characters long';
    } else if (!/[A-Z]/.test(password)) {
        helpText.style.color = '#ef4444';
        helpText.textContent = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(password)) {
        helpText.style.color = '#ef4444';
        helpText.textContent = 'Password must contain at least one lowercase letter';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        helpText.style.color = '#ef4444';
        helpText.textContent = 'Password must contain at least one special character';
    } else {
        helpText.style.color = '#10b981';
        helpText.textContent = 'Strong password ✓';
    }
}

function validatePasswordMatch() {
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmInput = document.getElementById('confirmPassword');

    if (confirmPassword && password !== confirmPassword) {
        confirmInput.style.borderColor = '#ef4444';
        showFieldError(confirmInput, 'Passwords do not match');
    } else if (confirmPassword) {
        confirmInput.style.borderColor = '#10b981';
        clearFieldError(confirmInput);
    }
}

function validateEmail() {
    const email = document.getElementById('email').value;
    const emailInput = document.getElementById('email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email && !emailRegex.test(email)) {
        emailInput.style.borderColor = '#ef4444';
        showFieldError(emailInput, 'Please enter a valid email address');
    } else if (email) {
        emailInput.style.borderColor = '#10b981';
        clearFieldError(emailInput);
    }
}

function showFieldError(input, message) {
    clearFieldError(input);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.color = '#ef4444';
    errorDiv.style.fontSize = '0.8rem';
    errorDiv.style.marginTop = '4px';
    errorDiv.textContent = message;
    input.parentNode.appendChild(errorDiv);
}

function clearFieldError(input) {
    const existingError = input.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

function resetButton(button, originalText) {
    button.disabled = false;
    button.innerHTML = originalText;
}

function showLoadingButton(button, loadingText = 'Loading...') {
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span> ${loadingText}`;
}

async function handlePersonalInfoUpdate(event) {
    event.preventDefault();

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;

    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner"></span> Saving...';

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    // Validate required fields
    if (!data.first_name || !data.last_name || !data.email) {
        showAlert('Please fill in all required fields', 'error');
        resetButton(submitButton, originalText);
        return;
    }

    // Remove empty current_password if no email change
    const originalEmail = document.getElementById('email').defaultValue;
    if (data.email === originalEmail && !data.current_password) {
        delete data.current_password;
    }

    const token = localStorage.getItem('dr_resume_token');

    try {
        const response = await fetch(`${API_BASE_URL}/api/update_account`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Account information updated successfully!', 'success');
            // Clear password field
            document.getElementById('currentPasswordInfo').value = '';
            // Reload account info
            loadAccountInfo();
        } else {
            showAlert(result.message || 'Failed to update account information', 'error');
        }

    } catch (error) {
        console.error('Error updating account:', error);
        showAlert('Error updating account information', 'error');
    }
}

async function handlePasswordChange(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    // Validate password confirmation
    if (data.new_password !== data.confirm_password) {
        showAlert('New password and confirmation do not match', 'error');
        return;
    }

    const token = localStorage.getItem('dr_resume_token');

    try {
        const response = await fetch(`${API_BASE_URL}/api/change_password`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include' // Include credentials for CORS
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Password changed successfully!', 'success');
            // Clear form
            document.getElementById('passwordForm').reset();
        } else {
            showAlert(result.message || 'Failed to change password', 'error');
        }

    } catch (error) {
        console.error('Error changing password:', error);
        showAlert('Error changing password', 'error');
    }
}

function resetPersonalInfo() {
    loadAccountInfo(); // Reload original values
    document.getElementById('currentPasswordInfo').value = '';
}

function resetPasswordForm() {
    document.getElementById('passwordForm').reset();
}

function showDeleteConfirmation() {
    document.getElementById('deleteModal').style.display = 'flex';
}

function hideDeleteConfirmation() {
    document.getElementById('deleteModal').style.display = 'none';
    document.getElementById('deleteForm').reset();
}

async function deleteAccount() {
    const password = document.getElementById('deletePassword').value;
    const confirmDeletion = document.getElementById('confirmDeletion').checked;

    if (!password) {
        showAlert('Password is required', 'error');
        return;
    }

    if (!confirmDeletion) {
        showAlert('Please confirm that you understand this action cannot be undone', 'error');
        return;
    }

    const token = localStorage.getItem('dr_resume_token');

    try {
        const response = await fetch(`${API_BASE_URL}/api/delete_account`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: password,
                confirm_deletion: confirmDeletion
            }),
            credentials: 'include' // Include credentials for CORS
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Account has been deactivated. You will be logged out.', 'success');
            setTimeout(() => {
                logout();
            }, 2000);
        } else {
            showAlert(result.message || 'Failed to delete account', 'error');
        }

    } catch (error) {
        console.error('Error deleting account:', error);
        showAlert('Error deleting account', 'error');
    }
}

function upgradeToPremium() {
    showAlert('Premium upgrade feature coming soon!', 'info');
}

function logout() {
    localStorage.removeItem('dr_resume_token');
    localStorage.removeItem('dr_resume_refresh_token');
    window.location.href = '/login';
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    alertContainer.appendChild(alertDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function addNavigationListeners() {
    // Navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();

            // Get the href attribute to determine navigation
            const href = this.getAttribute('href');

            // Handle navigation based on href
            if (href) {
                console.log('Navigation clicked:', this.textContent, 'href:', href);

                // Navigate to the appropriate page
                if (href.includes('history') || href === '/history') {
                    window.location.href = '/history';
                } else if (href.includes('account') || href === '/account') {
                    window.location.href = '/account';
                } else if (href.includes('dashboard') || href === '/dashboard') {
                    window.location.href = '/dashboard';
                } else {
                    // For any other links, navigate directly
                    window.location.href = href;
                }
            }
        });
    });
}
