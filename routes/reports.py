from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, current_app
from flask_login import login_required, current_user
from models import db, Report, User
from auth import login_required, role_required
from utils import setup_approval_workflow_db, create_new_submission_notification, get_unread_count
import json
import uuid
from datetime import datetime

reports_bp = Blueprint('reports', __name__, url_prefix='/reports')

@reports_bp.route('/new')
@login_required
@role_required(['Engineer', 'Admin'])
def new():
    """Show report type selection page"""
    return render_template('report_selector.html')

@reports_bp.route('/new/sat')
@login_required
@role_required(['Engineer', 'TM', 'Admin'])
def new_sat():
    """SAT report creation"""
    return redirect(url_for('reports.new_sat_full'))

@reports_bp.route('/new/sat/full')
@login_required
@role_required(['Engineer', 'TM', 'Admin'])
def new_sat_full():
    """Full SAT report form"""
    try:
        unread_count = get_unread_count()
        return render_template('SAT.html', unread_count=unread_count)
    except Exception as e:
        current_app.logger.error(f"Error rendering SAT form: {e}")
        return render_template('SAT.html', unread_count=0)