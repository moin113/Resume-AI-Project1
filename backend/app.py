#!/usr/bin/env python3
"""
Dr. Resume AI - Flask Application
Production-safe for Local + AWS Elastic Beanstalk
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from flask import Flask, render_template, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# --------------------------------------------------
# Logging
# --------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dr_resume")

# --------------------------------------------------
# Path setup
# --------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# --------------------------------------------------
# App Factory
# --------------------------------------------------
def create_app():
    # Flask will automatically find 'templates' and 'static' inside the 'backend' folder
    app = Flask(__name__)

    # ---------------- CONFIG ----------------
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "prod-secret-change-me")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "jwt-secret-change-me"))
    
    # Environment control
    ENV = os.getenv("FLASK_ENV", "production")
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
    app.config["DEBUG"] = DEBUG

    # SQLite (EB-safe) - Use a defined path or fallback to local
    db_env = os.getenv("DATABASE_URL")
    if db_env:
        if db_env.startswith("sqlite://"):
            app.config["SQLALCHEMY_DATABASE_URI"] = db_env
        else:
            # If it's just a path, make it a sqlite URI
            app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_env}"
    else:
        default_db_path = os.path.join(BASE_DIR, "app.db")
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{default_db_path}"
    
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Uploads
    upload_path = os.path.join(BASE_DIR, "uploads")
    resume_upload_path = os.path.join(upload_path, "resumes")
    os.makedirs(upload_path, exist_ok=True)
    os.makedirs(resume_upload_path, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = upload_path
    app.config["RESUME_UPLOAD_FOLDER"] = resume_upload_path

    # JWT
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=7)

    # ---------------- EXTENSIONS ----------------
    # In production, you might want to restrict this to your domain
    # Example: CORS(app, origins=["https://yourdomain.com"])
    allowed_origins = os.getenv("CORS_ORIGINS", "*")
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
    JWTManager(app)

    # ---------------- HEALTH ----------------
    @app.route("/health")
    def health():
        return jsonify(
            service="resume-doctor-ai",
            status="ok",
            timestamp=datetime.utcnow().isoformat()
        ), 200

    # ---------------- HARD API TEST ----------------
    @app.route("/api/ping")
    def ping():
        return jsonify({"message": "API is alive"}), 200

    # ---------------- UI ROUTES ----------------
    @app.route("/")
    @app.route("/landing")
    def landing():
        return render_template("us10_landing.html")

    @app.route("/login")
    def login():
        return render_template("us10_login.html")

    @app.route("/register")
    def register():
        return render_template("us10_register.html")

    @app.route("/dashboard")
    def dashboard():
        return render_template("us10_dashboard.html")

    @app.route("/history")
    def history():
        return render_template("us10_scan_history.html")

    @app.route("/account")
    def account():
        return render_template("us10_account.html")

    @app.route("/results")
    def results():
        return render_template("us10_results.html")

    # ---------------- DATABASE ----------------
    try:
        from backend.models import db
        db.init_app(app)
        with app.app_context():
            db.create_all()
        logger.info("Database initialized")
    except Exception as e:
        logger.warning(f"Database skipped: {e}")

    # ---------------- AUTH BLUEPRINT (PHASE 1) ----------------
    try:
        from backend.routes.us05_auth_routes import auth_bp
        app.register_blueprint(auth_bp)
        logger.info("Auth blueprint registered (Phase 1)")
    except Exception as e:
        logger.error(f"Auth blueprint failed: {e}")
        raise

    # ---------------- UPLOAD BLUEPRINT (PHASE 3) ----------------
    try:
        from backend.routes.us05_upload_routes import upload_bp
        app.register_blueprint(upload_bp)
        logger.info("Upload blueprint registered (Phase 3)")
    except Exception as e:
        logger.error(f"Upload blueprint failed: {e}")
        raise

    # ---------------- JOB DESCRIPTION BLUEPRINT (PHASE 4) ----------------
    try:
        from backend.routes.us05_jd_routes import jd_bp
        app.register_blueprint(jd_bp)
        logger.info("Job Description blueprint registered (Phase 4)")
    except Exception as e:
        logger.error(f"JD blueprint failed: {e}")
        raise

    # ---------------- SCAN BLUEPRINT (PHASE 5 & 6) ----------------
    try:
        from backend.routes.us05_scan_routes import scan_bp
        app.register_blueprint(scan_bp)
        logger.info("Scan blueprint registered (Phase 5 & 6)")
    except Exception as e:
        logger.error(f"Scan blueprint failed: {e}")
        raise

    # ---------------- HISTORY BLUEPRINT (PHASE 7) ----------------
    try:
        from backend.routes.phase7_history_routes import phase7_bp
        app.register_blueprint(phase7_bp)
        logger.info("History blueprint registered (Phase 7)")
    except Exception as e:
        logger.error(f"History blueprint failed: {e}")
        raise

    return app


# --------------------------------------------------
# Gunicorn entry point
# --------------------------------------------------
app = create_app()

# --------------------------------------------------
# Local run
# --------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
