from flask import Blueprint, render_template, redirect, url_for, current_app
from auth import login_required, role_required

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
        import uuid
        from utils import get_unread_count
        
        # Create empty submission data structure for new forms
        submission_data = {
            'DOCUMENT_TITLE': '',
            'PROJECT_REFERENCE': '',
            'DOCUMENT_REFERENCE': '',
            'DATE': '',
            'CLIENT_NAME': '',
            'REVISION': '',
            'REVISION_DETAILS': '',
            'REVISION_DATE': '',
            'USER_EMAIL': '',
            'PREPARED_BY': '',
            'REVIEWED_BY_TECH_LEAD': '',
            'REVIEWED_BY_PM': '',
            'APPROVED_BY_CLIENT': '',
            'PURPOSE': '',
            'SCOPE': '',
            'RELATED_DOCUMENTS': [],
            'PRE_EXECUTION_APPROVAL': [],
            'POST_EXECUTION_APPROVAL': [],
            'PRE_TEST_REQUIREMENTS': [],
            'KEY_COMPONENTS': [],
            'IP_RECORDS': [],
            'SIGNAL_LISTS': [],
            'DIGITAL_OUTPUTS': [],
            'ANALOGUE_INPUTS': [],
            'ANALOGUE_OUTPUTS': [],
            'MODBUS_DIGITAL_LISTS': [],
            'MODBUS_ANALOGUE_LISTS': [],
            'PROCESS_TEST': [],
            'SCADA_VERIFICATION': [],
            'TRENDS_TESTING': [],
            'ALARM_LIST': []
        }
        
        unread_count = get_unread_count()
        submission_id = str(uuid.uuid4())
        
        return render_template('SAT.html', 
                             submission_data=submission_data,
                             submission_id=submission_id,
                             unread_count=unread_count)
    except Exception as e:
        current_app.logger.error(f"Error rendering SAT form: {e}")
        # Provide minimal data structure even on error
        submission_data = {}
        return render_template('SAT.html', 
                             submission_data=submission_data,
                             submission_id='',
                             unread_count=0)