import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from backend.config import Config
from backend.models.base import db
from backend.utils.response import error_response, success_response


def create_app(config_class=Config, config_override=None):
    """Application factory for TaskFlow backend."""
    app = Flask(__name__)
    app.config.from_object(config_class)
    if config_override:
        app.config.update(config_override)
    
    # Initialize SQLAlchemy
    db.init_app(app)
    
    # Configure CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config.get('CORS_ORIGINS', ['http://localhost:5173']),
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Workspace-Id"]
        }
    }, supports_credentials=True)
    
    # Configure JWT
    jwt = JWTManager(app)
    
    @jwt.unauthorized_loader
    def handle_missing_jwt(error_message):
        return error_response(f"Authentication token required: {error_message}", 401)
        
    @jwt.invalid_token_loader
    def handle_invalid_jwt(error_message):
        return error_response(f"Invalid authentication token: {error_message}", 401)
        
    @jwt.expired_token_loader
    def handle_expired_jwt(jwt_header, jwt_payload):
        return error_response("Authentication token has expired. Please log in again.", 401)
        
    # Global HTTP error handlers
    @app.errorhandler(400)
    def handle_bad_request(e):
        return error_response(str(e.description if hasattr(e, 'description') else "Bad Request"), 400)

    @app.errorhandler(404)
    def handle_not_found(e):
        return error_response("The requested resource was not found.", 404)

    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        return error_response("HTTP method not allowed for this endpoint.", 405)

    @app.errorhandler(500)
    def handle_server_error(e):
        return error_response("Internal server error. Please try again later.", 500)
        
    # Root & Health check endpoints
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return success_response({
            'status': 'healthy',
            'service': 'TaskFlow API',
            'version': '1.0.0'
        }, message="TaskFlow API is running smoothly")
        
    # Register blueprints (imported lazily to prevent circular dependencies)
    from backend.routes.auth_routes import auth_bp
    from backend.routes.user_routes import user_bp
    from backend.routes.workspace_routes import workspace_bp
    from backend.routes.project_routes import project_bp
    from backend.routes.folder_routes import folder_bp
    from backend.routes.list_routes import list_bp
    from backend.routes.task_routes import task_bp
    from backend.routes.comment_routes import comment_bp
    from backend.routes.notification_routes import notification_bp
    from backend.routes.search_routes import search_bp
    from backend.routes.dashboard_routes import dashboard_bp
    from backend.routes.activity_routes import activity_bp
    from backend.routes.oauth_routes import oauth_bp
    from backend.routes.email_routes import email_bp
    from backend.routes.dsa_routes import dsa_bp
    from backend.routes.chat_routes import chat_bp
    from backend.routes.admin_routes import admin_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(workspace_bp, url_prefix='/api/workspaces')
    app.register_blueprint(project_bp, url_prefix='/api/projects')
    app.register_blueprint(folder_bp, url_prefix='/api/folders')
    app.register_blueprint(list_bp, url_prefix='/api/lists')
    app.register_blueprint(task_bp, url_prefix='/api/tasks')
    app.register_blueprint(comment_bp, url_prefix='/api/comments')
    app.register_blueprint(notification_bp, url_prefix='/api/notifications')
    app.register_blueprint(search_bp, url_prefix='/api/search')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(activity_bp, url_prefix='/api/activity')
    app.register_blueprint(oauth_bp, url_prefix='/api/auth/oauth')
    app.register_blueprint(email_bp, url_prefix='/api/email')
    app.register_blueprint(dsa_bp, url_prefix='/api/dsa')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # Initialize SocketIO with Flask app
    from backend.sockets import socketio
    socketio.init_app(app, cors_allowed_origins="*")

    # Automatically create tables and ensure demo user in development
    with app.app_context():
        # Ensure database directory exists
        db_dir = os.path.join(app.root_path, '..', 'database')
        os.makedirs(db_dir, exist_ok=True)
        db.create_all()
        # Idempotent migration for is_platform_admin column
        try:
            from sqlalchemy import text
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_platform_admin BOOLEAN DEFAULT 0 NOT NULL"))
                conn.commit()
        except Exception:
            pass
        seed_demo_account()

    return app


def seed_demo_account():
    """Ensure standard TaskFlow demo accounts exist with realistic sample data."""
    try:
        from backend.models import User, Workspace, WorkspaceMember
        demo_email = 'lead_architect@taskflow.dev'
        demo_user = User.query.filter_by(email=demo_email).first()
        if not demo_user:
            demo_user = User(
                email=demo_email,
                full_name='Sarah Architect',
                is_verified=True,
                is_active=True
            )
            demo_user.set_password('StrongPassword123!')
            db.session.add(demo_user)
            db.session.flush()

            ws = Workspace(
                name="Architecture & Engineering",
                slug=f"ws-demo-{demo_user.id}",
                description="Core engineering and system architecture workspace.",
                owner_id=demo_user.id
            )
            db.session.add(ws)
            db.session.flush()

            db.session.add(WorkspaceMember(
                workspace_id=ws.id,
                user_id=demo_user.id,
                role='Owner'
            ))
            db.session.commit()

        if demo_user and not demo_user.is_platform_admin:
            demo_user.is_platform_admin = True
            db.session.commit()

        # Guarantee only lead_architect is platform admin, all others are non-admin
        User.query.filter(User.email != 'lead_architect@taskflow.dev', User.is_platform_admin == True).update({'is_platform_admin': False}, synchronize_session=False)
        db.session.commit()

        # Idempotently seed all 5 professional demo accounts with sample data
        from backend.seeds.seed_demo_accounts import seed_all_demo_accounts
        seed_all_demo_accounts(verbose=False)
    except Exception as e:
        db.session.rollback()


app = create_app()

if __name__ == '__main__':
    from backend.sockets import socketio
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() in ('true', '1')
    socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=True)
