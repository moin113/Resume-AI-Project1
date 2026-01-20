// Resume Doctor.Ai - Results Page JavaScript

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
            if (greetingEl) {
                greetingEl.textContent = `Hi, ${user.first_name || 'there'}!`;
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
                updateMatchRate(scan.score);
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
        // Fallback to localStorage (Phase 8.4 fallback)
        const scanResult = JSON.parse(localStorage.getItem('currentScanResult') || localStorage.getItem('currentScanData') || '{}');
        if (scanResult.success || scanResult.overall_match_score) {
            console.log('📊 Using data from localStorage');
            displayScanDetails(scanResult);
            showNotification('Displaying sample results', 'info');
        } else {
            console.log('📝 No scan data found in URL or localStorage');
            showNotification('No scan results found. Please perform a scan first.', 'warning');
        }
    }
}

function handleAuthError() {
    localStorage.removeItem('dr_resume_token');
    window.location.href = '/login';
}

function displayScanDetails(scan) {
    console.log('📊 displayScanDetails called with:', scan);

    // Store globally for other functions to access
    window.currentAnalysis = scan;

    // Update summary
    const summaryEl = document.getElementById('ai-summary-text');
    if (summaryEl) {
        summaryEl.textContent = scan.summary || 'Scan results analyzed successfully.';
    }

    // Update progress bars (Phase 7.3)
    updateProgressBars(scan);

    // Update charts/scores
    updateEnhancedMatchRate(scan);

    // Populate skills sections based on data available
    if (scan.detailed_analysis) {
        console.log('🎯 Using enhanced detailed analysis for UI');
        populateDetailedAnalysisSections(scan);
    } else {
        console.log('📝 Using basic skills population');
        populateSkillsFromScan(scan);
    }
}

function populateSkillsFromScan(scan) {
    // Hard skills
    const hardSkillsBody = document.querySelector('#hard-skills-table tbody');
    if (hardSkillsBody) {
        hardSkillsBody.innerHTML = '';

        // Matched
        scan.matched_skills.forEach(skill => {
            const row = `<tr>
                <td class="skill-name">${skill}</td>
                <td class="skill-count found">Found</td>
                <td class="skill-count found">Required</td>
                <td class="match-icon found">✓</td>
            </tr>`;
            hardSkillsBody.insertAdjacentHTML('beforeend', row);
        });

        // Missing
        scan.missing_skills.forEach(skill => {
            const row = `<tr>
                <td class="skill-name">${skill}</td>
                <td class="skill-count missing">Missing</td>
                <td class="skill-count found">Required</td>
                <td class="match-icon missing">✗</td>
            </tr>`;
            hardSkillsBody.insertAdjacentHTML('beforeend', row);
        });
    }
}

function updateMatchRate(percentage) {
    const matchPercentageEl = document.getElementById('match-percentage');
    const progressEl = document.getElementById('match-progress');

    if (matchPercentageEl) {
        matchPercentageEl.textContent = percentage + '%';
    }

    if (progressEl) {
        // Update circular progress with colors matching the screenshot
        const degrees = (percentage / 100) * 360;
        // Use yellow/orange for 72% like in the screenshot
        const color = percentage >= 80 ? '#10b981' : percentage >= 60 ? '#fbbf24' : '#dc2626';
        const greenStart = Math.min(degrees * 0.3, 108); // Small green section
        progressEl.style.background = `conic-gradient(${color} 0deg ${degrees}deg, #10b981 ${degrees}deg ${degrees + greenStart}deg, #e5e7eb ${degrees + greenStart}deg 360deg)`;
    }
}

