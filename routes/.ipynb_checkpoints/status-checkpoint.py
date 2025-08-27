from flask import Blueprint, render_template, redirect, url_for, flash, current_app, send_file
import os
from utils import load_submissions, convert_to_pdf

status_bp = Blueprint('status', __name__)

@status_bp.route('/<submission_id>')
def view_status(submission_id):
    """View the status of a submission"""
    try:
        submissions = load_submissions()
        submission_data = submissions.get(submission_id)
        
        if not submission_data:
            flash("Submission not found", "error")
            return redirect(url_for('main.index'))
            
        # Extract data for the status page
        context = {
            "submission_id": submission_id,
            "submission_data": submission_data,
            "approvals": submission_data.get("approvals", []),
            "locked": submission_data.get("locked", False),
            "created_at": submission_data.get("created_at", ""),
            "updated_at": submission_data.get("updated_at", ""),
            "user_email": submission_data.get("user_email", ""),
            "document_title": submission_data.get("context", {}).get("DOCUMENT_TITLE", "SAT Report"),
            "project_reference": submission_data.get("context", {}).get("PROJECT_REFERENCE", ""),
            "client_name": submission_data.get("context", {}).get("CLIENT_NAME", ""),
            "prepared_by": submission_data.get("context", {}).get("PREPARED_BY", ""),
            "has_pdf": "pdf_path" in submission_data
        }
        
        # Calculate overall status
        statuses = [a.get("status", "pending") for a in submission_data.get("approvals", [])]
        if "rejected" in statuses:
            overall_status = "rejected"
        elif all(status == "approved" for status in statuses):
            overall_status = "approved"
        elif any(status == "approved" for status in statuses):
            overall_status = "partially_approved"
        else:
            overall_status = "pending"
            
        context["overall_status"] = overall_status
        
        return render_template("status.html", **context)
        
    except Exception as e:
        current_app.logger.error(f"Error in view_status: {e}", exc_info=True)
        flash("An error occurred while retrieving the status", "error")
        return redirect(url_for('main.index'))

@status_bp.route('/download/<submission_id>')
def download_report(submission_id):
    """Download the generated report"""
    try:
        submissions = load_submissions()
        submission_data = submissions.get(submission_id)
        
        if not submission_data:
            flash("Submission not found", "error")
            return redirect(url_for('main.index'))
            
        output_path = os.path.abspath(current_app.config['OUTPUT_FILE'])
        
        if not os.path.exists(output_path):
            flash("Report file not found", "error")
            return redirect(url_for('status.view_status', submission_id=submission_id))
            
        # Get document title for the filename
        doc_title = submission_data.get("context", {}).get("DOCUMENT_TITLE", "SAT_Report")
        # Clean the title for use in filename (replace spaces and special chars)
        safe_title = "".join(c if c.isalnum() else "_" for c in doc_title)
        
        # Generate download name with document title
        download_name = f"{safe_title}_{submission_id}.docx"
        
        return send_file(output_path, as_attachment=True, download_name=download_name)
        
    except Exception as e:
        current_app.logger.error(f"Error in download_report: {e}", exc_info=True)
        flash("An error occurred while downloading the report", "error")
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
        submissions = load_submissions()
        
        # Prepare submission data for display
        submission_list = []
        for sub_id, data in submissions.items():
            # Extract key information
            statuses = [a.get("status", "pending") for a in data.get("approvals", [])]
            if "rejected" in statuses:
                overall_status = "rejected"
            elif all(status == "approved" for status in statuses):
                overall_status = "approved"
            elif any(status == "approved" for status in statuses):
                overall_status = "partially_approved"
            else:
                overall_status = "pending"
                
            submission_list.append({
                "id": sub_id,
                "document_title": data.get("context", {}).get("DOCUMENT_TITLE", "SAT Report"),
                "client_name": data.get("context", {}).get("CLIENT_NAME", ""),
                "created_at": data.get("created_at", ""),
                "updated_at": data.get("updated_at", ""),
                "user_email": data.get("user_email", ""),
                "status": overall_status
            })
            
        # Sort by most recent first
        submission_list.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        
        return render_template("submissions_list.html", submissions=submission_list)
        
    except Exception as e:
        current_app.logger.error(f"Error in list_submissions: {e}", exc_info=True)
        flash("An error occurred while listing submissions", "error")
        return redirect(url_for('main.index'))