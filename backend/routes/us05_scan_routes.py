"""
Phase 5 & 6: AI Scan Routes
POST /api/scan - Main scan endpoint with free scan limits
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models import db, User, Resume, JobDescription, ScanHistory
from datetime import datetime
import time
import json

# Create blueprint for scan routes
scan_bp = Blueprint('scan', __name__, url_prefix='/api')


@scan_bp.route('/scan', methods=['POST'])
@jwt_required()
def perform_scan():
    """
    Phase 5: AI Scan Endpoint
    
    Request Body:
    {
        "resume_id": null,  # If null, uses latest resume
        "job_description_id": null  # If null, uses latest JD
    }
    
    Response:
    {
        "success": true,
        "scan_id": 12,
        "score": 72,
        "matched_skills": [],
        "missing_skills": [],
        "summary": "Your resume matches well but lacks XYZ",
        "category_scores": {
            "technical": 70,
            "soft_skills": 75
        },
        "scan_balance": {
            "free_scans_remaining": 2,
            "can_scan": true
        }
    }
    """
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # PHASE 6.2: PRE-SCAN CHECK - Check scan limits
        if not user.can_perform_scan():
            return jsonify({
                'success': False,
                'message': 'Free scan limit exceeded. Upgrade to continue.',
                'scan_balance': {
                    'free_scans_remaining': user.free_scans_remaining,
                    'total_scans_used': user.total_scans_used,
                    'can_scan': False,
                    'is_premium': user.is_premium()
                }
            }), 403
        
        # Get request data
        data = request.get_json() or {}
        resume_id = data.get('resume_id')
        job_description_id = data.get('job_description_id')
        
        current_app.logger.info(f"📊 Scan request received for user {current_user_id}")
        current_app.logger.info(f"📄 Resume ID: {resume_id}, JD ID: {job_description_id}")
        
        # PHASE 5.3: DATA COLLECTION
        # If IDs are null, use latest
        if resume_id is None:
            resume = Resume.query.filter_by(
                user_id=current_user_id,
                is_active=True
            ).order_by(Resume.created_at.desc()).first()
            
            if not resume:
                return jsonify({
                    'success': False,
                    'message': 'No resume found. Please upload a resume first.'
                }), 404
            
            resume_id = resume.id
            current_app.logger.info(f"📄 Using latest resume ID: {resume_id}")
        else:
            # Validate resume belongs to user
            resume = Resume.query.filter_by(
                id=resume_id,
                user_id=current_user_id,
                is_active=True
            ).first()
            
            if not resume:
                return jsonify({
                    'success': False,
                    'message': 'Resume not found'
                }), 404
        
        if job_description_id is None:
            job_description = JobDescription.query.filter_by(
                user_id=current_user_id,
                is_active=True
            ).order_by(JobDescription.created_at.desc()).first()
            
            if not job_description:
                return jsonify({
                    'success': False,
                    'message': 'No job description found. Please create a job description first.'
                }), 404
            
            job_description_id = job_description.id
            current_app.logger.info(f"📄 Using latest JD ID: {job_description_id}")
        else:
            # Validate JD belongs to user
            job_description = JobDescription.query.filter_by(
                id=job_description_id,
                user_id=current_user_id,
                is_active=True
            ).first()
            
            if not job_description:
                return jsonify({
                    'success': False,
                    'message': 'Job description not found'
                }), 404
        
        # Log data collection
        current_app.logger.info(f"📄 Resume ID: {resume.id}")
        current_app.logger.info(f"📄 JD ID: {job_description.id}")
        current_app.logger.info(f"📄 Resume text length: {len(resume.extracted_text) if resume.extracted_text else 0}")
        current_app.logger.info(f"📄 JD text length: {len(job_description.job_text)}")
        
        # Validate extracted text exists
        if not resume.extracted_text:
            return jsonify({
                'success': False,
                'message': 'Resume text not extracted. Please re-upload your resume.'
            }), 400
        
        # PHASE 6.3: DECREMENT LOGIC - Use free scan BEFORE processing
        # This ensures we don't process if scan fails
        if not user.is_premium():
            scan_used = user.use_free_scan()
            if not scan_used:
                return jsonify({
                    'success': False,
                    'message': 'Failed to use free scan. Please try again.',
                    'scan_balance': user.get_scan_status()
                }), 400
            current_app.logger.info(f"✅ Free scan used. Remaining: {user.free_scans_remaining}")
        else:
            current_app.logger.info(f"✅ Premium user - no scan limit")
        
        # Track scan duration
        scan_start_time = time.time()
        
        # PHASE 5.4: AI / MATCHING LOGIC (NLP-based)
        try:
            from backend.services.enhanced_matching_service import RealTimeLLMService
            from backend.services.dynamic_suggestions_service import DynamicSuggestionsService
            
            llm_service = RealTimeLLMService()
            suggestions_service = DynamicSuggestionsService()
            
            current_app.logger.info(f"🚀 Starting Enhanced NLP Scan for user {current_user_id}")
            
            # Perform enhanced analysis
            analysis_results = llm_service.analyze_resume_realtime(resume.extracted_text, job_description.job_text)
            
            if not analysis_results.get('success'):
                current_app.logger.error(f"❌ NLP Analysis failed: {analysis_results.get('error')}")
                raise Exception(analysis_results.get('error', 'Unknown error in NLP analysis'))
            
            # Extract results
            overall_score = analysis_results['overall_match_score']
            category_scores = analysis_results['category_scores']
            detailed_analysis = analysis_results['detailed_analysis']
            recommendations = analysis_results['recommendations']
            keyword_analysis = analysis_results['keyword_analysis']
            
            # Generate summary based on the enhanced score
            if overall_score >= 80:
                summary = f"Excellent match! Your resume aligns well with {overall_score}% compatibility. {len(detailed_analysis['matched_skills'])} key skills were identified."
            elif overall_score >= 60:
                summary = f"Good match! You have {overall_score}% compatibility. Your experience covers most requirements, but there are some missing keywords."
            elif overall_score >= 40:
                summary = f"Fair match. Your resume has {overall_score}% compatibility. Significant improvements needed to better align with this role."
            else:
                summary = f"Low match ({overall_score}%). This role requires more alignment in technical and soft skills."

            # Add summary to detailed analysis for persistence
            detailed_analysis['summary'] = summary
            
            scan_duration = time.time() - scan_start_time
            
            # PHASE 5.5: RESULT STORAGE
            scan_history = ScanHistory(
                user_id=current_user_id,
                resume_id=resume.id,
                job_description_id=job_description.id,
                overall_match_score=overall_score,
                category_scores=category_scores,
                detailed_analysis=detailed_analysis,
                recommendations=recommendations,
                keyword_analysis=keyword_analysis,
                ats_compatibility=category_scores.get('ats_compatibility', overall_score),
                scan_type='stored',
                algorithm_used='llm_enhanced',
                scan_duration=scan_duration
            )
            
            db.session.add(scan_history)
            db.session.commit()
            
            current_app.logger.info(f"✅ Enhanced Scan completed. ID: {scan_history.id}, Score: {overall_score:.2f}%")
            
            # PHASE 5.6: RESPONSE RETURN (PHASE 6.6: Include scan balance)
            return jsonify({
                'success': True,
                'scan_id': scan_history.id,
                'score': round(overall_score, 2),
                'matched_skills': [s['skill'] if isinstance(s, dict) else s for s in detailed_analysis.get('matched_skills', [])],
                'missing_skills': [s['skill'] if isinstance(s, dict) else s for s in detailed_analysis.get('missing_skills', [])],
                'summary': summary,
                'category_scores': category_scores,
                'detailed_analysis': detailed_analysis,
                'recommendations': recommendations,
                'scan_status': user.get_scan_status(),
                'scan_balance': user.get_scan_status()
            }), 200
            
        except Exception as matching_error:
            # If matching fails, restore the scan count for non-premium users
            if not user.is_premium():
                user.free_scans_remaining += 1
                user.total_scans_used -= 1
                db.session.commit()
                current_app.logger.warning(f"⚠️ Scan failed, count restored")
            
            current_app.logger.error(f"❌ Matching error: {matching_error}")
            import traceback
            traceback.print_exc()
            
            return jsonify({
                'success': False,
                'message': 'Failed to perform scan analysis',
                'error': str(matching_error)
            }), 500
        
    except Exception as e:
        current_app.logger.error(f"❌ Scan error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'message': 'Error performing scan',
            'error': str(e)
        }), 500


@scan_bp.route('/scan_status', methods=['GET'])
@jwt_required()
def get_scan_status():
    """
    Get current scan status for user
    Returns remaining scans and usage info
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        return jsonify({
            'success': True,
            'scan_status': user.get_scan_status(),
            'scan_balance': user.get_scan_status()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting scan status: {e}")
        return jsonify({
            'success': False,
            'message': 'Error getting scan status',
            'error': str(e)
        }), 500
