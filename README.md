# Dr. Resume AI 🚀

An advanced AI-powered Resume Analyzer and ATS Optimizer that helps users bridge the gap between their resumes and job descriptions.

## ✨ Features
- **AI-Powered Scanning**: Compares resumes against job descriptions using NLP and LLM-enhanced algorithms.
- **Skill Gap Analysis**: Identifies missing technical and soft skills.
- **Scan History**: Keep track of all your past analyses with detailed metrics.
- **Smart Dashboard**: Real-time stats, scan balance, and recent activity.
- **Usage Limits**: Free tier with 5 scans; upgrade-ready logic.
- **JWT Authentication**: Secure login and session management.

## 🛠️ Tech Stack
- **Backend**: Flask (Python), Flask-JWT-Extended, SQLAlchemy
- **Database**: SQLite (Production-ready for Elastic Beanstalk)
- **Frontend**: Vanilla HTML5, CSS3 (Premium Dark Mode UI), Modern JS
- **AI/NLP**: NLTK, Spacy, Custom Matching Algorithms
- **Deployment**: AWS Elastic Beanstalk

## 🚀 Getting Started

### Local Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the application:
   ```bash
   python backend/app.py
   ```
4. Access at `http://localhost:5000`

### Running Tests
- **Backend Tests**: `python test_phase7.py`
- **Production Verification**: `python PHASE9_VERIFICATION.py`

## ☁️ Deployment (AWS Elastic Beanstalk)
1. **Initialize EB**: `eb init`
2. **Environment Configuration**:
   - Set `SECRET_KEY` and `JWT_SECRET_KEY` in EB Configuration -> Environment properties.
   - Set `FLASK_ENV=production`.
3. **Deploy**: `eb deploy`

## 📊 API Summary
- `POST /api/register` - Create a new account
- `POST /api/login` - Get access & refresh tokens
- `POST /api/upload_resume` - Upload and parse resume
- `POST /api/upload_jd` - Upload or save job description
- `POST /api/scan` - Perform AI analysis (uses 1 scan credit)
- `GET /api/scans` - List all past scans
- `GET /api/scan/<id>` - Detailed report for a specific scan
- `GET /api/dashboard/summary` - User stats and scan balance

## 📝 License
Proprietary. Developed for Dr. Resume AI Project.
