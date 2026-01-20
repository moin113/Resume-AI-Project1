// Resume Doctor.Ai - Results Page JavaScript
// Version: 2.0 (Clean - No Dummy Data)

document.addEventListener('DOMContentLoaded', function () {
    console.log('🤖 Resume Doctor.Ai Results Page Loaded');

    // Check authentication
    const token = localStorage.getItem('dr_resume_token');
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        window.location.href = '/login';
        return;
    }

    // Initialize results page
    initializeResultsPage();

    // Update user greeting
    updateUserGreeting();
});

function updateUserGreeting() {
    const userJson = localStorage.getItem('dr_resume_user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            const greetingEl = document.querySelector('.user-greeting');
            const welcomeTitle = document.querySelector('.welcome-title');

            if (greetingEl) {
                greetingEl.textContent = `Hi, ${user.first_name || 'there'}!`;
            }
            if (welcomeTitle) {
                welcomeTitle.textContent = `Welcome, ${user.first_name || 'User'}`;
            }
        } catch (e) {
            console.error('Error parsing user data for greeting', e);
        }
    }
}

function initializeResultsPage() {
    console.log('✅ Results page initialized');

    // Load scan results (Phase 7.2)
    loadScanResults();

    // Set up event listeners
    setupEventListeners();
}

async function loadScanResults() {
    const urlParams = new URLSearchParams(window.location.search);
    const scanId = urlParams.get('scan_id');
    const token = localStorage.getItem('dr_resume_token');

    if (scanId) {
        console.log(`📊 Loading scan results for ID: ${scanId}...`);
        showNotification('Loading scan results from server...', 'info');

        try {
            const response = await fetch(`${API_BASE_URL}/api/scan/${scanId}`, {
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
            if (data.success && data.scan) {
                const scan = data.scan;
                console.log('✅ Scan data loaded:', scan);

                // Update UI (Phase 8.4)
                updateMatchRate(scan.score || scan.overall_match_score || 0);
                displayScanDetails(scan);
                showNotification('Results loaded successfully', 'success');
            } else {
                showNotification('Scan not found or access denied', 'error');
            }
        } catch (error) {
            console.error('Error loading scan:', error);
            showNotification('Failed to load scan results', 'error');
        }
    } else {
        // NO FALLBACK TO DUMMY DATA
        console.log('❌ No scan_id in URL - redirecting to dashboard');
        showNotification('No scan results found. Please perform a scan first.', 'error');

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 2000);
    }
}

function handleAuthError() {
    console.log('❌ Session expired or invalid, cleaning up...');
    localStorage.removeItem('dr_resume_token');
    localStorage.removeItem('dr_resume_refresh_token');
    localStorage.removeItem('dr_resume_user');
    window.location.href = '/login';
}

function displayScanDetails(scan) {
    console.log('📊 displayScanDetails called with real data');

    // Store globally for other functions to access
    window.currentAnalysis = scan;

    // Update summary - ONLY show if backend provides it
    const summaryEl = document.getElementById('ai-summary-text');
    if (summaryEl) {
        if (scan.summary) {
            summaryEl.textContent = scan.summary;
        } else if (scan.detailed_analysis && scan.detailed_analysis.summary) {
            summaryEl.textContent = scan.detailed_analysis.summary;
        } else {
            // No summary from backend - show empty state
            summaryEl.textContent = 'No summary available for this scan.';
            summaryEl.style.color = '#9ca3af';
        }
    }

    // Update progress bars (Phase 7.3)
    updateProgressBars(scan);

    // Update charts/scores
    updateMatchRate(scan.overall_match_score || scan.score || 0);

    // Populate skills sections based on data available
    if (scan.detailed_analysis) {
        populateDetailedAnalysisSections(scan);
    } else {
        populateSkillsFromScan(scan);
    }
}

function populateSkillsFromScan(scan) {
    // Hard skills
    const hardSkillsBody = document.querySelector('#hard-skills-table tbody');
    if (hardSkillsBody) {
        hardSkillsBody.innerHTML = '';

        const matchedSkills = scan.matched_skills || [];
        const missingSkills = scan.missing_skills || [];

        matchedSkills.forEach(skill => {
            const row = `<tr>
                <td class="skill-name">${skill}</td>
                <td class="skill-count found">Found</td>
                <td class="skill-count found">Required</td>
                <td class="match-icon found">✓</td>
            </tr>`;
            hardSkillsBody.insertAdjacentHTML('beforeend', row);
        });

        missingSkills.forEach(skill => {
            const row = `<tr>
                <td class="skill-name">${skill}</td>
                <td class="skill-count missing">Missing</td>
                <td class="skill-count found">Required</td>
                <td class="match-icon missing">✗</td>
            </tr>`;
            hardSkillsBody.insertAdjacentHTML('beforeend', row);
        });

        if (matchedSkills.length === 0 && missingSkills.length === 0) {
            hardSkillsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #9ca3af; padding: 20px;">No skill data available.</td></tr>';
        }
    }
}

function updateMatchRate(percentage) {
    const matchPercentageEl = document.getElementById('match-percentage');
    const progressEl = document.getElementById('match-progress');

    if (matchPercentageEl) {
        matchPercentageEl.textContent = Math.round(percentage) + '%';
    }

    if (progressEl) {
        const degrees = (percentage / 100) * 360;
        const color = percentage >= 80 ? '#10b981' : percentage >= 60 ? '#fbbf24' : '#dc2626';
        progressEl.style.background = `conic-gradient(${color} 0deg ${degrees}deg, #e5e7eb ${degrees}deg 360deg)`;
    }
}

function updateEnhancedMatchRate(analysis) {
    // Alias for backward compatibility if needed elsewhere
    updateMatchRate(analysis.overall_match_score || analysis.score || 0);
}

function updateProgressBars(scan) {
    const categoryScores = scan.category_scores || {};

    // Searchability / ATS
    const atsScore = categoryScores.ats_compatibility || scan.ats_compatibility || 0;
    updateProgressBar('searchability', atsScore);

    // Hard Skills
    const techScore = categoryScores.technical_skills || 0;
    updateProgressBar('hard-skills', techScore);

    // Soft Skills
    const softScore = categoryScores.soft_skills || 0;
    updateProgressBar('soft-skills', softScore);

    // Recruiter Tips (Experience match)
    const expScore = categoryScores.experience_match || 0;
    updateProgressBar('recruiter-tips', expScore);

    // Formatting
    const formattingScore = categoryScores.formatting || 100; // Default to 100 if not provided
    updateProgressBar('formatting', formattingScore);
}

function updateProgressBar(id, score) {
    const fill = document.querySelector(`.progress-fill.${id}`);
    const count = document.getElementById(`${id}-count`);

    if (fill) {
        fill.style.width = `${score}%`;
    }

    if (count) {
        if (score >= 90) count.textContent = 'Excellent!';
        else if (score >= 70) count.textContent = 'Good Match';
        else if (score >= 50) count.textContent = 'Fair Match';
        else count.textContent = 'Needs Focus';
    }
}

function populateDetailedAnalysisSections(analysis) {
    populateRecruiterTipsFromAnalysis(analysis);
    populateHardSkillsFromAnalysis(analysis);
    populateSoftSkillsFromAnalysis(analysis);
    populateFormattingFromAnalysis(analysis);
}

function populateRecruiterTipsFromAnalysis(analysis) {
    const container = document.getElementById('recruiter-tips-items');
    if (!container || !analysis.recommendations) return;

    container.innerHTML = '';

    const recruiterTips = analysis.recommendations.filter(rec =>
        rec.priority === 'critical' || rec.priority === 'high' || rec.type === 'skill_gap'
    ).slice(0, 6);

    recruiterTips.forEach(tip => {
        const itemEl = document.createElement('div');
        itemEl.className = `analysis-item ${tip.priority === 'critical' ? 'error' : tip.priority === 'high' ? 'warning' : 'success'}`;
        const statusIcon = tip.priority === 'critical' ? '🚨' : tip.priority === 'high' ? '⚠️' : '💡';

        itemEl.innerHTML = `
            <div class="item-icon">${statusIcon}</div>
            <div class="item-content">
                <div class="item-title">${tip.title}</div>
                <div class="item-description">${tip.description}</div>
                ${tip.action ? `<div class="item-action" style="margin-top: 8px; font-size: 0.9em; color: #6b7280;">
                    <strong>Action:</strong> ${tip.action}
                </div>` : ''}
            </div>
        `;
        container.appendChild(itemEl);
    });

    if (recruiterTips.length === 0) {
        container.innerHTML = '<div style="padding: 20px; color: #6b7280; text-align: center;">No specific recruiter tips available.</div>';
    }
}

function populateHardSkillsFromAnalysis(analysis) {
    const tbody = document.querySelector('#hard-skills-table tbody');
    if (!tbody || !analysis.detailed_analysis) return;

    tbody.innerHTML = '';
    const matchedSkills = analysis.detailed_analysis.matched_skills || [];
    const missingSkills = analysis.detailed_analysis.missing_skills || [];

    // Filter and add matched skills
    matchedSkills.forEach(skill => {
        const skillName = typeof skill === 'string' ? skill : (skill.skill || '');
        if (!skillName) return;

        const row = `<tr>
            <td class="skill-name">${skillName}</td>
            <td class="skill-count found">Found</td>
            <td class="skill-count found">Required</td>
            <td class="match-icon found">✓</td>
        </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });

    // Filter and add missing skills
    missingSkills.forEach(skill => {
        const skillName = typeof skill === 'string' ? skill : (skill.skill || '');
        if (!skillName) return;

        const row = `<tr>
            <td class="skill-name">${skillName}</td>
            <td class="skill-count missing">Missing</td>
            <td class="skill-count found">Required</td>
            <td class="match-icon missing">✗</td>
        </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });

    if (tbody.children.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #9ca3af; padding: 20px;">No technical skill data.</td></tr>';
    }
}

function populateSoftSkillsFromAnalysis(analysis) {
    const tbody = document.querySelector('#soft-skills-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    // Typically our LLM service might not separate soft skills clearly unless instructed
    // If we don't have them separately, this section will be empty but clean.
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #9ca3af; padding: 20px;">Soft skills analysis is incorporated in the overall scan results.</td></tr>';
}

function populateFormattingFromAnalysis(analysis) {
    const container = document.getElementById('formatting-items');
    if (!container || !analysis.recommendations) return;

    container.innerHTML = '';
    const formattingTips = analysis.recommendations.filter(rec =>
        rec.category === 'formatting' || rec.type === 'formatting'
    ).slice(0, 5);

    formattingTips.forEach(tip => {
        const itemEl = document.createElement('div');
        const itemType = tip.priority === 'high' ? 'warning' : tip.priority === 'critical' ? 'error' : 'success';
        itemEl.className = `analysis-item ${itemType}`;
        const statusIcon = itemType === 'error' ? '✗' : itemType === 'warning' ? '⚠️' : '✓';

        itemEl.innerHTML = `
            <div class="item-icon">${statusIcon}</div>
            <div class="item-content">
                <div class="item-title">${tip.title}</div>
                <div class="item-description">${tip.description}</div>
            </div>
        `;
        container.appendChild(itemEl);
    });

    if (formattingTips.length === 0) {
        container.innerHTML = '<div style="padding: 20px; color: #6b7280; text-align: center;">Formatting looks good! No major issues detected.</div>';
    }
}

function setupEventListeners() {
    // Setup any specific results page interactions
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add essential styles dynamic
    if (!document.getElementById('notif-styles')) {
        const s = document.createElement('style');
        s.id = 'notif-styles';
        s.innerHTML = `.notification { position: fixed; bottom: 20px; right: 20px; padding: 12px 24px; border-radius: 8px; color: white; z-index: 9999; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s ease; }
        .notification-info { background: #3b82f6; }
        .notification-success { background: #10b981; }
        .notification-error { background: #ef4444; }`;
        document.head.appendChild(s);
    }

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 3000);
    }, 3000);
}

function handleLogout() {
    localStorage.removeItem('dr_resume_token');
    localStorage.removeItem('dr_resume_refresh_token');
    localStorage.removeItem('dr_resume_user');
    window.location.href = '/login';
}

function uploadAndRescan() {
    window.location.href = '/dashboard';
}
