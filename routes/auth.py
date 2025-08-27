from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, current_app
from flask_login import login_user, logout_user, current_user
from models import db, User
from auth import login_required
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/welcome')
def welcome():
    """Welcome/Home page with Register and Log In buttons"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.home'))
    return render_template('welcome.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """User registration"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.home'))

    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        requested_role = request.form.get('requested_role', '')

        # Validation
        if not all([full_name, email, password, requested_role]):
            flash('All fields are required.', 'error')
            return render_template('register.html')

        if requested_role not in ['Engineer', 'TM', 'PM']:
            flash('Invalid role selection.', 'error')
            return render_template('register.html')

        # Check if user already exists
        if User.query.filter_by(email=email).first():
            flash('Email already registered. Please use a different email.', 'error')
            return render_template('register.html')

        # Create new user
        user = User(
            full_name=full_name,
            email=email,
            requested_role=requested_role,
            status='Pending'
        )
        user.set_password(password)

        try:
            db.session.add(user)
            db.session.commit()
            return render_template('register_confirmation.html')
        except Exception as e:
            db.session.rollback()
            flash('Registration failed. Please try again.', 'error')
            return render_template('register.html')

    return render_template('register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """User login"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.home'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        if not email or not password:
            flash('Email and password are required.', 'error')
            return render_template('login.html')

        try:
            # Test database connection first
            db.session.execute(db.text('SELECT 1'))
            user = User.query.filter_by(email=email).first()

            if user and user.check_password(password):
                # Check user status
                if user.status == 'Pending':
                    return render_template('pending_approval.html', user=user)
                elif user.status == 'Disabled':
                    flash('Your account has been disabled. Please contact an administrator.', 'error')
                    return render_template('login.html')
                elif user.status == 'Active':
                    login_user(user)
                    flash('Login successful!', 'success')

                    # Role-based dashboard redirect
                    if user.role == 'Admin':
                        return redirect(url_for('dashboard.admin'))
                    elif user.role == 'Engineer':
                        return redirect(url_for('dashboard.engineer'))
                    elif user.role == 'TM':
                        return redirect(url_for('dashboard.tm'))
                    elif user.role == 'PM':
                        return redirect(url_for('dashboard.pm'))
                    else:
                        return redirect(url_for('dashboard.home'))
                else:
                    flash('Account status unknown. Please contact an administrator.', 'error')
                    return render_template('login.html')
            else:
                flash('Invalid email or password', 'error')
                return render_template('login.html')

        except Exception as e:
            current_app.logger.error(f"Login error: {e}")
            flash('System temporarily unavailable. Please try again later.', 'error')
            return render_template('login.html')

    return render_template('login.html')


@auth_bp.route('/logout')
@login_required
def logout():
    """User logout"""
    logout_user()
    flash('You have been logged out successfully.', 'success')
    return redirect(url_for('auth.welcome'))

@auth_bp.route('/pending')
def pending_approval():
    """Pending approval page"""
    return render_template('pending_approval.html')

@auth_bp.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """Forgot password - reset user password"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.home'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()

        if not email:
            flash('Email is required.', 'error')
            return render_template('forgot_password.html')

        user = User.query.filter_by(email=email).first()

        if user:
            # For demo purposes, set a default password
            # In production, you'd send an email with reset link
            user.set_password('newpassword123')
            try:
                db.session.commit()
                flash(f'Password reset for {email}. New password: newpassword123', 'success')
                return redirect(url_for('auth.login'))
            except Exception as e:
                db.session.rollback()
                flash('Password reset failed. Please try again.', 'error')
        else:
            # Don't reveal if email exists for security
            flash('If this email exists, a password reset has been sent.', 'info')

    return render_template('forgot_password.html')

@auth_bp.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    """Reset password using token"""
    token = request.args.get('token')
    if not token:
        flash('Invalid or missing reset token.', 'error')
        return redirect(url_for('auth.forgot_password'))

    user = User.verify_reset_token(token)
    if not user:
        flash('Invalid or expired reset token.', 'error')
        return redirect(url_for('auth.forgot_password'))

    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if not password or len(password) < 6:
            flash('Password must be at least 6 characters long.', 'error')
            return render_template('reset_password.html', token=token)

        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return render_template('reset_password.html', token=token)

        user.password_hash = generate_password_hash(password)
        try:
            db.session.commit()
            flash('Your password has been reset successfully. You can now log in.', 'success')
            return redirect(url_for('auth.login'))
        except Exception as e:
            db.session.rollback()
            flash('An error occurred while resetting your password.', 'error')
            return render_template('reset_password.html', token=token)

    return render_template('reset_password.html', token=token)

@auth_bp.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    """Change user password"""
    try:
        from models import Notification
        unread_count = Notification.query.filter_by(
            user_email=current_user.email,
            read=False
        ).count()
    except Exception as e:
        current_app.logger.warning(f"Could not get unread count: {e}")
        unread_count = 0

    if request.method == 'POST':
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')

        # Validate current password
        if not current_user.check_password(current_password):
            flash('Current password is incorrect', 'error')
            return render_template('change_password.html', unread_count=unread_count)

        # Validate new password
        if new_password != confirm_password:
            flash('New passwords do not match', 'error')
            return render_template('change_password.html', unread_count=unread_count)

        if len(new_password) < 6:
            flash('Password must be at least 6 characters long', 'error')
            return render_template('change_password.html', unread_count=unread_count)

        try:
            # Update password
            current_user.set_password(new_password)
            db.session.commit()

            flash('Password changed successfully', 'success')
            return redirect(url_for('dashboard.home'))
        except Exception as e:
            current_app.logger.error(f"Error changing password: {e}")
            flash('An error occurred while changing password', 'error')
            return render_template('change_password.html', unread_count=unread_count)

    return render_template('change_password.html', unread_count=unread_count)