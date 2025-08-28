import os
import sys
import signal
import logging
import traceback
from flask import Flask, g, request, render_template, jsonify, make_response, redirect, url_for
from flask_wtf.csrf import CSRFProtect, generate_csrf, CSRFError
from flask_login import current_user, login_required
from config import Config

# Initialize CSRF protection globally
csrf = CSRFProtect()

# Import only essential modules - lazy load others
try:
    from models import db, User, init_db
    from auth import init_auth
    # Lazy import blueprints to reduce startup time
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def create_app(config_class=Config):
    """Create and configure Flask application"""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    csrf.init_app(app)

    # Initialize database and auth
    try:
        db_initialized = init_db(app)
        if not db_initialized:
            app.logger.warning("Database initialization returned False")

        init_auth(app)
        app.logger.info("Database and auth initialized")
    except Exception as e:
        app.logger.error(f"Failed to initialize database or auth: {e}")
        traceback.print_exc()
        db_initialized = False

    # Simplified logging for better performance
    logging.basicConfig(level=logging.WARNING)

    # Add CSRF token to g for access in templates
    @app.before_request
    def add_csrf_token():
        token = generate_csrf()
        g.csrf_token = token

    # Inject CSRF token into all responses
    @app.after_request
    def set_csrf_cookie(response):
        if response.mimetype == 'text/html':
            response.set_cookie(
                'csrf_token', g.csrf_token,
                httponly=False, samesite='Lax'
            )
        return response

    # Make CSRF token available in all templates
    @app.context_processor
    def inject_csrf():
        return dict(csrf_token=getattr(g, 'csrf_token', generate_csrf()))

    # CSRF token refresh endpoint
    @app.route('/refresh_csrf')
    def refresh_csrf():
        """Refresh CSRF token via AJAX"""
        return jsonify({'csrf_token': generate_csrf()})

    # API endpoint for getting users by role
    @app.route('/api/get-users-by-role')
    @login_required
    def get_users_by_role():
        """API endpoint to get users grouped by role for dropdowns"""
        try:
            # Only get active users
            users = User.query.filter_by(status='Active').all()
            users_by_role = {
                'Admin': [],
                'Engineer': [],
                'TM': [],
                'PM': []
            }

            for user in users:
                user_data = {
                    'name': user.full_name,
                    'email': user.email
                }
                
                # Map database roles to frontend role categories
                if user.role == 'Admin':
                    users_by_role['Admin'].append(user_data)
                elif user.role == 'Engineer':
                    users_by_role['Engineer'].append(user_data)
                elif user.role in ['TM', 'Technical Manager', 'Tech Manager', 'Automation Manager']:
                    users_by_role['TM'].append(user_data)
                elif user.role in ['PM', 'Project Manager', 'Project_Manager']:
                    users_by_role['PM'].append(user_data)

            app.logger.info(f"Found {len(users)} total users")
            app.logger.info(f"Users by role: TM={len(users_by_role['TM'])}, PM={len(users_by_role['PM'])}, Admin={len(users_by_role['Admin'])}, Engineer={len(users_by_role['Engineer'])}")
            
            return jsonify({'success': True, 'users': users_by_role})
        except Exception as e:
            app.logger.error(f"Error in get_users_by_role endpoint: {e}")
            return jsonify({'success': False, 'error': 'Unable to fetch users at this time'}), 500

    # Custom CSRF error handler
    @app.errorhandler(CSRFError)
    def handle_csrf_error(e):
        app.logger.error(f"CSRF Error occurred: {str(e)}")
        app.logger.error(f"Request Method: {request.method}")
        app.logger.error(f"Request Form Keys: {list(request.form.keys()) if request.form else []}")
        app.logger.error(f"CSRF Token Submitted: {request.form.get('csrf_token') if request.form else 'No form data'}")

        # For AJAX requests, return JSON error
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'error': 'CSRF token expired',
                'message': 'Please refresh the page and try again',
                'csrf_token': generate_csrf()
            }), 400

        # Ensure we have a CSRF token for the error page
        if not hasattr(g, 'csrf_token'):
            g.csrf_token = generate_csrf()

        return render_template('csrf_error.html', reason=str(e)), 400

    # Root route - redirect to welcome or dashboard
    @app.route('/')
    def index():
        if current_user.is_authenticated:
            return redirect(url_for('dashboard.home'))
        return redirect(url_for('auth.welcome'))

    # Legacy redirects
    @app.route('/sat_form')
    def legacy_sat_form():
        return redirect(url_for('reports.new'))

    @app.route('/sat')
    @app.route('/sat/start')
    def legacy_sat():
        return redirect(url_for('reports.new_sat'))

    @app.route('/generate_sat')
    def legacy_generate_sat():
        return redirect(url_for('reports.new_sat'))

    # Lazy import and register blueprints for faster startup
    def register_blueprints():
        from routes.auth import auth_bp
        from routes.dashboard import dashboard_bp
        from routes.reports import reports_bp
        from routes.notifications import notifications_bp
        from routes.io_builder import io_builder_bp
        from routes.main import main_bp
        from routes.approval import approval_bp
        from routes.status import status_bp

        app.register_blueprint(auth_bp, url_prefix='/auth')
        app.register_blueprint(dashboard_bp, url_prefix='/dashboard')
        app.register_blueprint(reports_bp, url_prefix='/reports')
        app.register_blueprint(notifications_bp, url_prefix='/notifications')
        app.register_blueprint(io_builder_bp, url_prefix='/io-builder')
        app.register_blueprint(main_bp)
        app.register_blueprint(approval_bp, url_prefix='/approve')
        app.register_blueprint(status_bp, url_prefix='/status')

    register_blueprints()

    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return render_template('404.html'), 500

    @app.errorhandler(400)
    def csrf_error(error):
        """Handle CSRF token errors"""
        return render_template('csrf_error.html'), 400

    # 404 Error handler
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('404.html'), 404

    # Minimal response logging for performance
    @app.after_request
    def log_response(response):
        return response

    if not db_initialized:
        app.logger.warning("Database initialization failed - running without database")

    return app

