// Resume Doctor.Ai - Clean Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function () {
    console.log('🤖 Resume Doctor.Ai Dashboard Loaded - Version 1.1');
    console.log('🔧 All fixes applied: scan count, textarea height, file upload, sample scan, documentation');

    // Check authentication
    const token = localStorage.getItem('dr_resume_token');
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        window.location.href = '/login';
        return;
    }

    // Verify token is valid by making a test API call
    verifyTokenAndProceed();

    // Load dashboard summary (Phase 7.3)
    loadDashboardSummary();

    // Add event listeners
    addEventListeners();
});

async function verifyTokenAndProceed() {
    const token = localStorage.getItem('dr_resume_token');

    if (!token) {
        console.log('❌ No token found, redirecting to login');
        window.location.href = '/login';
        return;
    }

    try {
        // Verify token and get real user data
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
            console.log('✅ User verified:', data.user.email);
            updateUserGreeting(data.user);
            localStorage.setItem('dr_resume_user', JSON.stringify(data.user));

            // Re-initialize other components with real data
            initializeDashboard();
        }
    } catch (error) {
        console.error('❌ Token verification error:', error);
    }
}

function updateUserGreeting(user) {
    const greetingElement = document.querySelector('.user-greeting');
    const welcomeTitle = document.querySelector('.welcome-title');
    const firstName = user.first_name || 'User';

    if (greetingElement) {
        greetingElement.textContent = `Hi, ${firstName}!`;
    }

    if (welcomeTitle) {
        welcomeTitle.textContent = `Welcome, ${firstName}`;
    }
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

        if (response.status === 401) {
            handleAuthError();
            return;
        }

        const data = await response.json();
        if (data.success) {
            // Update stats cards
            updateStatCard(0, data.total_scans || 0);
            updateStatCard(1, data.average_score || 0);
            updateStatCard(2, data.last_scan_score || 0);

            // Update scan count/balance (Phase 6.6)
            displayScanStatus(data.scan_balance);
        }
    } catch (error) {
        console.error('Error loading dashboard summary:', error);
    }
}

function handleAuthError() {
    console.log('❌ Auth error, redirecting to login');
    localStorage.removeItem('dr_resume_token');
    localStorage.removeItem('dr_resume_user');
    window.location.href = '/login';
}

function clearTokens() {
    localStorage.removeItem('dr_resume_token');
    localStorage.removeItem('dr_resume_refresh_token');
    localStorage.removeItem('dr_resume_user');
}

function initializeDashboard() {
    console.log('✅ Dashboard initialized');

    // Load user data
    const userData = JSON.parse(localStorage.getItem('dr_resume_user') || '{}');
    updateUserGreeting(userData);

    // Initialize scan count
    initializeScanCount();

    // Load recent scan history (Phase 7.1)
    loadRecentScansList();

    // Load last used resume if available
    loadLastUsedResume();

    // Hide pro plans section initially
    const proPlansSection = document.getElementById('pro-plans-section');
    if (proPlansSection) {
        proPlansSection.style.display = 'none';
    }
}

// Initialize scan count - now handled by server
function initializeScanCount() {
    console.log('🔧 initializeScanCount() called - using server-based tracking');
    // Scan count is now managed by the server via loadScanStatus()
    // Remove any old localStorage scan tracking
    localStorage.removeItem('dr_resume_scan_count');
    console.log('✅ Removed old localStorage scan tracking');
}

// Debug function to reload scan status from server
function debugResetScanCount() {
    console.log('🔧 Debug: Reloading scan status from server');
    loadScanStatus();
}

// Make debug function available globally
window.debugResetScanCount = debugResetScanCount;

