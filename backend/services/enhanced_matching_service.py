import logging
import re
import json
import os
import time
from typing import Dict, List, Tuple, Set, Optional
from datetime import datetime

import spacy
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure NLTK data is downloaded
def download_nltk_resources():
    try:
        nltk.download('punkt', quiet=True)
        nltk.download('stopwords', quiet=True)
        nltk.download('averaged_perceptron_tagger', quiet=True)
        logger.info("✅ NLTK resources downloaded successfully")
    except Exception as e:
        logger.warning(f"⚠️ Failed to download NLTK resources: {e}")

download_nltk_resources()

class RealTimeLLMService:
    """
    Real-time AI-powered service for accurate resume-job description analysis.
    Uses spaCy for semantic analysis, NLTK for text processing, and scikit-learn for TF-IDF similarity.
    """

    def __init__(self):
        self.logger = logger
        self.nlp = None
        self.stop_words = set()
        
        # Try to load spaCy model with comprehensive error handling
        try:
            try:
                self.nlp = spacy.load('en_core_web_sm')
                logger.info("✅ spaCy model 'en_core_web_sm' loaded successfully")
            except OSError:
                logger.warning("⚠️ spaCy model 'en_core_web_sm' not found locally")
                try:
                    import subprocess
                    logger.info("Attempting to download spaCy model...")
                    result = subprocess.run(
                        ["python", "-m", "spacy", "download", "en_core_web_sm"], 
                        capture_output=True, 
                        timeout=60
                    )
                    if result.returncode == 0:
                        self.nlp = spacy.load('en_core_web_sm')
                        logger.info("✅ spaCy model downloaded and loaded successfully")
                    else:
                        logger.warning(f"⚠️ spaCy download failed: {result.stderr.decode()}")
                except Exception as download_error:
                    logger.warning(f"⚠️ Could not download spaCy model: {download_error}")
        except Exception as e:
            logger.warning(f"⚠️ spaCy initialization failed: {e}. Using basic NLP fallback.")

        # Try to load NLTK stopwords with error handling
        try:
            self.stop_words = set(stopwords.words('english'))
            logger.info("✅ NLTK stopwords loaded successfully")
        except Exception as e:
            logger.warning(f"⚠️ NLTK stopwords not available: {e}. Using empty set.")
            # Basic fallback stopwords
            self.stop_words = {'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 
                             'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 
                             'to', 'was', 'will', 'with'}

        # Enhanced skill synonyms for intelligent matching
        self.skill_synonyms = {
            'javascript': ['js', 'node.js', 'nodejs', 'ecmascript', 'es6', 'typescript', 'ts', 'react', 'vue', 'angular'],
            'python': ['py', 'python3', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
            'artificial intelligence': ['ai', 'machine learning', 'ml', 'deep learning', 'neural networks', 'nlp'],
            'cloud': ['aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'cloud computing'],
            'devops': ['ci/cd', 'docker', 'kubernetes', 'jenkins', 'terraform', 'ansible'],
            'database': ['sql', 'nosql', 'mysql', 'postgresql', 'mongodb', 'redis', 'db'],
            'project management': ['agile', 'scrum', 'kanban', 'jira', 'pmp', 'project manager'],
            'api': ['rest', 'restful', 'graphql', 'microservices', 'web services', 'json']
        }

    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for NLP analysis"""
        if not text:
            return ""
        
        # Lowercase and clean non-alphanumeric
        text = text.lower().strip()
        text = re.sub(r'[^\w\s]', ' ', text)
        
        if self.nlp:
            doc = self.nlp(text)
            tokens = [token.lemma_ for token in doc if not token.is_stop and not token.is_punct and len(token.text) > 2]
        else:
            # Basic fallback
            tokens = word_tokenize(text)
            tokens = [t for t in tokens if t not in self.stop_words and len(t) > 2]
            
        return " ".join(tokens)

    def analyze_resume_realtime(self, resume_text: str, job_description_text: str) -> Dict:
        """
        Real-time analysis of resume against job description using advanced NLP techniques.
        """
        try:
            if not resume_text or not job_description_text:
                return {'success': False, 'error': 'Missing resume or job description text'}

            self.logger.info("🚀 Starting Enhanced NLP Real-time Analysis...")

            # 1. Text Preprocessing
            clean_resume = self._preprocess_text(resume_text)
            clean_jd = self._preprocess_text(job_description_text)

            # Check if we have enough text for TF-IDF
            if not clean_resume.strip() or not clean_jd.strip():
                # Fallback to very basic matching if TF-IDF fails
                return self._basic_fallback_analysis(resume_text, job_description_text)

            # 2. Semantic Analysis
            resume_analysis = self._analyze_text_semantically(resume_text)
            jd_analysis = self._analyze_text_semantically(job_description_text)

            # 3. TF-IDF Similarity
            try:
                tfidf_vectorizer = TfidfVectorizer()
                tfidf_matrix = tfidf_vectorizer.fit_transform([clean_resume, clean_jd])
                content_similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                similarity_perc = content_similarity * 100
            except Exception as e:
                self.logger.warning(f"TF-IDF failed: {e}")
                similarity_perc = 0

            # 4. Structured Matching (Skills, Experience, Education)
            match_results = self._calculate_match_metrics(resume_analysis, jd_analysis)
            
            # 5. Combined Scoring
            # Weights: 30% Global Similarity, 50% Technical, 10% Soft, 10% Exp/Edu
            overall_score = (similarity_perc * 0.3) + (match_results['technical_score'] * 0.5) + \
                            (match_results['soft_skills_score'] * 0.1) + \
                            ((match_results['experience_score'] + match_results['education_score'])/2 * 0.1)
            
            overall_score = round(min(max(overall_score, 0), 100), 1)

            # 6. ATS Compatibility (0-100)
            ats_score = self._calculate_ats_compatibility(resume_text, jd_analysis)

            # 7. Recommendations
            recommendations = self._generate_contextual_recommendations(
                resume_analysis, jd_analysis, match_results
            )

            return {
                'success': True,
                'timestamp': datetime.utcnow().isoformat(),
                'overall_match_score': overall_score,
                'content_similarity': round(similarity_perc, 1),
                'category_scores': {
                    'technical_skills': round(match_results['technical_score'], 1),
                    'soft_skills': round(match_results['soft_skills_score'], 1),
                    'experience_match': round(match_results['experience_score'], 1),
                    'education_match': round(match_results['education_score'], 1),
                    'ats_compatibility': round(ats_score, 1)
                },
                'detailed_analysis': {
                    'matched_skills': match_results['matched_skills'],
                    'missing_skills': match_results['missing_skills'],
                    'skill_gaps': match_results['skill_gaps'],
                    'strength_areas': match_results['strength_areas']
                },
                'recommendations': recommendations,
                'keyword_analysis': {
                    'resume_keywords': resume_analysis['keywords'],
                    'jd_keywords': jd_analysis['keywords'],
                    'keyword_density': self._calculate_keyword_density(resume_text, jd_analysis)
                }
            }

        except Exception as e:
            self.logger.error(f"❌ Error in real-time NLP analysis: {e}")
            import traceback
            error_trace = traceback.format_exc()
            self.logger.error(error_trace)
            
            # Return a more detailed error response
            return {
                'success': False, 
                'error': f'Analysis failed: {str(e)}',
                'error_type': type(e).__name__,
                'fallback_available': True
            }

    def _analyze_text_semantically(self, text: str) -> Dict:
        """Deep semantic analysis of text"""
        text_lower = text.lower()
        
        # Technical skills extraction
        tech_skills = self._extract_skills(text_lower, 'technical')
        soft_skills = self._extract_skills(text_lower, 'soft')
        
        # Experience extraction
        exp_data = self._extract_experience(text_lower)
        
        # Education extraction
        edu_data = self._extract_education(text_lower)
        
        return {
            'keywords': {
                'technical': tech_skills,
                'soft': soft_skills
            },
            'experience': exp_data,
            'education': edu_data,
            'text_metrics': {
                'length': len(text),
                'words': len(text.split())
            }
        }

    def _extract_skills(self, text: str, skill_type: str) -> Dict[str, int]:
        """Extract skills using regex patterns and frequency"""
        skills_found = {}
        
        patterns = {
            'technical': [
                r'\b(?:python|java|javascript|js|typescript|ts|html|css|react|angular|vue|node\.js|express|django|flask|sql|nosql|mysql|postgresql|mongodb|aws|azure|gcp|docker|kubernetes|git|jenkins|ci/cd|api|rest|graphql)\b',
                r'\b(?:c\+\+|c#|ruby|php|swift|kotlin|go|rust|scala|hadoop|spark|tensorflow|pytorch|pandas|numpy|sklearn)\b'
            ],
            'soft': [
                r'\b(?:leadership|communication|teamwork|collaboration|problem solving|critical thinking|adaptability|creativity|time management|agile|scrum|mentoring|public speaking)\b'
            ]
        }
        
        for pattern in patterns.get(skill_type, []):
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                normalized = self._normalize_skill(match.lower())
                skills_found[normalized] = skills_found.get(normalized, 0) + 1
                
        return skills_found

    def _normalize_skill(self, skill: str) -> str:
        """Map synonyms to common canonical forms"""
        for main, synonyms in self.skill_synonyms.items():
            if skill == main or skill in synonyms:
                return main
        return skill

    def _extract_experience(self, text: str) -> Dict:
        """Extract years of experience"""
        patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'(\d+)\+?\s*years?\s*in',
            r'exp[.:]\s*(\d+)\+?\s*years?'
        ]
        
        years = []
        for p in patterns:
            matches = re.findall(p, text)
            years.extend([int(m) for m in matches if m.isdigit()])
            
        max_years = max(years) if years else 0
        return {
            'years': max_years,
            'level': 'senior' if max_years >= 8 else 'mid' if max_years >= 3 else 'junior' if max_years >= 1 else 'entry'
        }

    def _extract_education(self, text: str) -> Dict:
        """Extract education level"""
        edu_map = {'phd': 4, 'master': 3, 'bachelor': 2, 'degree': 1}
        levels_found = []
        
        if re.search(r'\b(?:phd|doctorate)\b', text): levels_found.append('phd')
        if re.search(r'\b(?:master|ms|ma|mba)\b', text): levels_found.append('master')
        if re.search(r'\b(?:bachelor|bs|ba)\b', text): levels_found.append('bachelor')
        if re.search(r'\b(?:degree|college|university)\b', text): levels_found.append('degree')
        
        max_level = 'unknown'
        max_val = 0
        for l in levels_found:
            if edu_map.get(l, 0) > max_val:
                max_val = edu_map[l]
                max_level = l
                
        return {'level': max_level, 'value': max_val}

    def _calculate_match_metrics(self, res: Dict, jd: Dict) -> Dict:
        """Calculate detailed matching metrics between resume and JD"""
        from fuzzywuzzy import fuzz
        
        # Technical Match
        matched_tech = []
        missing_tech = []
        
        jd_tech = jd['keywords']['technical']
        res_tech = res['keywords']['technical']
        
        for skill, freq in jd_tech.items():
            if skill in res_tech:
                matched_tech.append({'skill': skill, 'jd_freq': freq, 'resume_freq': res_tech[skill], 'category': 'technical'})
            else:
                # Fuzzy match check
                found_fuzzy = False
                for r_skill in res_tech:
                    if fuzz.ratio(skill, r_skill) > 85:
                        matched_tech.append({'skill': skill, 'matched_as': r_skill, 'jd_freq': freq, 'resume_freq': res_tech[r_skill], 'category': 'technical'})
                        found_fuzzy = True
                        break
                if not found_fuzzy:
                    missing_tech.append({'skill': skill, 'jd_freq': freq, 'importance': min(freq * 20, 100), 'category': 'technical'})
                    
        tech_score = (len(matched_tech) / max(len(jd_tech), 1)) * 100
        
        # Soft Match
        matched_soft = []
        missing_soft = []
        jd_soft = jd['keywords']['soft']
        res_soft = res['keywords']['soft']
        
        for skill, freq in jd_soft.items():
            if skill in res_soft:
                matched_soft.append({'skill': skill, 'jd_freq': freq, 'resume_freq': res_soft[skill], 'category': 'soft_skills'})
            else:
                missing_soft.append({'skill': skill, 'jd_freq': freq, 'importance': 50, 'category': 'soft_skills'})
                
        soft_score = (len(matched_soft) / max(len(jd_soft), 1)) * 100
        
        # Experience Match
        exp_score = 100 if res['experience']['years'] >= jd['experience']['years'] else (res['experience']['years'] / max(jd['experience']['years'], 1)) * 100
        
        # Education Match
        edu_score = 100 if res['education']['value'] >= jd['education']['value'] else 50
        
        return {
            'technical_score': tech_score,
            'soft_skills_score': soft_score,
            'experience_score': exp_score,
            'education_score': edu_score,
            'matched_skills': matched_tech + matched_soft,
            'missing_skills': missing_tech + missing_soft,
            'skill_gaps': sorted(missing_tech, key=lambda x: x['importance'], reverse=True)[:5],
            'strength_areas': sorted(matched_tech, key=lambda x: x['resume_freq'], reverse=True)[:5]
        }

    def _calculate_ats_compatibility(self, text: str, jd_analysis: Dict) -> float:
        """Calculate ATS score based on keyword density and formatting basics"""
        score = 80 # Base high score
        
        # Keyword coverage
        jd_all_keywords = set(jd_analysis['keywords']['technical'].keys()).union(set(jd_analysis['keywords']['soft'].keys()))
        found = 0
        text_lower = text.lower()
        for kw in jd_all_keywords:
            if kw in text_lower:
                found += 1
                
        coverage = (found / max(len(jd_all_keywords), 1)) * 100
        if coverage < 40: score -= 20
        elif coverage < 60: score -= 10
        
        # Length check
        words = len(text.split())
        if words < 200: score -= 15 # Too short
        if words > 1500: score -= 5 # A bit too long
        
        return max(min(score, 100), 0)

    def _calculate_keyword_density(self, text: str, jd_analysis: Dict) -> Dict:
        words = text.lower().split()
        total = len(words)
        if total == 0: return {'density': 0, 'count': 0}
        
        kw_count = 0
        for kw in set(jd_analysis['keywords']['technical'].keys()):
            kw_count += text.lower().count(kw)
            
        return {'density': round((kw_count / total) * 100, 2), 'count': kw_count}

    def _generate_contextual_recommendations(self, res: Dict, jd: Dict, match: Dict) -> List[Dict]:
        recs = []
        
        # 1. Skill Gaps
        for gap in match['skill_gaps']:
            recs.append({
                'title': f"Add '{gap['skill']}' to your resume",
                'description': f"This is a core requirement mentioned {gap['jd_freq']} times in the job description.",
                'action': f"Describe a project or role where you used {gap['skill']} to demonstrate proficiency.",
                'priority': 'critical' if gap['importance'] > 70 else 'high',
                'type': 'skill_gap',
                'category': 'technical_skills'
            })
            
        # 2. Formatting / ATS
        if res['text_metrics']['words'] < 300:
            recs.append({
                'title': "Expand your resume content",
                'description': "Your resume is shorter than recommended (under 300 words).",
                'action': "Add more details about your achievements and responsibilities in previous roles.",
                'priority': 'medium',
                'type': 'formatting',
                'category': 'formatting'
            })
            
        # 3. Experience level
        if res['experience']['years'] < jd['experience']['years']:
            recs.append({
                'title': "Highlight transferable skills",
                'description': f"The role prefers {jd['experience']['years']} years of experience, you have {res['experience']['years']}.",
                'action': "Emphasize high-impact projects and rapid learning ability to offset the year gap.",
                'priority': 'high',
                'type': 'experience',
                'category': 'content'
            })
            
        return recs[:10]

    def _basic_fallback_analysis(self, res_text: str, jd_text: str) -> Dict:
        """Minimal fallback if NLP processing fails heavily"""
        return {
            'success': True,
            'overall_match_score': 50.0,
            'category_scores': {'technical_skills': 50, 'soft_skills': 50, 'ats_compatibility': 50},
            'detailed_analysis': {'matched_skills': [], 'missing_skills': []},
            'recommendations': [],
            'keyword_analysis': {}
        }

    # Legacy method names for backward compatibility
    def calculate_enhanced_match_score(self, resume_id: int, job_description_id: int, user_id: int) -> Dict:
        from backend.models import Resume, JobDescription
        resume = Resume.query.filter_by(id=resume_id, user_id=user_id).first()
        jd = JobDescription.query.filter_by(id=job_description_id, user_id=user_id).first()
        if not resume or not jd: return {'success': False, 'error': 'Not found'}
        return self.analyze_resume_realtime(resume.extracted_text, jd.job_text)
