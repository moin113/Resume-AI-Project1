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
# App Factory (ONLY ONE)
# --------------------------------------------------
def create_app():
    app = Flask(
        __name__,
        template_folder="../frontend",
        static_folder="../frontend/static"
    )

    # ---------------- CONFIG ----------------
    secret_key = os.getenv("SECRET_KEY", "dev-secret-key")
    app.config["SECRET_KEY"] = secret_key
    app.config["JWT_SECRET_KEY"] = secret_key

    # SQLite (EB-safe)
    db_path = os.path.join(BASE_DIR, "app.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Uploads
    upload_path = os.path.join(BASE_DIR, "uploads")
    os.makedirs(upload_path, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = upload_path

    # JWT
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=7)

    # ---------------- EXTENSIONS ----------------
    CORS(app)
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
        return {"message": "API is alive"}, 200

    # ---------------- PHASE 1 AUTH TEST ----------------
    @app.route("/api/auth/test")
    def auth_test():
        return {"auth": "ok"}, 200

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

    # ---------------- DATABASE (SAFE) ----------------
    try:
        from backend.models import db
        db.init_app(app)
        with app.app_context():
            db.create_all()
        logger.info("Database initialized")
    except Exception as e:
        logger.warning(f"Database skipped: {e}")

    # ---------------- BLUEPRINTS (OFF) ----------------
    logger.info("Blueprints disabled (Phase 1)")

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
