import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

# Base directories
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

# Load environment variables from .env in root or backend
env_path = ROOT_DIR / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()


class Config:
    """Base configuration for TaskFlow Flask backend."""
    
    # Core Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'taskflow-super-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() in ('true', '1', 't')
    
    # Database
    db_path = ROOT_DIR / 'database'
    db_path.mkdir(parents=True, exist_ok=True)
    db_file = db_path / 'taskflow.db'
    
    # Resolve DATABASE_URL safely
    raw_db_url = os.getenv('DATABASE_URL')
    if raw_db_url and raw_db_url.startswith('sqlite:///') and not raw_db_url.startswith('sqlite:////'):
        rel_sub = raw_db_url.replace('sqlite:///', '')
        if not (len(rel_sub) > 1 and rel_sub[1] == ':'): # not windows absolute drive
            resolved_file = ROOT_DIR / rel_sub
            resolved_file.parent.mkdir(parents=True, exist_ok=True)
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{resolved_file.as_posix()}"
        else:
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{Path(rel_sub).as_posix()}"
    elif raw_db_url:
        SQLALCHEMY_DATABASE_URI = raw_db_url
    else:
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_file.as_posix()}"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }
    
    # JWT Authentication
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'taskflow-jwt-super-secret-key')
    days_expire = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_DAYS', '7'))
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=days_expire)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # CORS
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    CORS_ORIGINS = [
        FRONTEND_URL,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000'
    ]

    # File Uploads & Chat
    UPLOAD_FOLDER = ROOT_DIR / 'uploads' / 'chat'
    MAX_CONTENT_LENGTH = 30 * 1024 * 1024  # 30 MB max
    ALLOWED_CHAT_EXTENSIONS = {
        'jpg', 'jpeg', 'png', 'gif', 'webp',
        'mp4', 'webm', 'mov',
        'pdf', 'docx', 'doc', 'txt', 'xlsx', 'xls', 'pptx', 'ppt', 'csv'
    }
    
    # Email / SMTP
    MAIL_SERVER = os.getenv('MAIL_SERVER', '').strip()
    MAIL_PORT = int(os.getenv('MAIL_PORT', '587'))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() in ('true', '1', 't')
    MAIL_USE_SSL = os.getenv('MAIL_USE_SSL', 'False').lower() in ('true', '1', 't')
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '').strip()
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '').strip()
    MAIL_FROM = os.getenv('MAIL_FROM', 'TaskFlow <no-reply@taskflow.local>')
    
    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '').strip()
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '').strip()
    GOOGLE_REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:5000/api/auth/oauth/google/callback')
    
    # GitHub OAuth
    GITHUB_CLIENT_ID = os.getenv('GITHUB_CLIENT_ID', '').strip()
    GITHUB_CLIENT_SECRET = os.getenv('GITHUB_CLIENT_SECRET', '').strip()
    GITHUB_REDIRECT_URI = os.getenv('GITHUB_REDIRECT_URI', 'http://localhost:5000/api/auth/oauth/github/callback')

    # Clerk Authentication
    CLERK_SECRET_KEY = os.getenv('CLERK_SECRET_KEY', '').strip()
    CLERK_PUBLISHABLE_KEY = os.getenv('CLERK_PUBLISHABLE_KEY', os.getenv('VITE_CLERK_PUBLISHABLE_KEY', '')).strip()
    CLERK_JWKS_URL = os.getenv('CLERK_JWKS_URL', '').strip()


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)


class ProductionConfig(Config):
    DEBUG = False
