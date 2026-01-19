"""
Phase 7: History & Dashboard Routes
Provides scan history, individual scan details, and dashboard summary
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models import db, User, Resume, JobDescription, ScanHistory
from sqlalchemy import desc, func
from datetime import datetime, timedelta

# Create blueprint for Phase 7 history routes
phase7_bp = Blueprint('phase7_history', __name__, url_prefix='/api')


@phase7_bp.route('/scans', methods=['GET'])
@jwt_required()
def get_scans_list():
    """
    PHASE 7.1 - HISTORY LIST API
    
    GET /api/scans
    Returns lightweight list of scans for logged-in user
    Sorted by created_at DESC
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get all scans for user, sorted by created_at DESC
        scans = ScanHistory.query.filter_by(
            user_id=current_user_id
        ).order_by(ScanHistory.created_at.desc()).all()
        
        # Format lightweight payload
        scans_list = []
        for scan in scans:
            # Get resume and JD details (if available)
            resume = Resume.query.get(scan.resume_id) if scan.resume_id else None
            job_description = JobDescription.query.get(scan.job_description_id) if scan.job_description_id else None
            
            scans_list.append({
                'id': scan.id,
                'score': round(scan.overall_match_score, 2),
                'score_category': scan.get_score_category(),
                'created_at': scan.created_at.isoformat() if scan.created_at else None,
                'resume_title': resume.title if resume else 'Real-time Scan',
                'job_title': job_description.title if job_description else 'Real-time Job Description'
            })
        
        return jsonify({
            'success': True,
            'count': len(scans_list),
            'scans': scans_list
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting scans list: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve scans',
            'error': str(e)
        }), 500


@phase7_bp.route('/scan/<int:scan_id>', methods=['GET'])
@jwt_required()
def get_scan_detail(scan_id):
    """
    PHASE 7.2 - SINGLE SCAN DETAIL API
    
    GET /api/scan/<id>
    Returns full details of a specific scan
    Validates scan belongs to logged-in user
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get scan and validate ownership
        scan = ScanHistory.query.filter_by(
            id=scan_id,
            user_id=current_user_id
        ).first()
        
        if not scan:
            return jsonify({
                'success': False,
                'message': 'Scan not found'
            }), 404
        
        # Get detailed analysis
        detailed_analysis = scan.detailed_analysis or {}
        category_scores = scan.category_scores or {}
        recommendations = scan.recommendations or []
        keyword_analysis = scan.keyword_analysis or {}
        
        # Generate summary if not present
        summary = "Scan completed successfully."
        if detailed_analysis.get('matched_count', 0) > 0:
            matched_count = detailed_analysis.get('matched_count', 0)
            missing_count = detailed_analysis.get('missing_count', 0)
            
            if scan.overall_match_score >= 80:
                summary = f"Excellent match! Your resume aligns well with the job requirements. You have {matched_count} matching skills."
            elif scan.overall_match_score >= 60:
                summary = f"Good match! Your resume covers most requirements. Consider adding: {', '.join(detailed_analysis.get('missing_skills', [])[:3])}."
            elif scan.overall_match_score >= 40:
                summary = f"Fair match. Your resume has {matched_count} matching skills but is missing key requirements."
            else:
                summary = f"Low match. Consider strengthening your resume with these skills: {', '.join(detailed_analysis.get('missing_skills', [])[:5])}."
        
        # Return full details
        return jsonify({
            'success': True,
            'scan': {
                'id': scan.id,
                'resume_id': scan.resume_id,
                'job_description_id': scan.job_description_id,
                'score': round(scan.overall_match_score, 2),
                'overall_match_score': round(scan.overall_match_score, 2), # Frontend looks for this
                'score_category': scan.get_score_category(),
                'category_scores': category_scores,
                'matched_skills': detailed_analysis.get('matched_skills', []),
                'missing_skills': detailed_analysis.get('missing_skills', []),
                'summary': detailed_analysis.get('summary', summary),
                'recommendations': recommendations,
                'keyword_analysis': keyword_analysis,
                'ats_compatibility': round(scan.ats_compatibility, 2),
                'scan_type': scan.scan_type,
                'algorithm_used': scan.algorithm_used,
                'scan_duration': scan.scan_duration,
                'created_at': scan.created_at.isoformat() if scan.created_at else None
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting scan detail: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve scan details',
            'error': str(e)
        }), 500


@phase7_bp.route('/dashboard/summary', methods=['GET'])
@jwt_required()
def get_dashboard_summary():
    """
    PHASE 7.3 - DASHBOARD SUMMARY API
    
    GET /api/dashboard/summary
    Returns dashboard summary with key metrics
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get total scans
        total_scans = ScanHistory.query.filter_by(user_id=current_user_id).count()
        
        # Calculate average score
        avg_score_result = db.session.query(
            func.avg(ScanHistory.overall_match_score)
        ).filter_by(user_id=current_user_id).scalar()
        
        average_score = round(avg_score_result, 2) if avg_score_result else 0
        
        # Get last scan score
        last_scan = ScanHistory.query.filter_by(
            user_id=current_user_id
        ).order_by(ScanHistory.created_at.desc()).first()
        
        last_scan_score = round(last_scan.overall_match_score, 2) if last_scan else 0
        
        # Get scan balance
        scan_balance = user.get_scan_status()
        
        return jsonify({
            'success': True,
            'total_scans': total_scans,
            'average_score': average_score,
            'last_scan_score': last_scan_score,
            'scan_status': scan_balance,
            'scan_balance': scan_balance
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting dashboard summary: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve dashboard summary',
            'error': str(e)
        }), 500