// Load last used resume on page load
function loadLastUsedResume() {
    const lastUsedResumeId = localStorage.getItem('last_used_resume_id');
    if (!lastUsedResumeId) {
        console.log('📝 No last used resume found');
        return;
    }

    const token = localStorage.getItem('dr_resume_token');

    fetch(`${API_BASE_URL}/api/resumes/${lastUsedResumeId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.resume) {
                // Populate the resume textarea with extracted text
                const resumeTextarea = document.getElementById('resume-text');
                if (resumeTextarea && data.resume.extracted_text) {
                    resumeTextarea.value = data.resume.extracted_text;
                }

                // Update the uploaded file display
                updateUploadedFileDisplay(data.resume.original_filename || data.resume.title || 'Last Used Resume');

                console.log(`📝 Loaded last used resume: ${data.resume.title || 'Untitled Resume'}`);
            } else {
                // Resume not found, clear the stored ID
                localStorage.removeItem('last_used_resume_id');
            }
        })
        .catch(error => {
            console.error('Error loading last used resume:', error);
            // Clear the stored ID if there's an error
            localStorage.removeItem('last_used_resume_id');
        });
}

// File upload handlers
function triggerFileUpload() {
    // Reset the upload display when triggering new upload
    const uploadContent = document.getElementById('upload-content');
    const uploadedFileDisplay = document.getElementById('uploaded-file-display');

    if (uploadContent && uploadedFileDisplay) {
        uploadContent.style.display = 'flex';
        uploadedFileDisplay.style.display = 'none';
    }

    // Clear the file input to allow selecting the same file again
    const fileInput = document.getElementById('resume-file');
    if (fileInput) {
        fileInput.value = '';
    }

    document.getElementById('resume-file').click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('File selected:', file.name);

        // Show uploaded file info in center
        const uploadContent = document.getElementById('upload-content');
        const uploadedFileDisplay = document.getElementById('uploaded-file-display');
        const fileNameCenterEl = document.getElementById('uploaded-file-name-center');

        if (uploadContent && uploadedFileDisplay && fileNameCenterEl) {
            // Hide the upload content and show the uploaded file display
            uploadContent.style.display = 'none';
            uploadedFileDisplay.style.display = 'flex';
            fileNameCenterEl.textContent = file.name;
            console.log('✅ File display updated in center:', file.name);
        }

        // Also update the old display for backward compatibility
        const uploadedResumeEl = document.getElementById('uploaded-resume');
        const fileNameEl = document.getElementById('uploaded-file-name');

        if (uploadedResumeEl && fileNameEl) {
            fileNameEl.textContent = file.name;
            uploadedResumeEl.style.display = 'block';
        }

        // Clear the textarea since file is uploaded
        const resumeTextarea = document.getElementById('resume-text');
        if (resumeTextarea) {
            resumeTextarea.value = '';
        }
    }
}

function handleDrop(event) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        // Simulate file input change
        const fileInput = document.getElementById('resume-file');
        fileInput.files = files;
        handleFileSelect({ target: { files: [file] } });
    }
}

function handleDragOver(event) {
    event.preventDefault();
}

// Scan functionality
function performScan() {
    console.log('🔍 Starting performScan function...');

    // Get resume text from textarea or uploaded file
    let resumeText = '';
    const resumeTextarea = document.getElementById('resume-text');
    if (resumeTextarea) {
        resumeText = resumeTextarea.value.trim();
    }

    // Get job description text from textarea
    let jobDescription = '';
    const jobTextarea = document.querySelector('.job-textarea');
    if (jobTextarea) {
        jobDescription = jobTextarea.value.trim();
    }

    const uploadedFile = document.getElementById('resume-file').files[0];

    console.log('📝 Initial data check:', {
        resumeTextLength: resumeText.length,
        jobDescriptionLength: jobDescription.length,
        hasUploadedFile: !!uploadedFile
    });

    // If text areas are empty, try to get data from saved resumes/JDs
    if (!resumeText && !uploadedFile) {
        console.log('📝 No resume text or file, checking for saved resumes...');
        // Try to get the most recent resume text
        const token = localStorage.getItem('dr_resume_token');

        fetch(`${API_BASE_URL}/api/resumes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.resumes && data.resumes.length > 0) {
                    const latestResume = data.resumes[0];
                    console.log('📝 Found saved resume:', latestResume.title);

                    // Get resume details with text
                    return fetch(`${API_BASE_URL}/api/resumes/${latestResume.id}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } else {
                    throw new Error('No saved resumes found');
                }
            })
            .then(response => response.json())
            .then(resumeData => {
                if (resumeData.success && resumeData.resume.extracted_text) {
                    resumeText = resumeData.resume.extracted_text;
                    console.log('📝 Got resume text from saved resume, length:', resumeText.length);
                    continueWithScan(resumeText, jobDescription);
                } else {
                    throw new Error('Could not get resume text');
                }
            })
            .catch(error => {
                console.error('❌ Error getting saved resume:', error);
                showNotification('Please upload a resume or enter resume text', 'error');
            });
        return; // Exit here, continueWithScan will be called asynchronously
    }

    if (!jobDescription) {
        console.log('📝 No job description text, checking for saved JDs...');
        // Try to get the most recent job description
        const token = localStorage.getItem('dr_resume_token');

        fetch(`${API_BASE_URL}/api/job_descriptions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success && data.job_descriptions && data.job_descriptions.length > 0) {
                    const latestJD = data.job_descriptions[0];
                    console.log('📝 Found saved JD:', latestJD.title);

                    // Get JD details with text
                    return fetch(`${API_BASE_URL}/api/job_descriptions/${latestJD.id}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } else {
                    throw new Error('No saved job descriptions found');
                }
            })
            .then(response => response.json())
            .then(jdData => {
                if (jdData.success && jdData.job_description.job_text) {
                    jobDescription = jdData.job_description.job_text;
                    console.log('📝 Got JD text from saved JD, length:', jobDescription.length);
                    continueWithScan(resumeText, jobDescription);
                } else {
                    throw new Error('Could not get job description text');
                }
            })
            .catch(error => {
                console.error('❌ Error getting saved job description:', error);
                showNotification('Please enter a job description', 'error');
            });
        return; // Exit here, continueWithScan will be called asynchronously
    }

    // If we have both texts, continue with scan
    continueWithScan(resumeText, jobDescription);
}

function continueWithScan(resumeText, jobDescription) {
    console.log('📝 Continuing with scan:', {
        resumeTextLength: resumeText.length,
        jobDescriptionLength: jobDescription.length
    });

    // Only use sample data if both fields are completely empty (for testing)
    if (!resumeText) {
        console.log('📝 Using sample resume data for testing');
        resumeText = `John Doe
Software Engineer
Email: john.doe@email.com | Phone: (555) 123-4567

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years developing web applications using JavaScript, Python, and React. Led teams of 3-5 developers and increased application performance by 40%. Strong background in agile development and problem-solving.

WORK EXPERIENCE
Senior Software Engineer | TechCorp Inc. | 2020-2023
• Developed and maintained React applications serving 100,000+ users
• Implemented REST APIs using Python and Django
• Led agile development team and improved deployment efficiency by 60%
• Collaborated with cross-functional teams on project management initiatives

Software Developer | StartupXYZ | 2018-2020
• Built responsive web applications using JavaScript and HTML/CSS
• Worked with SQL databases and optimized query performance
• Participated in code reviews and mentored junior developers
• Contributed to project management and time management processes

EDUCATION
Bachelor of Science in Computer Science | University of Technology | 2018

SKILLS
Technical: JavaScript, Python, React, SQL, HTML, CSS, Git, Agile, REST APIs
Soft Skills: Leadership, Communication, Problem Solving, Teamwork, Project Management`;
    }

    if (!jobDescription) {
        console.log('📝 Using sample job description for testing');
        jobDescription = `Senior Software Engineer Position

We are seeking a Senior Software Engineer to join our dynamic team. The ideal candidate will have strong experience in modern web development technologies and leadership skills.

REQUIRED SKILLS:
• 5+ years of experience with JavaScript and Python
• Proficiency in React and modern frontend frameworks
• Experience with SQL databases and API development
• Strong problem-solving and analytical thinking abilities
• Excellent communication and leadership skills
• Experience with agile development methodologies
• Project management experience preferred

RESPONSIBILITIES:
• Lead development of web applications using React and Python
• Collaborate with cross-functional teams on product development
• Mentor junior developers and provide technical guidance
• Implement best practices for code quality and performance
• Participate in agile ceremonies and project planning
• Work with AWS cloud services and DevOps practices

QUALIFICATIONS:
• Bachelor's degree in Computer Science or related field
• 5+ years of software development experience
• Strong communication and teamwork skills
• Experience with version control (Git) and CI/CD
• Knowledge of database design and optimization
• Customer-focused mindset and innovation thinking`;
    }

    // Final validation before sending to API
    if (!resumeText || !jobDescription) {
        console.error('❌ Missing required data:', {
            resumeTextLength: resumeText ? resumeText.length : 0,
            jobDescriptionLength: jobDescription ? jobDescription.length : 0
        });
        showNotification('Both resume text and job description text are required', 'error');
        return;
    }

    console.log('✅ Data validation passed:', {
        resumeTextLength: resumeText.length,
        jobDescriptionLength: jobDescription.length
    });

    // Check scan status from server first
    const token = localStorage.getItem('dr_resume_token');

    // Show loading state
    showNotification('Checking scan availability...', 'info');

    // First check if user can perform scan
    fetch(`${API_BASE_URL}/api/scan_status`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(scanStatusData => {
            if (!scanStatusData || !scanStatusData.success) {
                showNotification('Error checking scan status', 'error');
                return;
            }

            if (!scanStatusData.scan_status.can_scan) {
                showNotification('No free scans remaining. Please upgrade to premium for unlimited scans.', 'warning');
                showUpgradeModal();
                return;
            }

            // User can scan, proceed with the analysis
            performActualScan(resumeText, jobDescription, token);
        })
        .catch(error => {
            console.error('Error checking scan status:', error);
            showNotification('Error checking scan status', 'error');
        });
}

function performActualScan(resumeText, jobDescription, token) {
    console.log('🔍 Performing scan Phase 5/6/7...');
    showNotification('Analyzing resume against job description...', 'info');

    // Phase 5.1 - Call /api/scan
    fetch(`${API_BASE_URL}/api/scan`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            resume_id: null,
            job_description_id: null,
            resume_text: resumeText,
            job_description_text: jobDescription
        })
    })
        .then(response => {
            if (response.status === 401) {
                handleAuthError();
                return;
            }
            if (response.status === 403) {
                return response.json().then(data => {
                    showNotification(data.message, 'warning');
                    showUpgradeModal();
                    throw new Error('Limit reached');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data && data.success) {
                console.log('✅ Scan successful:', data);

                // Store scan data for results page
                localStorage.setItem('currentScanResult', JSON.stringify(data));
                localStorage.setItem('last_scan_id', data.scan_id);

                showNotification('✅ Scan completed successfully!', 'success');

                // Redirect to results page (Phase 8.4)
                setTimeout(() => {
                    window.location.href = `/results?scan_id=${data.scan_id}`;
                }, 1000);
            } else if (data) {
                // Enhanced error display
                console.error('❌ Scan failed:', data);

                let errorMessage = data.message || 'Scan failed';

                // If there are error details, log them
                if (data.error_details) {
                    console.error('Error details:', data.error_details);
                    errorMessage += ` (${data.error_details.error_type || 'Unknown error'})`;
                }

                // If there's a specific error message, include it
                if (data.error && data.error !== data.message) {
                    console.error('Error:', data.error);
                }

                showNotification(errorMessage, 'error');
            }
        })
        .catch(error => {
            console.error('❌ Scan error:', error);
            if (error.message !== 'Limit reached') {
                showNotification('Error performing scan. Please ensure you have uploaded a resume and JD, and try again.', 'error');
            }
        });
}

function showUpgradeModal() {
    const proPlansSection = document.getElementById('pro-plans-section');
    if (proPlansSection) {
        proPlansSection.style.display = 'block';
        proPlansSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function showUpgradePrompt() {
    console.log('⚠️ Low scan count, showing upgrade prompt');

    // Show a more prominent notification
    showNotification('⚠️ You\'re running low on free scans! Consider upgrading to premium for unlimited scans.', 'warning');

    // Highlight the upgrade button
    const upgradeBtn = document.querySelector('.upgrade-btn');
    if (upgradeBtn) {
        upgradeBtn.style.backgroundColor = '#f59e0b';
        upgradeBtn.style.color = 'white';
        upgradeBtn.style.transform = 'scale(1.05)';
        upgradeBtn.style.transition = 'all 0.3s ease';

        // Reset styling after 3 seconds
        setTimeout(() => {
            upgradeBtn.style.transform = 'scale(1)';
        }, 3000);
    }

    // Scroll to pro plans section briefly
    const proPlansSection = document.getElementById('pro-plans-section');
    if (proPlansSection) {
        proPlansSection.style.display = 'block';
        proPlansSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Hide it again after 5 seconds
        setTimeout(() => {
            proPlansSection.style.display = 'none';
        }, 5000);
    }
}

function togglePowerEdit() {
    console.log('⚡ Power Edit toggled');
    alert('Power Edit feature coming soon!');
}

function showSavedResumes() {
    console.log('📁 Show saved resumes');

    const token = localStorage.getItem('dr_resume_token');

    // Create modal for saved resumes
    const modal = createSavedResumesModal();
    document.body.appendChild(modal);

    // Load saved resumes
    fetch(`${API_BASE_URL}/api/resumes`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.resumes) {
                displaySavedResumesInModal(data.resumes, modal);
            } else {
                displayNoResumesMessage(modal);
            }
        })
        .catch(error => {
            console.error('Error loading saved resumes:', error);
            displayErrorMessage(modal);
        });
}

function createSavedResumesModal() {
    const modal = document.createElement('div');
    modal.className = 'saved-resumes-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Select a Resume</h3>
                    <button class="close-btn" onclick="closeSavedResumesModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="loading-message">Loading saved resumes...</div>
                </div>
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .saved-resumes-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .saved-resumes-modal .modal-content {
            background: white;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
        }
        .saved-resumes-modal .modal-header {
            padding: 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .saved-resumes-modal .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
        }
        .saved-resumes-modal .modal-body {
            padding: 20px;
        }
        .resume-item {
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 6px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .resume-item:hover {
            background-color: #f5f5f5;
        }
        .resume-item.last-used {
            border-color: #007bff;
            background-color: #f0f8ff;
        }
        .resume-item-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .resume-item-details {
            font-size: 12px;
            color: #666;
        }
        .last-used-badge {
            background: #007bff;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            margin-left: 10px;
        }
    `;
    document.head.appendChild(style);

    return modal;
}

function displaySavedResumesInModal(resumes, modal) {
    const modalBody = modal.querySelector('.modal-body');
    const lastUsedResumeId = localStorage.getItem('last_used_resume_id');

    if (resumes.length === 0) {
        modalBody.innerHTML = '<div class="no-resumes-message">No saved resumes found. Upload a resume first!</div>';
        return;
    }

    const resumesList = resumes.map(resume => {
        const isLastUsed = resume.id.toString() === lastUsedResumeId;
        return `
            <div class="resume-item ${isLastUsed ? 'last-used' : ''}" onclick="selectResume(${resume.id}, '${resume.title || 'Untitled Resume'}')">
                <div class="resume-item-name">
                    ${resume.title || 'Untitled Resume'}
                    ${isLastUsed ? '<span class="last-used-badge">Last Used</span>' : ''}
                </div>
                <div class="resume-item-details">
                    Uploaded: ${new Date(resume.created_at).toLocaleDateString()}
                    ${resume.original_filename ? ` • ${resume.original_filename}` : ''}
                </div>
            </div>
        `;
    }).join('');

    modalBody.innerHTML = resumesList;
}

function displayNoResumesMessage(modal) {
    const modalBody = modal.querySelector('.modal-body');
    modalBody.innerHTML = '<div class="no-resumes-message">No saved resumes found. Upload a resume first!</div>';
}

function displayErrorMessage(modal) {
    const modalBody = modal.querySelector('.modal-body');
    modalBody.innerHTML = '<div class="error-message">Error loading resumes. Please try again.</div>';
}

function closeSavedResumesModal() {
    const modal = document.querySelector('.saved-resumes-modal');
    if (modal) {
        document.body.removeChild(modal);
        // Remove the style element
        const styles = document.querySelectorAll('style');
        styles.forEach(style => {
            if (style.textContent.includes('.saved-resumes-modal')) {
                document.head.removeChild(style);
            }
        });
    }
}

function selectResume(resumeId, resumeTitle) {
    console.log(`Selected resume: ${resumeTitle} (ID: ${resumeId})`);

    // Store the selected resume as the last used
    localStorage.setItem('last_used_resume_id', resumeId.toString());

    // Get the resume details and populate the textarea
    const token = localStorage.getItem('dr_resume_token');

    fetch(`${API_BASE_URL}/api/resumes/${resumeId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.resume) {
                // Populate the resume textarea with extracted text
                const resumeTextarea = document.getElementById('resume-text');
                if (resumeTextarea && data.resume.extracted_text) {
                    resumeTextarea.value = data.resume.extracted_text;
                }

                // Update the uploaded file display
                updateUploadedFileDisplay(data.resume.original_filename || resumeTitle);

                showNotification(`Resume "${resumeTitle}" loaded successfully!`, 'success');
            } else {
                showNotification('Error loading resume details', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading resume details:', error);
            showNotification('Error loading resume details', 'error');
        });

    // Close the modal
    closeSavedResumesModal();
}

function updateUploadedFileDisplay(filename) {
    const uploadedFileDiv = document.getElementById('uploaded-resume');
    const fileNameSpan = document.getElementById('uploaded-file-name');

    if (uploadedFileDiv && fileNameSpan) {
        fileNameSpan.textContent = filename;
        uploadedFileDiv.style.display = 'block';
    }
}

function viewSampleScan() {
    console.log('👁️ View sample scan with comprehensive dummy data');

    // Comprehensive sample data that demonstrates real analysis results
    const sampleScanData = {
        resumeText: `Sarah Johnson
Senior Software Engineer
Email: sarah.johnson@email.com | Phone: (555) 123-4567 | LinkedIn: linkedin.com/in/sarahjohnson

PROFESSIONAL SUMMARY
Experienced Senior Software Engineer with 6+ years developing scalable web applications using JavaScript, Python, and React. Led cross-functional teams of 5-8 developers and improved application performance by 45%. Strong background in agile development, cloud architecture, and problem-solving.

WORK EXPERIENCE
Senior Software Engineer | TechCorp Inc. | 2021-2024
• Developed and maintained React applications serving 250,000+ users
• Implemented REST APIs using Python, Django, and PostgreSQL
• Led agile development team and improved deployment efficiency by 65%
• Collaborated with product managers on feature planning and roadmap
• Mentored 3 junior developers and conducted code reviews

Software Developer | StartupXYZ | 2019-2021
• Built responsive web applications using JavaScript, HTML5, and CSS3
• Worked with SQL databases and optimized query performance by 40%
• Participated in daily standups and sprint planning meetings
• Contributed to CI/CD pipeline setup using Jenkins and Docker

Junior Developer | WebSolutions | 2018-2019
• Developed frontend components using React and Redux
• Collaborated with UX/UI designers on user interface improvements
• Fixed bugs and implemented new features based on user feedback

EDUCATION
Bachelor of Science in Computer Science | University of Technology | 2018
Relevant Coursework: Data Structures, Algorithms, Database Systems, Software Engineering

SKILLS
Technical: JavaScript, Python, React, Node.js, SQL, PostgreSQL, HTML5, CSS3, Git, Docker, Jenkins, AWS, REST APIs, GraphQL
Soft Skills: Leadership, Communication, Problem Solving, Teamwork, Project Management, Agile Methodologies`,

        resumeFile: 'Sarah_Johnson_Senior_Software_Engineer.pdf',

        jobDescription: `Senior Software Engineer - Full Stack Development
TechInnovate Solutions | San Francisco, CA

We are seeking a Senior Software Engineer to join our dynamic engineering team. The ideal candidate will have strong experience in modern web development technologies and leadership skills.

REQUIRED SKILLS:
• 5+ years of experience with JavaScript and Python
• Proficiency in React and modern frontend frameworks
• Experience with SQL databases and API development
• Strong problem-solving and analytical thinking abilities
• Excellent communication and leadership skills
• Experience with agile development methodologies
• Project management experience preferred
• Knowledge of cloud platforms (AWS, Azure, or GCP)

RESPONSIBILITIES:
• Lead development of web applications using React and Python
• Collaborate with cross-functional teams on product development
• Mentor junior developers and provide technical guidance
• Implement best practices for code quality and performance
• Participate in agile ceremonies and sprint planning
• Work with AWS cloud services and DevOps practices
• Design and implement REST APIs and microservices
• Conduct code reviews and ensure coding standards

QUALIFICATIONS:
• Bachelor's degree in Computer Science or related field
• 5+ years of software development experience
• Strong communication and teamwork skills
• Experience with version control (Git) and CI/CD pipelines
• Knowledge of database design and optimization
• Customer-focused mindset and innovation thinking
• Experience with Docker and containerization
• Familiarity with GraphQL and modern API design`,

        matchRate: 87,
        timestamp: new Date().toISOString(),
        isSample: true,

        // Detailed analysis results
        detailedScores: {
            technical_score: 92,
            soft_skills_score: 85,
            other_keywords_score: 83,
            overall_score: 87
        },

        keywordAnalysis: {
            total_resume_keywords: 28,
            total_jd_keywords: 32,
            matched_keywords: 24,
            match_percentage: 75
        },

        // Sample suggestions data
        suggestions: [
            {
                title: "Add Cloud Platform Certifications",
                description: "Consider obtaining AWS, Azure, or GCP certifications to strengthen your cloud expertise. The job description emphasizes cloud platform knowledge.",
                category: "technical_skills",
                priority: "high",
                impact: "Increases technical credibility by 15%"
            },
            {
                title: "Highlight GraphQL Experience",
                description: "If you have GraphQL experience, add it to your skills section. The job mentions familiarity with GraphQL and modern API design.",
                category: "technical_skills",
                priority: "medium",
                impact: "Improves API development profile"
            },
            {
                title: "Quantify Leadership Impact",
                description: "Add specific metrics about team size and project outcomes when describing your leadership experience.",
                category: "soft_skills",
                priority: "high",
                impact: "Strengthens leadership narrative by 20%"
            },
            {
                title: "Emphasize Microservices Architecture",
                description: "Mention any experience with microservices architecture, as this is highlighted in the job responsibilities.",
                category: "technical_skills",
                priority: "medium",
                impact: "Aligns with modern architecture trends"
            },
            {
                title: "Add DevOps Tools Experience",
                description: "Expand on your CI/CD experience by mentioning specific DevOps tools and practices you've implemented.",
                category: "technical_skills",
                priority: "medium",
                impact: "Demonstrates full-stack development capability"
            }
        ],

        // Progress data for the results page
        progressData: {
            searchability: { score: 85, issues: 2, label: "2 issues to fix" },
            hardSkills: { score: 92, issues: 1, label: "1 issue to fix" },
            softSkills: { score: 88, issues: 2, label: "2 issues to fix" },
            recruiterTips: { score: 78, issues: 3, label: "3 issues to fix" },
            formatting: { score: 95, issues: 0, label: "All good!" }
        }
    };

    localStorage.setItem('currentScanData', JSON.stringify(sampleScanData));
    console.log('✅ Sample scan data stored with comprehensive analysis');
    window.location.href = '/results';
}

function upgradeToPro() {
    console.log('💎 Upgrade to Pro clicked');
    alert('Upgrade feature coming soon! You will be redirected to payment page.');
}

function contactSales() {
    console.log('📞 Contact sales clicked');
    alert('Please contact sales at sales@resumedoctor.ai for Enterprise pricing.');
}

function addEventListeners() {
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

    // Stat cards hover effects
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-4px)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(-2px)';
        });
    });
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear stored data
        localStorage.removeItem('dr_resume_token');
        localStorage.removeItem('dr_resume_user');

        // Show notification
        showNotification('Logged out successfully', 'success');

        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
    }
};

function updateUserGreeting(userData) {
    console.log('👤 Updating user greeting with data:', userData);

    // Update welcome title with user's first name
    const welcomeTitleElement = document.querySelector('.welcome-title');
    if (welcomeTitleElement) {
        if (userData.first_name) {
            welcomeTitleElement.textContent = `Welcome, ${userData.first_name}`;
            console.log(`✅ Updated welcome title to: Welcome, ${userData.first_name}`);
        } else {
            welcomeTitleElement.textContent = 'Welcome';
            console.log('ℹ️ No first_name found, using generic Welcome');
        }
    }

    // Update matches subtitle (Phase 7.3)
    const welcomeSubtitle = document.querySelector('.welcome-subtitle');
    if (welcomeSubtitle && userData.first_name) {
        welcomeSubtitle.textContent = 'Good to see you again!';
    }

    // Also update any user greeting elements if they exist
    const greetingElement = document.querySelector('.user-greeting');
    if (greetingElement && userData.first_name) {
        greetingElement.textContent = `Hi, ${userData.first_name}!`;
    } else if (greetingElement) {
        greetingElement.textContent = 'Hi, there!';
    }
}

function loadDashboardStats() {
    // Fetch real data from API
    const token = localStorage.getItem('dr_resume_token');

    fetch(`${API_BASE_URL}/api/dashboard_stats`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return; // Handle case where response was 401
            if (data.success) {
                const stats = data.stats;
                // Update stat cards with real data
                updateStatCard(0, stats.total_resumes || 0);
                updateStatCard(1, stats.total_job_descriptions || 0);
                updateStatCard(2, stats.total_scans || 0);
            } else {
                console.error('Failed to load dashboard stats:', data.message);
                // Show zeros if API fails
                updateStatCard(0, 0);
                updateStatCard(1, 0);
                updateStatCard(2, 0);
            }
        })
        .catch(error => {
            console.error('Error loading dashboard stats:', error);
            // Show zeros if API fails
            updateStatCard(0, 0);
            updateStatCard(1, 0);
            updateStatCard(2, 0);
        });
}

function updateStatCard(index, value) {
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards[index]) {
        const numberElement = statCards[index].querySelector('.stat-number');
        if (numberElement) {
            // Animate number counting up
            animateNumber(numberElement, 0, value, 1000);
        }
    }
}

function animateNumber(element, start, end, duration) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(start + (end - start) * easeOutQuart);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

async function loadRecentScansList() {
    const token = localStorage.getItem('dr_resume_token');
    try {
        const response = await fetch(`${API_BASE_URL}/api/scans`, {
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
        if (data.success && data.scans && data.scans.length > 0) {
            const latestScan = data.scans[0];
            updateScanCard({
                fileName: latestScan.resume_title,
                jobDescription: latestScan.job_title,
                scanDate: new Date(latestScan.created_at).toLocaleDateString(),
                matchPercentage: latestScan.score,
                keywordCount: latestScan.score_category,
                keywordBreakdown: []
            });
        } else {
            updateScanCardEmpty();
        }
    } catch (error) {
        console.error('Error loading recent scans:', error);
        updateScanCardEmpty();
    }
}

function updateScanCard(scanData) {
    const listContainer = document.getElementById('recent-scans-list');
    if (!listContainer) return;

    // Clear container
    listContainer.innerHTML = '';

    const scoreClass = getScoreCategoryClass(scanData.matchPercentage);

    const cardHtml = `
        <div class="scan-card">
            <div class="scan-header">
                <div class="document-icon">📄</div>
                <h3 class="file-name">${scanData.fileName}</h3>
            </div>

            <div class="scan-meta">
                <p class="job-description">${scanData.jobDescription}</p>
                <p class="scan-date">${scanData.scanDate}</p>
            </div>

            <div class="score-summary">
                <div class="match-percentage ${scoreClass}">${scanData.matchPercentage}%</div>
                <div class="keyword-count">${scanData.keywordCount} match</div>
            </div>

            <div class="keyword-breakdown">
                ${scanData.keywordBreakdown.length > 0 ? scanData.keywordBreakdown.map(kb => `
                    <div class="keyword-item">
                        <div class="keyword-percentage">${kb.percentage}%</div>
                        <div class="keyword-label">${kb.label}</div>
                    </div>
                `).join('') : `
                    <div class="keyword-item">
                        <button class="view-details-btn" onclick="window.location.href='/history'">View Full History</button>
                    </div>
                `}
            </div>
        </div>
    `;

    listContainer.innerHTML = cardHtml;
}

function getScoreCategoryClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
}

function updateKeywordBreakdown(keywords) {
    const keywordItems = document.querySelectorAll('.keyword-item');

    keywords.forEach((keyword, index) => {
        if (keywordItems[index]) {
            const percentageElement = keywordItems[index].querySelector('.keyword-percentage');
            const labelElement = keywordItems[index].querySelector('.keyword-label');

            if (percentageElement) {
                percentageElement.textContent = `${keyword.percentage} %`;
            }

            if (labelElement) {
                labelElement.textContent = keyword.keyword;
            }
        }
    });
}

function updateScanCardEmpty() {
    const listContainer = document.getElementById('recent-scans-list');
    if (!listContainer) return;

    listContainer.innerHTML = `
        <div class="empty-state" id="no-scans-message" style="padding: 40px; text-align: center; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
            <p style="color: var(--text-muted); margin-bottom: 20px;">No recent scans found. Upload a resume and Job Description to get started!</p>
            <button class="new-resume-btn" onclick="document.getElementById('resume-upload').click()" style="margin: 0 auto;">Upload Resume</button>
        </div>
    `;
}

function loadSavedResumes() {
    const token = localStorage.getItem('dr_resume_token');

    fetch(`${API_BASE_URL}/api/resumes`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            const resumeSelectDiv = document.getElementById('resume-select');
            if (resumeSelectDiv) {
                if (data.success && data.resumes && data.resumes.length > 0) {
                    resumeSelectDiv.innerHTML = data.resumes.map(resume => `
                    <div class="saved-item" data-id="${resume.id}">
                        <div class="saved-item-name">${resume.title || 'Untitled Resume'}</div>
                        <div class="saved-item-date">Uploaded: ${new Date(resume.created_at).toLocaleDateString()}</div>
                    </div>
                `).join('');
                } else {
                    resumeSelectDiv.innerHTML = '<div class="saved-placeholder">No saved resumes yet. Upload your first resume above!</div>';
                }
            }
        })
        .catch(error => {
            console.error(' Error loading saved resumes:', error);
            const resumeSelectDiv = document.getElementById('resume-select');
            if (resumeSelectDiv) {
                resumeSelectDiv.innerHTML = '<div class="saved-placeholder">Error loading resumes</div>';
            }
        });
}

function loadSavedJobDescriptions() {
    const token = localStorage.getItem('dr_resume_token');

    fetch(`${API_BASE_URL}/api/job_descriptions`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            const jobSelectDiv = document.getElementById('job-select');
            if (jobSelectDiv) {
                if (data.success && data.job_descriptions && data.job_descriptions.length > 0) {
                    jobSelectDiv.innerHTML = data.job_descriptions.map(job => `
                    <div class="saved-item" data-id="${job.id}">
                        <div class="saved-item-name">${job.title || 'Untitled Job'}</div>
                        <div class="saved-item-date">Created: ${new Date(job.created_at).toLocaleDateString()}</div>
                    </div>
                `).join('');
                } else {
                    jobSelectDiv.innerHTML = '<div class="saved-placeholder">No saved job descriptions yet. Create your first job description above!</div>';
                }
            }
        })
        .catch(error => {
            console.error(' Error loading saved job descriptions:', error);
            const jobSelectDiv = document.getElementById('job-select');
            if (jobSelectDiv) {
                jobSelectDiv.innerHTML = '<div class="saved-placeholder">Error loading job descriptions</div>';
            }
        });
}




// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '1000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });

    // Set background color based on type
    const colors = {
        info: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Resume Analysis Functions


function switchTab(section, tab) {
    // Remove active class from all tabs in the section
    const sectionElement = document.querySelector(`.${section}-section`);
    const tabs = sectionElement.querySelectorAll('.tab-btn');
    const panes = sectionElement.querySelectorAll('.tab-pane');

    tabs.forEach(t => t.classList.remove('active'));
    panes.forEach(p => p.classList.remove('active'));

    // Add active class to clicked tab and corresponding pane
    event.target.classList.add('active');
    document.getElementById(`${section}-${tab}`).classList.add('active');
}

function triggerFileUpload() {
    document.getElementById('resume-file').click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('📁 File selected:', file.name, file.type, file.size);

        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (allowedTypes.includes(file.type)) {
            showNotification(`Uploading "${file.name}"...`, 'info');
            const formData = new FormData();
            formData.append('resume', file);

            const token = localStorage.getItem('dr_resume_token');
            console.log('🔑 Using token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');

            if (!token) {
                showNotification('No authentication token found. Please log in again.', 'error');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }

            console.log('📤 Starting upload to:', `${API_BASE_URL}/api/upload_resume`);

            fetch(`${API_BASE_URL}/api/upload_resume`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })
                .then(response => {
                    console.log('📊 Upload response status:', response.status);
                    console.log('📄 Upload response headers:', Object.fromEntries(response.headers.entries()));

                    if (response.status === 401) {
                        // Token is invalid, clear it and redirect to login
                        console.log('❌ Upload failed: Token invalid, redirecting to login');
                        clearTokens();
                        showNotification('Session expired. Please log in again.', 'error');
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 2000);
                        return;
                    }

                    if (response.status === 500) {
                        console.log('❌ Server error (500)');
                        return response.text().then(text => {
                            console.log('📄 Server error response:', text);
                            try {
                                const errorData = JSON.parse(text);
                                throw new Error(`Server error: ${errorData.message || 'Internal server error'}`);
                            } catch (parseError) {
                                throw new Error(`Server error: ${text}`);
                            }
                        });
                    }

                    if (!response.ok) {
                        console.log(`❌ HTTP error: ${response.status}`);
                        return response.text().then(text => {
                            console.log('📄 Error response:', text);
                            throw new Error(`HTTP error! status: ${response.status} - ${text}`);
                        });
                    }

                    return response.json();
                })
                .then(result => {
                    console.log('✅ Upload result:', result);
                    if (result && result.success) {
                        showNotification('Resume uploaded and keywords extracted!', 'success');
                        console.log('📄 Resume ID:', result.resume?.id);
                        console.log('🔍 Keywords extracted:', result.keywords_extracted);

                        // Refresh the dashboard data
                        loadDashboardSummary();
                        loadSavedResumes();
                        loadRecentScansList();

                        // Calculate matching score if both resume and JD exist
                        calculateMatchingScoreIfReady();

                        // DO NOT auto-load suggestions - user must click the buttons manually
                        console.log('📝 Resume uploaded successfully. User can now generate suggestions manually.');
                    } else if (result) {
                        console.log('❌ Upload failed:', result.message);
                        showNotification(result.message || 'Upload failed', 'error');
                    } else {
                        console.log('❌ No result received');
                        showNotification('Upload failed: No response received', 'error');
                    }
                })
                .catch(error => {
                    console.error('❌ Upload error:', error);
                    console.error('❌ Error stack:', error.stack);
                    showNotification(`Upload failed: ${error.message}`, 'error');
                });
        } else {
            showNotification('Please select a PDF, DOC, DOCX, or TXT file', 'error');
        }
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '#94a3af';
    event.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '#cbd5e1';
    event.currentTarget.style.background = 'transparent';

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

        if (allowedTypes.includes(file.type)) {
            showNotification(`File "${file.name}" uploaded successfully`, 'success');
            console.log('File dropped:', file.name, file.type, file.size);
        } else {
            showNotification('Please drop a PDF, DOC, DOCX, or TXT file', 'error');
        }
    }
}

function toggleSaveButton() {
    const textarea = document.querySelector('.job-textarea');
    const saveBtn = document.getElementById('save-job-btn');

    if (textarea && saveBtn) {
        if (textarea.value.trim().length > 0) {
            saveBtn.disabled = false;
        } else {
            saveBtn.disabled = true;
        }
    }
}

// Job Description Input Handling
function handleJobDescriptionInput() {
    const textarea = document.querySelector('.job-textarea');
    const jobStatus = document.getElementById('job-status');
    const wordCountElement = document.getElementById('job-word-count');
    const saveBtn = document.getElementById('save-job-btn');

    const text = textarea.value.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;

    if (text) {
        jobStatus.style.display = 'flex';
        wordCountElement.textContent = `${wordCount} words`;
        saveBtn.disabled = false;
    } else {
        jobStatus.style.display = 'none';
        saveBtn.disabled = true;
    }
}

// Job File Upload Functions
function triggerJobFileUpload() {
    document.getElementById('job-file-input').click();
}

function handleJobFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processJobFile(file);
    }
}

function handleJobDragOver(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('job-upload-area');
    uploadArea.classList.add('drag-over');
}

function handleJobDragLeave(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('job-upload-area');
    uploadArea.classList.remove('drag-over');
}

function handleJobFileDrop(event) {
    event.preventDefault();
    const uploadArea = document.getElementById('job-upload-area');
    uploadArea.classList.remove('drag-over');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processJobFile(files[0]);
    }
}

function processJobFile(file) {
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'];

    if (!allowedTypes.includes(file.type)) {
        showNotification('Please upload a PDF, DOC, DOCX, or TXT file', 'error');
        return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('File size must be less than 5MB', 'error');
        return;
    }

    // Show file in upload area
    const uploadContent = document.getElementById('job-upload-content');
    const fileDisplay = document.getElementById('job-file-display');
    const fileName = document.getElementById('job-file-name');

    uploadContent.style.display = 'none';
    fileDisplay.style.display = 'flex';
    fileName.textContent = file.name;

    // Extract text from file
    extractTextFromJobFile(file);
}

function extractTextFromJobFile(file) {
    const reader = new FileReader();

    if (file.type === 'text/plain') {
        reader.onload = function (e) {
            const text = e.target.result;
            document.querySelector('.job-textarea').value = text;
            handleJobDescriptionInput();
            showNotification('Job description loaded from file', 'success');
        };
        reader.readAsText(file);
    } else {
        // For PDF/DOC files, we'll need to send to backend for processing
        const formData = new FormData();
        formData.append('job_file', file);

        const token = localStorage.getItem('dr_resume_token');

        fetch(`${API_BASE_URL}/api/extract_job_text`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.querySelector('.job-textarea').value = data.extracted_text;
                    handleJobDescriptionInput();
                    showNotification('Job description extracted from file', 'success');
                } else {
                    showNotification('Failed to extract text from file', 'error');
                    resetJobUploadArea();
                }
            })
            .catch(error => {
                console.error('Error extracting job text:', error);
                showNotification('Error processing file', 'error');
                resetJobUploadArea();
            });
    }
}

function resetJobUploadArea() {
    const uploadContent = document.getElementById('job-upload-content');
    const fileDisplay = document.getElementById('job-file-display');

    uploadContent.style.display = 'flex';
    fileDisplay.style.display = 'none';
}

function saveJobDescription() {
    const textarea = document.querySelector('.job-textarea');
    const jobDescription = textarea.value.trim();

    if (!jobDescription) {
        showNotification('Please enter a job description', 'error');
        return;
    }

    const token = localStorage.getItem('dr_resume_token');

    // Show loading state
    showNotification('Saving job description...', 'info');

    fetch(`${API_BASE_URL}/api/upload_jd`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: 'Job Description',
            company_name: 'Company',
            job_text: jobDescription
        })
    })
        .then(response => {
            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;

            if (data.success) {
                showNotification('Job description saved and keywords extracted!', 'success');

                // Refresh dashboard data
                loadSavedJobDescriptions();
                loadDashboardSummary();
                loadRecentScansList();

                // Clear the textarea
                textarea.value = '';
                toggleSaveButton();

                // DO NOT auto-calculate matching score - user must click the button manually
                console.log('📝 Job description saved successfully. User can now calculate matching score manually.');
            } else {
                showNotification(data.message || 'Failed to save job description', 'error');
            }
        })
        .catch(error => {
            console.error('Error saving job description:', error);
            showNotification('Failed to save job description', 'error');
        });
}

// Matching Score Calculation
function generateMatchingScore() {
    console.log('🎯 User clicked Calculate Matching Score');

    // Show matching score section first
    const matchingSection = document.getElementById('matching-score-section');
    if (matchingSection) {
        matchingSection.style.display = 'block';
    }

    // Show loading state (we can add this later)
    showNotification('Calculating matching score...', 'info');

    calculateMatchingScoreIfReady();
}

function calculateMatchingScoreIfReady() {
    console.log('🎯 Checking if ready to calculate matching score...');

    const token = localStorage.getItem('dr_resume_token');

    // Get latest resume and job description
    Promise.all([
        fetch(`${API_BASE_URL}/api/resumes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).then(response => response.json()),

        fetch(`${API_BASE_URL}/api/job_descriptions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).then(response => response.json())
    ])
        .then(([resumesData, jdData]) => {
            if (resumesData.success && jdData.success &&
                resumesData.resumes.length > 0 && jdData.job_descriptions.length > 0) {

                const latestResume = resumesData.resumes[0];
                const latestJD = jdData.job_descriptions[0];

                // Check if both have keywords extracted
                if (latestResume.keywords_extracted && latestJD.keywords_extracted) {
                    console.log(`🎯 Calculating matching score for resume ${latestResume.id} vs JD ${latestJD.id}`);

                    // Calculate matching score
                    fetch(`${API_BASE_URL}/api/calculate_match`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            resume_id: latestResume.id,
                            job_description_id: latestJD.id
                        })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('✅ Matching score calculated:', data);

                                // Show matching score section with the calculated data
                                showMatchingScore({
                                    overall_score: data.detailed_scores.overall_score,
                                    technical_score: data.detailed_scores.technical_score,
                                    soft_skills_score: data.detailed_scores.soft_skills_score,
                                    other_keywords_score: data.detailed_scores.other_keywords_score,
                                    matched_keywords: data.keyword_analysis.matched_keywords,
                                    total_resume_keywords: data.keyword_analysis.total_resume_keywords,
                                    total_jd_keywords: data.keyword_analysis.total_jd_keywords
                                });

                                showNotification('Matching score calculated successfully!', 'success');
                            } else {
                                console.error('Failed to calculate matching score:', data.message);
                                showNotification('Failed to calculate matching score', 'error');
                            }
                        })
                        .catch(error => {
                            console.error('Error calculating matching score:', error);
                            showNotification('Error calculating matching score', 'error');
                        });
                } else {
                    console.log('⏳ Keywords not extracted yet for both resume and JD');
                }
            } else {
                console.log('📭 No resume or job description found');
            }
        })
        .catch(error => {
            console.error('Error checking for resume/JD:', error);
        });
}

// Suggestions Functions
let currentSuggestions = {
    basic: [],
    premium: []
};

function loadLatestSuggestions() {
    const token = localStorage.getItem('dr_resume_token');

    fetch(`${API_BASE_URL}/api/latest_suggestions`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;

            console.log('🔍 Latest suggestions response:', data);

            if (data.success) {
                currentSuggestions.basic = data.suggestions || [];
                console.log('📝 Basic suggestions loaded:', currentSuggestions.basic.length, 'suggestions');

                // Show suggestions section first
                const suggestionsSection = document.getElementById('suggestions-section');
                if (suggestionsSection) {
                    suggestionsSection.style.display = 'block';
                    console.log('✅ Suggestions section made visible');
                }

                if (currentSuggestions.basic.length > 0) {
                    displaySuggestions(currentSuggestions.basic, 'basic');
                    showBasicSuggestions(); // Ensure basic tab is active
                    console.log('✅ Suggestions displayed and basic tab activated');
                } else {
                    console.log('⚠️ No suggestions to display');
                    showEmptySuggestions('No suggestions available yet. Upload both a resume and job description to get suggestions.');
                }
            } else {
                console.log('❌ Suggestions API failed:', data.message);
                // Show empty state but still make section visible
                const suggestionsSection = document.getElementById('suggestions-section');
                if (suggestionsSection) {
                    suggestionsSection.style.display = 'block';
                }
                showEmptySuggestions(data.message);
            }
        })
        .catch(error => {
            console.error('Error loading suggestions:', error);
            showEmptySuggestions('Failed to load suggestions');
        });
}

function generateBasicSuggestions() {
    console.log('⭐ User clicked Generate Basic Suggestions');

    // Show suggestions section first
    const suggestionsSection = document.getElementById('suggestions-section');
    if (suggestionsSection) {
        suggestionsSection.style.display = 'block';
    }

    showSuggestionsLoading();

    const token = localStorage.getItem('dr_resume_token');

    // Get the user's resumes and job descriptions
    Promise.all([
        fetch(`${API_BASE_URL}/api/resumes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()),
        fetch(`${API_BASE_URL}/api/job_descriptions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
    ])
        .then(([resumesData, jdData]) => {
            if (resumesData.success && jdData.success &&
                resumesData.resumes.length > 0 && jdData.job_descriptions.length > 0) {

                const latestResume = resumesData.resumes[0];
                const latestJD = jdData.job_descriptions[0];

                console.log(`📝 Generating basic suggestions for resume ${latestResume.id} vs JD ${latestJD.id}`);

                return fetch(`${API_BASE_URL}/api/basic_suggestions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        resume_id: latestResume.id,
                        job_description_id: latestJD.id
                    })
                });
            } else {
                throw new Error('Please upload both a resume and job description first');
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('🎯 Basic suggestions response:', data);
            if (data.success) {
                currentSuggestions.basic = data.suggestions || [];
                console.log('📊 Basic suggestions stored:', currentSuggestions.basic.length);
                displaySuggestions(currentSuggestions.basic, 'basic');
                showBasicSuggestions(); // Switch to basic view
                showNotification(`Generated ${currentSuggestions.basic.length} basic suggestions`, 'success');
            } else {
                console.error('❌ Basic suggestions failed:', data.message);
                showNotification(data.message || 'Failed to generate basic suggestions', 'error');
                hideSuggestionsLoading();
            }
        })
        .catch(error => {
            console.error('Error generating basic suggestions:', error);
            showNotification(error.message || 'Failed to generate basic suggestions', 'error');
            hideSuggestionsLoading();
        });
}

