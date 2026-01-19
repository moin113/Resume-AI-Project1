// Resume Doctor.Ai US-04 Registration JavaScript (same as US-03)

document.addEventListener('DOMContentLoaded', function () {
    console.log('🤖 Resume Doctor.Ai Registration Page Loaded (US-04)');

    const form = document.getElementById('registerForm');
    const submitBtn = document.getElementById('submitBtn');
    const alertContainer = document.getElementById('alertContainer');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        clearAlerts();

        const formData = new FormData(form);
        const data = {
            first_name: formData.get('first_name').trim(),
            last_name: formData.get('last_name').trim(),
            email: formData.get('email').trim(),
            password: formData.get('password'),
            confirm_password: formData.get('confirm_password')
        };

        const validationErrors = validateForm(data);
        if (validationErrors.length > 0) {
            showAlert('error', 'Please fix the following errors:', validationErrors);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include' // Include credentials for CORS
            });

            const result = await response.json();

            if (result.success) {
                showAlert('success', result.message);
                form.reset();
                setTimeout(() => { window.location.href = '/login'; }, 2000);
            } else {
                if (result.errors && result.errors.length > 0) {
                    showAlert('error', result.message, result.errors);
                } else {
                    showAlert('error', result.message);
                }
            }

        } catch (error) {
            console.error('Registration error:', error);
            showAlert('error', 'Network error. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    });

    const emailInput = document.getElementById('email');
    emailInput.addEventListener('blur', async function () {
        const email = this.value.trim();
        if (email && isValidEmail(email)) {
            await checkEmailExists(email);
        }
    });

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Real-time password validation
    passwordInput.addEventListener('input', function () {
        validatePasswordStrength(this.value);
    });

    confirmPasswordInput.addEventListener('input', function () {
        const password = passwordInput.value;
        const confirmPassword = this.value;

        if (confirmPassword && password !== confirmPassword) {
            this.style.borderColor = '#ef4444';
        } else {
            this.style.borderColor = '#e5e7eb';
        }
    });
});

function validateForm(data) {
    const errors = [];

    if (!data.first_name) errors.push('First name is required');
    if (!data.last_name) errors.push('Last name is required');
    if (!data.email) errors.push('Email is required');
    if (!data.password) errors.push('Password is required');
    if (!data.confirm_password) errors.push('Password confirmation is required');

    if (data.email && !isValidEmail(data.email)) {
        errors.push('Please enter a valid email address');
    }

    if (data.password && data.password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (data.password) {
        // Check for uppercase letter
        if (!/[A-Z]/.test(data.password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        // Check for lowercase letter
        if (!/[a-z]/.test(data.password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        // Check for special character
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
            errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
        }
    }

    if (data.password && data.confirm_password && data.password !== data.confirm_password) {
        errors.push('Passwords do not match');
    }

    return errors;
}

function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

async function checkEmailExists(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/check-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
            credentials: 'include' // Include credentials for CORS
        });

        const result = await response.json();

        if (result.success && result.exists) {
            showAlert('warning', 'This email is already registered. Please use a different email or sign in.');
        }

    } catch (error) {
        console.error('Email check error:', error);
    }
}

function showAlert(type, message, errors = []) {
    const alertContainer = document.getElementById('alertContainer');

    let alertHTML = `<div class="alert alert-${type}">`;
    alertHTML += `<strong>${message}</strong>`;

    if (errors.length > 0) {
        alertHTML += '<ul style="margin: 8px 0 0 20px;">';
        errors.forEach(error => {
            alertHTML += `<li>${error}</li>`;
        });
        alertHTML += '</ul>';
    }

    alertHTML += '</div>';

    alertContainer.innerHTML = alertHTML;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearAlerts() {
    document.getElementById('alertContainer').innerHTML = '';
}

function validatePasswordStrength(password) {
    const passwordInput = document.getElementById('password');

    // Remove any existing validation styling
    passwordInput.style.borderColor = '#e5e7eb';

    // Create or find help text element
    let helpText = document.querySelector('#password + .form-help');
    if (!helpText) {
        helpText = document.createElement('div');
        helpText.className = 'form-help';
        helpText.style.fontSize = '0.875rem';
        helpText.style.marginTop = '0.25rem';
        passwordInput.parentNode.insertBefore(helpText, passwordInput.nextSibling);
    }

    if (!password) {
        helpText.textContent = '';
        return;
    }

    if (password.length < 8) {
        helpText.style.color = '#ef4444';
        helpText.textContent = 'Password must be at least 8 characters long';
        passwordInput.style.borderColor = '#ef4444';
    } else if (!/[A-Z]/.test(password)) {
        helpText.style.color = '#ef4444';
        helpText.textContent = 'Password must contain at least one uppercase letter';
        passwordInput.style.borderColor = '#ef4444';
    } else if (!/[a-z]/.test(password)) {
        helpText.style.color = '#ef4444';
        helpText.textContent = 'Password must contain at least one lowercase letter';
        passwordInput.style.borderColor = '#ef4444';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        helpText.style.color = '#ef4444';
        helpText.textContent = 'Password must contain at least one special character';
        passwordInput.style.borderColor = '#ef4444';
    } else {
        helpText.style.color = '#10b981';
        helpText.textContent = 'Strong password ✓';
        passwordInput.style.borderColor = '#10b981';
    }
}

function setLoading(loading) {
    const submitBtn = document.getElementById('submitBtn');

    if (loading) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Creating Account...';
    } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Create Account';
    }
}
