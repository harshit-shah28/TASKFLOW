import logging
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import current_app
from backend.models.base import db
from backend.models.email_log import EmailLog

logger = logging.getLogger(__name__)


class EmailService:
    """
    Robust transactional email service supporting SMTP providers
    (Gmail App Password, Brevo, SendGrid, Amazon SES, Mailgun, etc.)
    with safe failure handling, detailed audit logging, and offline development grace.
    """
    
    @staticmethod
    def is_configured() -> bool:
        """Check if active SMTP server credentials have been provided."""
        config = current_app.config
        server = config.get('MAIL_SERVER', '').strip()
        port = config.get('MAIL_PORT')
        return bool(server and port)

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
        Sends an HTML email to the specified recipient.
        Returns (success: bool, status_message: str).
        Never throws unhandled exceptions that break parent caller workflows.
        """
        config = current_app.config
        mail_server = config.get('MAIL_SERVER', '').strip()
        mail_port = int(config.get('MAIL_PORT', 587))
        mail_user = config.get('MAIL_USERNAME', '').strip()
        mail_pass = config.get('MAIL_PASSWORD', '').strip()
        mail_from = config.get('MAIL_FROM', 'TaskFlow <no-reply@taskflow.local>')
        use_tls = config.get('MAIL_USE_TLS', True)
        use_ssl = config.get('MAIL_USE_SSL', False)
        
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
        
        # Check configuration
        if not mail_server:
            msg = "SMTP not configured (MAIL_SERVER is empty). Email safely logged to database."
            logger.info(f"[EmailService] {msg} -> Recipient: {recipient_email}, Subject: '{subject}'")
            log_entry.status = 'skipped_unconfigured'
            log_entry.error_message = 'SMTP server not configured in environment (.env).'
            db.session.commit()
            return False, msg
            
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
            logger.info(f"[EmailService] Email successfully sent to {recipient_email}")
            return True, "Email sent successfully."
            
        except Exception as e:
            error_msg = f"Delivery failed: {str(e)}"
            logger.error(f"[EmailService] Error sending email to {recipient_email}: {error_msg}")
            log_entry.status = 'failed'
            log_entry.error_message = error_msg
            db.session.commit()
            return False, error_msg
