"""
Keyword parsing service for extracting skills and keywords from text
"""
import re
import string
import logging
from collections import Counter
from typing import List, Dict, Tuple, Set

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import NLP libraries
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize, sent_tokenize
    from nltk.stem import WordNetLemmatizer
    from nltk.tag import pos_tag
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False
    logger.warning("NLTK not available. Using basic keyword extraction.")

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    logger.warning("SpaCy not available. Using basic keyword extraction.")

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("Scikit-learn not available. Using basic keyword extraction.")

class KeywordParser:
    """Service for parsing and extracting keywords from resume and job description text"""
    
    def __init__(self):
        self.stop_words = self._get_stop_words()
        self.lemmatizer = self._get_lemmatizer()
        self.nlp = None  # Load spaCy model lazily
        
        # Comprehensive technical skills dictionary for ASP.NET + Angular Full Stack
        self.technical_skills = {
            'programming_languages': [
                'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'csharp', 'php', 'ruby',
                'go', 'rust', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'shell',
                'bash', 'powershell', 'sql', 'html', 'css', 'sass', 'less', 'scss'
            ],
            'dotnet_frameworks': [
                'asp.net', 'asp.net core', 'aspnet', 'aspnet core', '.net', '.net core', 'dotnet',
                'entity framework', 'entity framework core', 'ef core', 'web api', 'mvc',
                'blazor', 'razor', 'linq', 'signalr', 'wcf', 'wpf', 'winforms'
            ],
            'frontend_frameworks': [
                'react', 'angular', 'vue', 'vue.js', 'svelte', 'ember', 'backbone',
                'jquery', 'bootstrap', 'tailwind', 'tailwindcss', 'material-ui', 'mui',
                'redux', 'vuex', 'rxjs', 'ngrx', 'mobx', 'recoil'
            ],
            'angular_specific': [
                'angular', 'angular guards', 'guards', 'pipes', 'directives', 'services',
                'components', 'modules', 'routing', 'httpclient', 'observables', 'rxjs',
                'ngrx', 'angular material', 'angular cli', 'dependency injection'
            ],
            'databases': [
                'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'sqlite',
                'oracle', 'sql server', 'sqlserver', 'mssql', 'cassandra', 'dynamodb',
                'firebase', 'couchdb', 'mariadb', 'cosmos db', 'azure sql'
            ],
            'authentication_security': [
                'jwt', 'json web token', 'oauth', 'oauth2', 'saml', 'openid', 'ldap',
                'authorization', 'authentication', 'rbac', 'role-based access control',
                'guards', 'filters', 'authorization filters', 'angular guards', 'cors',
                'ssl', 'tls', 'https', 'encryption', 'hashing', 'bcrypt'
            ],
            'cloud_devops': [
                'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s',
                'jenkins', 'gitlab', 'github actions', 'azure devops', 'terraform',
                'ansible', 'chef', 'puppet', 'vagrant', 'ci/cd', 'devops', 'microservices',
                'serverless', 'lambda', 'azure functions', 'containers', 'iis'
            ],
            'testing_tools': [
                'unit testing', 'integration testing', 'xunit', 'nunit', 'mstest', 'moq',
                'jasmine', 'karma', 'protractor', 'cypress', 'selenium', 'jest', 'postman',
                'swagger', 'openapi', 'api testing', 'load testing', 'performance testing'
            ],
            'development_tools': [
                'git', 'svn', 'visual studio', 'vs code', 'jira', 'confluence', 'slack',
                'teams', 'postman', 'swagger', 'fiddler', 'resharper', 'nuget', 'npm', 'yarn'
            ],
            'data_science': [
                'machine learning', 'deep learning', 'ai', 'artificial intelligence',
                'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'jupyter',
                'tableau', 'power bi', 'excel', 'statistics', 'data analysis',
                'data visualization', 'big data', 'hadoop', 'spark', 'kafka'
            ]
        }
        
        self.soft_skills = [
            'communication', 'leadership', 'teamwork', 'problem solving', 'critical thinking',
            'creativity', 'adaptability', 'time management', 'organization', 'attention to detail',
            'analytical', 'strategic thinking', 'project management', 'collaboration', 'mentoring',
            'training', 'presentation', 'negotiation', 'customer service', 'sales', 'marketing',
            'research', 'writing', 'editing', 'planning', 'coordination', 'multitasking',
            'decision making', 'conflict resolution', 'emotional intelligence', 'empathy',
            'patience', 'persistence', 'initiative', 'self-motivated', 'detail-oriented',
            'results-driven', 'goal-oriented', 'innovative', 'resourceful', 'reliable'
        ]
        
        # Industry-specific keywords for full-stack development
        self.industry_keywords = [
            # Development terms
            'develop', 'build', 'create', 'design', 'implement', 'maintain', 'optimize',
            'integrate', 'deploy', 'test', 'debug', 'troubleshoot', 'refactor', 'enhance',
            'scalable', 'secure', 'performance', 'responsive', 'cross-platform', 'full-stack',
            'frontend', 'backend', 'server-side', 'client-side', 'api', 'rest', 'restful',

            # Business terms
            'requirements', 'specifications', 'documentation', 'code review', 'best practices',
            'standards', 'guidelines', 'methodology', 'process', 'workflow', 'pipeline',
            'delivery', 'deployment', 'production', 'staging', 'environment', 'configuration',

            # Quality terms
            'quality', 'reliability', 'availability', 'maintainability', 'extensibility',
            'reusability', 'modularity', 'clean code', 'solid principles', 'design patterns',
            'architecture', 'solution', 'framework', 'library', 'component', 'service'
        ]

        # Common job-related keywords
        self.job_keywords = [
            'experience', 'years', 'senior', 'junior', 'lead', 'manager', 'director',
            'engineer', 'developer', 'analyst', 'specialist', 'consultant', 'architect',
            'designer', 'administrator', 'coordinator', 'supervisor', 'executive',
            'intern', 'entry level', 'mid level', 'expert', 'professional', 'certified',
            'degree', 'bachelor', 'master', 'phd', 'diploma', 'certificate', 'training',
            'course', 'bootcamp', 'workshop', 'seminar', 'conference', 'publication'
        ]
    
    def _get_stop_words(self) -> Set[str]:
        """Get stop words for filtering"""
        if NLTK_AVAILABLE:
            try:
                nltk.download('stopwords', quiet=True)
                return set(stopwords.words('english'))
            except:
                pass
        
        # Fallback stop words
        return {
            'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
            'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she',
            'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
            'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that',
            'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an',
            'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of',
            'at', 'by', 'for', 'with', 'through', 'during', 'before', 'after', 'above',
            'below', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
            'further', 'then', 'once'
        }
    
    def _get_lemmatizer(self):
        """Get lemmatizer for word normalization"""
        if NLTK_AVAILABLE:
            try:
                nltk.download('wordnet', quiet=True)
                nltk.download('omw-1.4', quiet=True)
                return WordNetLemmatizer()
            except:
                pass
        return None
    
    def _get_spacy_model(self):
        """Get SpaCy model for advanced NLP with caching"""
        if KeywordParser._nlp_model is not None:
            return KeywordParser._nlp_model

        if SPACY_AVAILABLE:
            try:
                # Try to load from RealTimeLLMService if available
                from backend.services.enhanced_matching_service import RealTimeLLMService
                if RealTimeLLMService._nlp_model:
                    KeywordParser._nlp_model = RealTimeLLMService._nlp_model
                    return KeywordParser._nlp_model
                
                KeywordParser._nlp_model = spacy.load('en_core_web_sm')
                return KeywordParser._nlp_model
            except OSError:
                logger.warning("SpaCy model 'en_core_web_sm' not found. Fallback to basic extraction.")
        return None

    _nlp_model = None  # Class variable to cache the model
    
    def extract_keywords(self, text: str, max_keywords: int = 50) -> Dict[str, List[str]]:
        """
        Extract keywords from text and categorize them
        
        Args:
            text (str): Input text to analyze
            max_keywords (int): Maximum number of keywords to extract
            
        Returns:
            dict: Dictionary with categorized keywords
        """
        if not text or not text.strip():
            return {
                'technical_skills': [],
                'soft_skills': [],
                'other_keywords': []
            }
        
        try:
            # Clean and preprocess text
            cleaned_text = self._clean_text(text)
            
            # Extract different types of keywords with improved methods
            technical_skills = self._extract_technical_skills_comprehensive(cleaned_text)
            soft_skills = self._extract_soft_skills(cleaned_text)
            other_keywords = self._extract_industry_keywords(cleaned_text, max_keywords)
            
            # Remove duplicates and limit results (increased limits for better coverage)
            technical_skills = list(set(technical_skills))[:max_keywords//2]  # Increased from //3 to //2
            soft_skills = list(set(soft_skills))[:max_keywords//4]
            other_keywords = list(set(other_keywords))[:max_keywords//2]  # Increased from //3 to //2
            
            logger.info(f"Extracted {len(technical_skills)} technical skills, {len(soft_skills)} soft skills, {len(other_keywords)} other keywords")
            
            return {
                'technical_skills': technical_skills,
                'soft_skills': soft_skills,
                'other_keywords': other_keywords
            }
            
        except Exception as e:
            logger.error(f"Error extracting keywords: {e}")
            return {
                'technical_skills': [],
                'soft_skills': [],
                'other_keywords': []
            }
    
    def _clean_text(self, text: str) -> str:
        """Clean and preprocess text"""
        # Convert to lowercase
        text = text.lower()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters but keep important ones
        text = re.sub(r'[^\w\s\-\.\+\#]', ' ', text)
        
        return text.strip()
    
    def _extract_technical_skills(self, text: str) -> List[str]:
        """Extract technical skills from text"""
        found_skills = []
        
        # Flatten all technical skills
        all_tech_skills = []
        for category, skills in self.technical_skills.items():
            all_tech_skills.extend(skills)
        
        # Look for exact matches and variations (case-insensitive)
        text_lower = text.lower()
        for skill in all_tech_skills:
            skill_lower = skill.lower()

            # Check for exact match
            if skill_lower in text_lower:
                found_skills.append(skill)
                continue

            # Check for variations (e.g., "node.js" vs "nodejs", "ASP.NET Core" vs "asp.net core")
            skill_variations = [
                skill_lower.replace('.', ''),
                skill_lower.replace('-', ''),
                skill_lower.replace(' ', ''),
                skill_lower.replace('.js', 'js'),
                skill_lower.replace('#', 'sharp'),
                skill_lower.replace('asp.net core', 'aspnetcore'),
                skill_lower.replace('entity framework', 'entityframework'),
                skill_lower.replace('angular guards', 'guards'),
                skill_lower.replace('authorization filters', 'filters')
            ]

            for variation in skill_variations:
                if variation in text_lower and variation != skill_lower:
                    found_skills.append(skill)
                    break
        
        return found_skills

    def _extract_technical_skills_comprehensive(self, text: str) -> List[str]:
        """Extract technical skills using comprehensive categorized approach"""
        found_skills = []
        text_lower = text.lower()

        # Extract from all technical skill categories
        for category, skills in self.technical_skills.items():
            for skill in skills:
                skill_lower = skill.lower()

                # Check for exact match
                if skill_lower in text_lower:
                    found_skills.append(skill)
                    continue

                # Check for variations and common alternatives
                variations = self._get_skill_variations(skill_lower)
                for variation in variations:
                    if variation in text_lower and variation != skill_lower:
                        found_skills.append(skill)
                        break

        return list(set(found_skills))  # Remove duplicates

    def _get_skill_variations(self, skill: str) -> List[str]:
        """Get common variations of a technical skill"""
        variations = [
            skill.replace('.', ''),
            skill.replace('-', ''),
            skill.replace(' ', ''),
            skill.replace('.js', 'js'),
            skill.replace('#', 'sharp'),
            skill.replace('asp.net core', 'aspnetcore'),
            skill.replace('entity framework', 'entityframework'),
            skill.replace('sql server', 'sqlserver'),
            skill.replace('github actions', 'githubactions'),
            skill.replace('role-based access control', 'rbac'),
            skill.replace('json web token', 'jwt')
        ]

        # Add common abbreviations
        abbreviations = {
            'asp.net': ['aspnet'],
            'entity framework': ['ef'],
            'sql server': ['mssql', 'sqlserver'],
            'typescript': ['ts'],
            'javascript': ['js'],
            'cascading style sheets': ['css'],
            'hypertext markup language': ['html']
        }

        if skill in abbreviations:
            variations.extend(abbreviations[skill])

        return variations

    def _extract_industry_keywords(self, text: str, max_keywords: int = 20) -> List[str]:
        """Extract industry-specific keywords"""
        found_keywords = []
        text_lower = text.lower()

        # Extract from industry keywords list
        for keyword in self.industry_keywords:
            if keyword.lower() in text_lower:
                found_keywords.append(keyword)

        # Also extract using existing other keywords method for additional terms
        other_keywords = self._extract_other_keywords(text, max_keywords)
        found_keywords.extend(other_keywords)

        return list(set(found_keywords))[:max_keywords]

    def _extract_soft_skills(self, text: str) -> List[str]:
        """Extract soft skills from text"""
        found_skills = []
        
        for skill in self.soft_skills:
            if skill in text:
                found_skills.append(skill)
        
        return found_skills
    
    def _extract_other_keywords(self, text: str, max_keywords: int = 20) -> List[str]:
        """Extract other important keywords using various methods"""
        keywords = []
        
        # Method 1: Use TF-IDF if available
        if SKLEARN_AVAILABLE:
            tfidf_keywords = self._extract_tfidf_keywords(text, max_keywords)
            keywords.extend(tfidf_keywords)
        
        # Method 2: Use NLTK if available
        if NLTK_AVAILABLE:
            nltk_keywords = self._extract_nltk_keywords(text, max_keywords)
            keywords.extend(nltk_keywords)
        
        # Method 3: Use SpaCy if available
        if self.nlp:
            spacy_keywords = self._extract_spacy_keywords(text, max_keywords)
            keywords.extend(spacy_keywords)
        
        # Method 4: Basic frequency analysis
        basic_keywords = self._extract_basic_keywords(text, max_keywords)
        keywords.extend(basic_keywords)
        
        # Remove duplicates and filter
        keywords = list(set(keywords))
        keywords = [kw for kw in keywords if len(kw) >= 2 and kw not in self.stop_words]
        
        return keywords[:max_keywords]
    
    def _extract_tfidf_keywords(self, text: str, max_keywords: int) -> List[str]:
        """Extract keywords using TF-IDF"""
        try:
            # For single documents, don't use max_df to avoid the error
            vectorizer = TfidfVectorizer(
                max_features=max_keywords,
                stop_words='english',
                ngram_range=(1, 2),
                min_df=1
                # Removed max_df to avoid "max_df corresponds to < documents than min_df" error
            )
            
            tfidf_matrix = vectorizer.fit_transform([text])
            feature_names = vectorizer.get_feature_names_out()
            scores = tfidf_matrix.toarray()[0]
            
            # Get top keywords
            keyword_scores = list(zip(feature_names, scores))
            keyword_scores.sort(key=lambda x: x[1], reverse=True)
            
            return [kw for kw, score in keyword_scores[:max_keywords] if score > 0]
            
        except Exception as e:
            logger.error(f"Error in TF-IDF extraction: {e}")
            return []
    
    def _extract_nltk_keywords(self, text: str, max_keywords: int) -> List[str]:
        """Extract keywords using NLTK"""
        try:
            nltk.download('punkt', quiet=True)
            nltk.download('averaged_perceptron_tagger', quiet=True)
            
            # Tokenize
            tokens = word_tokenize(text)
            
            # POS tagging
            pos_tags = pos_tag(tokens)
            
            # Extract nouns and adjectives
            keywords = []
            for word, pos in pos_tags:
                if pos in ['NN', 'NNS', 'NNP', 'NNPS', 'JJ', 'JJR', 'JJS']:
                    if len(word) >= 2 and word.lower() not in self.stop_words:
                        if self.lemmatizer:
                            word = self.lemmatizer.lemmatize(word.lower())
                        keywords.append(word.lower())
            
            # Count frequency
            word_freq = Counter(keywords)
            return [word for word, freq in word_freq.most_common(max_keywords)]
            
        except Exception as e:
            logger.error(f"Error in NLTK extraction: {e}")
            return []
    
    def _extract_spacy_keywords(self, text: str, max_keywords: int) -> List[str]:
        """Extract keywords using SpaCy"""
        try:
            # Load spaCy model lazily
            if self.nlp is None:
                self.nlp = self._get_spacy_model()

            if self.nlp is None:
                return []  # spaCy not available

            doc = self.nlp(text)
            
            keywords = []
            for token in doc:
                # Extract important tokens
                if (token.pos_ in ['NOUN', 'ADJ', 'PROPN'] and 
                    not token.is_stop and 
                    not token.is_punct and 
                    len(token.text) >= 2):
                    keywords.append(token.lemma_.lower())
            
            # Extract named entities
            for ent in doc.ents:
                if ent.label_ in ['ORG', 'PRODUCT', 'LANGUAGE', 'SKILL']:
                    keywords.append(ent.text.lower())
            
            # Count frequency
            word_freq = Counter(keywords)
            return [word for word, freq in word_freq.most_common(max_keywords)]
            
        except Exception as e:
            logger.error(f"Error in SpaCy extraction: {e}")
            return []
    
    def _extract_basic_keywords(self, text: str, max_keywords: int) -> List[str]:
        """Basic keyword extraction using frequency analysis"""
        # Simple tokenization
        words = re.findall(r'\b[a-zA-Z]{2,}\b', text)
        
        # Filter out stop words and short words
        filtered_words = [
            word.lower() for word in words 
            if word.lower() not in self.stop_words and len(word) >= 2
        ]
        
        # Count frequency
        word_freq = Counter(filtered_words)
        
        return [word for word, freq in word_freq.most_common(max_keywords)]