function generatePremiumSuggestions() {
    console.log('💎 User clicked Generate Premium Suggestions');

    // Show suggestions section first
    const suggestionsSection = document.getElementById('suggestions-section');
    if (suggestionsSection) {
        suggestionsSection.style.display = 'block';
    }

    showSuggestionsLoading();

    const token = localStorage.getItem('dr_resume_token');

    // Get the user's resumes and job descriptions
    Promise.all([
        fetch(`${API_BASE_URL}/api/resumes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()),
        fetch(`${API_BASE_URL}/api/job_descriptions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
    ])
        .then(([resumesData, jdData]) => {
            if (resumesData.success && jdData.success &&
                resumesData.resumes.length > 0 && jdData.job_descriptions.length > 0) {

                const latestResume = resumesData.resumes[0];
                const latestJD = jdData.job_descriptions[0];

                console.log(`🤖 Generating premium AI suggestions for resume ${latestResume.id} vs JD ${latestJD.id}`);

                return fetch(`${API_BASE_URL}/api/premium_suggestions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        resume_id: latestResume.id,
                        job_description_id: latestJD.id
                    })
                });
            } else {
                throw new Error('Please upload both a resume and job description first');
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('🎯 Premium suggestions response:', data);
            if (data.success) {
                currentSuggestions.premium = data.suggestions || [];
                console.log('📊 Premium suggestions stored:', currentSuggestions.premium.length);
                displaySuggestions(currentSuggestions.premium, 'premium');
                showPremiumSuggestions(); // Switch to premium view
                showNotification(`Generated ${currentSuggestions.premium.length} premium AI suggestions`, 'success');
            } else {
                console.error('❌ Premium suggestions failed:', data.message);
                showNotification(data.message || 'Failed to generate premium suggestions', 'error');
                hideSuggestionsLoading();
            }
        })
        .catch(error => {
            console.error('Error generating premium suggestions:', error);
            showNotification(error.message || 'Failed to generate premium suggestions', 'error');
            hideSuggestionsLoading();
        });
}

function showBasicSuggestions() {
    document.getElementById('basic-toggle').classList.add('active');
    document.getElementById('premium-toggle').classList.remove('active');

    if (currentSuggestions.basic.length > 0) {
        displaySuggestions(currentSuggestions.basic, 'basic');
    } else {
        showEmptySuggestions('Click "Generate Basic Suggestions" to get AI-powered suggestions');
    }
}

function showPremiumSuggestions() {
    document.getElementById('basic-toggle').classList.remove('active');
    document.getElementById('premium-toggle').classList.add('active');

    if (currentSuggestions.premium.length > 0) {
        displaySuggestions(currentSuggestions.premium, 'premium');
    } else {
        showEmptySuggestions('Click "Generate Premium Suggestions" to get advanced AI-powered suggestions');
    }
}

function displaySuggestions(suggestions, type) {
    console.log(`🎨 Displaying ${suggestions.length} ${type} suggestions`);
    console.log('🔍 Suggestions data:', suggestions);

    const suggestionsSection = document.getElementById('suggestions-section');
    const suggestionsList = document.getElementById('suggestions-list');
    const emptyState = document.getElementById('suggestions-empty');
    const loadingState = document.getElementById('suggestions-loading');

    console.log('🔍 DOM elements found:', {
        suggestionsSection: !!suggestionsSection,
        suggestionsList: !!suggestionsList,
        emptyState: !!emptyState,
        loadingState: !!loadingState
    });

    if (!suggestionsSection) {
        console.error('❌ Suggestions section not found in DOM');
        return;
    }

    if (!suggestionsList) {
        console.error('❌ Suggestions list not found in DOM');
        return;
    }

    // Hide loading and empty states
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';

    // Show suggestions section
    suggestionsSection.style.display = 'block';
    console.log('✅ Suggestions section made visible');

    if (suggestions.length === 0) {
        console.log('📭 No suggestions to display, showing empty state');
        if (emptyState) emptyState.style.display = 'block';
        suggestionsList.style.display = 'none';
        return;
    }

    // Show suggestions list and clear existing suggestions
    suggestionsList.style.display = 'block';
    suggestionsList.innerHTML = '';
    console.log('✅ Suggestions list made visible and cleared');

    // Display suggestions
    suggestions.forEach((suggestion, index) => {
        console.log(`📝 Creating suggestion ${index + 1}:`, suggestion.title);
        const suggestionElement = createSuggestionElement(suggestion);
        suggestionsList.appendChild(suggestionElement);
        console.log(`✅ Added suggestion ${index + 1} to DOM`);
    });

    console.log('✅ All suggestions displayed');
    console.log('🔍 Final suggestions list HTML:', suggestionsList.innerHTML.substring(0, 200) + '...');
}

function createSuggestionElement(suggestion) {
    const div = document.createElement('div');
    div.className = 'suggestion-item';

    const priorityClass = suggestion.priority || 'medium';

    div.innerHTML = `
        <div class="suggestion-header">
            <span class="suggestion-priority ${priorityClass}">${priorityClass}</span>
        </div>
        <h4 class="suggestion-title">${suggestion.title}</h4>
        <p class="suggestion-description">${suggestion.description}</p>
        <div class="suggestion-action">${suggestion.action}</div>
        ${suggestion.keywords ? `
            <div class="suggestion-keywords">
                ${suggestion.keywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
            </div>
        ` : ''}
    `;

    return div;
}

function showSuggestionsLoading() {
    const suggestionsSection = document.getElementById('suggestions-section');
    const loadingState = document.getElementById('suggestions-loading');
    const suggestionsList = document.getElementById('suggestions-list');
    const emptyState = document.getElementById('suggestions-empty');

    suggestionsSection.style.display = 'block';
    loadingState.style.display = 'block';
    suggestionsList.style.display = 'none';
    emptyState.style.display = 'none';
}

function hideSuggestionsLoading() {
    const loadingState = document.getElementById('suggestions-loading');
    const suggestionsList = document.getElementById('suggestions-list');

    loadingState.style.display = 'none';
    suggestionsList.style.display = 'block';
}

function showEmptySuggestions(message) {
    const suggestionsSection = document.getElementById('suggestions-section');
    const emptyState = document.getElementById('suggestions-empty');
    const loadingState = document.getElementById('suggestions-loading');
    const suggestionsList = document.getElementById('suggestions-list');

    loadingState.style.display = 'none';
    suggestionsList.style.display = 'none';
    emptyState.style.display = 'block';

    if (message) {
        emptyState.querySelector('p').textContent = message;
    }
}

// Matching Score Functions
function showMatchingScore(matchingData) {
    console.log('🎯 Showing matching score:', matchingData);

    const matchingSection = document.getElementById('matching-score-section');
    if (matchingSection) {
        matchingSection.style.display = 'block';

        // Update overall score
        const overallScore = Math.round(matchingData.overall_score || 0);
        updateOverallScore(overallScore);

        // Update detailed scores
        updateDetailedScores({
            technical: Math.round(matchingData.technical_score || 0),
            softSkills: Math.round(matchingData.soft_skills_score || 0),
            otherKeywords: Math.round(matchingData.other_keywords_score || 0)
        });

        // Update keyword analysis
        updateKeywordAnalysis({
            matched: matchingData.matched_keywords || 0,
            resume: matchingData.total_resume_keywords || 0,
            jobDescription: matchingData.total_jd_keywords || 0
        });

        // Scroll to matching score section
        matchingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updateOverallScore(score) {
    const scoreValueElement = document.getElementById('overall-score-value');
    const progressElement = document.getElementById('overall-progress');
    const categoryElement = document.getElementById('score-category');

    if (scoreValueElement) {
        scoreValueElement.textContent = `${score}%`;
    }

    if (progressElement) {
        progressElement.style.setProperty('--progress', score);
    }

    if (categoryElement) {
        const category = getScoreCategory(score);
        categoryElement.textContent = category.label;
        categoryElement.className = `score-category ${category.class}`;
    }
}

function updateDetailedScores(scores) {
    // Technical Skills
    const technicalScoreElement = document.getElementById('technical-score');
    const technicalFillElement = document.getElementById('technical-fill');
    if (technicalScoreElement) technicalScoreElement.textContent = `${scores.technical}%`;
    if (technicalFillElement) {
        setTimeout(() => {
            technicalFillElement.style.width = `${scores.technical}%`;
        }, 300);
    }

    // Soft Skills
    const softSkillsScoreElement = document.getElementById('soft-skills-score');
    const softSkillsFillElement = document.getElementById('soft-skills-fill');
    if (softSkillsScoreElement) softSkillsScoreElement.textContent = `${scores.softSkills}%`;
    if (softSkillsFillElement) {
        setTimeout(() => {
            softSkillsFillElement.style.width = `${scores.softSkills}%`;
        }, 500);
    }

    // Other Keywords
    const otherKeywordsScoreElement = document.getElementById('other-keywords-score');
    const otherKeywordsFillElement = document.getElementById('other-keywords-fill');
    if (otherKeywordsScoreElement) otherKeywordsScoreElement.textContent = `${scores.otherKeywords}%`;
    if (otherKeywordsFillElement) {
        setTimeout(() => {
            otherKeywordsFillElement.style.width = `${scores.otherKeywords}%`;
        }, 700);
    }
}

function updateKeywordAnalysis(keywords) {
    const matchedElement = document.getElementById('matched-keywords');
    const resumeElement = document.getElementById('resume-keywords');
    const jdElement = document.getElementById('jd-keywords');

    if (matchedElement) matchedElement.textContent = keywords.matched;
    if (resumeElement) resumeElement.textContent = keywords.resume;
    if (jdElement) jdElement.textContent = keywords.jobDescription;
}

function getScoreCategory(score) {
    if (score >= 80) {
        return { label: 'Excellent Match', class: 'excellent' };
    } else if (score >= 60) {
        return { label: 'Good Match', class: 'good' };
    } else if (score >= 40) {
        return { label: 'Fair Match', class: 'fair' };
    } else {
        return { label: 'Needs Improvement', class: 'poor' };
    }
}

function hideMatchingScore() {
    const matchingSection = document.getElementById('matching-score-section');
    if (matchingSection) {
        matchingSection.style.display = 'none';
    }
}

// Export functions for global access
window.DashboardApp = {
    showNotification,
    updateUserGreeting,
    loadDashboardStats,
    loadRecentScanHistory,
    showMatchingScore,
    hideMatchingScore
};

// Real-time LLM Analysis
function performRealtimeAnalysis() {
    const resumeText = getCurrentResumeText();
    const jobDescriptionText = document.querySelector('.job-textarea').value.trim();

    if (!resumeText || !jobDescriptionText) {
        showNotification('Please upload a resume and enter a job description', 'warning');
        return;
    }

    const token = localStorage.getItem('dr_resume_token');

    showNotification('Performing real-time analysis...', 'info');

    fetch(`${API_BASE_URL}/api/analyze_realtime`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            resume_text: resumeText,
            job_description_text: jobDescriptionText
        })
    })
        .then(response => {
            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                displayRealtimeAnalysis(data.analysis);
                showNotification('Real-time analysis completed!', 'success');

                // Update scan status if provided
                if (data.scan_status) {
                    displayScanStatus(data.scan_status);
                }
            } else {
                if (data.message && data.message.includes('No free scans remaining')) {
                    showNotification('No free scans remaining! Upgrade to premium for unlimited scans.', 'error');
                    if (data.scan_status) {
                        displayScanStatus(data.scan_status);
                    }
                } else {
                    showNotification(data.message || 'Analysis failed', 'error');
                }
            }
        })
        .catch(error => {
            console.error('Real-time analysis error:', error);
            showNotification('Error performing analysis', 'error');
        });
}

function displayRealtimeAnalysis(analysis) {
    // Update the results display with real-time analysis
    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer) return;

    const analysisHTML = `
        <div class="realtime-analysis">
            <div class="analysis-header">
                <h3>Real-Time Analysis Results</h3>
                <span class="timestamp">${new Date(analysis.timestamp).toLocaleString()}</span>
            </div>

            <div class="score-overview">
                <div class="overall-score">
                    <span class="score-value">${analysis.overall_match_score}%</span>
                    <span class="score-label">Overall Match</span>
                </div>

                <div class="category-scores">
                    <div class="score-item">
                        <span class="score">${analysis.category_scores.technical_skills}%</span>
                        <span class="label">Technical Skills</span>
                    </div>
                    <div class="score-item">
                        <span class="score">${analysis.category_scores.soft_skills}%</span>
                        <span class="label">Soft Skills</span>
                    </div>
                    <div class="score-item">
                        <span class="score">${analysis.category_scores.ats_compatibility}%</span>
                        <span class="label">ATS Compatible</span>
                    </div>
                </div>
            </div>

            <div class="detailed-analysis">
                <div class="matched-skills">
                    <h4>✅ Matched Skills (${analysis.detailed_analysis.matched_skills.length})</h4>
                    <div class="skills-list">
                        ${analysis.detailed_analysis.matched_skills.map(skill =>
        `<span class="skill-tag matched">${skill.skill}</span>`
    ).join('')}
                    </div>
                </div>

                <div class="missing-skills">
                    <h4>❌ Missing Skills (${analysis.detailed_analysis.missing_skills.length})</h4>
                    <div class="skills-list">
                        ${analysis.detailed_analysis.missing_skills.map(skill =>
        `<span class="skill-tag missing">${skill.skill}</span>`
    ).join('')}
                    </div>
                </div>
            </div>

            <div class="recommendations">
                <h4>💡 AI Recommendations</h4>
                <div class="recommendations-list">
                    ${analysis.recommendations.map(rec => `
                        <div class="recommendation-item ${rec.priority}">
                            <div class="rec-title">${rec.title}</div>
                            <div class="rec-description">${rec.description}</div>
                            <div class="rec-action">${rec.action}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    resultsContainer.innerHTML = analysisHTML;
    resultsContainer.style.display = 'block';
}

function getCurrentResumeText() {
    // Get the current resume text from the textarea
    const resumeTextarea = document.getElementById('resume-text');
    if (resumeTextarea && resumeTextarea.value.trim()) {
        return resumeTextarea.value.trim();
    }

    // Fallback to localStorage if textarea is empty
    return localStorage.getItem('current_resume_text') || '';
}

// Make functions globally accessible
window.handleLogout = handleLogout;
window.switchTab = switchTab;
window.triggerFileUpload = triggerFileUpload;
window.handleFileSelect = handleFileSelect;
window.handleDragOver = handleDragOver;
window.handleDrop = handleDrop;
window.toggleSaveButton = toggleSaveButton;
window.saveJobDescription = saveJobDescription;
window.generateBasicSuggestions = generateBasicSuggestions;
window.generatePremiumSuggestions = generatePremiumSuggestions;
window.showBasicSuggestions = showBasicSuggestions;
window.showPremiumSuggestions = showPremiumSuggestions;
window.handleJobDescriptionInput = handleJobDescriptionInput;
window.triggerJobFileUpload = triggerJobFileUpload;
window.handleJobFileSelect = handleJobFileSelect;
window.handleJobDragOver = handleJobDragOver;
window.handleJobDragLeave = handleJobDragLeave;
window.handleJobFileDrop = handleJobFileDrop;
window.performRealtimeAnalysis = performRealtimeAnalysis;
window.showSavedResumes = showSavedResumes;
window.closeSavedResumesModal = closeSavedResumesModal;
window.selectResume = selectResume;

// Scan Status Functions
async function loadScanStatus() {
    try {
        const token = localStorage.getItem('dr_resume_token');
        const response = await fetch(`${API_BASE_URL}/api/scan_status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                displayScanStatus(result.scan_status);
            }
        }
    } catch (error) {
        console.error('Error loading scan status:', error);
    }
}

// Display scan status in the UI
function displayScanStatus(scanStatus) {
    console.log('📊 Displaying scan status:', scanStatus);

    // Update the scan count in the scan controls section
    const scanCountElement = document.getElementById('scan-count');
    if (scanCountElement) {
        scanCountElement.textContent = scanStatus.free_scans_remaining;
        console.log('✅ Updated scan count to:', scanStatus.free_scans_remaining);
    }

    // Update the available scans text and styling
    const availableScansElement = document.querySelector('.available-scans');
    if (availableScansElement) {
        if (scanStatus.is_premium) {
            availableScansElement.innerHTML = 'Available scans: <span id="scan-count">Unlimited</span> (Premium)';
            availableScansElement.style.color = '#10b981'; // Green for premium
        } else {
            availableScansElement.innerHTML = `Available scans: <span id="scan-count">${scanStatus.free_scans_remaining}</span>`;

            // Add warning styling if low on scans
            if (scanStatus.free_scans_remaining <= 1) {
                availableScansElement.style.color = '#ef4444'; // Red for low scans
                availableScansElement.style.fontWeight = 'bold';
            } else if (scanStatus.free_scans_remaining <= 2) {
                availableScansElement.style.color = '#f59e0b'; // Orange for warning
            } else {
                availableScansElement.style.color = '#6b7280'; // Default gray
                availableScansElement.style.fontWeight = 'normal';
            }
        }
    }

    // Show upgrade button more prominently if no scans left
    const upgradeBtn = document.querySelector('.upgrade-btn');
    if (upgradeBtn) {
        if (scanStatus.free_scans_remaining === 0 && !scanStatus.is_premium) {
            upgradeBtn.style.backgroundColor = '#ef4444';
            upgradeBtn.style.color = 'white';
            upgradeBtn.style.animation = 'pulse 2s infinite';
            upgradeBtn.textContent = 'Upgrade Now!';
        } else if (scanStatus.free_scans_remaining <= 2 && !scanStatus.is_premium) {
            upgradeBtn.style.backgroundColor = '#f59e0b';
            upgradeBtn.style.color = 'white';
            upgradeBtn.textContent = 'Upgrade';
        } else if (scanStatus.is_premium) {
            upgradeBtn.style.display = 'none'; // Hide upgrade button for premium users
        }
    }

    // Show notification and upgrade prompt if scans are low
    if (scanStatus.free_scans_remaining === 0 && !scanStatus.is_premium) {
        showNotification('No free scans remaining! Upgrade to premium for unlimited scans.', 'warning');
    } else if (scanStatus.free_scans_remaining <= 1 && !scanStatus.is_premium) {
        showUpgradePrompt();
    }
}