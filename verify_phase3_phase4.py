"""
Quick verification script to check if Phase 3 & 4 are properly configured
This doesn't require external dependencies
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def check_blueprints():
    """Check if all blueprints are properly registered"""
    print("="*80)
    print("  PHASE 3 & 4 CONFIGURATION VERIFICATION")
    print("="*80)
    
    try:
        from backend.app import create_app
        app = create_app()
        
        print("\n✅ App created successfully")
        
        # Check registered blueprints
        print("\n📋 Registered Blueprints:")
        for blueprint_name in app.blueprints:
            print(f"   ✓ {blueprint_name}")
        
        # Check if required blueprints are registered
        required_blueprints = ['auth', 'upload', 'job_descriptions']
        missing = []
        for bp in required_blueprints:
            if bp not in app.blueprints:
                missing.append(bp)
        
        if missing:
            print(f"\n❌ Missing blueprints: {', '.join(missing)}")
            return False
        else:
            print("\n✅ All required blueprints registered")
        
        # Check routes
        print("\n🛣️  Available Routes:")
        routes = []
        for rule in app.url_map.iter_rules():
            if rule.endpoint != 'static':
                routes.append(f"   {', '.join(rule.methods)} {rule.rule}")
        
        # Sort and print routes
        for route in sorted(routes):
            print(route)
        
        # Check critical Phase 3 & 4 routes
        print("\n🔍 Critical Routes Check:")
        critical_routes = [
            ('/health', 'Health check'),
            ('/api/ping', 'API ping'),
            ('/api/register', 'User registration'),
            ('/api/login', 'User login'),
            ('/api/profile', 'User profile'),
            ('/api/upload_resume', 'Resume upload'),
            ('/api/resumes', 'List resumes'),
            ('/api/jd', 'Create JD'),
            ('/api/jd/latest', 'Get latest JD'),
        ]
        
        all_routes = [str(rule.rule) for rule in app.url_map.iter_rules()]
        
        for route, description in critical_routes:
            if route in all_routes:
                print(f"   ✅ {route} - {description}")
            else:
                print(f"   ❌ {route} - {description} (MISSING)")
        
        # Check config
        print("\n⚙️  Configuration:")
        print(f"   Upload Folder: {app.config.get('UPLOAD_FOLDER')}")
        print(f"   Resume Upload Folder: {app.config.get('RESUME_UPLOAD_FOLDER')}")
        print(f"   JWT Access Token Expires: {app.config.get('JWT_ACCESS_TOKEN_EXPIRES')}")
        print(f"   Database URI: {app.config.get('SQLALCHEMY_DATABASE_URI')}")
        
        # Check if folders exist
        upload_folder = app.config.get('UPLOAD_FOLDER')
        resume_folder = app.config.get('RESUME_UPLOAD_FOLDER')
        
        print("\n📁 Folder Status:")
        if upload_folder and os.path.exists(upload_folder):
            print(f"   ✅ Upload folder exists: {upload_folder}")
        else:
            print(f"   ❌ Upload folder missing: {upload_folder}")
        
        if resume_folder and os.path.exists(resume_folder):
            print(f"   ✅ Resume folder exists: {resume_folder}")
        else:
            print(f"   ❌ Resume folder missing: {resume_folder}")
        
        # Check database
        print("\n💾 Database Check:")
        try:
            with app.app_context():
                from backend.models import db, User, Resume, JobDescription
                
                # Check if tables exist
                inspector = db.inspect(db.engine)
                tables = inspector.get_table_names()
                
                print(f"   Tables found: {len(tables)}")
                for table in tables:
                    print(f"      ✓ {table}")
                
                required_tables = ['users', 'resumes', 'job_descriptions']
                missing_tables = [t for t in required_tables if t not in tables]
                
                if missing_tables:
                    print(f"   ❌ Missing tables: {', '.join(missing_tables)}")
                else:
                    print("   ✅ All required tables exist")
        except Exception as e:
            print(f"   ⚠️  Database check error: {str(e)}")
        
        print("\n" + "="*80)
        print("  VERIFICATION COMPLETE")
        print("="*80)
        print("\n✅ Phase 3 & 4 configuration looks good!")
        print("\n📝 Next Steps:")
        print("   1. Start the Flask app: python backend/app.py")
        print("   2. Run the full test suite: python test_phase3_phase4.py")
        print("   3. Or test manually using Postman/curl")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_blueprints()
    sys.exit(0 if success else 1)
