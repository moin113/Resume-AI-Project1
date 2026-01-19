import logging
import re
import json
import os
from typing import Dict, List, Tuple, Set, Optional
from collections import Counter
from datetime import datetime

import spacy
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from backend.models import db, Resume, JobDescription, MatchScore

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RealTimeLLMService:
    """
    Real-time AI-powered service for accurate resume-job description analysis.
    Uses spaCy for semantic analysis, NLTK for text processing, and scikit-learn for TF-IDF similarity.
    """

    def __init__(self):
        self.logger = logger
        try:
            self.nlp = spacy.load('en_core_web_sm')
        except OSError:
            # Fallback if model not found dynamically
            self.logger.warning("spaCy model 'en_core_web_sm' not found. Make sure it's installed.")
            self.nlp = None

        try:
            self.stop_words = set(stopwords.words('english'))
        except:
            self.stop_words = set()

        # Enhanced skill synonyms with semantic understanding
        self.skill_synonyms = {
            'javascript': ['js', 'node.js', 'nodejs', 'ecmascript', 'es6', 'es2015', 'typescript', 'ts'],
            'python': ['py', 'python3', 'python2', 'django', 'flask', 'fastapi'],
            'artificial intelligence': ['ai', 'machine learning', 'ml', 'deep learning', 'neural networks', 'nlp'],
            'react': ['reactjs', 'react.js', 'react native', 'jsx', 'hooks'],
            'angular': ['angularjs', 'angular.js', 'angular 2+', 'typescript'],
            'vue': ['vuejs', 'vue.js', 'nuxt', 'vuex'],
            'database': ['db', 'sql', 'nosql', 'rdbms', 'mysql', 'postgresql', 'mongodb', 'redis'],
            'cloud': ['aws', 'azure', 'gcp', 'google cloud', 'amazon web services'],
            'devops': ['ci/cd', 'docker', 'kubernetes', 'jenkins', 'gitlab ci', 'github actions'],
            'api': ['rest', 'restful', 'graphql', 'microservices', 'web services'],
            'project management': ['agile', 'scrum', 'kanban', 'jira', 'trello', 'asana']
        }

    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for NLP analysis (lemmatization, tokenization, stopword removal)"""
        if not text:
            return ""
        
        # Lowercase and clean
        text = text.lower().strip()
        text = re.sub(r'[^\w\s]', ' ', text)
        
        if self.nlp:
            doc = self.nlp(text)
            tokens = [token.lemma_ for token in doc if not token.is_stop and not token.is_punct and len(token.text) > 2]
        else:
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

            self.logger.info("Starting real-time NLP analysis...")

            # 1. Text Preprocessing
            clean_resume = self._preprocess_text(resume_text)
            clean_jd = self._preprocess_text(job_description_text)

            # 2. Semantic Analysis using spaCy
            resume_analysis = self._analyze_text_semantically(resume_text)
            jd_analysis = self._analyze_text_semantically(job_description_text)

            # 3. TF-IDF & Cosine Similarity using scikit-learn
            tfidf_vectorizer = TfidfVectorizer()
            tfidf_matrix = tfidf_vectorizer.fit_transform([clean_resume, clean_jd])
            content_similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            similarity_perc = content_similarity * 100

            # 4. Keyword and Category Specific Matching
            match_results = self._calculate_realtime_match(resume_analysis, jd_analysis)
            
            # Combine TF-IDF similarity with keyword-based matching
            # Weight: 40% TF-IDF, 60% Structured Matching
            overall_score = (similarity_perc * 0.4) + (match_results['overall_score'] * 0.6)
            overall_score = round(min(max(overall_score, 0), 100), 1)

            # 5. Generate Recommendations
            recommendations = self._generate_contextual_recommendations(
                resume_analysis, jd_analysis, match_results
            )

            # 6. ATS Compatibility
            ats_score = self._calculate_ats_compatibility(resume_text, jd_analysis)

            return {
                'success': True,
                'timestamp': datetime.utcnow().isoformat(),
                'overall_match_score': overall_score,
                'content_similarity': round(similarity_perc, 1),
                'category_scores': {
                    'technical_skills': match_results['technical_score'],
                    'soft_skills': match_results['soft_skills_score'],
                    'experience_match': match_results['experience_score'],
                    'education_match': match_results['education_score'],
                    'ats_compatibility': ats_score
                },
                'detailed_analysis': {
                    'matched_skills': match_results['matched_skills'],
                    'missing_skills': match_results['missing_skills'],
                    'skill_gaps': match_results['skill_gaps'],
                    'strength_areas': match_results['strength_areas'],
                    'text_metrics': resume_analysis['text_metrics']
                },
                'recommendations': recommendations,
                'keyword_analysis': {
                    'resume_keywords': resume_analysis['extracted_keywords'],
                    'jd_keywords': jd_analysis['extracted_keywords'],
                    'keyword_density': self._calculate_keyword_density(resume_text, jd_analysis)
                }
            }

        except Exception as e:
            self.logger.error(f"Error in real-time NLP analysis: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            return {'success': False, 'error': str(e)}

    def calculate_enhanced_match_score(self, resume_id: int, job_description_id: int, user_id: int) -> Dict:
        """
        Calculate enhanced matching score with improved accuracy for stored documents
        """
        try:
            # Get resume and job description
            resume = Resume.query.filter_by(id=resume_id, user_id=user_id).first()
            job_description = JobDescription.query.filter_by(id=job_description_id, user_id=user_id).first()

            if not resume or not job_description:
                return {'success': False, 'error': 'Resume or job description not found'}

            # Use real-time analysis for stored documents
            return self.analyze_resume_realtime(resume.extracted_text, job_description.job_text)

        except Exception as e:
            self.logger.error(f"Error in enhanced match calculation: {e}")
            return {'success': False, 'error': str(e)}
    
    def _analyze_text_semantically(self, text: str) -> Dict:
        """
        Advanced semantic analysis of text using NLP techniques
        """
        text_lower = text.lower()

        # Extract skills with semantic understanding
        technical_skills = self._extract_technical_skills_semantic(text_lower)
        soft_skills = self._extract_soft_skills_semantic(text_lower)

        # Extract experience and education with context
        experience_analysis = self._analyze_experience_context(text_lower)
        education_analysis = self._analyze_education_context(text_lower)

        # Extract key phrases and context
        key_phrases = self._extract_key_phrases(text)

        return {
            'extracted_keywords': {
                'technical_skills': technical_skills,
                'soft_skills': soft_skills,
                'key_phrases': key_phrases
            },
            'experience_analysis': experience_analysis,
            'education_analysis': education_analysis,
            'text_metrics': {
                'length': len(text),
                'word_count': len(text.split()),
                'sentence_count': len([s for s in text.split('.') if s.strip()])
            }
        }

    def _analyze_text_with_context(self, text: str) -> Dict:
        """
        Legacy method - kept for backward compatibility
        """
        return self._analyze_text_semantically(text)
    
    def _extract_skills_with_frequency(self, text: str, skill_type: str) -> Dict[str, int]:
        """
        Extract skills with their frequency and context importance
        """
        skills_found = {}
        
        # Define skill lists based on type
        if skill_type == 'technical':
            skill_patterns = [
                r'\b(?:python|java|javascript|react|angular|vue|node\.?js|sql|html|css|php|ruby|go|rust|swift|kotlin|c\+\+|c#|\.net)\b',
                r'\b(?:aws|azure|gcp|docker|kubernetes|jenkins|git|github|gitlab|jira|confluence)\b',
                r'\b(?:machine learning|artificial intelligence|data science|big data|analytics|tableau|power bi)\b',
                r'\b(?:agile|scrum|kanban|devops|ci/cd|microservices|api|rest|graphql)\b'
            ]
        else:  # soft skills
            skill_patterns = [
                r'\b(?:leadership|communication|teamwork|problem solving|analytical|creative|adaptable)\b',
                r'\b(?:project management|time management|organization|planning|coordination)\b',
                r'\b(?:customer service|client relations|presentation|negotiation|mentoring)\b'
            ]
        
        for pattern in skill_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                normalized_skill = self._normalize_skill(match)
                skills_found[normalized_skill] = skills_found.get(normalized_skill, 0) + 1
        
        return skills_found
    
    def _normalize_skill(self, skill: str) -> str:
        """
        Normalize skill names and handle synonyms
        """
        skill_lower = skill.lower().strip()
        
        # Check for synonyms
        for main_skill, synonyms in self.skill_synonyms.items():
            if skill_lower == main_skill or skill_lower in synonyms:
                return main_skill
        
        return skill_lower
    
    def _calculate_detailed_skill_matching(self, resume_analysis: Dict, jd_analysis: Dict) -> Dict:
        """
        Calculate detailed skill matching with fuzzy logic
        """
        matches = {
            'technical_exact': [],
            'technical_partial': [],
            'technical_missing': [],
            'soft_exact': [],
            'soft_partial': [],
            'soft_missing': []
        }
        
        # Technical skills matching
        resume_tech = resume_analysis['technical_skills']
        jd_tech = jd_analysis['technical_skills']
        
        for jd_skill, jd_freq in jd_tech.items():
            if jd_skill in resume_tech:
                matches['technical_exact'].append({
                    'skill': jd_skill,
                    'resume_freq': resume_tech[jd_skill],
                    'jd_freq': jd_freq,
                    'importance': self._calculate_skill_importance(jd_skill, jd_freq, jd_analysis)
                })
            else:
                # Check for partial matches
                partial_match = self._find_partial_match(jd_skill, resume_tech)
                if partial_match:
                    matches['technical_partial'].append({
                        'jd_skill': jd_skill,
                        'resume_skill': partial_match,
                        'jd_freq': jd_freq,
                        'importance': self._calculate_skill_importance(jd_skill, jd_freq, jd_analysis)
                    })
                else:
                    matches['technical_missing'].append({
                        'skill': jd_skill,
                        'jd_freq': jd_freq,
                        'importance': self._calculate_skill_importance(jd_skill, jd_freq, jd_analysis)
                    })
        
        # Soft skills matching (similar logic)
        resume_soft = resume_analysis['soft_skills']
        jd_soft = jd_analysis['soft_skills']
        
        for jd_skill, jd_freq in jd_soft.items():
            if jd_skill in resume_soft:
                matches['soft_exact'].append({
                    'skill': jd_skill,
                    'resume_freq': resume_soft[jd_skill],
                    'jd_freq': jd_freq,
                    'importance': self._calculate_skill_importance(jd_skill, jd_freq, jd_analysis)
                })
            else:
                partial_match = self._find_partial_match(jd_skill, resume_soft)
                if partial_match:
                    matches['soft_partial'].append({
                        'jd_skill': jd_skill,
                        'resume_skill': partial_match,
                        'jd_freq': jd_freq,
                        'importance': self._calculate_skill_importance(jd_skill, jd_freq, jd_analysis)
                    })
                else:
                    matches['soft_missing'].append({
                        'skill': jd_skill,
                        'jd_freq': jd_freq,
                        'importance': self._calculate_skill_importance(jd_skill, jd_freq, jd_analysis)
                    })
        
        return matches
    
    def _find_partial_match(self, target_skill: str, skill_dict: Dict[str, int]) -> str:
        """
        Find partial matches using synonym mapping and fuzzy logic
        """
        # Check synonyms
        if target_skill in self.skill_synonyms:
            for synonym in self.skill_synonyms[target_skill]:
                if synonym in skill_dict:
                    return synonym
        
        # Check if target skill is a synonym of any resume skill
        for resume_skill in skill_dict.keys():
            if resume_skill in self.skill_synonyms:
                if target_skill in self.skill_synonyms[resume_skill]:
                    return resume_skill
        
        # Check substring matches
        for resume_skill in skill_dict.keys():
            if target_skill in resume_skill or resume_skill in target_skill:
                if len(target_skill) > 3 and len(resume_skill) > 3:  # Avoid short false matches
                    return resume_skill
        
        return None
    
    def _calculate_skill_importance(self, skill: str, frequency: int, analysis: Dict) -> float:
        """
        Calculate skill importance based on frequency and context
        """
        # Base importance from frequency
        base_importance = min(frequency / 3.0, 1.0)  # Normalize to 0-1
        
        # Boost for critical technical skills
        critical_skills = ['python', 'javascript', 'react', 'sql', 'aws', 'machine learning']
        if skill in critical_skills:
            base_importance *= 1.5
        
        # Boost for skills mentioned multiple times
        if frequency > 2:
            base_importance *= 1.2
        
        return min(base_importance, 1.0)
    
    def _calculate_weighted_scores(self, skill_matches: Dict, jd_analysis: Dict) -> Dict:
        """
        Calculate weighted scores based on skill importance and matches
        """
        # Technical skills score
        tech_total_importance = sum(match['importance'] for match in 
                                  skill_matches['technical_exact'] + 
                                  skill_matches['technical_partial'] + 
                                  skill_matches['technical_missing'])
        
        tech_matched_importance = (
            sum(match['importance'] for match in skill_matches['technical_exact']) +
            sum(match['importance'] * 0.7 for match in skill_matches['technical_partial'])
        )
        
        technical_score = (tech_matched_importance / tech_total_importance * 100) if tech_total_importance > 0 else 100
        
        # Soft skills score (similar calculation)
        soft_total_importance = sum(match['importance'] for match in 
                                  skill_matches['soft_exact'] + 
                                  skill_matches['soft_partial'] + 
                                  skill_matches['soft_missing'])
        
        soft_matched_importance = (
            sum(match['importance'] for match in skill_matches['soft_exact']) +
            sum(match['importance'] * 0.7 for match in skill_matches['soft_partial'])
        )
        
        soft_score = (soft_matched_importance / soft_total_importance * 100) if soft_total_importance > 0 else 100
        
        # Overall weighted score
        overall_score = (technical_score * 0.6 + soft_score * 0.4)
        
        return {
            'overall': round(overall_score, 1),
            'technical': round(technical_score, 1),
            'soft': round(soft_score, 1),
            'experience': 85.0,  # Placeholder for experience matching
            'education': 90.0    # Placeholder for education matching
        }

    def _extract_technical_skills_semantic(self, text: str) -> Dict[str, int]:
        """Extract technical skills with semantic understanding, regex, and spaCy NER/Noun chunks"""
        skills_found = {}

        # 1. Regex-based extraction for known patterns
        tech_patterns = {
            'javascript': r'\b(?:javascript|js|node\.?js|typescript|ts|react|angular|vue|next\.js|nuxt|express)\b',
            'python': r'\b(?:python|py|django|flask|fastapi|pandas|numpy|scipy|sklearn|pytorch|tensorflow)\b',
            'java': r'\b(?:java|spring|hibernate|maven|gradle|kotlin)\b',
            'csharp': r'\b(?:c#|csharp|\.net|asp\.net|entity framework|unity|blazor)\b',
            'database': r'\b(?:sql|mysql|postgresql|mongodb|redis|database|db|oracle|sqlite|cassandra)\b',
            'cloud': r'\b(?:aws|azure|gcp|google cloud|amazon web services|cloud|lambda|docker|kubernetes)\b',
            'devops': r'\b(?:docker|kubernetes|jenkins|ci/cd|devops|terraform|ansible|vagrant)\b',
            'web': r'\b(?:html|css|sass|less|bootstrap|tailwind|responsive|web|ux|ui|figma)\b',
            'api': r'\b(?:api|rest|restful|graphql|microservices|json|soap)\b',
            'testing': r'\b(?:testing|unit test|integration test|tdd|bdd|jest|pytest|selenium|cypress)\b'
        }

        for skill, pattern in tech_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                skills_found[skill] = len(matches)

        # 2. spaCy-based extraction for emerging skills (Noun chunks / NER)
        if self.nlp:
            doc = self.nlp(text)
            # Focus on capitalized entities or technical-sounding noun phrases
            for chunk in doc.noun_chunks:
                chunk_text = chunk.text.lower().strip()
                # If it's a short, specific-looking term not already found
                if 2 < len(chunk_text) < 20 and chunk_text not in skills_found:
                    # Simple heuristic: if it contains a technical keyword or is a single word capitalized in original
                    if any(token.pos_ in ['PROPN'] for token in chunk if len(token.text) > 2):
                        # Don't add common English words
                        if not chunk.root.is_stop:
                            skills_found[chunk_text] = 1

        return skills_found

    def _extract_soft_skills_semantic(self, text: str) -> Dict[str, int]:
        """Extract soft skills with semantic understanding"""
        skills_found = {}

        soft_patterns = {
            'leadership': r'\b(?:leadership|lead|manage|mentor|coach|supervise)\b',
            'communication': r'\b(?:communication|present|collaborate|negotiate|articulate)\b',
            'teamwork': r'\b(?:team|collaborate|cooperation|cross-functional|partnership)\b',
            'problem_solving': r'\b(?:problem.solving|troubleshoot|analyze|debug|resolve)\b',
            'project_management': r'\b(?:project.management|agile|scrum|kanban|planning)\b',
            'adaptability': r'\b(?:adapt|flexible|versatile|learn|growth)\b',
            'creativity': r'\b(?:creative|innovative|design|brainstorm|ideate)\b',
            'time_management': r'\b(?:time.management|prioritize|deadline|efficient|organize)\b'
        }

        for skill, pattern in soft_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                skills_found[skill] = len(matches)

        return skills_found

    def _analyze_experience_context(self, text: str) -> Dict:
        """Analyze experience context from text"""
        experience_patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'(\d+)\+?\s*years?\s*in',
            r'experience\s*(?:of\s*)?(\d+)\+?\s*years?'
        ]

        years_found = []
        for pattern in experience_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            years_found.extend([int(match) for match in matches if match.isdigit()])

        return {
            'years_mentioned': years_found,
            'max_years': max(years_found) if years_found else 0,
            'experience_level': self._classify_experience_level(max(years_found) if years_found else 0)
        }

    def _analyze_education_context(self, text: str) -> Dict:
        """Analyze education context from text"""
        education_patterns = {
            'bachelor': r'\b(?:bachelor|b\.?s\.?|b\.?a\.?|undergraduate)\b',
            'master': r'\b(?:master|m\.?s\.?|m\.?a\.?|mba|graduate)\b',
            'phd': r'\b(?:phd|ph\.?d\.?|doctorate|doctoral)\b',
            'certification': r'\b(?:certified|certification|certificate)\b'
        }

        education_found = {}
        for level, pattern in education_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                education_found[level] = len(matches)

        return education_found

    def _extract_key_phrases(self, text: str) -> List[str]:
        """Extract key phrases using simple NLP techniques"""
        # Split into sentences and extract meaningful phrases
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 10]
        key_phrases = []

        for sentence in sentences[:10]:  # Limit to first 10 sentences
            # Extract phrases with action verbs
            action_patterns = [
                r'(?:developed|created|implemented|designed|built|managed|led|improved)\s+[^.]{10,50}',
                r'(?:responsible for|experience in|skilled in|proficient in)\s+[^.]{10,50}'
            ]

            for pattern in action_patterns:
                matches = re.findall(pattern, sentence, re.IGNORECASE)
                key_phrases.extend(matches[:3])  # Limit matches per sentence

        return key_phrases[:15]  # Return top 15 key phrases

    def _calculate_realtime_match(self, resume_analysis: Dict, jd_analysis: Dict) -> Dict:
        """Calculate real-time matching scores with advanced algorithms"""

        # Extract skill sets
        resume_tech = resume_analysis['extracted_keywords']['technical_skills']
        resume_soft = resume_analysis['extracted_keywords']['soft_skills']
        jd_tech = jd_analysis['extracted_keywords']['technical_skills']
        jd_soft = jd_analysis['extracted_keywords']['soft_skills']

        # Calculate technical skills match
        tech_matches = self._calculate_skill_matches(resume_tech, jd_tech, 'technical')
        soft_matches = self._calculate_skill_matches(resume_soft, jd_soft, 'soft')

        # Calculate experience match
        exp_score = self._calculate_experience_match(
            resume_analysis['experience_analysis'],
            jd_analysis['experience_analysis']
        )

        # Calculate education match
        edu_score = self._calculate_education_match(
            resume_analysis['education_analysis'],
            jd_analysis['education_analysis']
        )

        # Calculate weighted overall score
        # 30% TF-IDF (Global Content Similarity)
        # 40% Technical Skills
        # 15% Soft Skills
        # 10% Experience
        # 5% Education
        
        # Note: self.similarity_perc or similar can be used if we store it
        # Since this method is called within analyze_resume_realtime, we calculate combined score there.
        # This method provides the structured weights.
        
        overall_score = (
            tech_matches['score'] * 0.5 +
            soft_matches['score'] * 0.2 +
            exp_score * 0.2 +
            edu_score * 0.1
        )

        return {
            'overall_score': round(overall_score, 1),
            'technical_score': round(tech_matches['score'], 1),
            'soft_skills_score': round(soft_matches['score'], 1),
            'experience_score': round(exp_score, 1),
            'education_score': round(edu_score, 1),
            'matched_skills': tech_matches['matched'] + soft_matches['matched'],
            'missing_skills': tech_matches['missing'] + soft_matches['missing'],
            'skill_gaps': self._identify_critical_gaps(tech_matches['missing'], jd_tech),
            'strength_areas': self._identify_strengths(tech_matches['matched'], resume_tech)
        }

    def _calculate_skill_matches(self, resume_skills: Dict, jd_skills: Dict, skill_type: str = 'technical') -> Dict:
        """Calculate skill matching with synonym recognition and fuzzy matching"""
        from fuzzywuzzy import fuzz
        
        matched = []
        missing = []

        for jd_skill, jd_freq in jd_skills.items():
            found_match = False

            # Direct/Exact match
            if jd_skill in resume_skills:
                matched.append({
                    'skill': jd_skill,
                    'resume_freq': resume_skills[jd_skill],
                    'jd_freq': jd_freq,
                    'match_type': 'exact',
                    'category': 'soft_skills' if skill_type == 'soft' else 'technical_skills'
                })
                found_match = True
            else:
                # Check synonyms
                for skill, synonyms in self.skill_synonyms.items():
                    if jd_skill in synonyms or skill == jd_skill:
                        for synonym in synonyms + [skill]:
                            if synonym in resume_skills:
                                matched.append({
                                    'skill': jd_skill,
                                    'resume_skill': synonym,
                                    'resume_freq': resume_skills[synonym],
                                    'jd_freq': jd_freq,
                                    'match_type': 'synonym',
                                    'category': 'soft_skills' if skill_type == 'soft' else 'technical_skills'
                                })
                                found_match = True
                                break
                        if found_match:
                            break

                # If still no match, check for fuzzy matching using fuzzywuzzy
                if not found_match:
                    best_match = None
                    highest_score = 0
                    
                    for resume_skill in resume_skills.keys():
                        # Calculate fuzzy similarity score
                        score = fuzz.ratio(jd_skill.lower(), resume_skill.lower())
                        if score > 85: # High threshold for accuracy
                            if score > highest_score:
                                highest_score = score
                                best_match = resume_skill
                    
                    if best_match:
                        matched.append({
                            'skill': jd_skill,
                            'resume_skill': best_match,
                            'resume_freq': resume_skills[best_match],
                            'jd_freq': jd_freq,
                            'match_type': 'fuzzy',
                            'score': highest_score,
                            'category': 'soft_skills' if skill_type == 'soft' else 'technical_skills'
                        })
                        found_match = True

        # Calculate missing skills
        for jd_skill, jd_freq in jd_skills.items():
            is_matched = any(m['skill'] == jd_skill for m in matched)
            if not is_matched:
                missing.append({
                    'skill': jd_skill,
                    'jd_freq': jd_freq,
                    'importance': self._calculate_skill_importance(jd_skill, jd_freq),
                    'category': 'soft_skills' if skill_type == 'soft' else 'technical_skills'
                })

        # Calculate match score
        total_jd_skills = len(jd_skills)
        matched_count = len(matched)
        score = (matched_count / max(total_jd_skills, 1)) * 100

        return {
            'score': score,
            'matched': matched,
            'missing': missing,
            'match_ratio': f"{matched_count}/{total_jd_skills}"
        }

    def _calculate_experience_match(self, resume_exp: Dict, jd_exp: Dict) -> float:
        """Calculate experience level matching"""
        resume_years = resume_exp.get('max_years', 0)
        jd_years = jd_exp.get('max_years', 0)

        if jd_years == 0:
            return 100.0  # No specific requirement

        if resume_years >= jd_years:
            return 100.0  # Meets or exceeds requirement
        elif resume_years >= jd_years * 0.8:
            return 85.0   # Close to requirement
        elif resume_years >= jd_years * 0.6:
            return 70.0   # Somewhat below requirement
        else:
            return 50.0   # Significantly below requirement

    def _calculate_education_match(self, resume_edu: Dict, jd_edu: Dict) -> float:
        """Calculate education level matching"""
        education_hierarchy = {'phd': 4, 'master': 3, 'bachelor': 2, 'certification': 1}

        resume_level = 0
        jd_level = 0

        for edu_type, level in education_hierarchy.items():
            if edu_type in resume_edu:
                resume_level = max(resume_level, level)
            if edu_type in jd_edu:
                jd_level = max(jd_level, level)

        if jd_level == 0:
            return 100.0  # No specific requirement

        if resume_level >= jd_level:
            return 100.0
        elif resume_level == jd_level - 1:
            return 80.0
        else:
            return 60.0

    def _classify_experience_level(self, years: int) -> str:
        """Classify experience level based on years"""
        if years >= 10:
            return 'senior'
        elif years >= 5:
            return 'mid-level'
        elif years >= 2:
            return 'junior'
        else:
            return 'entry-level'

    def _calculate_skill_importance(self, skill: str, frequency: int) -> float:
        """Calculate skill importance based on frequency and context"""
        base_importance = min(frequency * 10, 100)  # Cap at 100

        # Boost importance for critical skills
        critical_skills = ['python', 'javascript', 'java', 'react', 'sql', 'aws']
        if skill.lower() in critical_skills:
            base_importance *= 1.2

        return min(base_importance, 100)

    def _identify_critical_gaps(self, missing_skills: List[Dict], jd_skills: Dict) -> List[Dict]:
        """Identify critical skill gaps that need immediate attention"""
        critical_gaps = []

        for missing in missing_skills:
            if missing['importance'] > 70:  # High importance threshold
                critical_gaps.append({
                    'skill': missing['skill'],
                    'importance': missing['importance'],
                    'priority': 'high',
                    'suggestion': f"Consider adding {missing['skill']} to your resume"
                })

        return critical_gaps[:5]  # Return top 5 critical gaps

    def _identify_strengths(self, matched_skills: List[Dict], resume_skills: Dict) -> List[Dict]:
        """Identify strength areas to highlight"""
        strengths = []

        for match in matched_skills:
            if match.get('resume_freq', 0) > 2:  # Mentioned multiple times
                strengths.append({
                    'skill': match['skill'],
                    'frequency': match.get('resume_freq', 0),
                    'strength_level': 'high' if match.get('resume_freq', 0) > 4 else 'medium'
                })

        return sorted(strengths, key=lambda x: x['frequency'], reverse=True)[:5]

    def _calculate_ats_compatibility(self, resume_text: str, jd_analysis: Dict) -> float:
        """Calculate ATS (Applicant Tracking System) compatibility score"""
        score = 100.0

        # Check for common ATS issues
        if len(resume_text.split()) < 200:
            score -= 10  # Too short
        elif len(resume_text.split()) > 1000:
            score -= 5   # Might be too long

        # Check for keyword density
        jd_keywords = jd_analysis['extracted_keywords']
        total_jd_keywords = sum(len(skills) for skills in jd_keywords.values())

        if total_jd_keywords > 0:
            keyword_coverage = self._calculate_keyword_coverage(resume_text, jd_keywords)
            if keyword_coverage < 30:
                score -= 20  # Low keyword coverage
            elif keyword_coverage < 50:
                score -= 10

        return max(score, 0)

    def _calculate_keyword_coverage(self, text: str, jd_keywords: Dict) -> float:
        """Calculate what percentage of JD keywords appear in resume"""
        text_lower = text.lower()
        total_keywords = 0
        found_keywords = 0

        for category, skills in jd_keywords.items():
            if isinstance(skills, dict):
                for skill, freq in skills.items():
                    total_keywords += 1
                    if skill in text_lower:
                        found_keywords += 1
            elif isinstance(skills, list):
                for skill in skills:
                    total_keywords += 1
                    if skill in text_lower:
                        found_keywords += 1

        return (found_keywords / max(total_keywords, 1)) * 100

    def _calculate_keyword_density(self, text: str, jd_analysis: Dict) -> Dict:
        """Calculate keyword density metrics"""
        words = text.lower().split()
        total_words = len(words)

        if total_words == 0:
            return {'density': 0, 'keyword_count': 0, 'total_words': 0}

        keyword_count = 0
        jd_keywords = jd_analysis.get('extracted_keywords', {})

        for category, skills in jd_keywords.items():
            if isinstance(skills, dict):
                for skill in skills.keys():
                    keyword_count += text.lower().count(skill)
            elif isinstance(skills, list):
                for skill in skills:
                    keyword_count += text.lower().count(skill)

        density = (keyword_count / total_words) * 100

        return {
            'density': round(density, 2),
            'keyword_count': keyword_count,
            'total_words': total_words
        }

    def _generate_contextual_recommendations(self, resume_analysis: Dict, jd_analysis: Dict, match_results: Dict) -> List[Dict]:
        """Generate comprehensive contextual recommendations based on detailed analysis"""
        recommendations = []

        # Detailed recommendations for missing critical skills
        for gap in match_results['skill_gaps'][:5]:  # Top 5 critical gaps
            skill_name = gap['skill']
            frequency = gap.get('jd_freq', 1)
            importance = gap.get('importance', 0.5)

            # Generate specific, actionable recommendations
            if importance > 0.8:
                priority = 'critical'
                action_detail = f"This is a core requirement mentioned {frequency} times. Add a dedicated section showcasing {skill_name} projects, certifications, or experience. Include specific metrics and outcomes."
            elif importance > 0.6:
                priority = 'high'
                action_detail = f"Important skill mentioned {frequency} times. Include {skill_name} in your skills section and mention it in relevant work experience with concrete examples."
            else:
                priority = 'medium'
                action_detail = f"Consider adding {skill_name} to strengthen your profile. Mention any related experience or training you have."

            recommendations.append({
                'type': 'skill_gap',
                'priority': priority,
                'title': f"Add {skill_name} expertise to your resume",
                'description': f"Critical skill gap - {skill_name} appears {frequency} times in job requirements",
                'action': action_detail,
                'category': 'technical_skills',
                'impact': 'high'
            })

        # Enhanced recommendations for strengthening existing skills
        for strength in match_results['strength_areas'][:4]:
            skill_name = strength['skill']
            frequency = strength.get('frequency', 1)

            recommendations.append({
                'type': 'skill_enhancement',
                'priority': 'medium',
                'title': f"Amplify your {skill_name} expertise",
                'description': f"You have {skill_name} experience ({frequency} mentions) - make it more prominent",
                'action': f"Move {skill_name} to the top of your skills section. Add quantifiable achievements: 'Led {skill_name} project resulting in X% improvement' or 'Implemented {skill_name} solution saving $X annually'",
                'category': 'skill_enhancement',
                'impact': 'medium'
            })

        # Comprehensive formatting and ATS recommendations
        recommendations.extend([
            {
                'type': 'formatting',
                'priority': 'high',
                'title': 'Optimize resume structure for ATS scanning',
                'description': 'Improve your resume\'s compatibility with Applicant Tracking Systems',
                'action': 'Use standard section headers (Experience, Education, Skills). Avoid tables, graphics, and complex formatting. Use bullet points and consistent formatting throughout.',
                'category': 'formatting',
                'impact': 'high'
            },
            {
                'type': 'keyword_optimization',
                'priority': 'high',
                'title': 'Increase keyword density and relevance',
                'description': 'Enhance keyword matching with job description',
                'action': 'Incorporate more job-specific keywords naturally throughout your resume. Use exact phrases from the job posting when describing your experience.',
                'category': 'content',
                'impact': 'high'
            },
            {
                'type': 'content_enhancement',
                'priority': 'medium',
                'title': 'Add quantifiable achievements and metrics',
                'description': 'Strengthen your resume with measurable results',
                'action': 'Replace generic descriptions with specific metrics: "Increased sales by 25%", "Managed team of 8 developers", "Reduced processing time by 40%"',
                'category': 'content',
                'impact': 'medium'
            },
            {
                'type': 'industry_alignment',
                'priority': 'medium',
                'title': 'Align experience with industry requirements',
                'description': 'Better match your background to the target role',
                'action': 'Emphasize relevant experience and use industry-specific terminology. Highlight transferable skills and relevant projects.',
                'category': 'content',
                'impact': 'medium'
            }
        ])

        return recommendations[:12]  # Return top 12 comprehensive recommendations



    # Legacy compatibility methods (kept for backward compatibility)
    def calculate_enhanced_match(self, user_id: int, resume_id: int, job_description_id: int) -> Dict:
        """Legacy method - redirects to new implementation"""
        return self.calculate_enhanced_match_score(resume_id, job_description_id, user_id)

    def _extract_skills_with_frequency(self, text: str, skill_type: str) -> Dict[str, int]:
        """Legacy method - redirects to semantic extraction"""
        if skill_type == 'technical':
            return self._extract_technical_skills_semantic(text)
        elif skill_type == 'soft':
            return self._extract_soft_skills_semantic(text)
        else:
            return {}

    def _extract_experience_years(self, text: str) -> int:
        """Legacy method - extract experience years"""
        experience_analysis = self._analyze_experience_context(text)
        return experience_analysis.get('max_years', 0)

    def _extract_education_level(self, text: str) -> str:
        """Legacy method - extract education level"""
        education_analysis = self._analyze_education_context(text)

        if 'phd' in education_analysis:
            return 'doctorate'
        elif 'master' in education_analysis:
            return 'masters'
        elif 'bachelor' in education_analysis:
            return 'bachelors'
        elif 'certification' in education_analysis:
            return 'certification'
        else:
            return 'unknown'



    # Additional helper methods for complete implementation
    def _calculate_detailed_skill_matching(self, resume_analysis: Dict, jd_analysis: Dict) -> Dict:
        """Calculate detailed skill matching between resume and job description"""
        resume_tech = resume_analysis.get('technical_skills', {})
        resume_soft = resume_analysis.get('soft_skills', {})
        jd_tech = jd_analysis.get('technical_skills', {})
        jd_soft = jd_analysis.get('soft_skills', {})

        return {
            'technical_matches': self._calculate_skill_matches(resume_tech, jd_tech),
            'soft_skill_matches': self._calculate_skill_matches(resume_soft, jd_soft)
        }

    def _calculate_weighted_scores(self, skill_matches: Dict, jd_analysis: Dict) -> Dict:
        """Calculate weighted scores based on skill importance"""
        tech_score = skill_matches['technical_matches']['score']
        soft_score = skill_matches['soft_skill_matches']['score']

        # Weight technical skills more heavily
        overall_score = (tech_score * 0.7) + (soft_score * 0.3)

        return {
            'overall': round(overall_score, 1),
            'technical': round(tech_score, 1),
            'soft': round(soft_score, 1),
            'experience': 85.0,  # Placeholder
            'education': 90.0    # Placeholder
        }

    def _generate_detailed_analysis(self, skill_matches: Dict, resume_analysis: Dict, jd_analysis: Dict) -> Dict:
        """Generate detailed analysis for frontend display"""
        return {
            'matched_skills': skill_matches['technical_matches']['matched'] + skill_matches['soft_skill_matches']['matched'],
            'missing_skills': skill_matches['technical_matches']['missing'] + skill_matches['soft_skill_matches']['missing'],
            'skill_gaps': self._identify_critical_gaps(skill_matches['technical_matches']['missing'], jd_analysis.get('technical_skills', {})),
            'strength_areas': self._identify_strengths(skill_matches['technical_matches']['matched'], resume_analysis.get('technical_skills', {}))
        }

    def _generate_recommendations(self, skill_matches: Dict, jd_analysis: Dict) -> List[Dict]:
        """Generate recommendations based on skill analysis"""
        recommendations = []

        # Add recommendations for missing skills
        missing_skills = skill_matches['technical_matches']['missing'] + skill_matches['soft_skill_matches']['missing']

        for missing in missing_skills[:5]:  # Top 5 missing skills
            recommendations.append({
                'type': 'skill_gap',
                'priority': 'high' if missing.get('importance', 0) > 70 else 'medium',
                'title': f"Add {missing['skill']} to your resume",
                'description': f"This skill is mentioned {missing.get('jd_freq', 1)} times in the job description",
                'action': f"Include specific examples of {missing['skill']} experience",
                'category': 'technical_skills'
            })

        return recommendations
    
    def _generate_detailed_analysis(self, skill_matches: Dict, resume_analysis: Dict, jd_analysis: Dict) -> Dict:
        """
        Generate detailed analysis for frontend display
        """
        return {
            'skills_comparison': {
                'technical_skills': [
                    {
                        'skill': match['skill'],
                        'resume_count': match['resume_freq'],
                        'jd_count': match['jd_freq'],
                        'match_type': 'exact'
                    } for match in skill_matches['technical_exact']
                ] + [
                    {
                        'skill': match['jd_skill'],
                        'resume_count': 'X',
                        'jd_count': match['jd_freq'],
                        'match_type': 'missing'
                    } for match in skill_matches['technical_missing']
                ],
                'soft_skills': [
                    {
                        'skill': match['skill'],
                        'resume_count': match['resume_freq'],
                        'jd_count': match['jd_freq'],
                        'match_type': 'exact'
                    } for match in skill_matches['soft_exact']
                ] + [
                    {
                        'skill': match['jd_skill'],
                        'resume_count': 'X',
                        'jd_count': match['jd_freq'],
                        'match_type': 'missing'
                    } for match in skill_matches['soft_missing']
                ]
            },
            'summary': {
                'total_technical_skills': len(jd_analysis['technical_skills']),
                'matched_technical_skills': len(skill_matches['technical_exact']) + len(skill_matches['technical_partial']),
                'total_soft_skills': len(jd_analysis['soft_skills']),
                'matched_soft_skills': len(skill_matches['soft_exact']) + len(skill_matches['soft_partial'])
            }
        }
    
    def _generate_recommendations(self, skill_matches: Dict, jd_analysis: Dict) -> List[Dict]:
        """
        Generate actionable recommendations based on analysis
        """
        recommendations = []
        
        # Missing critical technical skills
        for missing in skill_matches['technical_missing']:
            if missing['importance'] > 0.7:
                recommendations.append({
                    'type': 'critical',
                    'category': 'technical',
                    'title': f"Add {missing['skill']} experience",
                    'description': f"This skill appears {missing['jd_freq']} times in the job description and is highly important.",
                    'action': f"Include projects or experience with {missing['skill']} in your resume."
                })
        
        # Missing soft skills
        for missing in skill_matches['soft_missing']:
            if missing['importance'] > 0.6:
                recommendations.append({
                    'type': 'important',
                    'category': 'soft',
                    'title': f"Highlight {missing['skill']} abilities",
                    'description': f"This soft skill is mentioned {missing['jd_freq']} times in the job description.",
                    'action': f"Add examples demonstrating your {missing['skill']} in your work experience."
                })
        
        return recommendations
    
    def _extract_experience_years(self, text: str) -> int:
        """Extract years of experience from text"""
        patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'(\d+)\+?\s*years?\s*in',
            r'experience.*?(\d+)\+?\s*years?'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return max(int(match) for match in matches)
        
        return 0
    
    def _extract_education_level(self, text: str) -> str:
        """Extract education level from text"""
        if re.search(r'\b(?:phd|doctorate|doctoral)\b', text, re.IGNORECASE):
            return 'PhD'
        elif re.search(r'\b(?:master|mba|ms|ma)\b', text, re.IGNORECASE):
            return 'Masters'
        elif re.search(r'\b(?:bachelor|bs|ba|degree)\b', text, re.IGNORECASE):
            return 'Bachelors'
        else:
            return 'Other'
    

