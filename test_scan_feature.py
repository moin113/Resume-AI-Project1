"""
Test script to verify the scan feature is working correctly
Run this before deploying to EB to ensure all NLP dependencies are working
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_nlp_dependencies():
    """Test that all NLP dependencies are available"""
    print("=" * 60)
    print("Testing NLP Dependencies")
    print("=" * 60)
    
    # Test 1: spaCy
    print("\n1. Testing spaCy...")
    try:
        import spacy
        print("   ✅ spaCy imported successfully")
        
        try:
            nlp = spacy.load('en_core_web_sm')
            print("   ✅ spaCy model 'en_core_web_sm' loaded successfully")
            
            # Test processing
            doc = nlp("This is a test sentence with Python and JavaScript skills.")
            print(f"   ✅ Processed test sentence: {len(doc)} tokens")
        except OSError as e:
            print(f"   ❌ spaCy model not found: {e}")
            print("   Run: python -m spacy download en_core_web_sm")
            return False
    except ImportError as e:
        print(f"   ❌ spaCy not installed: {e}")
        return False
    
    # Test 2: NLTK
    print("\n2. Testing NLTK...")
    try:
        import nltk
        print("   ✅ NLTK imported successfully")
        
        try:
            from nltk.corpus import stopwords
            stop_words = stopwords.words('english')
            print(f"   ✅ NLTK stopwords loaded: {len(stop_words)} words")
        except Exception as e:
            print(f"   ❌ NLTK data not found: {e}")
            print("   Run: python -m nltk.downloader punkt stopwords averaged_perceptron_tagger")
            return False
            
        try:
            from nltk.tokenize import word_tokenize
            tokens = word_tokenize("This is a test.")
            print(f"   ✅ NLTK tokenizer working: {tokens}")
        except Exception as e:
            print(f"   ❌ NLTK tokenizer failed: {e}")
            return False
    except ImportError as e:
        print(f"   ❌ NLTK not installed: {e}")
        return False
    
    # Test 3: scikit-learn
    print("\n3. Testing scikit-learn...")
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        print("   ✅ scikit-learn imported successfully")
        
        # Test TF-IDF
        vectorizer = TfidfVectorizer()
        texts = ["Python developer with 5 years experience", "Java developer seeking new role"]
        tfidf_matrix = vectorizer.fit_transform(texts)
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        print(f"   ✅ TF-IDF vectorizer working: similarity = {similarity:.4f}")
    except ImportError as e:
        print(f"   ❌ scikit-learn not installed: {e}")
        return False
    
    # Test 4: fuzzywuzzy
    print("\n4. Testing fuzzywuzzy...")
    try:
        from fuzzywuzzy import fuzz
        ratio = fuzz.ratio("python", "Python")
        print(f"   ✅ fuzzywuzzy working: ratio = {ratio}")
    except ImportError as e:
        print(f"   ❌ fuzzywuzzy not installed: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ All NLP dependencies are working correctly!")
    print("=" * 60)
    return True


def test_enhanced_matching_service():
    """Test the RealTimeLLMService"""
    print("\n" + "=" * 60)
    print("Testing Enhanced Matching Service")
    print("=" * 60)
    
    try:
        from backend.services.enhanced_matching_service import RealTimeLLMService
        print("✅ RealTimeLLMService imported successfully")
        
        # Initialize service
        service = RealTimeLLMService()
        print("✅ RealTimeLLMService initialized")
        
        # Test with sample data
        resume_text = """
        John Doe
        Software Engineer
        
        EXPERIENCE:
        5 years of experience with Python, JavaScript, and React.
        Developed web applications using Django and Flask.
        Strong problem-solving and communication skills.
        
        EDUCATION:
        Bachelor of Science in Computer Science
        """
        
        jd_text = """
        Senior Software Engineer
        
        REQUIREMENTS:
        - 5+ years experience with Python and JavaScript
        - Experience with React and modern web frameworks
        - Strong communication skills
        - Bachelor's degree in Computer Science
        """
        
        print("\nPerforming analysis...")
        result = service.analyze_resume_realtime(resume_text, jd_text)
        
        if result.get('success'):
            print("✅ Analysis completed successfully!")
            print(f"   Overall Score: {result['overall_match_score']:.1f}%")
            print(f"   Technical Skills: {result['category_scores']['technical_skills']:.1f}%")
            print(f"   Soft Skills: {result['category_scores']['soft_skills']:.1f}%")
            print(f"   ATS Compatibility: {result['category_scores']['ats_compatibility']:.1f}%")
            print(f"   Matched Skills: {len(result['detailed_analysis']['matched_skills'])}")
            print(f"   Missing Skills: {len(result['detailed_analysis']['missing_skills'])}")
            print(f"   Recommendations: {len(result['recommendations'])}")
            return True
        else:
            print(f"❌ Analysis failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing service: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_database_models():
    """Test that database models are working"""
    print("\n" + "=" * 60)
    print("Testing Database Models")
    print("=" * 60)
    
    try:
        from backend.models import db, User, Resume, JobDescription, ScanHistory
        print("✅ Database models imported successfully")
        return True
    except Exception as e:
        print(f"❌ Error importing models: {e}")
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("RESUME DOCTOR AI - SCAN FEATURE TEST")
    print("=" * 60)
    
    tests = [
        ("NLP Dependencies", test_nlp_dependencies),
        ("Enhanced Matching Service", test_enhanced_matching_service),
        ("Database Models", test_database_models),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' crashed: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED!")
        print("You can now deploy to Elastic Beanstalk")
        print("=" * 60)
        return 0
    else:
        print("\n" + "=" * 60)
        print("⚠️  SOME TESTS FAILED")
        print("Please fix the issues before deploying")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
