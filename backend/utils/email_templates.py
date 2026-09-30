"""
TaskFlow HTML Email Templates
Clean, responsive, SaaS-styled HTML emails with inline CSS.
"""


def _get_base_wrapper(title: str, content: str, cta_text: str | None = None, cta_url: str | None = None) -> str:
    cta_button_html = ""
    if cta_text and cta_url:
        cta_button_html = f"""
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="margin: 28px 0 24px 0;">
          <tbody>
            <tr>
              <td align="left">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tbody>
                    <tr>
                      <td style="border-radius: 8px; background: #6366f1; text-align: center;">
                        <a href="{cta_url}" target="_blank" style="border: solid 1px #6366f1; border-radius: 8px; box-sizing: border-box; cursor: pointer; display: inline-block; font-size: 15px; font-weight: 600; margin: 0; padding: 12px 28px; text-decoration: none; text-transform: capitalize; background-color: #6366f1; border-color: #6366f1; color: #ffffff;">
                          {cta_text} &rarr;
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        """

    return f"""<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>{title}</title>
    <style>
      body {{
        background-color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 15px;
        line-height: 1.6;
        margin: 0;
        padding: 0;
        color: #1e293b;
      }}
      .email-container {{
        max-width: 580px;
        margin: 30px auto;
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      }}
      .email-header {{
        background: #0f172a;
        padding: 24px 32px;
        border-bottom: 2px solid #6366f1;
      }}
      .brand-title {{
        color: #ffffff;
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.5px;
        margin: 0;
        display: inline-flex;
        align-items: center;
      }}
      .brand-badge {{
        background: #6366f1;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
        margin-left: 8px;
        text-transform: uppercase;
      }}
      .email-body {{
        padding: 32px;
      }}
      .email-footer {{
        background: #f1f5f9;
        padding: 20px 32px;
        border-top: 1px solid #e2e8f0;
        font-size: 13px;
        color: #64748b;
        text-align: center;
      }}
      .meta-box {{
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px 20px;
        margin: 20px 0;
      }}
      .meta-item {{
        margin: 6px 0;
        font-size: 14px;
      }}
      .meta-label {{
        font-weight: 600;
        color: #475569;
      }}
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1 class="brand-title">
          <span>TASKFLOW</span>
          <span class="brand-badge">SaaS</span>
        </h1>
      </div>
      <div class="email-body">
        {content}
        {cta_button_html}
      </div>
      <div class="email-footer">
        <p style="margin: 0 0 6px 0;">This notification was sent by <strong>TASKFLOW</strong> productivity engine.</p>
        <p style="margin: 0; font-size: 12px;">You can update your email notification preferences at any time in Settings &gt; Notifications.</p>
      </div>
    </div>
  </body>
</html>
"""


def render_welcome_email(user_name: str, app_url: str) -> tuple[str, str]:
    subject = "Welcome to TaskFlow! Streamline your projects & workflows"
    content = f"""
    <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0;">Welcome aboard, {user_name}! 🚀</h2>
    <p>We're thrilled to welcome you to <strong>TaskFlow</strong> — the intelligent, modern project, task, and team management platform.</p>
    <p>With TaskFlow, you can:</p>
    <ul style="padding-left: 20px; color: #334155;">
      <li>Organize work into <strong>Workspaces, Projects, Folders, and Lists</strong></li>
      <li>Switch seamlessly between <strong>Kanban boards, Lists, and Calendar views</strong></li>
      <li>Collaborate in real time with <strong>task assignments, tags, comments, and mentions</strong></li>
      <li>Track progress using powerful <strong>real-time analytics and dashboards</strong></li>
    </ul>
    <p>Click below to jump directly into your dashboard and launch your first project:</p>
    """
    return subject, _get_base_wrapper("Welcome to TaskFlow", content, "Get Started", f"{app_url}/dashboard")


