"""
Service Layer for Business Logic
Separates route handling from business logic for better maintainability
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any
from werkzeug.exceptions import NotFound
from flask import current_app
from models import db, User, Report, SATReport, SystemSettings, Notification
from utils import send_email_notification, generate_report_document
import uuid

logger = logging.getLogger(__name__)


class UserService:
    """Service for user-related operations"""
    
    @staticmethod
    def get_users_by_role() -> Dict[str, List[Dict[str, str]]]:
        """Get active users grouped by role"""
        try:
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
            
            return users_by_role
        except Exception as e:
            logger.error(f"Error getting users by role: {e}")
            raise
    
    @staticmethod
    def create_user(data: Dict[str, Any]) -> User:
        """Create a new user"""
        try:
            user = User(
                full_name=data['full_name'],
                email=data['email'],
                role=data.get('role', 'Engineer'),
                status='Pending'
            )
            user.set_password(data['password'])
            db.session.add(user)
            db.session.commit()
            return user
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating user: {e}")
            raise
    
    @staticmethod
    def update_user_status(user_id: int, status: str) -> bool:
        """Update user status"""
        try:
            user = User.query.get(user_id)
            if not user:
                raise NotFound("User not found")
            
            user.status = status
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating user status: {e}")
            raise


class ReportService:
    """Service for report-related operations"""
    
    @staticmethod
    def create_report(data: Dict[str, Any], user_email: str) -> Report:
        """Create a new report"""
        try:
            report_id = str(uuid.uuid4())
            
            report = Report(
                id=report_id,
                type=data.get('type', 'SAT'),
                status='DRAFT',
                document_title=data.get('document_title'),
                document_reference=data.get('document_reference'),
                project_reference=data.get('project_reference'),
                client_name=data.get('client_name'),
                revision=data.get('revision', 'R0'),
                prepared_by=data.get('prepared_by'),
                user_email=user_email,
                version='R0'
            )
            
            # Handle SAT-specific data
            if report.type == 'SAT':
                sat_report = SATReport(
                    report_id=report_id,
                    data_json=json.dumps(data),
                    date=data.get('date'),
                    purpose=data.get('purpose'),
                    scope=data.get('scope')
                )
                db.session.add(sat_report)
            
            db.session.add(report)
            db.session.commit()
            return report
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating report: {e}")
            raise
    
    @staticmethod
    def get_user_reports(user_email: str, role: str) -> List[Report]:
        """Get reports based on user role"""
        try:
            query = Report.query
            
            if role == 'Admin':
                # Admin sees all reports
                reports = query.all()
            elif role in ['TM', 'Technical Manager', 'PM', 'Project Manager']:
                # Managers see all reports
                reports = query.all()
            else:
                # Engineers only see their own reports
                reports = query.filter_by(user_email=user_email).all()
            
            return reports
        except Exception as e:
            logger.error(f"Error getting user reports: {e}")
            raise
    
    @staticmethod
    def update_report_status(report_id: str, status: str, user_email: str = None) -> bool:
        """Update report status with approval workflow"""
        try:
            report = Report.query.get(report_id)
            if not report:
                raise NotFound("Report not found")
            
            old_status = report.status
            report.status = status
            report.updated_at = datetime.utcnow()
            
            # Update approvals if needed
            if status == 'PENDING' and old_status == 'DRAFT':
                # Initialize approval workflow
                approvals = {
                    'stage': 1,
                    'approvers': [
                        {'stage': 1, 'title': 'Technical Manager', 'status': 'pending'},
                        {'stage': 2, 'title': 'Project Manager', 'status': 'pending'}
                    ]
                }
                report.approvals_json = json.dumps(approvals)
            
            db.session.commit()
            
            # Send notifications if needed
            if status == 'PENDING' and not report.approval_notification_sent:
                NotificationService.create_approval_notification(report)
                report.approval_notification_sent = True
                db.session.commit()
            
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating report status: {e}")
            raise
    
    @staticmethod
    def get_pending_approvals(user_role: str) -> int:
        """Get count of pending approvals for a role"""
        try:
            if user_role in ['TM', 'Technical Manager']:
                # TMs see reports at stage 1
                reports = Report.query.filter_by(status='PENDING').all()
                count = sum(1 for r in reports if ReportService._is_at_stage(r, 1))
            elif user_role in ['PM', 'Project Manager']:
                # PMs see reports at stage 2
                reports = Report.query.filter_by(status='PENDING').all()
                count = sum(1 for r in reports if ReportService._is_at_stage(r, 2))
            else:
                count = 0
            
            return count
        except Exception as e:
            logger.error(f"Error getting pending approvals: {e}")
            return 0
    
    @staticmethod
    def _is_at_stage(report: Report, stage: int) -> bool:
        """Check if report is at specific approval stage"""
        if not report.approvals_json:
            return False
        
        try:
            approvals = json.loads(report.approvals_json)
            return approvals.get('stage') == stage
        except Exception:
            return False


class NotificationService:
    """Service for notification-related operations"""
    
    @staticmethod
    def create_notification(user_email: str, title: str, message: str, 
                          notification_type: str = 'info') -> Notification:
        """Create a notification for a user"""
        try:
            notification = Notification(
                user_email=user_email,
                title=title,
                message=message,
                type=notification_type,
                read=False
            )
            db.session.add(notification)
            db.session.commit()
            return notification
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating notification: {e}")
            raise
    
    @staticmethod
    def create_approval_notification(report: Report) -> bool:
        """Create approval notifications for relevant users"""
        try:
            # Get TMs for stage 1 approval
            tms = User.query.filter(
                User.role.in_(['TM', 'Technical Manager']),
                User.status == 'Active'
            ).all()
            
            for tm in tms:
                NotificationService.create_notification(
                    tm.email,
                    'New Report for Approval',
                    f'Report "{report.document_title}" requires your approval',
                    'approval'
                )
            
            # Send email notifications if enabled
            if current_app.config.get('ENABLE_EMAIL_NOTIFICATIONS'):
                for tm in tms:
                    send_email_notification(
                        tm.email,
                        'New Report Pending Approval',
                        f'A new report "{report.document_title}" is pending your approval.'
                    )
            
            return True
        except Exception as e:
            logger.error(f"Error creating approval notifications: {e}")
            return False
    
    @staticmethod
    def get_unread_count(user_email: str) -> int:
        """Get count of unread notifications for a user"""
        try:
            return Notification.query.filter_by(
                user_email=user_email,
                read=False
            ).count()
        except Exception as e:
            logger.error(f"Error getting unread count: {e}")
            return 0
    
    @staticmethod
    def mark_as_read(notification_id: int, user_email: str) -> bool:
        """Mark a notification as read"""
        try:
            notification = Notification.query.filter_by(
                id=notification_id,
                user_email=user_email
            ).first()
            
            if notification:
                notification.read = True
                notification.read_at = datetime.utcnow()
                db.session.commit()
                return True
            return False
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error marking notification as read: {e}")
            return False


class DashboardService:
    """Service for dashboard statistics and data"""
    
    @staticmethod
    def get_engineer_stats(user_email: str) -> Dict[str, int]:
        """Get statistics for engineer dashboard"""
        try:
            reports = Report.query.filter_by(user_email=user_email).all()
            
            return {
                'total_reports': len(reports),
                'pending_reports': sum(1 for r in reports if r.status == 'PENDING'),
                'approved_reports': sum(1 for r in reports if r.status == 'APPROVED'),
                'draft_reports': sum(1 for r in reports if r.status == 'DRAFT')
            }
        except Exception as e:
            logger.error(f"Error getting engineer stats: {e}")
            return {'total_reports': 0, 'pending_reports': 0, 'approved_reports': 0, 'draft_reports': 0}
    
    @staticmethod
    def get_admin_stats() -> Dict[str, Any]:
        """Get statistics for admin dashboard"""
        try:
            total_users = User.query.count()
            active_users = User.query.filter_by(status='Active').count()
            pending_users = User.query.filter_by(status='Pending').count()
            total_reports = Report.query.count()
            pending_reports = Report.query.filter_by(status='PENDING').count()
            
            # Get database status
            try:
                db.session.execute('SELECT 1')
                db_status = 'Connected'
            except Exception:
                db_status = 'Disconnected'
            
            return {
                'total_users': total_users,
                'active_users': active_users,
                'pending_users': pending_users,
                'total_reports': total_reports,
                'pending_reports': pending_reports,
                'database_status': db_status
            }
        except Exception as e:
            logger.error(f"Error getting admin stats: {e}")
            return {
                'total_users': 0,
                'active_users': 0,
                'pending_users': 0,
                'total_reports': 0,
                'pending_reports': 0,
                'database_status': 'Error'
            }
    
    @staticmethod
    def get_manager_stats(user_role: str) -> Dict[str, Any]:
        """Get statistics for manager dashboards"""
        try:
            total_reports = Report.query.count()
            pending_approvals = ReportService.get_pending_approvals(user_role)
            approved_reports = Report.query.filter_by(status='APPROVED').count()
            
            # Get recent reports
            recent_reports = Report.query.order_by(
                Report.updated_at.desc()
            ).limit(10).all()
            
            return {
                'reports_count': total_reports,
                'pending_approvals': pending_approvals,
                'approved_reports': approved_reports,
                'recent_reports': recent_reports,
                'team_reports': total_reports  # Simplified for now
            }
        except Exception as e:
            logger.error(f"Error getting manager stats: {e}")
            return {
                'reports_count': 0,
                'pending_approvals': 0,
                'approved_reports': 0,
                'recent_reports': [],
                'team_reports': 0
            }


class SystemService:
    """Service for system-wide operations"""
    
    @staticmethod
    def initialize_database() -> bool:
        """Initialize database with default data"""
        try:
            # Create default admin user if none exists
            admin = User.query.filter_by(role='Admin').first()
            if not admin:
                admin = User(
                    full_name='System Administrator',
                    email='admin@cullyautomation.com',
                    role='Admin',
                    status='Active'
                )
                admin.set_password('admin123')  # Should be changed on first login
                db.session.add(admin)
            
            # Initialize default system settings
            default_settings = {
                'company_name': 'Cully Automation',
                'email_notifications': 'enabled',
                'approval_stages': '2',
                'maintenance_mode': 'disabled'
            }
            
            for key, value in default_settings.items():
                if not SystemSettings.get_setting(key):
                    SystemSettings.set_setting(key, value)
            
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error initializing database: {e}")
            return False
    
    @staticmethod
    def cleanup_old_data(days: int = 90) -> int:
        """Clean up old draft reports and notifications"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Delete old draft reports
            old_drafts = Report.query.filter(
                Report.status == 'DRAFT',
                Report.updated_at < cutoff_date
            ).all()
            
            count = len(old_drafts)
            for report in old_drafts:
                db.session.delete(report)
            
            # Delete old read notifications
            old_notifications = Notification.query.filter(
                Notification.read,
                Notification.created_at < cutoff_date
            ).all()
            
            for notif in old_notifications:
                db.session.delete(notif)
            
            db.session.commit()
            return count
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error cleaning up old data: {e}")
            return 0