function updateEnhancedMatchRate(analysis) {
    const score = analysis.overall_match_score || analysis.score || 0;
    console.log('📊 Updating enhanced match rate:', score);

    const matchPercentageEl = document.getElementById('match-percentage');
    const progressEl = document.getElementById('match-progress');

    if (matchPercentageEl) {
        matchPercentageEl.textContent = Math.round(score) + '%';
    }

    if (progressEl) {
        const percentage = score;
        const degrees = (percentage / 100) * 360;
        const color = percentage >= 80 ? '#10b981' : percentage >= 60 ? '#fbbf24' : '#dc2626';
        progressEl.style.background = `conic-gradient(${color} 0deg ${degrees}deg, #e5e7eb ${degrees}deg 360deg)`;
    }
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

function displayEnhancedAnalysisResults(analysis) {
    console.log('🎯 Displaying enhanced LLM analysis results');

    // Update the main results area with enhanced analysis
    const resultsMain = document.querySelector('.results-main');
    if (!resultsMain) return;

    // Create enhanced results HTML
    const enhancedResultsHTML = `
        <div class="enhanced-analysis-header">
            <h1>Enhanced LLM Analysis Results</h1>
            <div class="analysis-timestamp">
                Analyzed: ${new Date(analysis.timestamp).toLocaleString()}
            </div>
        </div>

        <div class="enhanced-scores-grid">
            <div class="score-card primary">
                <div class="score-value">${analysis.overall_match_score}%</div>
                <div class="score-label">Overall Match</div>
            </div>
            <div class="score-card">
                <div class="score-value">${analysis.category_scores.technical_skills}%</div>
                <div class="score-label">Technical Skills</div>
            </div>
            <div class="score-card">
                <div class="score-value">${analysis.category_scores.soft_skills}%</div>
                <div class="score-label">Soft Skills</div>
            </div>
            <div class="score-card">
                <div class="score-value">${analysis.category_scores.ats_compatibility}%</div>
                <div class="score-label">ATS Compatible</div>
            </div>
        </div>

        <div class="analysis-sections">
            <div class="analysis-section">
                <h3>✅ Matched Skills (${analysis.detailed_analysis.matched_skills.length})</h3>
                <div class="skills-grid">
                    ${analysis.detailed_analysis.matched_skills.map(skill => `
                        <div class="skill-item matched">
                            <span class="skill-name">${skill.skill}</span>
                            <span class="skill-freq">Resume: ${skill.resume_freq || 'N/A'} | Job: ${skill.jd_freq || 'N/A'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="analysis-section">
                <h3>❌ Missing Skills (${analysis.detailed_analysis.missing_skills.length})</h3>
                <div class="skills-grid">
                    ${analysis.detailed_analysis.missing_skills.map(skill => `
                        <div class="skill-item missing">
                            <span class="skill-name">${skill.skill}</span>
                            <span class="skill-importance">Importance: ${skill.importance || 'N/A'}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="analysis-section">
                <h3>💡 AI Recommendations</h3>
                <div class="recommendations-grid">
                    ${analysis.recommendations.map(rec => `
                        <div class="recommendation-card ${rec.priority}">
                            <div class="rec-header">
                                <span class="rec-title">${rec.title}</span>
                                <span class="rec-priority">${rec.priority}</span>
                            </div>
                            <div class="rec-description">${rec.description}</div>
                            <div class="rec-action">${rec.action}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Insert enhanced results at the beginning
    resultsMain.insertAdjacentHTML('afterbegin', enhancedResultsHTML);
}

function populateDetailedAnalysisSections(analysis) {
    console.log('📊 Populating detailed analysis sections with real data:', analysis);

    // Populate Recruiter Tips with real recommendations
    populateRecruiterTipsFromAnalysis(analysis);

    // Populate Hard Skills table with real data
    populateHardSkillsFromAnalysis(analysis);

    // Populate Soft Skills table with real data
    populateSoftSkillsFromAnalysis(analysis);

    // Populate Formatting section with real recommendations
    populateFormattingFromAnalysis(analysis);
}

function populateRecruiterTipsFromAnalysis(analysis) {
    const container = document.getElementById('recruiter-tips-items');
    if (!container || !analysis.recommendations) return;

    container.innerHTML = '';

    // Filter recommendations for recruiter tips (high priority items)
    const recruiterTips = analysis.recommendations.filter(rec =>
        rec.priority === 'critical' || rec.priority === 'high' || rec.type === 'skill_gap'
    ).slice(0, 6); // Show top 6 tips

    recruiterTips.forEach(tip => {
        const itemEl = document.createElement('div');
        itemEl.className = `analysis-item ${tip.priority === 'critical' ? 'error' : tip.priority === 'high' ? 'warning' : 'success'}`;

        const statusIcon = tip.priority === 'critical' ? '🚨' : tip.priority === 'high' ? '⚠️' : '💡';

        itemEl.innerHTML = `
            <div class="item-icon">${statusIcon}</div>
            <div class="item-content">
                <div class="item-title">${tip.title}</div>
                <div class="item-description">${tip.description}</div>
                <div class="item-action" style="margin-top: 8px; font-size: 0.9em; color: #6b7280;">
                    <strong>Action:</strong> ${tip.action}
                </div>
            </div>
        `;

        container.appendChild(itemEl);
    });
}

function populateHardSkillsFromAnalysis(analysis) {
    const table = document.getElementById('hard-skills-table');
    if (!table || !analysis.detailed_analysis) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Get technical skills from matched and missing skills
    const matchedSkills = analysis.detailed_analysis.matched_skills || [];
    const missingSkills = analysis.detailed_analysis.missing_skills || [];

    // Add matched technical skills
    matchedSkills.filter(skill => {
        const skillObj = typeof skill === 'string' ? { skill: skill, category: 'technical' } : skill;
        return skillObj.category !== 'soft_skills' && skillObj.match_type !== 'soft';
    }).forEach(skill => {
        const skillName = typeof skill === 'string' ? skill : skill.skill;
        const resumeFreq = typeof skill === 'object' ? (skill.resume_freq || 'Found') : 'Found';
        const jdFreq = typeof skill === 'object' ? (skill.jd_freq || 'Required') : 'Required';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="skill-name">${skillName}</td>
            <td class="skill-count found">${resumeFreq}</td>
            <td class="skill-count found">${jdFreq}</td>
            <td class="match-icon found">✓</td>
        `;
        tbody.appendChild(row);
    });

    // Add missing technical skills (show as gaps)
    const filteredMissing = missingSkills.filter(skill => {
        const skillObj = typeof skill === 'string' ? { skill: skill, category: 'technical' } : skill;
        return skillObj.category !== 'soft_skills';
    });

    filteredMissing.slice(0, 10).forEach(skill => {
        const skillName = typeof skill === 'string' ? skill : skill.skill;
        const jdFreq = typeof skill === 'object' ? (skill.jd_freq || 'Required') : 'Required';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="skill-name">${skillName}</td>
            <td class="skill-count missing">Missing</td>
            <td class="skill-count found">${jdFreq}</td>
            <td class="match-icon missing">✗</td>
        `;
        tbody.appendChild(row);
    });
}

function populateSoftSkillsFromAnalysis(analysis) {
    const table = document.getElementById('soft-skills-table');
    if (!table || !analysis.detailed_analysis) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Get soft skills from matched and missing skills
    const matchedSkills = analysis.detailed_analysis.matched_skills || [];
    const missingSkills = analysis.detailed_analysis.missing_skills || [];

    // Define soft skill keywords to identify soft skills
    const softSkillKeywords = [
        'leadership', 'communication', 'teamwork', 'collaboration', 'problem solving',
        'critical thinking', 'time management', 'project management', 'adaptability',
        'creativity', 'innovation', 'analytical', 'interpersonal', 'presentation',
        'negotiation', 'mentoring', 'coaching', 'organization', 'planning'
    ];

    // Function to check if a skill is a soft skill
    const isSoftSkill = (skillName) => {
        const skillLower = skillName.toLowerCase();
        return softSkillKeywords.some(keyword =>
            skillLower.includes(keyword) || keyword.includes(skillLower)
        );
    };

    // Add matched soft skills - check both category and skill name
    matchedSkills.filter(skill => {
        const skillObj = typeof skill === 'string' ? { skill: skill, category: 'soft_skills' } : skill;
        const skillName = skillObj.skill || (typeof skill === 'string' ? skill : '');
        return skillObj.category === 'soft_skills' || skillObj.match_type === 'soft' || isSoftSkill(skillName);
    }).forEach(skill => {
        const skillName = typeof skill === 'string' ? skill : skill.skill;
        const resumeFreq = typeof skill === 'object' ? (skill.resume_freq || 'Found') : 'Found';
        const jdFreq = typeof skill === 'object' ? (skill.jd_freq || 'Required') : 'Required';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="skill-name">${skillName}</td>
            <td class="skill-count found">${resumeFreq}</td>
            <td class="skill-count found">${jdFreq}</td>
            <td class="match-icon found">✓</td>
        `;
        tbody.appendChild(row);
    });

    // Add missing soft skills - check both category and skill name
    missingSkills.filter(skill => {
        const skillObj = typeof skill === 'string' ? { skill: skill, category: 'soft_skills' } : skill;
        const skillName = skillObj.skill || (typeof skill === 'string' ? skill : '');
        return skillObj.category === 'soft_skills' || isSoftSkill(skillName);
    }).slice(0, 5).forEach(skill => {
        const skillName = typeof skill === 'string' ? skill : skill.skill;
        const jdFreq = typeof skill === 'object' ? (skill.jd_freq || 'Required') : 'Required';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="skill-name">${skillName}</td>
            <td class="skill-count missing">Missing</td>
            <td class="skill-count found">${jdFreq}</td>
            <td class="match-icon missing">✗</td>
        `;
        tbody.appendChild(row);
    });

    // If no soft skills found, show a message
    if (tbody.children.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="4" class="no-skills-message">No soft skills detected in analysis</td>
        `;
        tbody.appendChild(row);
    }
}

function populateFormattingFromAnalysis(analysis) {
    const container = document.getElementById('formatting-items');
    if (!container || !analysis.recommendations) return;

    container.innerHTML = '';

    // Filter recommendations for formatting and content improvements
    const formattingTips = analysis.recommendations.filter(rec =>
        rec.category === 'formatting' || rec.category === 'content' || rec.type === 'formatting' || rec.type === 'keyword_optimization'
    ).slice(0, 5); // Show top 5 formatting tips

    // If no specific formatting recommendations, add some general ones
    if (formattingTips.length === 0) {
        formattingTips.push(
            {
                title: 'ATS Optimization',
                description: 'Your resume appears to be well-formatted for ATS systems',
                type: 'success'
            },
            {
                title: 'Document Structure',
                description: 'Good use of standard sections and formatting',
                type: 'success'
            }
        );
    }

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
                ${tip.action ? `<div class="item-action" style="margin-top: 8px; font-size: 0.9em; color: #6b7280;">
                    <strong>Suggestion:</strong> ${tip.action}
                </div>` : ''}
            </div>
        `;

        container.appendChild(itemEl);
    });
}

function generateLLMAnalysis() {
    console.log('🤖 Generating real-time LLM analysis...');

    // Use enhanced analysis data if available
    if (window.currentAnalysis && window.currentAnalysis.overall_match_score) {
        console.log('📊 Using enhanced LLM analysis data');
        displayEnhancedAnalysisResults(window.currentAnalysis);
        return;
    }

    // Use real analysis data if available (fallback)
    if (window.currentAnalysis) {
        console.log('📊 Using basic analysis data');
        populateRealAnalysisData(window.currentAnalysis);
        return;
    }

    console.log('⚠️ No real analysis available, using fallback data');
    // Fallback analysis data for demo
    const analysisData = {
        searchability: [
            {
                type: 'error',
                title: 'ATS Tip',
                description: 'Adding this job\'s company name and web address can help us provide your ATS-specific tips.',
                action: 'Update scan info/mention'
            },
            {
                type: 'error',
                title: 'Contact Information',
                description: 'We did not find an address in your resume. Recruiters use your address to validate your location for job matches.'
            },
            {
                type: 'success',
                title: 'Contact Information',
                description: 'You provided your email. Recruiters use your email to contact you for job matches.'
            },
            {
                type: 'success',
                title: 'Contact Information',
                description: 'You provided your phone number.'
            },
            {
                type: 'success',
                title: 'Summary',
                description: 'We found a summary section on your resume. Good job! The summary provides a quick overview of the candidate\'s qualifications, helping recruiters and hiring managers promptly grasp the value the candidate can offer to the position.'
            },
            {
                type: 'error',
                title: 'Section Headings',
                description: 'We couldn\'t find an "Education" section in your resume. Ensure your resume includes an education section labeled as "Education" to ensure ATS can accurately recognize your academic qualifications.'
            },
            {
                type: 'success',
                title: 'Section Headings',
                description: 'We found the work experience section in your resume.'
            }
        ],
        hardSkills: [
            {
                type: 'error',
                title: 'Education Match',
                description: 'The job description does not list required or preferred education, but your education is noted.',
                action: 'Update required education level'
            },
            {
                type: 'success',
                title: 'File Type',
                description: 'You are using a .pdf resume, which is the preferred format for most ATS systems.'
            },
            {
                type: 'success',
                title: 'File Name',
                description: 'Your file name doesn\'t contain special characters that could cause an error in ATS.'
            },
            {
                type: 'success',
                title: 'Readability',
                description: 'Your file name is concise and readable.'
            },
            {
                type: 'error',
                title: 'Job Title Match',
                description: 'The Senior Product Manager job title provided or found in the job description was not found in your resume. We recommend having the exact title of the job for which you\'re applying in your resume. This ensures you\'ll be found when a recruiter searches by job title. If you haven\'t held this position before, include it as part of your summary statement.',
                action: 'Update scan information'
            }
        ],
        softSkills: [
            {
                type: 'error',
                title: 'Innovation',
                description: 'This skill was not found in your resume but appears 2 times in the job description.'
            },
            {
                type: 'error',
                title: 'Strategic Thinking',
                description: 'This skill was not found in your resume but appears 1 time in the job description.'
            },
            {
                type: 'success',
                title: 'High Quality',
                description: 'Found 1 time in your resume and 1 time in the job description.'
            },
            {
                type: 'success',
                title: 'Competitive',
                description: 'Found 3 times in your resume and 1 time in the job description.'
            },
            {
                type: 'success',
                title: 'Proactively',
                description: 'Found 1 time in your resume and 1 time in the job description.'
            },
            {
                type: 'error',
                title: 'Judgment',
                description: 'This skill was not found in your resume but appears 1 time in the job description.'
            }
        ],
        recruiterTips: [
            {
                type: 'warning',
                title: 'Job Level Match',
                description: 'You have more years of experience than the role requires. Keep in mind that our assessment considers total experience, not just relevant years. If you\'re changing fields or have specific reasons for pursuing this role, consider adding a brief explanation in your application to provide context.'
            },
            {
                type: 'success',
                title: 'Measurable Results',
                description: 'There are five or more mentions of measurable results in your resume. Keep it up - employers like to see the impact and results that you had on the job.',
                action: 'View Measurable Results'
            },
            {
                type: 'error',
                title: 'Paragraph Length',
                description: 'Some of your paragraphs are longer than 40 words. Consider shortening them for readability to bring attention to your skills and accomplishments.',
                action: 'View Paragraph Length'
            },
            {
                type: 'warning',
                title: 'Resume Tone',
                description: 'We\'ve found some negative phrases or cliches in your resume.',
                action: 'View Negative Words'
            },
            {
                type: 'error',
                title: 'Web Presence',
                description: 'Consider adding a website or LinkedIn url to build your web credibility. Recruiters appreciate the convenience and credibility associated with a professional website.'
            }
        ],
        formatting: [
            {
                type: 'success',
                title: 'Resume Tone',
                description: 'Your resume makes use of sparse bold styling. This increases readability for a recruiter.'
            },
            {
                type: 'success',
                title: 'Font Color',
                description: 'Your font is in a readable color.'
            },
            {
                type: 'success',
                title: 'Font Check',
                description: 'Your resume does not overuse different fonts.'
            },
            {
                type: 'success',
                title: 'Standard Font',
                description: 'Your resume uses a standard font.'
            },
            {
                type: 'success',
                title: 'Font Size',
                description: 'The average font size of your resume meets readability and ATS standards.'
            },
            {
                type: 'success',
                title: 'Images',
                description: 'Your resume doesn\'t contain images.'
            },
            {
                type: 'success',
                title: 'Layout',
                description: 'Your resume does not contain any tables.'
            },
            {
                type: 'success',
                title: 'Text Alignment',
                description: 'Your resume primarily uses standardized left alignment for text sections.'
            },
            {
                type: 'success',
                title: 'Headers and Footers',
                description: 'Your resume does not contain information in footers.'
            },
            {
                type: 'success',
                title: 'Page Setup',
                description: 'Your resume does not contain information in headers.'
            },
            {
                type: 'success',
                title: 'Margins',
                description: 'Your margin sizes are all consistent and standard sizes.'
            },
            {
                type: 'success',
                title: 'Document Size',
                description: 'Your document page size is standard.'
            }
        ]
    };

    // Populate analysis sections
    populateAnalysisSection('recruiter-tips-items', analysisData.recruiterTips);
    populateAnalysisSection('formatting-items', analysisData.formatting);

    // Populate skills tables
    populateSkillsTable('hard-skills-table', getHardSkillsData());
    populateSkillsTable('soft-skills-table', getSoftSkillsData());
}

function populateAnalysisSection(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = `analysis-item ${item.type}`;

        const statusIcon = getStatusIcon(item.type);

        itemEl.innerHTML = `
            <div class="item-icon">
                ${statusIcon}
            </div>
            <div class="item-content">
                <div class="item-title">${item.title}</div>
                <div class="item-description">${item.description}</div>
            </div>
        `;

        container.appendChild(itemEl);
    });
}

function getStatusIcon(type) {
    switch (type) {
        case 'success':
            return '✓';
        case 'error':
            return '✗';
        case 'warning':
            return '⚠️';
        default:
            return '•';
    }
}

function updateScoreIndicators(analysisData) {
    // Update hard skills score
    const hardSkillsErrors = analysisData.hardSkills.filter(item => item.type === 'error').length;
    const hardSkillsScoreEl = document.getElementById('hard-skills-score');
    if (hardSkillsScoreEl) {
        hardSkillsScoreEl.textContent = hardSkillsErrors > 0 ? `${hardSkillsErrors} issues to fix` : 'All good!';
        hardSkillsScoreEl.className = hardSkillsErrors > 0 ? 'score-text' : 'score-text success';
    }

    // Update recruiter tips score
    const recruiterTipsErrors = analysisData.recruiterTips.filter(item => item.type === 'error' || item.type === 'warning').length;
    const recruiterTipsScoreEl = document.getElementById('recruiter-tips-score');
    if (recruiterTipsScoreEl) {
        recruiterTipsScoreEl.textContent = recruiterTipsErrors > 0 ? `${recruiterTipsErrors} issues to fix` : 'All good!';
        recruiterTipsScoreEl.className = recruiterTipsErrors > 0 ? 'score-text' : 'score-text success';
    }
}

function getHardSkillsData() {
    // Enhanced data with more realistic skill analysis
    return [
        { skill: 'Python', resume: 12, jobDescription: 8 },
        { skill: 'JavaScript', resume: 15, jobDescription: 6 },
        { skill: 'React', resume: 8, jobDescription: 5 },
        { skill: 'SQL', resume: 6, jobDescription: 4 },
        { skill: 'AWS', resume: 'X', jobDescription: 7 },
        { skill: 'Machine Learning', resume: 3, jobDescription: 5 },
        { skill: 'Docker', resume: 'X', jobDescription: 3 },
        { skill: 'Git', resume: 4, jobDescription: 2 },
        { skill: 'API Development', resume: 7, jobDescription: 4 },
        { skill: 'Agile', resume: 5, jobDescription: 3 },
        { skill: 'Node.js', resume: 'X', jobDescription: 4 },
        { skill: 'Database Design', resume: 4, jobDescription: 3 }
    ];
}

function getSoftSkillsData() {
    // Enhanced data with more comprehensive soft skills
    return [
        { skill: 'Leadership', resume: 8, jobDescription: 6 },
        { skill: 'Communication', resume: 12, jobDescription: 5 },
        { skill: 'Problem Solving', resume: 9, jobDescription: 4 },
        { skill: 'Team Collaboration', resume: 7, jobDescription: 3 },
        { skill: 'Project Management', resume: 6, jobDescription: 5 },
        { skill: 'Critical Thinking', resume: 'X', jobDescription: 3 },
        { skill: 'Adaptability', resume: 4, jobDescription: 2 },
        { skill: 'Time Management', resume: 3, jobDescription: 2 },
        { skill: 'Innovation', resume: 'X', jobDescription: 4 },
        { skill: 'Customer Focus', resume: 5, jobDescription: 3 },
        { skill: 'Strategic Planning', resume: 'X', jobDescription: 2 },
        { skill: 'Mentoring', resume: 3, jobDescription: 1 }
    ];
}

function populateSkillsTable(tableId, skillsData) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Clear existing content
    tbody.innerHTML = '';

    // Populate skills table
    skillsData.forEach(skill => {
        const row = document.createElement('tr');

        const resumeCount = skill.resume === 'X' ? 'X' : skill.resume;
        const resumeClass = skill.resume === 'X' ? 'missing' : 'found';
        const matchIcon = skill.resume === 'X' ? '✗' : '✓';
        const matchClass = skill.resume === 'X' ? 'missing' : 'found';

        row.innerHTML = `
            <td class="skill-name">${skill.skill}</td>
            <td class="skill-count ${resumeClass}">${resumeCount}</td>
            <td class="skill-count found">${skill.jobDescription}</td>
            <td class="match-icon ${matchClass}">${matchIcon}</td>
        `;

        tbody.appendChild(row);
    });
}