def render_verification_email(user_name: str, verify_url: str) -> tuple[str, str]:
    subject = "Verify your email address for TaskFlow"
    content = f"""
    <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0;">Verify your email address</h2>
    <p>Hello {user_name},</p>
    <p>Thank you for signing up for TaskFlow. To verify your email and unlock all collaboration features, please click the button below:</p>
    <div class="meta-box">
      <p style="margin: 0; font-size: 13px; color: #64748b;">
        This verification link will expire in 24 hours. If you did not create an account on TaskFlow, you can safely disregard this email.
      </p>
    </div>
    """
    return subject, _get_base_wrapper("Verify Email", content, "Verify Email Address", verify_url)


def render_password_reset_email(user_name: str, reset_url: str) -> tuple[str, str]:
    subject = "Task Flow \u2014 Your password reset code"
    content = f"""
    <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0;">Password Reset Request</h2>
    <p>Hello {user_name},</p>
    <p>We received a request to reset the password for your TaskFlow account. Click the button below to choose a new password:</p>
    <div class="meta-box">
      <p style="margin: 0; font-size: 13px; color: #64748b;">
        This link will expire in 2 hours for your security. If you didn't request a password reset, no action is needed — your account remains secure.
      </p>
    </div>
    """
    return subject, _get_base_wrapper("Reset Password", content, "Reset My Password", reset_url)


def render_password_changed_email(user_name: str, app_url: str) -> tuple[str, str]:
    subject = "Security Notice: Your TaskFlow password was changed"
    content = f"""
    <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0;">Password Changed Successfully</h2>
    <p>Hello {user_name},</p>
    <p>This is a confirmation that your TaskFlow account password was recently changed.</p>
    <div class="meta-box">
      <p style="margin: 0; font-size: 13px; color: #ef4444; font-weight: 600;">
        If you did not perform this change, please contact support or reset your password immediately to protect your workspace.
      </p>
    </div>
    """
    return subject, _get_base_wrapper("Password Changed", content, "Go to Dashboard", f"{app_url}/dashboard")


def render_task_assigned_email(user_name: str, task_title: str, project_name: str, priority: str, due_date: str | None, task_url: str) -> tuple[str, str]:
    subject = f"Task Assigned to you: {task_title} ({project_name})"
    content = f"""
    <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0;">You have been assigned a task</h2>
    <p>Hello {user_name}, you have been assigned to a task on TaskFlow:</p>
    <div class="meta-box">
      <div class="meta-item"><span class="meta-label">Task:</span> <strong>{task_title}</strong></div>
      <div class="meta-item"><span class="meta-label">Project:</span> {project_name}</div>
      <div class="meta-item"><span class="meta-label">Priority:</span> <span style="display:inline-block; padding: 2px 8px; border-radius: 4px; background: #e0e7ff; color: #4338ca; font-weight: 600; font-size: 12px;">{priority}</span></div>
      <div class="meta-item"><span class="meta-label">Due Date:</span> {due_date if due_date else 'No due date set'}</div>
    </div>
    """
    return subject, _get_base_wrapper("Task Assigned", content, "View Task in TaskFlow", task_url)


def render_task_comment_email(user_name: str, author_name: str, task_title: str, comment_text: str, task_url: str) -> tuple[str, str]:
    subject = f"New comment on '{task_title}' by {author_name}"
    content = f"""
    <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0;">New comment on your task</h2>
    <p>Hello {user_name}, <strong>{author_name}</strong> commented on <strong>{task_title}</strong>:</p>
    <div class="meta-box" style="border-left: 4px solid #6366f1; background: #f8fafc;">
      <p style="margin: 0; font-style: italic; color: #334155;">&ldquo;{comment_text}&rdquo;</p>
    </div>
    """
    return subject, _get_base_wrapper("New Comment", content, "Reply to Comment", task_url)


def render_task_mention_email(user_name: str, author_name: str, task_title: str, comment_text: str, task_url: str) -> tuple[str, str]:
    subject = f"{author_name} mentioned you in '{task_title}'"
    content = f"""
    <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0;">You were mentioned in a task discussion</h2>
    <p>Hello {user_name}, <strong>{author_name}</strong> mentioned you in a comment on <strong>{task_title}</strong>:</p>
    <div class="meta-box" style="border-left: 4px solid #f59e0b; background: #fffbeb;">
      <p style="margin: 0; font-style: italic; color: #78350f;">&ldquo;{comment_text}&rdquo;</p>
    </div>
    """
    return subject, _get_base_wrapper("User Mention", content, "View Discussion", task_url)


