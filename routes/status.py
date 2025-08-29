from flask import Blueprint, render_template, redirect, url_for, flash, current_app, send_file
import os
from utils import load_submissions, convert_to_pdf
from docxtpl import InlineImage
from datetime import datetime
import tempfile
from flask_login import current_user

status_bp = Blueprint('status', __name__)

@status_bp.route('/view/<submission_id>')
def view_status(submission_id):
    """View the status of a submission"""
    try:
        from models import Report, SATReport
        import json

        # Get report from database
        report = Report.query.get(submission_id)
        if not report:
            flash("Submission not found", "error")
            return redirect(url_for('main.index'))

        # Get SAT report data
        sat_report = SATReport.query.filter_by(report_id=submission_id).first()
        if not sat_report:
            flash("Report data not found", "error")
            return redirect(url_for('main.index'))

        # Parse stored data
        stored_data = json.loads(sat_report.data_json)
        context = stored_data.get("context", {})
        approvals = json.loads(report.approvals_json) if report.approvals_json else []
        
        current_app.logger.info(f"Status view for {submission_id}: Found {len(approvals)} approvals")
        current_app.logger.info(f"Report created: {report.created_at}, updated: {report.updated_at}")
        current_app.logger.info(f"Context keys: {list(context.keys())}")

        # Calculate overall status
        statuses = [a.get("status", "pending") for a in approvals]
        if "rejected" in statuses:
            overall_status = "rejected"
        elif all(status == "approved" for status in statuses):
            overall_status = "approved"
        elif any(status == "approved" for status in statuses):
            overall_status = "partially_approved"
        else:
            overall_status = "pending"

        return render_template('status.html',
                              submission_id=submission_id,
                              submission_data=context,
                              approvals=approvals,
                              locked=report.locked,
                              overall_status=overall_status,
                              # Extract key fields for easy access
                              document_title=context.get('DOCUMENT_TITLE', 'SAT Report'),
                              project_reference=context.get('PROJECT_REFERENCE', ''),
                              client_name=context.get('CLIENT_NAME', ''),
                              prepared_by=context.get('PREPARED_BY', ''),
                              created_at=report.created_at.isoformat() if report.created_at else '',
                              updated_at=report.updated_at.isoformat() if report.updated_at else '')
    except Exception as e:
        current_app.logger.error(f"Error in view_status: {e}", exc_info=True)
        flash("An error occurred while loading the status", "error")
        return redirect(url_for('main.index'))

@status_bp.route('/download/<submission_id>')
def download_report(submission_id):
    """Download the generated report"""
    try:
        from models import Report, SATReport
        import json

        # Get report from database
        report = Report.query.get(submission_id)
        if not report:
            flash("Submission not found", "error")
            return redirect(url_for('main.index'))

        # Get SAT report data
        sat_report = SATReport.query.filter_by(report_id=submission_id).first()
        if not sat_report:
            flash("Report data not found", "error")
            return redirect(url_for('main.index'))

        # Parse stored data
        stored_data = json.loads(sat_report.data_json)
        context = stored_data.get("context", {})

        # Check if user has permission to download
        if current_user.role not in ['admin'] and report.user_email != current_user.email:
            flash("You are not authorized to download this report.", "error")
            return redirect(url_for('main.index'))

        # Generate the document using DocxTemplate for rendering
        from docxtpl import DocxTemplate
        doc = DocxTemplate(current_app.config['TEMPLATE_FILE'])

        # Create safe context (no InlineImage objects for download)
        safe_context = {}
        for key, value in context.items():
            if not isinstance(value, InlineImage):
                safe_context[key] = value

        doc.render(safe_context)

        # Create a temporary file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"SAT_Report_{timestamp}.docx"
        temp_path = os.path.join(tempfile.gettempdir(), filename)

        doc.save(temp_path)

        # Return the file for download
        safe_title = "".join(c if c.isalnum() else "_" 
                             for c in context.get("DOCUMENT_TITLE", "SAT_Report"))
        return send_file(temp_path,
                         as_attachment=True,
                         download_name=f"{safe_title}_{submission_id}.docx")

    except Exception as e:
        current_app.logger.error(f"Error in download_report: {e}", exc_info=True)
        flash("An error occurred while generating the download", "error")
        return redirect(url_for('status.view_status', submission_id=submission_id))

@status_bp.route('/download-pdf/<submission_id>')
def download_pdf(submission_id):
    """Download the PDF version of the report (if available)"""
    try:
        submissions = load_submissions()
        submission_data = submissions.get(submission_id)

        if not submission_data:
            flash("Submission not found", "error")
            return redirect(url_for('main.index'))

        # Check if PDF exists or can be generated
        pdf_path = submission_data.get("pdf_path")

        if not pdf_path or not os.path.exists(pdf_path):
            # PDF doesn't exist, try to generate it
            if current_app.config.get('ENABLE_PDF_EXPORT', False):
                output_path = os.path.abspath(current_app.config['OUTPUT_FILE'])
                pdf_path = convert_to_pdf(output_path)

                if pdf_path:
                    # Update submission data with PDF path
                    submission_data["pdf_path"] = pdf_path
                    submissions[submission_id] = submission_data
                    from utils import save_submissions
                    save_submissions(submissions)
                else:
                    flash("Failed to generate PDF report", "error")
                    return redirect(url_for('status.view_status', submission_id=submission_id))
            else:
                flash("PDF export is not enabled", "error")
                return redirect(url_for('status.view_status', submission_id=submission_id))

        # Get document title for the filename
        doc_title = submission_data.get("context", {}).get("DOCUMENT_TITLE", "SAT_Report")
        # Clean the title for use in filename (replace spaces and special chars)
        safe_title = "".join(c if c.isalnum() else "_" for c in doc_title)

        # Generate download name with document title
        download_name = f"{safe_title}_{submission_id}.pdf"

        return send_file(pdf_path, as_attachment=True, download_name=download_name)

    except Exception as e:
        current_app.logger.error(f"Error in download_pdf: {e}", exc_info=True)
        flash("An error occurred while downloading the PDF", "error")
        return redirect(url_for('status.view_status', submission_id=submission_id))

@status_bp.route('/list')
def list_submissions():
    """List all submissions (admin view)"""
    try:
        from models import Report, SATReport
        import json

        reports = Report.query.all()
        submission_list = []

        for report in reports:
            sat_report = SATReport.query.filter_by(report_id=report.id).first()
            if not sat_report:
                continue # Skip if SAT report data is missing

            stored_data = json.loads(sat_report.data_json)
            approvals = json.loads(report.approvals_json) if report.approvals_json else []

            statuses = [a.get("status", "pending") for a in approvals]
            if "rejected" in statuses:
                overall_status = "rejected"
            elif all(status == "approved" for status in statuses):
                overall_status = "approved"
            elif any(status == "approved" for status in statuses):
                overall_status = "partially_approved"
            else:
                overall_status = "pending"

            submission_list.append({
                "id": report.id,
                "document_title": stored_data.get("context", {}).get("DOCUMENT_TITLE", "SAT Report"),
                "client_name": stored_data.get("context", {}).get("CLIENT_NAME", ""),
                "created_at": report.created_at,
                "updated_at": report.updated_at,
                "user_email": report.user_email,
                "status": overall_status
            })

        # Sort by most recent first
        submission_list.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

        return render_template("submissions_list.html", submissions=submission_list)

    except Exception as e:
        current_app.logger.error(f"Error in list_submissions: {e}", exc_info=True)
        flash("An error occurred while listing submissions", "error")
        return redirect(url_for('main.index'))