// Ensure API_BASE_URL is defined (fallback if config.js fails)
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = window.location.origin;
}

// Global analysis engine variable
let analysisEngine;

document.addEventListener('DOMContentLoaded', function () {
    console.log('🤖 Resume Doctor.Ai Dashboard Loaded v3.1');

    // Initialize Analysis Engine safely
    try {
        if (typeof TextAnalysisEngine !== 'undefined') {
            analysisEngine = new TextAnalysisEngine();
            console.log('✅ TextAnalysisEngine initialized');
        } else {
            console.error('❌ TextAnalysisEngine class not found');
        }
    } catch (e) {
        console.error('❌ Error initializing TextAnalysisEngine:', e);
    }

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
                            <span class="match-score">${Math.round(scan.overall_match_score || scan.score)}%</span>
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

// ------------------------------------------------------------------
// Resume Upload & Extraction
// ------------------------------------------------------------------

function triggerFileUpload() {
    document.getElementById('resume-file').click();
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('dr_resume_token');
    showNotification('Uploading and extracting resume text...', 'info');

    // Add visual loading state
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) uploadArea.style.opacity = '0.5';

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('title', file.name);

    try {
        const response = await fetch(`${API_BASE_URL}/api/upload_resume`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            // Update UI
            const uploadContent = document.getElementById('upload-content');
            const uploadedFileDisplay = document.getElementById('uploaded-file-display');
            const fileNameCenterEl = document.getElementById('uploaded-file-name-center');
            const resumeTextarea = document.getElementById('resume-text');

            if (uploadContent && uploadedFileDisplay) {
                uploadContent.style.display = 'none';
                uploadedFileDisplay.style.display = 'flex';
                fileNameCenterEl.textContent = file.name;
            }

            if (resumeTextarea && data.resume && data.resume.extracted_text) {
                resumeTextarea.value = data.resume.extracted_text;
                // Trigger input event to update validation and real-time analysis
                resumeTextarea.dispatchEvent(new Event('input'));
            }

            // Store resume ID for later use
            window.lastUploadedResumeId = data.resume.id;

            showNotification('Resume extracted successfully!', 'success');
        } else {
            showNotification(data.message || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('Error uploading resume:', error);
        showNotification('Error uploading resume', 'error');
    } finally {
        if (uploadArea) uploadArea.style.opacity = '1';
    }
}

// ------------------------------------------------------------------
// Job Description Upload & Saving
// ------------------------------------------------------------------

function triggerJobFileUpload() {
    document.getElementById('job-file-input').click();
}

async function handleJobFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('dr_resume_token');
    showNotification('Extracting job description text...', 'info');

    const jobUploadArea = document.getElementById('job-upload-area');
    if (jobUploadArea) jobUploadArea.style.opacity = '0.5';

    const formData = new FormData();
    formData.append('job_file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/api/extract_job_text`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            // Update UI
            const jobUploadContent = document.getElementById('job-upload-content');
            const jobFileDisplay = document.getElementById('job-file-display');
            const jobFileNameEl = document.getElementById('job-file-name');
            const jobTextarea = document.getElementById('job-description');

            if (jobUploadContent && jobFileDisplay) {
                jobUploadContent.style.display = 'none';
                jobFileDisplay.style.display = 'flex';
                jobFileNameEl.textContent = file.name;
            }

            if (jobTextarea && data.extracted_text) {
                jobTextarea.value = data.extracted_text;
                handleJobDescriptionInput();
                // Trigger input event to update validation and real-time analysis
                jobTextarea.dispatchEvent(new Event('input'));
            }

            showNotification('Job description extracted!', 'success');
        } else {
            showNotification(data.message || 'Extraction failed', 'error');
        }
    } catch (error) {
        console.error('Error extracting job text:', error);
        showNotification('Error extracting job text', 'error');
    } finally {
        if (jobUploadArea) jobUploadArea.style.opacity = '1';
    }
}

async function saveJobDescription() {
    const jobText = document.getElementById('job-description').value.trim();
    if (!jobText) {
        showNotification('Please provide a job description first.', 'error');
        return;
    }

    const token = localStorage.getItem('dr_resume_token');
    showNotification('Saving job description...', 'info');

    try {
        const response = await fetch(`${API_BASE_URL}/api/jd`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Job Description ' + new Date().toLocaleDateString(),
                job_text: jobText
            })
        });

        const data = await response.json();
        if (data.success) {
            window.lastSavedJobId = data.job_description.id;
            showNotification('Job description saved!', 'success');

            // Highlight the Save button state
            const saveBtn = document.getElementById('save-job-btn');
            if (saveBtn) {
                saveBtn.textContent = 'Saved ✓';
                saveBtn.style.backgroundColor = '#10b981';
                setTimeout(() => {
                    saveBtn.textContent = 'Save Job Description';
                    saveBtn.style.backgroundColor = '';
                }, 3000);
            }
        } else {
            showNotification(data.message || 'Save failed', 'error');
        }
    } catch (error) {
        console.error('Error saving JD:', error);
        showNotification('Error saving job description', 'error');
    }
}