def render_due_date_reminder_email(user_name: str, task_title: str, project_name: str, due_date: str, task_url: str) -> tuple[str, str]:
    subject = f"Upcoming Deadline: '{task_title}' is due {due_date}"
    content = f"""
    <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0;">Upcoming Task Deadline ⏰</h2>
    <p>Hello {user_name}, this is a friendly reminder that a task assigned to you has an approaching due date:</p>
    <div class="meta-box">
      <div class="meta-item"><span class="meta-label">Task:</span> <strong>{task_title}</strong></div>
      <div class="meta-item"><span class="meta-label">Project:</span> {project_name}</div>
      <div class="meta-item"><span class="meta-label">Due Date:</span> <strong style="color: #ea580c;">{due_date}</strong></div>
    </div>
    """
    return subject, _get_base_wrapper("Due Date Reminder", content, "Open Task", task_url)


def render_overdue_task_email(user_name: str, task_title: str, project_name: str, due_date: str, task_url: str) -> tuple[str, str]:
    subject = f"Overdue Alert: '{task_title}' has passed its due date ({due_date})"
    content = f"""
    <h2 style="font-size: 22px; font-weight: 700; color: #dc2626; margin-top: 0;">Task Overdue Alert ⚠️</h2>
    <p>Hello {user_name}, the following task assigned to you is currently overdue:</p>
    <div class="meta-box" style="border-left: 4px solid #ef4444;">
      <div class="meta-item"><span class="meta-label">Task:</span> <strong>{task_title}</strong></div>
      <div class="meta-item"><span class="meta-label">Project:</span> {project_name}</div>
      <div class="meta-item"><span class="meta-label">Past Due Since:</span> <strong style="color: #dc2626;">{due_date}</strong></div>
    </div>
    """
    return subject, _get_base_wrapper("Overdue Task", content, "Update Task Status", task_url)


def render_workspace_invite_email(inviter_name: str, recipient_email: str, workspace_name: str, role: str, invite_url: str, expires_in_days: int = 7) -> tuple[str, str]:
    subject = f"{inviter_name} invited you to collaborate in '{workspace_name}' on TaskFlow"
    content = f"""
    <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0;">Workspace Invitation 🤝</h2>
    <p>Hello,</p>
    <p><strong>{inviter_name}</strong> has invited you to collaborate on the <strong>{workspace_name}</strong> workspace as a <strong>{role}</strong>.</p>
    <div class="meta-box">
      <div class="meta-item"><span class="meta-label">Workspace:</span> <strong>{workspace_name}</strong></div>
      <div class="meta-item"><span class="meta-label">Your Role:</span> {role}</div>
      <div class="meta-item"><span class="meta-label">Invited By:</span> {inviter_name}</div>
    </div>
    <p>Click the button below to accept the invitation and start collaborating with your team on projects, tasks, and real-time chat:</p>
    <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
      This invitation link will expire in {expires_in_days} days. If you already have a TaskFlow account, please sign in with <strong>{recipient_email}</strong> to join the workspace.
    </p>
    """
    return subject, _get_base_wrapper("Workspace Invitation", content, "Accept Invitation", invite_url)


def render_security_alert_email(user_name: str, alert_message: str, app_url: str) -> tuple[str, str]:
    subject = "Security Alert: Important activity on your TaskFlow account"
    content = f"""
    <h2 style="font-size: 22px; font-weight: 700; color: #dc2626; margin-top: 0;">Security Alert</h2>
    <p>Hello {user_name},</p>
    <p>We detected important security activity on your TaskFlow account:</p>
    <div class="meta-box" style="border-left: 4px solid #ef4444; background: #fef2f2;">
      <p style="margin: 0; color: #991b1b; font-weight: 500;">{alert_message}</p>
    </div>
    <p>If you recognize this action, no further steps are needed.</p>
    """
    return subject, _get_base_wrapper("Security Alert", content, "Review Account Security", f"{app_url}/settings")
