// Resume Doctor.Ai - Clean Dashboard JavaScript
// Version: 2.0 (Clean - No Dummy Data)

const API_BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', function () {
    console.log('🤖 Resume Doctor.Ai Dashboard Loaded');

    // Check authentication
    const token = localStorage.getItem('dr_resume_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Initialize Dashboard
    initializeDashboard();

    // Add Event Listeners
    addEventListeners();

    // Initial validation
    validateScanInputs();
});

async function initializeDashboard() {
    // 1. Verify token and get real user data
    await verifyToken();

    // 2. Load dashboard summary & scan status
    loadDashboardSummary();
    loadScanStatus();

    // 3. Load recent scans
    loadRecentScansList();
}

async function verifyToken() {
    const token = localStorage.getItem('dr_resume_token');
    try {
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            handleAuthError();
            return;
        }

        const data = await response.json();
        if (data.success && data.user) {
            updateUserGreeting(data.user);
            localStorage.setItem('dr_resume_user', JSON.stringify(data.user));
        }
    } catch (error) {
        console.error('❌ Token verification error:', error);
    }
}

function updateUserGreeting(user) {
    const greetingElement = document.querySelector('.user-greeting');
    const welcomeTitle = document.querySelector('.welcome-title');
    const firstName = user.first_name || 'User';

    if (greetingElement) greetingElement.textContent = `Hi, ${firstName}!`;
    if (welcomeTitle) welcomeTitle.textContent = `Welcome, ${firstName}`;
}

async function loadDashboardSummary() {
    const token = localStorage.getItem('dr_resume_token');
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            updateStatCard(0, data.total_scans || 0);
            updateStatCard(1, data.average_score || 0);
            updateStatCard(2, data.last_scan_score || 0);
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

function updateStatCard(index, value) {
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards[index]) {
        const numberElement = statCards[index].querySelector('.stat-number');
        if (numberElement) numberElement.textContent = value;
    }
}

async function loadScanStatus() {
    const token = localStorage.getItem('dr_resume_token');
    try {
        const response = await fetch(`${API_BASE_URL}/api/scan_status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            displayScanStatus(data.scan_status);
        }
    } catch (error) {
        console.error('Error loading scan status:', error);
    }
}

function displayScanStatus(scanStatus) {
    const scanCountElement = document.getElementById('scan-count');
    if (scanCountElement) {
        scanCountElement.textContent = scanStatus.is_premium ? 'Unlimited' : scanStatus.free_scans_remaining;
    }
}

async function loadRecentScansList() {
    const token = localStorage.getItem('dr_resume_token');
    const listContainer = document.getElementById('recent-scans-list');
    if (!listContainer) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/scans`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.success && data.scans && data.scans.length > 0) {
            listContainer.innerHTML = '';
            data.scans.slice(0, 3).forEach(scan => {
                const card = `
                    <div class="scan-card">
                        <div class="scan-header">
                            <span class="file-name">${scan.resume_title || 'Resume'}</span>
                            <span class="match-score">${scan.score}%</span>
                        </div>
                        <div class="scan-meta">
                            <span>JD: ${scan.job_title || 'N/A'}</span>
                            <span>Date: ${new Date(scan.created_at).toLocaleDateString()}</span>
                        </div>
                        <button class="view-btn" onclick="window.location.href='/results?scan_id=${scan.id}'">View Details</button>
                    </div>
                `;
                listContainer.insertAdjacentHTML('beforeend', card);
            });
        }
    } catch (error) {
        console.error('Error loading scans:', error);
    }
}

// Perform Scan Logic
function performScan() {
    const resumeText = document.getElementById('resume-text').value.trim();
    const jobDescription = document.getElementById('job-description').value.trim();
    const resumeFile = document.getElementById('resume-file').files[0];

    // NO SAMPLE DATA FALLBACK
    if ((!resumeText && !resumeFile) || !jobDescription) {
        showNotification('Please provide both resume and job description.', 'error');
        return;
    }

    const token = localStorage.getItem('dr_resume_token');
    showNotification('Starting scan...', 'info');

    // Actually perform the scan
    fetch(`${API_BASE_URL}/api/scan`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            resume_text: resumeText,
            job_description_text: jobDescription
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Scan completed!', 'success');
                setTimeout(() => {
                    window.location.href = `/results?scan_id=${data.scan_id}`;
                }, 1000);
            } else {
                showNotification(data.message || 'Scan failed', 'error');
            }
        })
        .catch(error => {
            showNotification('Error performing scan', 'error');
        });
}

// File Upload Handlers
function triggerFileUpload() {
    document.getElementById('resume-file').click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const uploadContent = document.getElementById('upload-content');
        const uploadedFileDisplay = document.getElementById('uploaded-file-display');
        const fileNameCenterEl = document.getElementById('uploaded-file-name-center');

        if (uploadContent && uploadedFileDisplay) {
            uploadContent.style.display = 'none';
            uploadedFileDisplay.style.display = 'flex';
            fileNameCenterEl.textContent = file.name;
        }
        showNotification(`File "${file.name}" selected.`, 'success');
    }
}

function handleJobDescriptionInput() {
    const textarea = document.getElementById('job-description');
    const wordCount = document.getElementById('job-word-count');
    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    if (wordCount) wordCount.textContent = `${words} words`;
}

function validateScanInputs() {
    const resumeText = document.getElementById('resume-text')?.value.trim();
    const jobDescription = document.getElementById('job-description')?.value.trim();
    const resumeFile = document.getElementById('resume-file')?.files[0];
    const scanBtn = document.querySelector('.scan-btn');

    if (scanBtn) {
        const isValid = (resumeText || resumeFile) && jobDescription;
        scanBtn.disabled = !isValid;
        scanBtn.style.opacity = isValid ? '1' : '0.5';
        scanBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
}

// Misc
function addEventListeners() {
    // Input listeners for validation
    document.getElementById('resume-text')?.addEventListener('input', validateScanInputs);
    document.getElementById('job-description')?.addEventListener('input', () => {
        handleJobDescriptionInput();
        validateScanInputs();
    });
    document.getElementById('resume-file')?.addEventListener('change', () => {
        handleFileSelect(event);
        validateScanInputs();
    });

    // Navigation
    document.querySelector('.logout-btn')?.addEventListener('click', handleLogout);
}

function handleLogout() {
    localStorage.removeItem('dr_resume_token');
    localStorage.removeItem('dr_resume_user');
    window.location.href = '/login';
}

function showNotification(message, type) {
    console.log(`[${type}] ${message}`);
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Styling
    Object.assign(notification.style, {
        position: 'fixed', bottom: '20px', right: '20px', padding: '12px 24px',
        borderRadius: '8px', color: 'white', zIndex: '9999', fontWeight: '500',
        backgroundColor: type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'
    });

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function handleAuthError() {
    localStorage.removeItem('dr_resume_token');
    window.location.href = '/login';
}

// Global Exports
window.performScan = performScan;
window.triggerFileUpload = triggerFileUpload;
window.handleFileSelect = handleFileSelect;
window.handleJobDescriptionInput = handleJobDescriptionInput;
window.handleLogout = handleLogout;