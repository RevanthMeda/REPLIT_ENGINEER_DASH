
from functools import wraps
from flask import redirect, url_for, flash, request
from flask_login import LoginManager, current_user
from models import User

login_manager = LoginManager()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))






login_manager = LoginManager()

def init_auth(app):
    """Initialize authentication"""
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'



def login_required(f):
    """Decorator to require login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login', next=request.url))
        if not current_user.is_active():
            flash('Your account is not active. Please contact an administrator.', 'warning')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))
        if current_user.role != 'Admin':
            flash('Admin access required.', 'error')
            return redirect(url_for('dashboard.home'))
        return f(*args, **kwargs)
    return decorated_function