function populateRealAnalysisData(analysis) {
    console.log('📊 Populating real analysis data:', analysis);

    // Populate recruiter tips with real data
    populateAnalysisSection('recruiter-tips-items', analysis.recruiterTips);

    // Populate formatting analysis with real data
    populateAnalysisSection('formatting-items', analysis.formattingAnalysis);

    // Populate skills tables with real data
    populateSkillsTableReal('hard-skills-table', analysis.skillComparison.technical);
    populateSkillsTableReal('soft-skills-table', analysis.skillComparison.soft);

    console.log('✅ Real analysis data populated successfully');
}

function populateSkillsTableReal(tableId, skillData) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Clear existing content
    tbody.innerHTML = '';

    // Add matched skills
    skillData.matched.forEach(skill => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="skill-name">${skill.skill}</td>
            <td class="skill-count found">${skill.resumeCount}</td>
            <td class="skill-count found">${skill.jobCount}</td>
            <td class="match-icon found">✓</td>
        `;
        tbody.appendChild(row);
    });

    // Add missing skills
    skillData.missing.forEach(skill => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="skill-name">${skill.skill}</td>
            <td class="skill-count missing">X</td>
            <td class="skill-count found">${skill.jobCount}</td>
            <td class="match-icon missing">✗</td>
        `;
        tbody.appendChild(row);
    });
}

