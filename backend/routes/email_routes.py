from flask import Blueprint, request, current_app, g
from backend.models import db, EmailLog
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required
from backend.services.email_service import EmailService
from backend.utils.email_templates import _get_base_wrapper

email_bp = Blueprint('email', __name__)


@email_bp.route('/status', methods=['GET'])
@jwt_auth_required
def get_email_status():
    """Return SMTP connection readiness and delivery logs summary."""
    config = current_app.config
    configured = EmailService.is_configured()
    
    server = config.get('MAIL_SERVER', '')
    port = config.get('MAIL_PORT')
    mail_from = config.get('MAIL_FROM', '')
    use_tls = config.get('MAIL_USE_TLS')
    use_ssl = config.get('MAIL_USE_SSL')
    
    total_emails = EmailLog.query.count()
    sent_emails = EmailLog.query.filter_by(status='sent').count()
    failed_emails = EmailLog.query.filter_by(status='failed').count()
    skipped_emails = EmailLog.query.filter_by(status='skipped_unconfigured').count()

    return success_response({
        'configured': configured,
        'smtp_server': server if server else "Not Configured",
        'smtp_port': port,
        'mail_from': mail_from,
        'use_tls': use_tls,
        'use_ssl': use_ssl,
        'stats': {
            'total': total_emails,
            'sent': sent_emails,
            'failed': failed_emails,
            'skipped_unconfigured': skipped_emails
        }
    })


@email_bp.route('/logs', methods=['GET'])
@jwt_auth_required
def get_email_logs():
    """Get audit logs for sent/attempted emails."""
    limit = int(request.args.get('limit', 50))
    logs = EmailLog.query.order_by(EmailLog.created_at.desc()).limit(limit).all()
    return success_response([log.to_dict() for log in logs])


@email_bp.route('/test', methods=['POST'])
@jwt_auth_required
def send_test_email():
    """Allows testing SMTP settings by sending a diagnostic test email to the user."""
    user = g.current_user
    data = request.get_json(silent=True) or {}
    recipient = data.get('recipient_email', user.email).strip().lower()

    if not EmailService.is_configured():
        return error_response(
            "SMTP is not configured in .env. Please configure MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, and MAIL_PASSWORD.",
            400,
            errors={'configured': False}
        )

    subject = "TaskFlow SMTP Diagnostic Test"
    content = f"""
    <h2 style="font-size: 22px; font-weight: 700; color: #16a34a; margin-top: 0;">SMTP Test Successful! ✅</h2>
    <p>Hello {user.full_name},</p>
    <p>This is a test notification confirming that TaskFlow's email delivery system is properly configured and successfully transmitting real emails over your configured SMTP provider.</p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #166534; font-size: 14px;"><strong>Target Recipient:</strong> {recipient}</p>
    </div>
    """
    app_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
    html = _get_base_wrapper("TaskFlow SMTP Test", content, "Open TaskFlow", f"{app_url}/dashboard")

    success, message = EmailService.send_html_email(
        recipient_email=recipient,
        subject=subject,
        html_content=html,
        user_id=user.id,
        email_type='smtp_test'
    )

    if not success:
        return error_response(f"Test email failed: {message}", 500)

    return success_response({
        'recipient': recipient,
        'status': 'sent'
    }, message=f"Test email sent successfully to {recipient}!")
