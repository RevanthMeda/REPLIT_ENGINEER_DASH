"""
Celery Background Tasks for Async Processing
Handles time-consuming operations like email sending, report generation, and image processing
"""

import os
import logging
from celery import Celery
from celery.result import AsyncResult
from datetime import datetime, timedelta
import json
from typing import Dict, Any, Optional

# Initialize Celery
celery = Celery('tasks',
                broker=os.environ.get('REDIS_URL', 'redis://localhost:6379/0'),
                backend=os.environ.get('REDIS_URL', 'redis://localhost:6379/0'))

# Configure Celery
celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # 4 minutes soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
)

logger = logging.getLogger(__name__)


@celery.task(bind=True, name='tasks.send_email_async')
def send_email_async(self, recipient: str, subject: str, body: str, 
                     html_body: Optional[str] = None) -> Dict[str, Any]:
    """
    Send email asynchronously
    """
    try:
        # Update task state
        self.update_state(state='PROGRESS', meta={'status': 'Sending email...'})
        
        # Import here to avoid circular dependencies
        from utils import send_email_notification
        
        result = send_email_notification(recipient, subject, body, html_body)
        
        return {
            'status': 'success',
            'message': f'Email sent to {recipient}',
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error sending email to {recipient}: {e}")
        return {
            'status': 'failed',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


@celery.task(bind=True, name='tasks.generate_report_async')
def generate_report_async(self, report_id: str, template_path: str, 
                         output_path: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate Word/PDF report asynchronously
    """
    try:
        self.update_state(state='PROGRESS', 
                         meta={'status': 'Generating report...', 'progress': 10})
        
        # Import here to avoid circular dependencies
        from utils import generate_word_report, convert_to_pdf
        from models import db, Report
        
        # Generate Word document
        self.update_state(state='PROGRESS',
                         meta={'status': 'Creating Word document...', 'progress': 30})
        
        word_path = generate_word_report(template_path, output_path, data)
        
        # Convert to PDF if enabled
        pdf_path = None
        if os.environ.get('ENABLE_PDF_EXPORT', 'False').lower() == 'true':
            self.update_state(state='PROGRESS',
                             meta={'status': 'Converting to PDF...', 'progress': 60})
            pdf_path = convert_to_pdf(word_path)
        
        # Update report status
        self.update_state(state='PROGRESS',
                         meta={'status': 'Updating database...', 'progress': 90})
        
        # Use app context for database operations
        from app import create_app
        app = create_app()
        with app.app_context():
            report = Report.query.get(report_id)
            if report:
                report.updated_at = datetime.utcnow()
                db.session.commit()
        
        return {
            'status': 'success',
            'word_path': word_path,
            'pdf_path': pdf_path,
            'report_id': report_id,
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error generating report {report_id}: {e}")
        return {
            'status': 'failed',
            'error': str(e),
            'report_id': report_id,
            'timestamp': datetime.utcnow().isoformat()
        }


@celery.task(bind=True, name='tasks.process_image_async')
def process_image_async(self, image_path: str, operations: list) -> Dict[str, Any]:
    """
    Process images asynchronously (resize, optimize, convert)
    """
    try:
        self.update_state(state='PROGRESS', meta={'status': 'Processing image...'})
        
        from PIL import Image
        import io
        
        # Open image
        img = Image.open(image_path)
        
        # Apply operations
        for op in operations:
            if op['type'] == 'resize':
                img = img.resize((op['width'], op['height']), Image.LANCZOS)
            elif op['type'] == 'convert':
                img = img.convert(op['mode'])
            elif op['type'] == 'rotate':
                img = img.rotate(op['angle'])
            elif op['type'] == 'optimize':
                # Optimize for web
                if img.mode in ('RGBA', 'LA'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
        
        # Save processed image
        output_path = image_path.rsplit('.', 1)[0] + '_processed.jpg'
        img.save(output_path, 'JPEG', quality=85, optimize=True)
        
        return {
            'status': 'success',
            'original_path': image_path,
            'processed_path': output_path,
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error processing image {image_path}: {e}")
        return {
            'status': 'failed',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


@celery.task(bind=True, name='tasks.bulk_notification_async')
def bulk_notification_async(self, user_emails: list, title: str, 
                           message: str, notification_type: str = 'info') -> Dict[str, Any]:
    """
    Send bulk notifications asynchronously
    """
    try:
        self.update_state(state='PROGRESS', 
                         meta={'status': 'Sending notifications...', 'total': len(user_emails)})
        
        from models import db, Notification
        from app import create_app
        
        app = create_app()
        with app.app_context():
            sent_count = 0
            failed_count = 0
            
            for i, email in enumerate(user_emails):
                try:
                    notification = Notification(
                        user_email=email,
                        title=title,
                        message=message,
                        type=notification_type
                    )
                    db.session.add(notification)
                    sent_count += 1
                    
                    # Update progress
                    self.update_state(state='PROGRESS',
                                     meta={'status': f'Sending {i+1}/{len(user_emails)}...',
                                          'progress': int((i+1) / len(user_emails) * 100)})
                except Exception as e:
                    logger.error(f"Failed to create notification for {email}: {e}")
                    failed_count += 1
            
            db.session.commit()
        
        return {
            'status': 'success',
            'sent': sent_count,
            'failed': failed_count,
            'total': len(user_emails),
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error sending bulk notifications: {e}")
        return {
            'status': 'failed',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


@celery.task(name='tasks.cleanup_old_data')
def cleanup_old_data(days: int = 90) -> Dict[str, Any]:
    """
    Periodic task to clean up old data
    """
    try:
        from services import SystemService
        from app import create_app
        
        app = create_app()
        with app.app_context():
            deleted_count = SystemService.cleanup_old_data(days)
        
        return {
            'status': 'success',
            'deleted_reports': deleted_count,
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error cleaning up old data: {e}")
        return {
            'status': 'failed',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


@celery.task(name='tasks.generate_analytics')
def generate_analytics() -> Dict[str, Any]:
    """
    Generate system analytics and reports
    """
    try:
        from models import db, Report, User
        from app import create_app
        
        app = create_app()
        with app.app_context():
            # Gather analytics
            total_users = User.query.count()
            active_users = User.query.filter_by(status='Active').count()
            total_reports = Report.query.count()
            
            # Reports by status
            draft_reports = Report.query.filter_by(status='DRAFT').count()
            pending_reports = Report.query.filter_by(status='PENDING').count()
            approved_reports = Report.query.filter_by(status='APPROVED').count()
            
            # Reports by type
            report_types = db.session.query(
                Report.type, db.func.count(Report.id)
            ).group_by(Report.type).all()
            
            analytics = {
                'users': {
                    'total': total_users,
                    'active': active_users,
                    'inactive': total_users - active_users
                },
                'reports': {
                    'total': total_reports,
                    'by_status': {
                        'draft': draft_reports,
                        'pending': pending_reports,
                        'approved': approved_reports
                    },
                    'by_type': dict(report_types)
                },
                'generated_at': datetime.utcnow().isoformat()
            }
            
            # Store analytics (could be saved to file, cache, or database)
            cache_key = f"analytics_{datetime.utcnow().strftime('%Y%m%d')}"
            # Here you would store to Redis or another cache
            
            return {
                'status': 'success',
                'analytics': analytics,
                'timestamp': datetime.utcnow().isoformat()
            }
    except Exception as e:
        logger.error(f"Error generating analytics: {e}")
        return {
            'status': 'failed',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


# Periodic task schedule
celery.conf.beat_schedule = {
    'cleanup-old-data': {
        'task': 'tasks.cleanup_old_data',
        'schedule': timedelta(days=1),  # Run daily
        'args': (90,)  # Clean data older than 90 days
    },
    'generate-analytics': {
        'task': 'tasks.generate_analytics',
        'schedule': timedelta(hours=6),  # Run every 6 hours
    }
}


def get_task_status(task_id: str) -> Dict[str, Any]:
    """
    Get the status of a Celery task
    """
    try:
        result = AsyncResult(task_id, app=celery)
        
        if result.state == 'PENDING':
            return {'state': 'PENDING', 'status': 'Task not found or not started'}
        elif result.state == 'PROGRESS':
            return {'state': 'PROGRESS', **result.info}
        elif result.state == 'SUCCESS':
            return {'state': 'SUCCESS', 'result': result.result}
        elif result.state == 'FAILURE':
            return {'state': 'FAILURE', 'error': str(result.info)}
        else:
            return {'state': result.state}
    except Exception as e:
        return {'state': 'ERROR', 'error': str(e)}