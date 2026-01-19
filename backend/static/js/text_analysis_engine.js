/**
 * Real-time Text Analysis Engine
 * Analyzes actual resume and job description content to generate accurate comparisons
 */

class TextAnalysisEngine {
    constructor() {
        this.skillSynonyms = {
            'javascript': ['js', 'node.js', 'nodejs', 'ecmascript', 'es6', 'es2015'],
            'python': ['py', 'python3', 'python2', 'django', 'flask'],
            'artificial intelligence': ['ai', 'machine learning', 'ml', 'deep learning', 'neural networks'],
            'user experience': ['ux', 'user interface', 'ui', 'ui/ux', 'user design'],
            'search engine optimization': ['seo', 'search optimization'],
            'customer relationship management': ['crm'],
            'application programming interface': ['api', 'apis', 'rest api', 'restful'],
            'database': ['db', 'sql', 'nosql', 'rdbms', 'mysql', 'postgresql', 'mongodb'],
            'react': ['reactjs', 'react.js'],
            'angular': ['angularjs', 'angular.js'],
            'vue': ['vuejs', 'vue.js'],
            'project management': ['pm', 'project manager', 'scrum master'],
            'agile': ['scrum', 'kanban', 'sprint'],
            'communication': ['verbal communication', 'written communication', 'interpersonal'],
            'leadership': ['team leadership', 'team lead', 'leading teams', 'management'],
            'problem solving': ['troubleshooting', 'analytical thinking', 'critical thinking'],
            'teamwork': ['collaboration', 'team player', 'cross-functional'],
            'time management': ['prioritization', 'multitasking', 'organization'],
            'customer service': ['client service', 'customer support', 'customer relations'],
            'data analysis': ['data analytics', 'business intelligence', 'bi', 'analytics'],
            'microsoft office': ['ms office', 'excel', 'word', 'powerpoint', 'outlook'],
            'social media': ['social media marketing', 'smm', 'digital marketing'],
            'cloud computing': ['aws', 'azure', 'gcp', 'cloud services'],
            'version control': ['git', 'github', 'gitlab', 'svn'],
            'continuous integration': ['ci/cd', 'jenkins', 'travis', 'github actions']
        };

        this.technicalSkills = [
            'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node.js', 'sql', 'html', 'css',
            'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'c++', 'c#', '.net', 'aws', 'azure', 'gcp',
            'docker', 'kubernetes', 'jenkins', 'git', 'github', 'gitlab', 'jira', 'confluence',
            'machine learning', 'artificial intelligence', 'data science', 'big data', 'analytics',
            'tableau', 'power bi', 'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'microservices',
            'api', 'rest', 'graphql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch'
        ];

        this.softSkills = [
            'leadership', 'communication', 'teamwork', 'problem solving', 'analytical thinking',
            'creative thinking', 'adaptability', 'project management', 'time management',
            'organization', 'planning', 'coordination', 'customer service', 'client relations',
            'presentation', 'negotiation', 'mentoring', 'training', 'strategic thinking',
            'innovation', 'critical thinking', 'decision making', 'conflict resolution',
            'emotional intelligence', 'cultural awareness', 'flexibility', 'resilience'
        ];
    }

    analyzeTexts(resumeText, jobDescriptionText) {
        console.log('🔍 Starting real-time text analysis...');
        
        if (!resumeText || !jobDescriptionText) {
            console.error('❌ Missing resume or job description text');
            return this.getEmptyAnalysis();
        }

        // Extract skills from both texts
        const resumeSkills = this.extractSkills(resumeText);
        const jobSkills = this.extractSkills(jobDescriptionText);

        // Calculate matches and missing skills
        const skillComparison = this.compareSkills(resumeSkills, jobSkills);

        // Calculate match rate
        const matchRate = this.calculateMatchRate(skillComparison);

        // Generate recruiter tips
        const recruiterTips = this.generateRecruiterTips(resumeText, jobDescriptionText, skillComparison);

        // Analyze formatting
        const formattingAnalysis = this.analyzeFormatting(resumeText);

        // Generate progress statistics
        const progressStats = this.generateProgressStats(skillComparison, formattingAnalysis);

        console.log('✅ Analysis complete:', {
            matchRate,
            technicalMatches: skillComparison.technical.matched.length,
            softMatches: skillComparison.soft.matched.length,
            totalIssues: progressStats.totalIssues
        });

        return {
            matchRate,
            skillComparison,
            recruiterTips,
            formattingAnalysis,
            progressStats,
            timestamp: new Date().toISOString()
        };
    }

    extractSkills(text) {
        const textLower = text.toLowerCase();
        const extractedSkills = {
            technical: {},
            soft: {}
        };

        // Extract technical skills
        this.technicalSkills.forEach(skill => {
            const frequency = this.countSkillOccurrences(textLower, skill);
            if (frequency > 0) {
                extractedSkills.technical[skill] = frequency;
            }
        });

        // Extract soft skills
        this.softSkills.forEach(skill => {
            const frequency = this.countSkillOccurrences(textLower, skill);
            if (frequency > 0) {
                extractedSkills.soft[skill] = frequency;
            }
        });

        return extractedSkills;
    }

