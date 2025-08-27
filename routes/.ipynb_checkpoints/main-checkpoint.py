from flask import Blueprint, render_template, current_app, request, redirect, url_for, flash, send_file, g
from flask_wtf.csrf import generate_csrf
import base64
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
from PIL import Image
import os
import uuid
import datetime
from werkzeug.utils import secure_filename
import tempfile
import shutil
import time
from utils import (
    load_submissions, save_submissions, setup_approval_workflow,
    send_edit_link, send_approval_link, update_toc, enable_autofit_tables,
    handle_image_removals, process_table_rows
)

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Render the main form with empty data for a new submission"""
    return render_template(
        'index.html', 
        submission_data={}, 
        #submission_id="",
        
    )
@main_bp.route('/edit/<submission_id>')
def edit_submission(submission_id):
    """Edit an existing submission"""
    try:
        submissions = load_submissions()
        sub = submissions.get(submission_id)
        
        if not sub:
            flash("Submission not found", "error")
            return redirect(url_for('main.index'))
            
        if sub.get("locked"):
            flash("This submission is locked and cannot be edited", "warning")
            return redirect(url_for('status.view_status', submission_id=submission_id))
        
        return render_template('index.html',
                             submission_data=sub.get("context", {}),
                             submission_id=submission_id)
    except Exception as e:
        current_app.logger.error(f"Error in edit_submission: {e}", exc_info=True)
        flash("An error occurred while loading the submission", "error")
        return redirect(url_for('main.index'))

@main_bp.route('/generate', methods=['POST'])
def generate():
    """Generate a SAT report from form data"""
    
    template_path = current_app.config['TEMPLATE_FILE']
    current_app.logger.info(f"Looking for template at: {template_path}")
    current_app.logger.info(f"Template file exists: {os.path.exists(template_path)}")

    # If it doesn't exist, try to find it in other locations
    possible_locations = [
        os.path.join(current_app.root_path, "templates", "SAT_Template.docx"),
        os.path.join(current_app.root_path, "SAT_Template.docx"),
        os.path.join(os.getcwd(), "templates", "SAT_Template.docx"),
        os.path.join(os.getcwd(), "SAT_Template.docx")
    ]
    for loc in possible_locations:
        if os.path.exists(loc):
            current_app.logger.info(f"Found template at alternative location: {loc}")
    try:
        
        # Log request details for debugging
        current_app.logger.info(f"Generate request from: {request.remote_addr}")
        current_app.logger.info(f"Request headers: {request.headers}")
        current_app.logger.info(f"Request form data keys: {list(request.form.keys())}")
        
        # Retrieve submission id and current submissions
        submission_id = request.form.get("submission_id", "")
        submissions = load_submissions()

        # Create a new submission ID if needed
        if not submission_id:
            submission_id = str(uuid.uuid4())
            
        # Create the upload directory for this submission
        upload_dir = os.path.join(current_app.config['UPLOAD_ROOT'], submission_id)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Get or create the submission record
        sub = submissions.setdefault(submission_id, {})
        
        approval_sigs = []
        for stage in sub.get("approvals", []):
            fn = stage.get("signature")
            if fn:
                full = os.path.join(current_app.config['SIGNATURES_FOLDER'], fn)
                approval_sigs.append( InlineImage(doc, full, width=Mm(40)) )
            else:
                approval_sigs.append("")  # blank until signed

        # safely unpack into three slots:
        SIG_APPROVER_1 = approval_sigs[0] if len(approval_sigs) > 0 else ""
        SIG_APPROVER_2 = approval_sigs[1] if len(approval_sigs) > 1 else ""
        SIG_APPROVER_3 = approval_sigs[2] if len(approval_sigs) > 2 else ""
        
        # Initialize image URLs lists
        scada_urls = sub.setdefault("scada_image_urls", [])
        trends_urls = sub.setdefault("trends_image_urls", [])
        alarm_urls = sub.setdefault("alarm_image_urls", [])
        
        # Initialize DocxTemplate early to add InlineImages
        doc = DocxTemplate(current_app.config['TEMPLATE_FILE'])
        
        sig_data_url = request.form.get("sig_prepared_data", "")
        if sig_data_url:
            # Parse and save the signature data
            try:
                # strip "data:image/png;base64,"
                if "," in sig_data_url:
                    header, encoded = sig_data_url.split(",", 1)
                    data = base64.b64decode(encoded)
                    
                    # Ensure unique filename
                    fn = f"{submission_id}_prepared_{int(time.time())}.png"
                    sig_folder = current_app.config['SIGNATURES_FOLDER']
                    os.makedirs(sig_folder, exist_ok=True)  # Ensure folder exists
                    out_path = os.path.join(sig_folder, fn)
                    
                    # Write signature file
                    with open(out_path, "wb") as f:
                        f.write(data)
                    
                    # Verify the file was created successfully
                    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
                        # Store signature filename in two places for redundancy
                        sub.setdefault("context", {})["prepared_signature"] = fn
                        sub["prepared_signature"] = fn  # Store in root of submission as well
                        
                        # Add timestamp for the preparer
                        current_timestamp = datetime.datetime.now().isoformat()
                        sub.setdefault("context", {})["prepared_timestamp"] = current_timestamp
                        
                        # Log success with full path info
                        current_app.logger.info(f"Stored preparer signature as {fn}")
                        current_app.logger.info(f"Absolute signature path: {os.path.abspath(out_path)}")
                        current_app.logger.info(f"File exists: {os.path.exists(out_path)}")
                        
                        # Create InlineImage for immediate use - ensure this is assigned correctly
                        try:
                            SIG_PREPARED = InlineImage(doc, out_path, width=Mm(40))
                            current_app.logger.info("Successfully created InlineImage for signature")
                            # Ensure this is added to your context later
                        except Exception as e:
                            current_app.logger.error(f"Error creating preparer signature image: {e}")
                            SIG_PREPARED = ""
                    else:
                        current_app.logger.error(f"Signature file not created or empty: {out_path}")
                        SIG_PREPARED = ""
                else:
                    current_app.logger.error("Invalid signature data format")
                    SIG_PREPARED = ""
            except Exception as e:
                current_app.logger.error(f"Error processing signature data: {e}", exc_info=True)
                SIG_PREPARED = ""
        else:
            SIG_PREPARED = ""


        # Now fix the image upload handling function in main.py:
        # Look for the save_new function around line 300-340

        # Improved image file handling
        def save_new(field, url_list, inline_list):
            """Save new uploaded files with better error handling and path resolution"""
            for f in request.files.getlist(field):
                if not f or not f.filename:
                    continue
                    
                try:
                    # Create a secure filename and ensure uniqueness
                    fn = secure_filename(f.filename)
                    uniq_fn = f"{uuid.uuid4().hex}_{fn}"
                    
                    # Ensure the upload directory exists
                    os.makedirs(upload_dir, exist_ok=True)
                    
                    # Create absolute path for file storage
                    disk_fp = os.path.join(upload_dir, uniq_fn)
                    
                    # Save the file
                    f.save(disk_fp)
                    current_app.logger.info(f"Saved uploaded file to: {disk_fp}")

                    # Create proper URL and add image object
                    try:
                        # Process image and create scaled inline version
                        with Image.open(disk_fp) as img:
                            w, h = img.size
                            
                        # Calculate scale to fit max width
                        max_w_mm = 150
                        scale = min(1, max_w_mm / (w * 0.264583))
                        
                        # 1) Add public URL for edit-mode preview
                        # Use posix-style paths for URLs (forward slashes)
                        rel_path = os.path.join("uploads", submission_id, uniq_fn).replace("\\", "/")
                        url = url_for("static", filename=rel_path)
                        url_list.append(url)
                        current_app.logger.info(f"Added image URL: {url}")

                        # 2) Build InlineImage for DOCX
                        inline_list.append(
                            InlineImage(doc, disk_fp,
                                width=Mm(w * 0.264583 * scale),
                                height=Mm(h * 0.264583 * scale)
                            )
                        )
                        current_app.logger.info(f"Created InlineImage for: {uniq_fn}")
                    except Exception as e:
                        current_app.logger.error(f"Error processing image {fn}: {e}", exc_info=True)
                        # Add default size if image processing fails
                        rel_path = os.path.join("uploads", submission_id, uniq_fn).replace("\\", "/")
                        url = url_for("static", filename=rel_path)
                        url_list.append(url)
                        inline_list.append(
                            InlineImage(doc, disk_fp, width=Mm(100), height=Mm(80))
                        )
                        current_app.logger.info(f"Created fallback InlineImage for: {uniq_fn}")
                except Exception as e:
                    current_app.logger.error(f"Failed to save file {f.filename}: {e}", exc_info=True)

        # Remove images flagged for deletion
        handle_image_removals(request.form, "removed_scada_images", scada_urls)
        handle_image_removals(request.form, "removed_trends_images", trends_urls)
        handle_image_removals(request.form, "removed_alarm_images", alarm_urls)
        
        # Create image objects for template
        scada_image_objects = []
        trends_image_objects = []
        alarm_image_objects = []
        
        # Process new image uploads
        save_new("SCADA_IMAGES", scada_urls, scada_image_objects)
        save_new("TRENDS_IMAGES", trends_urls, trends_image_objects)
        save_new("ALARM_IMAGES", alarm_urls, alarm_image_objects)

        # Process related documents
        related_documents = process_table_rows(
            request.form, 
            {
                'doc_ref[]': 'Document_Reference',
                'doc_title[]': 'Document_Title'
            }
        )
        
        # Process Pre and Post Approvals
        PRE_APPROVALS = process_table_rows(
            request.form,
            {
                'pre_approval_print_name[]': 'Print_Name',
                'pre_approval_signature[]': 'Signature',
                'pre_approval_date[]': 'Date',
                'pre_approval_initial[]': 'Initial',
                'pre_approval_company[]': 'Company'
            }
        )
        
        POST_APPROVALS = process_table_rows(
            request.form,
            {
                'post_approval_print_name[]': 'Print_Name',
                'post_approval_signature[]': 'Signature',
                'post_approval_date[]': 'Date',
                'post_approval_initial[]': 'Initial',
                'post_approval_company[]': 'Company'
            }
        )
        
        def build_sig_images(records):
            imgs = []
            for r in records:
                fn = r.get("Signature")
                if fn:
                    full = os.path.join(current_app.config['SIGNATURES_FOLDER'], fn)
                    imgs.append( InlineImage(doc, full, width=Mm(40)) )
                else:
                    imgs.append("")   # no signature
            return imgs

        # **Safe** extraction — never index past the end
        PRE = PRE_APPROVALS or []
        POST = POST_APPROVALS or []

        SIG_PREPARED_BY     = build_sig_images([PRE[0]])[0] if len(PRE) >= 1 else ""
        SIG_REVIEW_TECH     = build_sig_images([PRE[1]])[0] if len(PRE) >= 2 else ""
        SIG_REVIEW_PM       = build_sig_images([PRE[2]])[0] if len(PRE) >= 3 else ""
        SIG_APPROVAL_CLIENT = build_sig_images([POST[0]])[0] if len(POST) >= 1 else ""

        
        # Process Pre-Test Requirements
        PRE_TEST_REQUIREMENTS = process_table_rows(
            request.form,
            {
                'pretest_item[]': 'Item',
                'pretest_test[]': 'Test',
                'pretest_method[]': 'Method_Test_Steps',
                'pretest_acceptance[]': 'Acceptance_Criteria',
                'pretest_result[]': 'Result',
                'pretest_punch[]': 'Punch_Item',
                'pretest_verified_by[]': 'Verified_by',
                'pretest_comment[]': 'Comment'
            }
        )
        
        # Process Key Components
        KEY_COMPONENTS = process_table_rows(
            request.form,
            {
                'keycomp_s_no[]': 'S_no',
                'keycomp_model[]': 'Model',
                'keycomp_description[]': 'Description',
                'keycomp_remarks[]': 'Remarks'
            }
        )
        
        # Process IP Records
        IP_RECORDS = process_table_rows(
            request.form,
            {
                'ip_device[]': 'Device_Name',
                'ip_address[]': 'IP_Address',
                'ip_comment[]': 'Comment'
            }
        )
        
        # Process Digital Signals
        SIGNAL_LISTS = process_table_rows(
            request.form,
            {
                'S. No.[]': 'S. No.',
                'Rack No.[]': 'Rack No.',
                'Module Position[]': 'Module Position',
                'Signal TAG[]': 'Signal TAG',
                'Signal Description[]': 'Signal Description',
                'Result[]': 'Result',
                'Punch Item[]': 'Punch Item',
                'Verified By[]': 'Verified By',
                'Comment[]': 'Comment'
            }
        )
        
        # Process Analogue Signals
        ANALOGUE_LISTS = process_table_rows(
            request.form,
            {
                'S. No. Analogue[]': 'S. No.',
                'Rack No. Analogue[]': 'Rack No.',
                'Module Position Analogue[]': 'Module Position',
                'Signal TAG Analogue[]': 'Signal TAG',
                'Signal Description Analogue[]': 'Signal Description',
                'Result Analogue[]': 'Result',
                'Punch Item Analogue[]': 'Punch Item',
                'Verified By Analogue[]': 'Verified By',
                'Comment Analogue[]': 'Comment'
            }
        )
        
        # Process Modbus Digital Signals
        MODBUS_DIGITAL_LISTS = process_table_rows(
            request.form,
            {
                'Address[]': 'Address',
                'Description[]': 'Description',
                'Remarks[]': 'Remarks',
                'Digital_Result[]': 'Result',
                'Digital_Punch Item[]': 'Punch Item',
                'Digital_Verified By[]': 'Verified By',
                'Digital_Comment[]': 'Comment'
            }
        )
        
        # Process Modbus Analogue Signals
        MODBUS_ANALOGUE_LISTS = process_table_rows(
            request.form,
            {
                'Address Analogue[]': ' Address',  # Note: space in name is intentional
                'Description Analogue[]': 'Description',
                'Range Analogue[]': 'Range',
                'Result Analogue[]': 'Result',
                'Punch Item Analogue[]': 'Punch Item',
                'Verified By Analogue[]': 'Verified By',
                'Comment Analogue[]': 'Comment'
            }
        )
        
        # Process Data Validation
        DATA_VALIDATION = process_table_rows(
            request.form,
            {
                'Validation_Tag[]': 'Tag',
                'Validation_Range[]': 'Range',
                'Validation_SCADA Value[]': 'SCADA Value',
                'Validation_HMI Value[]': 'HMI Value'
            }
        )
        
        # Process Process Test
        PROCESS_TEST = process_table_rows(
            request.form,
            {
                'Process_Item[]': 'Item',
                'Process_Action[]': 'Action',
                'Process_Expected / Required Result[]': 'Expected / Required Result',
                'Process_Pass/Fail[]': ' Pass/Fail ',  # Note: spaces in name are intentional
                'Process_Comments[]': ' Comments '     # Note: spaces in name are intentional
            }
        )
        
        # Process SCADA Verification
        SCADA_VERIFICATION = process_table_rows(
            request.form,
            {
                'SCADA_Task[]': 'Task',
                'SCADA_Expected_Result[]': 'Expected Result',
                'SCADA_Pass/Fail[]': 'Pass/Fail',
                'SCADA_Comments[]': 'Comments'
            }
        )
        
        # Process Trends Testing
        TRENDS_TESTING = process_table_rows(
            request.form,
            {
                'Trend[]': 'Trend',
                'Expected Behavior[]': 'Expected Behavior',
                'Pass/Fail Trend[]': 'Pass/Fail',
                'Comments Trend[]': 'Comments'
            }
        )
        
        # Process Alarm Signals
        ALARM_LIST = process_table_rows(
            request.form,
            {
                'Alarm_Type[]': 'Alarm Type',
                'Expected / Required Result[]': 'Expected / Required Result',
                ' Pass/Fail []': ' Pass/Fail ',  # Note: spaces in name are intentional
                ' Comments []': ' Comments '     # Note: spaces in name are intentional
            }
        )
        
        # Build final context for the DOCX
        context = {
            "DOCUMENT_TITLE": request.form.get('document_title', ''),
            "PROJECT_REFERENCE": request.form.get('project_reference', ''),
            "DOCUMENT_REFERENCE": request.form.get('document_reference', ''),
            "DATE": request.form.get('date', ''),
            "CLIENT_NAME": request.form.get('client_name', ''),
            "REVISION": request.form.get('revision', ''),
            "REVISION_DETAILS": request.form.get('revision_details', ''),
            "REVISION_DATE": request.form.get('revision_date', ''),
            "PREPARED_BY": request.form.get('prepared_by', ''),
            "SIG_PREPARED": SIG_PREPARED,
            "SIG_PREPARED_BY": SIG_PREPARED_BY,
            "REVIEWED_BY_TECH_LEAD": request.form.get('reviewed_by_tech_lead', ''),
            "SIG_REVIEW_TECH": SIG_REVIEW_TECH,
            "REVIEWED_BY_PM": request.form.get('reviewed_by_pm', ''),
            "SIG_REVIEW_PM": SIG_REVIEW_PM,
            "APPROVED_BY_CLIENT": request.form.get('approved_by_client', ''),
            "SIG_APPROVAL_CLIENT": SIG_APPROVAL_CLIENT,
            "PURPOSE": request.form.get("purpose", ""),
            "SCOPE": request.form.get("scope", ""),
            "PRE_TEST_REQUIREMENTS": PRE_TEST_REQUIREMENTS,
            "KEY_COMPONENTS": KEY_COMPONENTS,
            "IP_RECORDS": IP_RECORDS,
            "RELATED_DOCUMENTS": related_documents,
            "PRE_APPROVALS": PRE_APPROVALS,
            "POST_APPROVALS": POST_APPROVALS,
            "SIGNAL_LISTS": SIGNAL_LISTS,
            "ANALOGUE_LISTS": ANALOGUE_LISTS,
            "MODBUS_DIGITAL_LISTS": MODBUS_DIGITAL_LISTS,
            "MODBUS_ANALOGUE_LISTS": MODBUS_ANALOGUE_LISTS,
            "DATA_VALIDATION": DATA_VALIDATION,
            "PROCESS_TEST": PROCESS_TEST,
            "SCADA_VERIFICATION": SCADA_VERIFICATION,
            "TRENDS_TESTING": TRENDS_TESTING,
            "SCADA_IMAGES": scada_image_objects,
            "TRENDS_IMAGES": trends_image_objects,
            "ALARM_IMAGES": alarm_image_objects,
            "ALARM_LIST": ALARM_LIST,
            "SIG_APPROVER_1": SIG_APPROVER_1,
            "SIG_APPROVER_2": SIG_APPROVER_2,
            "SIG_APPROVER_3": SIG_APPROVER_3,
            
        }
        
        # For storage, remove the InlineImage objects
        context_to_store = dict(context)
        #context_to_store.pop("SCADA_IMAGES", None)
        #context_to_store.pop("TRENDS_IMAGES", None)
        #context_to_store.pop("ALARM_IMAGES", None)
        for key in list(context_to_store.keys()):
            if isinstance(context_to_store[key], InlineImage):
                # Either remove completely
                context_to_store.pop(key, None)
                # Or store the path instead
                # context_to_store[key + '_path'] = getattr(context_to_store[key], '_filename', '')
        
        # Get approver emails from the form
        approver_emails = [
            request.form.get("approver_1_email"),
            request.form.get("approver_2_email"),
            request.form.get("approver_3_email")
        ]

        # Setup or retrieve approval workflow with custom approver emails
        approvals, locked = setup_approval_workflow(submission_id, submissions, approver_emails)

        # Store approver emails in context for later retrieval in edit form
        context_to_store["approver_1_email"] = approver_emails[0]
        context_to_store["approver_2_email"] = approver_emails[1]
        context_to_store["approver_3_email"] = approver_emails[2]
        
        # Save submission data
        submission_data = {
            "context": context_to_store,
            "user_email": request.form.get("user_email", ""),
            "approvals": approvals,
            "locked": locked,
            "scada_image_urls": scada_urls,
            "trends_image_urls": trends_urls,
            "alarm_image_urls": alarm_urls,
            "created_at": sub.get("created_at", datetime.datetime.now().isoformat()),
            "updated_at": datetime.datetime.now().isoformat()
        }
        submissions[submission_id] = submission_data
        save_submissions(submissions)
        current_app.logger.info(f"SIG_PREPARED type: {type(SIG_PREPARED)}")
        current_app.logger.info(f"SIG_PREPARED exists: {SIG_PREPARED is not None}")
        if hasattr(SIG_PREPARED, '_image_path'):
            current_app.logger.info(f"SIG_PREPARED path: {getattr(SIG_PREPARED, '_image_path', 'unknown')}")
        # Render the DOCX template
        doc.render(context)
        output_path = os.path.abspath(current_app.config['OUTPUT_FILE'])
        doc.save(output_path)
        
        # Update TOC and adjust table formatting
        # Try updating TOC (Word COM); if it fails, log & continue
        try:
            update_toc(output_path)
        except Exception as e:
            current_app.logger.warning(f"Could not update TOC (skipping): {e}")

        # Always autofit tables if you can
        dynamic_keywords = ["signal", "component", "test", "approval", "ip", "modbus"]
        try:
            enable_autofit_tables(output_path, dynamic_keywords)
        except Exception as e:
            current_app.logger.warning(f"Could not autofit tables: {e}")
        
        # Send edit link if not already sent
        if not submissions[submission_id].get("approval_notification_sent", False):
            # Ensure approvals list is not empty before accessing
            if approvals and len(approvals) > 0:
                try:
                    # Send to first approver (the preparer, stage 0)
                    send_approval_link(approvals[0]["approver_email"], submission_id, 0)
                    current_app.logger.info(f"Approval email sent to preparer: {approvals[0]['approver_email']}")
                except Exception as e:
                    current_app.logger.error(f"Failed to send approval email: {e}", exc_info=True)
                    flash("Failed to send approval notification", "warning")
            else:
                current_app.logger.warning(f"No approvers defined for submission {submission_id}")
            
            # Mark as sent regardless to prevent repeated attempts
            submissions[submission_id]["approval_notification_sent"] = True
            save_submissions(submissions)
        
        # Send first approval notification (only if new submission)
        if not submissions[submission_id].get("approval_notification_sent", False):
            # Ensure approvals list is not empty before accessing
            if approvals and len(approvals) > 0:
                try:
                    send_approval_link(approvals[0]["approver_email"], submission_id, 1)
                    current_app.logger.info(f"Approval email sent to {approvals[0]['approver_email']}")
                except Exception as e:
                    current_app.logger.error(f"Failed to send approval email: {e}", exc_info=True)
                    flash("Failed to send approval notification", "warning")
            else:
                current_app.logger.warning(f"No approvers defined for submission {submission_id}")
            
            # Mark as sent regardless to prevent repeated attempts
            submissions[submission_id]["approval_notification_sent"] = True
            save_submissions(submissions)
            
        current_app.logger.info(f"Generated report for submission {submission_id}")
        
        # Create download link
        download_url = url_for('status.download_report', submission_id=submission_id, _external=True)
        current_app.logger.info(f"Download URL: {download_url}")
        
        # Return file directly
        return send_file(output_path, as_attachment=True, download_name=f"SAT_Report_{submission_id}.docx")
        
    except Exception as e:
        current_app.logger.error(f"Error in generate: {e}", exc_info=True)
        flash(f"An error occurred while generating the report: {str(e)}", "error")
        return redirect(url_for('main.index'))