def sigint_handler(signum, frame):
    """Handle Ctrl+C gracefully"""
    print("\n📡 Shutting down server...")
    sys.exit(0)

if __name__ == '__main__':
    # Set up signal handling
    signal.signal(signal.SIGINT, sigint_handler)
    signal.signal(signal.SIGTERM, sigint_handler)

    try:
        print("🔧 Initializing SAT Report Generator...")

        # Create the app
        app = create_app()

        # Print startup information
        print("🚀 Starting SAT Report Generator...")
        print(f"Debug Mode: {app.config.get('DEBUG', True)}")
        print(f"Running on http://0.0.0.0:5000")

        # Create required directories if they don't exist
        try:
            upload_root = app.config.get('UPLOAD_ROOT', 'static/uploads')
            signatures_folder = app.config.get('SIGNATURES_FOLDER', 'static/signatures')
            submissions_file = app.config.get('SUBMISSIONS_FILE', 'data/submissions.json')

            os.makedirs(upload_root, exist_ok=True)
            os.makedirs(signatures_folder, exist_ok=True)
            os.makedirs(os.path.dirname(submissions_file), exist_ok=True)
            os.makedirs('instance', exist_ok=True)
            os.makedirs('logs', exist_ok=True)
            print("✅ Required directories created successfully")
        except Exception as dir_error:
            print(f"⚠️  Warning: Could not create some directories: {dir_error}")

        # Test a simple route to ensure app is working
        @app.route('/health')
        def health_check():
            return jsonify({'status': 'healthy', 'message': 'SAT Report Generator is running'})

        print("🌐 Health check endpoint available at /health")

        # Run the server
        app.run(
            host='0.0.0.0', 
            port=5000, 
            debug=True,  
            use_reloader=False  # Disable reloader to prevent double initialization
        )

    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        traceback.print_exc()
        sys.exit(1)