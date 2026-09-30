import logging
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import requests
from flask import current_app
from backend.models.base import db
from backend.models.email_log import EmailLog

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


class EmailService:
    """
    Robust transactional email service supporting Resend HTTP API (recommended)
    and standard SMTP providers (Gmail, Brevo, SendGrid, Amazon SES, Mailgun, etc.)
    with safe failure handling, detailed audit logging, and offline development grace.
    """
    
    @staticmethod
    def get_provider() -> str:
        """Return the active email delivery provider ('resend_api', 'smtp', or 'unconfigured')."""
        config = current_app.config
        if config.get('RESEND_API_KEY', '').strip():
            return 'resend_api'
        server = config.get('MAIL_SERVER', '').strip()
        port = config.get('MAIL_PORT')
        if server and port:
            return 'smtp'
        return 'unconfigured'

    @staticmethod
    def is_configured() -> bool:
        """Check if active Resend API key or SMTP server credentials have been provided."""
        return EmailService.get_provider() != 'unconfigured'

    @classmethod
    def send_html_email(
        cls,
        recipient_email: str,
        subject: str,
        html_content: str,
        text_content: str = "",
        user_id: int | None = None,
        email_type: str = "general"
    ) -> tuple[bool, str]:
        """
        Sends an HTML email to the specified recipient via Resend API or SMTP.
        Returns (success: bool, status_message: str).
        Never throws unhandled exceptions that break parent caller workflows.
        """
        config = current_app.config
        resend_key = config.get('RESEND_API_KEY', '').strip()
        mail_server = config.get('MAIL_SERVER', '').strip()
        mail_port = int(config.get('MAIL_PORT', 587))
        mail_user = config.get('MAIL_USERNAME', '').strip()
        mail_pass = config.get('MAIL_PASSWORD', '').strip()
        mail_from = config.get('MAIL_FROM', 'TaskFlow <onboarding@resend.dev>').strip()
        if not mail_from:
            mail_from = 'TaskFlow <onboarding@resend.dev>'

        # Remove any [Development] prefix from user-facing email subjects
        if subject.startswith('[Development]'):
            subject = subject.replace('[Development]', '', 1).strip(' -:')

        # Create audit entry
        log_entry = EmailLog(
            user_id=user_id,
            recipient_email=recipient_email,
            email_type=email_type,
            subject=subject,
            status='queued'
        )
        db.session.add(log_entry)
        db.session.commit()
        
        # In automated test environments, avoid hitting external SMTP/HTTP providers with fake test emails
        if config.get('TESTING'):
            log_entry.status = 'sent'
            log_entry.sent_at = datetime.now(timezone.utc)
            db.session.commit()
            return True, "Mock email delivered successfully (TESTING mode)."

        # Check configuration
        if not resend_key and not mail_server:
            msg = "Email delivery not configured (neither RESEND_API_KEY nor MAIL_SERVER is set in .env)."
            logger.info(f"[EmailService] {msg} -> Recipient: {recipient_email}, Subject: '{subject}'")
            log_entry.status = 'skipped_unconfigured'
            log_entry.error_message = 'Email delivery credentials missing from environment (.env).'
            db.session.commit()
            return False, msg

        # --- OPTION 1: RESEND HTTP API (Recommended, standard HTTPS port 443) ---
        if resend_key:
            try:
                headers = {
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "from": mail_from,
                    "to": [recipient_email],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content if text_content else subject
                }
                
                response = requests.post(RESEND_API_URL, json=payload, headers=headers, timeout=12)
                
                if response.status_code in (200, 201):
                    res_data = response.json() if response.content else {}
                    resend_id = res_data.get('id', 'delivered')
                    log_entry.status = 'sent'
                    log_entry.sent_at = datetime.now(timezone.utc)
                    log_entry.error_message = None
                    db.session.commit()
                    logger.info(f"[EmailService] Resend API delivered email to {recipient_email} (ID: {resend_id})")
                    return True, "Email sent successfully."
                else:
                    try:
                        err_json = response.json()
                        err_detail = err_json.get('message', response.text)
                    except Exception:
                        err_detail = response.text or f"HTTP {response.status_code}"
                    
                    error_msg = f"Resend API error ({response.status_code}): {err_detail}"
                    logger.error(f"[EmailService] Resend delivery failed for {recipient_email}: {error_msg}")
                    log_entry.status = 'failed'
                    log_entry.error_message = error_msg
                    db.session.commit()
                    return False, error_msg

            except requests.RequestException as req_err:
                error_msg = f"Resend API connection failed: {str(req_err)}"
                logger.error(f"[EmailService] Network error connecting to Resend: {error_msg}")
                log_entry.status = 'failed'
                log_entry.error_message = error_msg
                db.session.commit()
                return False, error_msg
            except Exception as e:
                error_msg = f"Unexpected Resend delivery failure: {str(e)}"
                logger.error(f"[EmailService] Exception: {error_msg}")
                log_entry.status = 'failed'
                log_entry.error_message = error_msg
                db.session.commit()
                return False, error_msg

        # --- OPTION 2: SMTP FALLBACK ---
        use_tls = config.get('MAIL_USE_TLS', True)
        use_ssl = config.get('MAIL_USE_SSL', False)
        
        try:
            # Build MIME email message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = mail_from
            msg['To'] = recipient_email
            
            # Plaintext fallback
            if not text_content:
                text_content = f"{subject}\n\nPlease view this email in an HTML-compatible client."
            msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))
            
            # Connect & authenticate
            if use_ssl:
                server = smtplib.SMTP_SSL(mail_server, mail_port, timeout=12)
            else:
                server = smtplib.SMTP(mail_server, mail_port, timeout=12)
                if use_tls:
                    server.starttls()
                    
            if mail_user and mail_pass:
                server.login(mail_user, mail_pass)
                
            server.sendmail(mail_from, [recipient_email], msg.as_string())
            server.quit()
            
            # Mark log as sent
            log_entry.status = 'sent'
            log_entry.sent_at = datetime.now(timezone.utc)
            log_entry.error_message = None
            db.session.commit()
            logger.info(f"[EmailService] SMTP email successfully sent to {recipient_email}")
            return True, "Email sent successfully."
            
        except Exception as e:
            error_msg = f"Delivery failed: {str(e)}"
            logger.error(f"[EmailService] Error sending email to {recipient_email}: {error_msg}")
            log_entry.status = 'failed'
            log_entry.error_message = error_msg
            db.session.commit()
            return False, error_msg
