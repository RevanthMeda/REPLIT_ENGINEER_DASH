import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import timedelta

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class"""
    # Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'NjEVwB9vNKTWwEtT8HOeodU2lsAiYXrfDdt_gaAD-6c='
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    TESTING = False
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload
    
    # CSRF Configuration
    WTF_CSRF_ENABLED = False
    WTF_CSRF_SECRET_KEY = SECRET_KEY  # Use the same secret key
    WTF_CSRF_TIME_LIMIT = None  # Disable automatic token expiration
    WTF_CSRF_SSL_STRICT = False  # Disable strict HTTPS checking for development
    WTF_CSRF_CHECK_DEFAULT = True
    WTF_CSRF_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
    
      
    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(hours=2)
    SESSION_PERMANENT = True
    
    # Cookie settings
    SESSION_COOKIE_SECURE = False  # Set to True in production
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Allowed hosts
    ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '192.168.150.118']
    
    # Application paths
    BASE_DIR = Path(__file__).resolve().parent
    UPLOAD_ROOT = os.path.join(BASE_DIR, "static", "uploads")
    SIGNATURES_FOLDER = os.path.join(BASE_DIR, "static", "signatures")
    TEMPLATE_FILE = os.path.join(BASE_DIR, r"C:\Users\rmeda\OneDrive - CULLY AUTOMATION\Personal\Automate SAT\SAT_Report_App\templates", "SAT_Template.docx")
    OUTPUT_FILE = os.path.join(BASE_DIR, "outputs", "SAT_Report_Final.docx")
    SUBMISSIONS_FILE = os.environ.get('SUBMISSIONS_FILE') or os.path.join(BASE_DIR, "data", "submissions.json")
    
    # Ensure directories exist
    os.makedirs(os.path.join(BASE_DIR, "outputs"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)
    
    # Email configuration
    SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    DEFAULT_SENDER = os.environ.get('DEFAULT_SENDER', SMTP_USERNAME)
    
    # Default approvers
    DEFAULT_APPROVERS = [
        {"stage": 1, "approver_email": os.environ.get('APPROVER_1'), "title": "Technical Lead"},
        {"stage": 2, "approver_email": os.environ.get('APPROVER_2'), "title": "Project Manager"}
    ]
    
    # Other application settings
    ENABLE_PDF_EXPORT = os.environ.get('ENABLE_PDF_EXPORT', 'False').lower() == 'true'


class DevelopmentConfig(Config):
    """Development configuration - for local development"""
    DEBUG = True
    TESTING = False
    
    
class TestingConfig(Config):
    """Testing configuration - for unit tests"""
    DEBUG = False
    TESTING = True
    SUBMISSIONS_FILE = os.path.join(Config.BASE_DIR, "data", "test_submissions.json")
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    """Production configuration - for deployment"""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY')  # Must be set in production
    
    # Ensure required environment variables are set
    @classmethod
    def validate(cls):
        """Validate that required configuration variables are set"""
        required_vars = ['SECRET_KEY', 'SMTP_USERNAME', 'SMTP_PASSWORD']
        missing = [var for var in required_vars if not getattr(cls, var)]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")


# Get the appropriate configuration based on environment
config_class = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig
}.get(os.environ.get('FLASK_ENV', 'development'), DevelopmentConfig)