function handleJobDescriptionInput() {
    const textarea = document.getElementById('job-description');
    const wordCount = document.getElementById('job-word-count');
    const statusDiv = document.getElementById('job-status');

    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;

    if (wordCount) wordCount.textContent = `${words} words`;

    if (statusDiv) {
        statusDiv.style.display = text.length > 50 ? 'flex' : 'none';
    }

    // Real-time analysis call
    debounceRealTimeAnalysis();
}

// Debounce helper to prevent excessive analysis calls
let analysisTimeout;
function debounceRealTimeAnalysis() {
    clearTimeout(analysisTimeout);
    analysisTimeout = setTimeout(() => {
        performRealTimeAnalysis();
    }, 500);
}

function performRealTimeAnalysis() {
    const resumeText = document.getElementById('resume-text').value.trim();
    const jobText = document.getElementById('job-description').value.trim();
    const feedbackDiv = document.getElementById('real-time-feedback');

    if (!resumeText || !jobText || jobText.length < 50) {
        if (feedbackDiv) feedbackDiv.style.display = 'none';
        return;
    }

    if (!analysisEngine) {
        console.warn('⚠️ Analysis engine not ready');
        return;
    }

    const results = analysisEngine.analyzeTexts(resumeText, jobText);

    // Update live feedback UI
    if (feedbackDiv) {
        feedbackDiv.style.display = 'block';

        // 1. Score & Badge
        const scoreEl = document.getElementById('live-score');
        const badgeEl = document.getElementById('match-quality-badge');
        const score = results.matchRate;

        scoreEl.textContent = `${score}%`;

        if (score >= 80) {
            scoreEl.style.color = '#10b981';
            badgeEl.textContent = 'Excellent Match';
            badgeEl.className = 'badge badge-high';
        } else if (score >= 60) {
            scoreEl.style.color = '#fbbf24';
            badgeEl.textContent = 'Good Match';
            badgeEl.className = 'badge badge-mid';
        } else {
            scoreEl.style.color = '#ef4444';
            badgeEl.textContent = 'Needs Work';
            badgeEl.className = 'badge badge-low';
        }

        // 2. Technical & Soft Stats
        const techMatches = results.skillComparison.technical.matched.length;
        const techMissing = results.skillComparison.technical.missing.length;
        const techTotal = techMatches + techMissing;
        const techPerc = techTotal > 0 ? (techMatches / techTotal) * 100 : 0;

        document.getElementById('live-tech-matches').textContent = techMatches;
        document.getElementById('tech-progress').style.width = `${techPerc}%`;

        const softMatches = results.skillComparison.soft.matched.length;
        const softMissing = results.skillComparison.soft.missing.length;
        const softTotal = softMatches + softMissing;
        const softPerc = softTotal > 0 ? (softMatches / softTotal) * 100 : 0;

        document.getElementById('live-soft-matches').textContent = softMatches;
        document.getElementById('soft-progress').style.width = `${softPerc}%`;

        // 3. Missing Keywords (Tags)
        const missingContainer = document.getElementById('live-missing-keywords');
        missingContainer.innerHTML = '';

        const topMissing = results.skillComparison.technical.missing.slice(0, 6);
        if (topMissing.length > 0) {
            topMissing.forEach(item => {
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.textContent = `+ ${item.skill}`;
                missingContainer.appendChild(tag);
            });
        } else {
            missingContainer.innerHTML = '<span class="sub-label">Perfect! No crucial technical keywords missing.</span>';
        }

        // 4. Quick Tip
        const tipEl = document.getElementById('live-ai-tip');
        if (results.recruiterTips && results.recruiterTips.length > 0) {
            tipEl.textContent = results.recruiterTips[0];
        } else {
            tipEl.textContent = "Your resume is looking good! Try to include more specific metrics for even better results.";
        }
    }
}

// ------------------------------------------------------------------
// Scan Logic
// ------------------------------------------------------------------