    countSkillOccurrences(text, skill) {
        let count = 0;
        
        // Count main skill
        const mainRegex = new RegExp(`\\b${this.escapeRegex(skill)}\\b`, 'gi');
        const mainMatches = text.match(mainRegex);
        if (mainMatches) count += mainMatches.length;

        // Count synonyms
        if (this.skillSynonyms[skill]) {
            this.skillSynonyms[skill].forEach(synonym => {
                const synonymRegex = new RegExp(`\\b${this.escapeRegex(synonym)}\\b`, 'gi');
                const synonymMatches = text.match(synonymRegex);
                if (synonymMatches) count += synonymMatches.length;
            });
        }

        return count;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    compareSkills(resumeSkills, jobSkills) {
        const comparison = {
            technical: { matched: [], missing: [], extra: [] },
            soft: { matched: [], missing: [], extra: [] }
        };

        // Compare technical skills
        Object.keys(jobSkills.technical).forEach(skill => {
            const jobFreq = jobSkills.technical[skill];
            const resumeFreq = resumeSkills.technical[skill] || 0;
            
            if (resumeFreq > 0) {
                comparison.technical.matched.push({
                    skill,
                    resumeCount: resumeFreq,
                    jobCount: jobFreq,
                    matchType: 'exact'
                });
            } else {
                comparison.technical.missing.push({
                    skill,
                    jobCount: jobFreq,
                    importance: this.calculateSkillImportance(skill, jobFreq)
                });
            }
        });

        // Find extra technical skills in resume
        Object.keys(resumeSkills.technical).forEach(skill => {
            if (!jobSkills.technical[skill]) {
                comparison.technical.extra.push({
                    skill,
                    resumeCount: resumeSkills.technical[skill]
                });
            }
        });

        // Compare soft skills (same logic)
        Object.keys(jobSkills.soft).forEach(skill => {
            const jobFreq = jobSkills.soft[skill];
            const resumeFreq = resumeSkills.soft[skill] || 0;
            
            if (resumeFreq > 0) {
                comparison.soft.matched.push({
                    skill,
                    resumeCount: resumeFreq,
                    jobCount: jobFreq,
                    matchType: 'exact'
                });
            } else {
                comparison.soft.missing.push({
                    skill,
                    jobCount: jobFreq,
                    importance: this.calculateSkillImportance(skill, jobFreq)
                });
            }
        });

        Object.keys(resumeSkills.soft).forEach(skill => {
            if (!jobSkills.soft[skill]) {
                comparison.soft.extra.push({
                    skill,
                    resumeCount: resumeSkills.soft[skill]
                });
            }
        });

        return comparison;
    }

    calculateSkillImportance(skill, frequency) {
        let importance = Math.min(frequency / 3.0, 1.0);
        
        // Boost critical skills
        const criticalSkills = ['python', 'javascript', 'react', 'sql', 'aws', 'leadership', 'communication'];
        if (criticalSkills.includes(skill)) {
            importance *= 1.5;
        }
        
        return Math.min(importance, 1.0);
    }

    calculateMatchRate(skillComparison) {
        const totalTechnicalRequired = skillComparison.technical.matched.length + skillComparison.technical.missing.length;
        const totalSoftRequired = skillComparison.soft.matched.length + skillComparison.soft.missing.length;
        
        if (totalTechnicalRequired === 0 && totalSoftRequired === 0) {
            return 100;
        }

        const technicalMatched = skillComparison.technical.matched.length;
        const softMatched = skillComparison.soft.matched.length;

        const technicalScore = totalTechnicalRequired > 0 ? (technicalMatched / totalTechnicalRequired) * 100 : 100;
        const softScore = totalSoftRequired > 0 ? (softMatched / totalSoftRequired) * 100 : 100;

        // Weight technical skills more heavily
        const overallScore = (technicalScore * 0.7) + (softScore * 0.3);
        
        return Math.round(overallScore);
    }

    generateRecruiterTips(resumeText, jobText, skillComparison) {
        const tips = [];
        
        // Missing critical skills
        const criticalMissing = skillComparison.technical.missing.filter(skill => skill.importance > 0.7);
        if (criticalMissing.length > 0) {
            tips.push({
                type: 'error',
                title: 'Critical Skills Missing',
                description: `Add experience with ${criticalMissing.slice(0, 3).map(s => s.skill).join(', ')} to match job requirements.`,
                icon: '✗'
            });
        }

        // Resume length check
        const wordCount = resumeText.split(/\s+/).length;
        if (wordCount < 200) {
            tips.push({
                type: 'warning',
                title: 'Resume Too Short',
                description: 'Your resume appears brief. Consider adding more details about your experience and achievements.',
                icon: '⚠️'
            });
        } else if (wordCount > 800) {
            tips.push({
                type: 'warning',
                title: 'Resume Length',
                description: 'Consider condensing your resume to 1-2 pages for better readability.',
                icon: '⚠️'
            });
        }

        // Quantifiable achievements
        const numberPattern = /\d+[%$k]|\d+\s*(percent|million|thousand|years?|months?)/gi;
        const achievements = resumeText.match(numberPattern);
        if (!achievements || achievements.length < 3) {
            tips.push({
                type: 'warning',
                title: 'Add Quantifiable Results',
                description: 'Include more specific numbers and metrics to demonstrate your impact.',
                icon: '⚠️'
            });
        } else {
            tips.push({
                type: 'success',
                title: 'Good Use of Metrics',
                description: `Found ${achievements.length} quantifiable achievements. This helps demonstrate your impact.`,
                icon: '✓'
            });
        }

        // Contact information
        const hasEmail = /@/.test(resumeText);
        const hasPhone = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(resumeText);
        
        if (!hasEmail) {
            tips.push({
                type: 'error',
                title: 'Missing Email',
                description: 'Add your email address so recruiters can contact you.',
                icon: '✗'
            });
        }
        
        if (!hasPhone) {
            tips.push({
                type: 'error',
                title: 'Missing Phone Number',
                description: 'Include your phone number for recruiter contact.',
                icon: '✗'
            });
        }

        return tips;
    }

    analyzeFormatting(resumeText) {
        const checks = [];
        
        // Check for sections
        const hasSummary = /summary|profile|objective/i.test(resumeText);
        const hasExperience = /experience|work|employment/i.test(resumeText);
        const hasEducation = /education|degree|university|college/i.test(resumeText);
        const hasSkills = /skills|technical|competencies/i.test(resumeText);

        checks.push({
            type: hasSummary ? 'success' : 'warning',
            title: 'Professional Summary',
            description: hasSummary ? 'Professional summary section found.' : 'Consider adding a professional summary.',
            icon: hasSummary ? '✓' : '⚠️'
        });

        checks.push({
            type: hasExperience ? 'success' : 'error',
            title: 'Work Experience',
            description: hasExperience ? 'Work experience section found.' : 'Work experience section missing.',
            icon: hasExperience ? '✓' : '✗'
        });

        checks.push({
            type: hasEducation ? 'success' : 'warning',
            title: 'Education Section',
            description: hasEducation ? 'Education section found.' : 'Consider adding education information.',
            icon: hasEducation ? '✓' : '⚠️'
        });

        checks.push({
            type: hasSkills ? 'success' : 'warning',
            title: 'Skills Section',
            description: hasSkills ? 'Skills section found.' : 'Consider adding a dedicated skills section.',
            icon: hasSkills ? '✓' : '⚠️'
        });

        // Check for formatting issues
        const hasAllCaps = /[A-Z]{10,}/.test(resumeText);
        checks.push({
            type: hasAllCaps ? 'warning' : 'success',
            title: 'Text Formatting',
            description: hasAllCaps ? 'Avoid excessive use of ALL CAPS text.' : 'Good text formatting detected.',
            icon: hasAllCaps ? '⚠️' : '✓'
        });

        return checks;
    }

    generateProgressStats(skillComparison, formattingAnalysis) {
        const techIssues = skillComparison.technical.missing.length;
        const softIssues = skillComparison.soft.missing.length;
        const formatIssues = formattingAnalysis.filter(check => check.type === 'error' || check.type === 'warning').length;
        
        const totalTechSkills = skillComparison.technical.matched.length + skillComparison.technical.missing.length;
        const totalSoftSkills = skillComparison.soft.matched.length + skillComparison.soft.missing.length;

        return {
            searchability: {
                issues: formatIssues,
                progress: Math.max(0, 100 - (formatIssues * 20))
            },
            hardSkills: {
                issues: techIssues,
                progress: totalTechSkills > 0 ? Math.round((skillComparison.technical.matched.length / totalTechSkills) * 100) : 100
            },
            softSkills: {
                issues: softIssues,
                progress: totalSoftSkills > 0 ? Math.round((skillComparison.soft.matched.length / totalSoftSkills) * 100) : 100
            },
            recruiterTips: {
                issues: skillComparison.technical.missing.filter(s => s.importance > 0.5).length + softIssues,
                progress: 70 // Based on overall analysis
            },
            formatting: {
                issues: formatIssues,
                progress: Math.max(0, 100 - (formatIssues * 15))
            },
            totalIssues: techIssues + softIssues + formatIssues
        };
    }

    getEmptyAnalysis() {
        return {
            matchRate: 0,
            skillComparison: {
                technical: { matched: [], missing: [], extra: [] },
                soft: { matched: [], missing: [], extra: [] }
            },
            recruiterTips: [{
                type: 'error',
                title: 'No Data Available',
                description: 'Please provide both resume and job description text for analysis.',
                icon: '✗'
            }],
            formattingAnalysis: [],
            progressStats: {
                searchability: { issues: 0, progress: 0 },
                hardSkills: { issues: 0, progress: 0 },
                softSkills: { issues: 0, progress: 0 },
                recruiterTips: { issues: 0, progress: 0 },
                formatting: { issues: 0, progress: 0 },
                totalIssues: 0
            }
        };
    }
}

// Export for use in other files
window.TextAnalysisEngine = TextAnalysisEngine;