function updateProgressBars(progressStats) {
    console.log('📊 Updating progress bars with real data:', progressStats);

    // Update searchability
    updateProgressBar('searchability', progressStats.searchability);

    // Update hard skills
    updateProgressBar('hard-skills', progressStats.hardSkills);

    // Update soft skills
    updateProgressBar('soft-skills', progressStats.softSkills);

    // Update recruiter tips
    updateProgressBar('recruiter-tips', progressStats.recruiterTips);

    // Update formatting
    updateProgressBar('formatting', progressStats.formatting);
}

function updateProgressBar(category, data) {
    const countElement = document.getElementById(`${category}-count`);
    const progressElement = document.querySelector(`.progress-fill.${category.replace('-', '')}`);

    if (countElement) {
        if (data.issues === 0) {
            countElement.textContent = 'All good!';
            countElement.style.color = '#10b981';
        } else {
            countElement.textContent = `${data.issues} issue${data.issues > 1 ? 's' : ''} to fix`;
            countElement.style.color = '#3b82f6';
        }
    }

    if (progressElement) {
        progressElement.style.width = `${data.progress}%`;
    }
}

function updateProgressBarsDefault() {
    // Default progress bars for demo
    updateProgressBar('searchability', { issues: 5, progress: 60 });
    updateProgressBar('hard-skills', { issues: 11, progress: 30 });
    updateProgressBar('soft-skills', { issues: 3, progress: 70 });
    updateProgressBar('recruiter-tips', { issues: 4, progress: 40 });
    updateProgressBar('formatting', { issues: 0, progress: 100 });
}