function performScan() {
    const resumeText = document.getElementById('resume-text').value.trim();
    const jobDescription = document.getElementById('job-description').value.trim();
    const resumeFile = document.getElementById('resume-file').files[0];
    const scanBtn = document.querySelector('.scan-btn');

    if ((!resumeText && !resumeFile) || !jobDescription) {
        showNotification('Please provide both resume and job description.', 'error');
        return;
    }

    const token = localStorage.getItem('dr_resume_token');
    showNotification('Starting real-time AI scan...', 'info');

    // UI feedback for processing
    if (scanBtn) {
        scanBtn.disabled = true;
        scanBtn.textContent = 'Scanning...';
        scanBtn.style.opacity = '0.7';
    }

    // Prepare payload
    const payload = {
        resume_text: resumeText,
        job_description_text: jobDescription
    };

    // If we have IDs from previous uploads in this session, provide them
    if (window.lastUploadedResumeId) payload.resume_id = window.lastUploadedResumeId;
    if (window.lastSavedJobId) payload.job_description_id = window.lastSavedJobId;

    fetch(`${API_BASE_URL}/api/scan`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (response.status === 403) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Free limit exceeded');
                });
            }
            if (!response.ok) throw new Error('Server error during scan');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showNotification('Scan completed!', 'success');
                setTimeout(() => {
                    window.location.href = `/results?scan_id=${data.scan_id}`;
                }, 1000);
            } else {
                showNotification(data.message || 'Scan failed', 'error');
                if (data.message && data.message.includes('limit exceeded')) {
                    showUpgradeModal();
                }
            }
        })
        .catch(error => {
            console.error('Scan error:', error);
            showNotification(error.message || 'Error performing scan', 'error');
            if (error.message.includes('limit exceeded')) showUpgradeModal();
        })
        .finally(() => {
            if (scanBtn) {
                scanBtn.disabled = false;
                scanBtn.textContent = 'Scan';
                scanBtn.style.opacity = '1';
                validateScanInputs();
            }
        });
}

function validateScanInputs() {
    const resumeText = document.getElementById('resume-text')?.value.trim();
    const jobDescription = document.getElementById('job-description')?.value.trim();
    const resumeFile = document.getElementById('resume-file')?.files[0];
    const scanBtn = document.querySelector('.scan-btn');

    if (scanBtn) {
        const isValid = (resumeText || resumeFile) && jobDescription && jobDescription.length > 20;
        scanBtn.disabled = !isValid;
        scanBtn.style.opacity = isValid ? '1' : '0.5';
        scanBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
}

// ------------------------------------------------------------------
// UI & Events
// ------------------------------------------------------------------

function addEventListeners() {
    // Input listeners for validation & real-time analysis
    document.getElementById('resume-text')?.addEventListener('input', () => {
        validateScanInputs();
        debounceRealTimeAnalysis();
    });

    document.getElementById('job-description')?.addEventListener('input', () => {
        handleJobDescriptionInput();
        validateScanInputs();
    });

    // File inputs
    document.getElementById('resume-file')?.addEventListener('change', handleFileSelect);
    document.getElementById('job-file-input')?.addEventListener('change', handleJobFileSelect);

    // Logout
    document.querySelector('.logout-btn')?.addEventListener('click', handleLogout);
}

function handleLogout() {
    localStorage.removeItem('dr_resume_token');
    localStorage.removeItem('dr_resume_user');
    window.location.href = '/login';
}

function showNotification(message, type) {
    console.log(`[${type}] ${message}`);

    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(el => el.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Styling
    Object.assign(notification.style, {
        position: 'fixed', bottom: '20px', right: '20px', padding: '12px 24px',
        borderRadius: '8px', color: 'white', zIndex: '9999', fontWeight: '500',
        backgroundColor: type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        animation: 'slideIn 0.3s ease-out'
    });

    // Add keyframes if not present
    if (!document.getElementById('notif-styles')) {
        const style = document.createElement('style');
        style.id = 'notif-styles';
        style.innerHTML = `@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'all 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

let powerEditEnabled = false;
function togglePowerEdit() {
    powerEditEnabled = !powerEditEnabled;
    const body = document.body;
    const btn = document.querySelector('.power-edit-btn');

    if (powerEditEnabled) {
        body.classList.add('power-edit-active');
        btn.innerHTML = '<span class="power-icon">⚡</span> Exit Power Edit';
        btn.style.background = '#fbbf24';
        btn.style.color = '#1f2937';
        showNotification('Power Edit Mode Active: Focus on content optimization!', 'success');
    } else {
        body.classList.remove('power-edit-active');
        btn.innerHTML = '<span class="power-icon">⚡</span> Power Edit';
        btn.style.background = '';
        btn.style.color = '';
    }
}

function showUpgradeModal() {
    const proSection = document.getElementById('pro-plans-section');
    if (proSection) {
        proSection.style.display = 'block';
        proSection.scrollIntoView({ behavior: 'smooth' });
        showNotification('Please upgrade to Pro for unlimited scans!', 'info');
    }
}

function handleAuthError() {
    localStorage.removeItem('dr_resume_token');
    window.location.href = '/login';
}

// Global Exports for HTML onclicks
window.performScan = performScan;
window.triggerFileUpload = triggerFileUpload;
window.handleFileSelect = handleFileSelect;
window.triggerJobFileUpload = triggerJobFileUpload;
window.handleJobFileSelect = handleJobFileSelect;
window.saveJobDescription = saveJobDescription;
window.handleJobDescriptionInput = handleJobDescriptionInput;
window.handleLogout = handleLogout;
window.showUpgradeModal = showUpgradeModal;
window.togglePowerEdit = togglePowerEdit;