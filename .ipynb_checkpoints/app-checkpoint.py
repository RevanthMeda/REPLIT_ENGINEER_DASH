import os
import sys
import signal
import logging
import traceback
from flask import Flask, g, request, render_template, jsonify, make_response
from flask_wtf.csrf import CSRFProtect, generate_csrf, CSRFError
from config import Config
from routes.main import main_bp
from routes.approval import approval_bp
from routes.status import status_bp

# Initialize CSRF protection globally
csrf = CSRFProtect()

def create_app(config_class=Config):
    """Create and configure Flask application"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO, 
        format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('application.log')
        ]
    )
    
    # Initialize CSRF protection
    csrf.init_app(app)
    
    # Add CSRF token to g for access in templates
    @app.before_request
    def add_csrf_token():
        g.csrf_token = generate_csrf()
    
    # Inject CSRF token into all responses
    @app.after_request
    def set_csrf_cookie(response):
        if response.mimetype == 'text/html':
            csrf_token = generate_csrf()
            response.set_cookie('csrf_token', csrf_token, httponly=False, samesite='Lax')
        return response
    
    # Make CSRF token available in all templates
    @app.context_processor
    def inject_csrf_token():
        return dict(csrf_token=generate_csrf())
    
    # Custom CSRF error handler
    @app.errorhandler(CSRFError)
    def handle_csrf_error(e):
        app.logger.error(f"CSRF Error occurred: {str(e)}")
        app.logger.error(f"Request Method: {request.method}")
        app.logger.error(f"Request Form Keys: {list(request.form.keys())}")
        app.logger.error(f"CSRF Token Submitted: {request.form.get('csrf_token')}")
        
        return render_template('csrf_error.html', reason=str(e)), 400
    
    # Register blueprints 
    app.register_blueprint(main_bp)
    app.register_blueprint(approval_bp, url_prefix='/approve')
    app.register_blueprint(status_bp, url_prefix='/status')
    
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
        # Create the app
        app = create_app()
        
        # Print startup information
        print("🚀 Starting SAT Report Generator...")
        print(f"Debug Mode: {app.config['DEBUG']}")
        print(f"Running on http://127.0.0.1:5000")
        
        # Run the server
        app.run(
            host='0.0.0.0', 
            port=5000, 
            debug=True,  
            use_reloader=True
        )
    
    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        traceback.print_exc()
        sys.exit(1)