function setupEventListeners() {
    // Add any additional event listeners here
    console.log('📝 Event listeners set up');
}

// Tab switching functionality
function switchContentTab(tabName) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));

    event.target.classList.add('active');

    // Here you could show different content based on the tab
    console.log('Switched to tab:', tabName);
}

// Action handlers
function uploadAndRescan() {
    console.log('Upload & rescan clicked');
    window.location.href = '/dashboard';
}

function powerEdit() {
    console.log('Power Edit clicked');
    // Implement power edit functionality
    alert('Power Edit feature coming soon!');
}

function guideMe() {
    console.log('Guide me clicked');
    // Implement guide functionality
    alert('Guide feature coming soon!');
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

TECHNICAL SKILLS
• Programming Languages: JavaScript, Python, Java, TypeScript, SQL
• Frontend: React, Vue.js, HTML5, CSS3, Bootstrap, Material-UI
• Backend: Node.js, Express, Django, Flask, RESTful APIs
• Databases: PostgreSQL, MongoDB, MySQL, Redis
• Cloud & DevOps: AWS, Docker, Kubernetes, CI/CD, Jenkins
• Tools: Git, JIRA, Slack, VS Code, Postman

PROFESSIONAL EXPERIENCE

Senior Software Engineer | TechCorp Inc. | 2021 - Present
• Led development of customer-facing web application serving 100K+ users
• Implemented microservices architecture reducing system downtime by 60%
• Mentored 3 junior developers and conducted code reviews
• Collaborated with product managers and designers on feature planning
• Technologies: React, Node.js, AWS, PostgreSQL

Software Engineer | StartupXYZ | 2019 - 2021
• Developed and maintained e-commerce platform handling $2M+ in transactions
• Built responsive web interfaces improving user engagement by 35%
• Integrated third-party APIs and payment processing systems
• Participated in agile development cycles and sprint planning
• Technologies: Vue.js, Python, Django, MySQL

Junior Developer | WebSolutions | 2018 - 2019
• Created dynamic websites and web applications for small businesses
• Worked with clients to gather requirements and deliver solutions
• Maintained and updated existing codebases
• Technologies: HTML, CSS, JavaScript, PHP

EDUCATION
Bachelor of Science in Computer Science
State University | 2014 - 2018
Relevant Coursework: Data Structures, Algorithms, Software Engineering, Database Systems

CERTIFICATIONS
• AWS Certified Solutions Architect (2022)
• Certified Scrum Master (2021)

PROJECTS
• Personal Finance Tracker - Full-stack web app with React and Node.js
• Open Source Contributor - Contributed to 5+ GitHub projects with 200+ stars`,

        jobDescription: `Senior Software Engineer - Frontend Focus
TechCorp Inc.

ABOUT THE ROLE
We are seeking a talented Senior Software Engineer to join our growing engineering team. You will be responsible for developing and maintaining our customer-facing web applications, working closely with cross-functional teams to deliver high-quality software solutions.

KEY RESPONSIBILITIES
• Design and develop scalable web applications using modern JavaScript frameworks
• Lead technical discussions and mentor junior developers
• Collaborate with product managers, designers, and other stakeholders
• Implement best practices for code quality, testing, and deployment
• Participate in agile development processes and sprint planning
• Conduct code reviews and provide constructive feedback
• Troubleshoot and resolve technical issues in production environments

REQUIRED QUALIFICATIONS
• Bachelor's degree in Computer Science or related field
• 5+ years of experience in software development
• Strong proficiency in JavaScript, HTML5, and CSS3
• Experience with React, Vue.js, or similar frontend frameworks
• Knowledge of RESTful APIs and backend integration
• Experience with version control systems (Git)
• Understanding of agile development methodologies
• Strong problem-solving and communication skills

PREFERRED QUALIFICATIONS
• Experience with cloud platforms (AWS, Azure, GCP)
• Knowledge of containerization (Docker, Kubernetes)
• Experience with CI/CD pipelines
• Background in mentoring and team leadership
• Familiarity with testing frameworks and methodologies
• Experience with database design and optimization

WHAT WE OFFER
• Competitive salary and equity package
• Comprehensive health, dental, and vision insurance
• Flexible work arrangements and remote work options
• Professional development opportunities and conference attendance
• Collaborative and innovative work environment
• Opportunity to work on cutting-edge technology projects

TechCorp Inc. is an equal opportunity employer committed to diversity and inclusion.`,

        timestamp: new Date().toISOString()
    };

    // Store sample data and navigate to results
    localStorage.setItem('currentScanData', JSON.stringify(sampleScanData));

    // Navigate to results page to show the sample scan
    window.location.href = '/results';
}

function handleItemAction(action) {
    console.log('Item action clicked:', action);
    // Implement specific actions based on the action type
    alert(`Action: ${action} - Feature coming soon!`);
}

function handleLogout() {
    localStorage.removeItem('dr_resume_token');
    localStorage.removeItem('dr_resume_refresh_token');
    localStorage.removeItem('dr_resume_user');
    localStorage.removeItem('currentScanData');
    window.location.href = '/login';
}
