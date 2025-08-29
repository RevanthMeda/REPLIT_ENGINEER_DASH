import os
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash


db = SQLAlchemy()

# Lazy loading flag to prevent heavy operations on import
_db_initialized = False

class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)  # Added index
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=True, index=True)  # Added index for role filtering
    status = db.Column(db.String(20), default='Pending', index=True)  # Added index for status filtering
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    requested_role = db.Column(db.String(20), nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def is_active(self):
        return self.status == 'Active'

    def __repr__(self):
        return f'<User {self.email}>'

class SystemSettings(db.Model):
    __tablename__ = 'system_settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @staticmethod
    def get_setting(key, default=None):
        setting = SystemSettings.query.filter_by(key=key).first()
        return setting.value if setting else default

    @staticmethod
    def set_setting(key, value):
        setting = SystemSettings.query.filter_by(key=key).first()
        if setting:
            setting.value = value
            setting.updated_at = datetime.utcnow()
        else:
            setting = SystemSettings(key=key, value=value)
            db.session.add(setting)
        db.session.commit()
        return setting

class Report(db.Model):
    __tablename__ = 'reports'
    __table_args__ = (
        db.Index('idx_report_status_user', 'status', 'user_email'),  # Composite index
        db.Index('idx_report_updated', 'updated_at'),  # Index for sorting
    )

    id = db.Column(db.String(36), primary_key=True)  # UUID
    type = db.Column(db.String(20), nullable=False, index=True)  # Added index
    status = db.Column(db.String(20), default='DRAFT', index=True)  # Added index
    document_title = db.Column(db.String(200), nullable=True)
    document_reference = db.Column(db.String(100), nullable=True)
    project_reference = db.Column(db.String(100), nullable=True, index=True)  # Added index
    client_name = db.Column(db.String(100), nullable=True)
    revision = db.Column(db.String(20), nullable=True)
    prepared_by = db.Column(db.String(100), nullable=True)
    user_email = db.Column(db.String(120), nullable=False, index=True)  # Added index
    version = db.Column(db.String(10), default='R0')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)  # Added index
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    locked = db.Column(db.Boolean, default=False)
    approvals_json = db.Column(db.Text, nullable=True)
    approval_notification_sent = db.Column(db.Boolean, default=False)

    # Relationships
    sat_report = db.relationship('SATReport', backref='parent_report', uselist=False, cascade='all, delete-orphan')
    fds_report = db.relationship('FDSReport', backref='parent_report', uselist=False, cascade='all, delete-orphan')
    hds_report = db.relationship('HDSReport', backref='parent_report', uselist=False, cascade='all, delete-orphan')
    site_survey_report = db.relationship('SiteSurveyReport', backref='parent_report', uselist=False, cascade='all, delete-orphan')
    sds_report = db.relationship('SDSReport', backref='parent_report', uselist=False, cascade='all, delete-orphan')
    fat_report = db.relationship('FATReport', backref='parent_report', uselist=False, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Report {self.id}: {self.type} - {self.document_title}>'

class SATReport(db.Model):
    __tablename__ = 'sat_reports'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.String(36), db.ForeignKey('reports.id'), nullable=False, unique=True)
    data_json = db.Column(db.Text, nullable=False)  # Full SAT form payload as JSON

    # Summary fields for quick access
    date = db.Column(db.String(20), nullable=True)
    purpose = db.Column(db.Text, nullable=True)
    scope = db.Column(db.Text, nullable=True)

    # Image URL storage
    scada_image_urls = db.Column(db.Text, nullable=True)  # JSON array
    trends_image_urls = db.Column(db.Text, nullable=True)  # JSON array
    alarm_image_urls = db.Column(db.Text, nullable=True)  # JSON array

    def __repr__(self):
        return f'<SATReport {self.report_id}>'

# Future report type tables (empty for now)
class FDSReport(db.Model):
    __tablename__ = 'fds_reports'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.String(36), db.ForeignKey('reports.id'), nullable=False, unique=True)
    data_json = db.Column(db.Text, nullable=False)

class HDSReport(db.Model):
    __tablename__ = 'hds_reports'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.String(36), db.ForeignKey('reports.id'), nullable=False, unique=True)
    data_json = db.Column(db.Text, nullable=False)

class SiteSurveyReport(db.Model):
    __tablename__ = 'site_survey_reports'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.String(36), db.ForeignKey('reports.id'), nullable=False, unique=True)
    data_json = db.Column(db.Text, nullable=False)

class SDSReport(db.Model):
    __tablename__ = 'sds_reports'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.String(36), db.ForeignKey('reports.id'), nullable=False, unique=True)
    data_json = db.Column(db.Text, nullable=False)

class FATReport(db.Model):
    __tablename__ = 'fat_reports'

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.String(36), db.ForeignKey('reports.id'), nullable=False, unique=True)
    data_json = db.Column(db.Text, nullable=False)

def init_db(app):
    """Initialize database with proper error handling"""
    try:
        # Ensure instance directory exists
        instance_dir = os.path.join(app.config.get('BASE_DIR', os.getcwd()), 'instance')
        os.makedirs(instance_dir, exist_ok=True)

        db.init_app(app)

        with app.app_context():
            # Test database connection
            try:
                db.engine.connect().close()
                app.logger.info("Database connection successful")
            except Exception as conn_error:
                app.logger.error(f"Database connection failed: {conn_error}")
                # Try to create the database file and directories
                try:
                    db.create_all()
                    app.logger.info("Database file created successfully")
                except Exception as create_error:
                    app.logger.error(f"Could not create database: {create_error}")
                    return False

            # Create all tables
            try:
                db.create_all()
                app.logger.info("Database tables created successfully")
            except Exception as table_error:
                app.logger.error(f"Error creating tables: {table_error}")
                return False

            # Create default admin user if it doesn't exist
            try:
                admin_user = User.query.filter_by(email='admin@cullyautomation.com').first()
                if not admin_user:
                    admin_user = User(
                        email='admin@cullyautomation.com',
                        full_name='System Administrator',
                        role='Admin',
                        status='Active'
                    )
                    admin_user.set_password('admin123')  # Change this in production
                    db.session.add(admin_user)
                    db.session.commit()
                    app.logger.info("Default admin user created")
            except Exception as user_error:
                app.logger.warning(f"Could not create admin user: {user_error}")
                try:
                    db.session.rollback()
                except Exception:
                    pass

            # Initialize system settings
            try:
                default_settings = [
                    ('company_name', 'Cully Automation'),
                    ('company_logo', 'static/img/cully.png'),
                    ('default_storage_location', 'static/uploads')
                ]

                for key, value in default_settings:
                    existing = SystemSettings.query.filter_by(key=key).first()
                    if not existing:
                        setting = SystemSettings(key=key, value=value)
                        db.session.add(setting)

                db.session.commit()
                app.logger.info("Default system settings initialized")
            except Exception as settings_error:
                app.logger.warning(f"Could not create system settings: {settings_error}")
                try:
                    db.session.rollback()
                except Exception:
                    pass

        app.logger.info("Database initialized successfully")
        return True

    except Exception as e:
        app.logger.error(f"Database initialization failed: {e}")
        return False


def import_json_to_db():
    """One-time import of existing JSON submissions to database"""
    import json

    submissions_file = 'data/submissions.json'
    archived_file = 'data/submissions.archived.json'

    # Check if JSON file exists and hasn't been archived yet
    if not os.path.exists(submissions_file) or os.path.exists(archived_file):
        return

    try:
        with open(submissions_file, 'r') as f:
            submissions = json.load(f)

        print(f"📂 Importing {len(submissions)} submissions from JSON to database...")

        for submission_id, data in submissions.items():
            # Skip if already exists in database
            if Report.query.get(submission_id):
                continue

            context = data.get('context', {})


            # Create parent report record
            report = Report(
                id=submission_id,
                type='SAT',
                status='APPROVED' if data.get('locked', False) else 'DRAFT',
                document_title=context.get('DOCUMENT_TITLE', ''),
                document_reference=context.get('DOCUMENT_REFERENCE', ''),
                project_reference=context.get('PROJECT_REFERENCE', ''),
                client_name=context.get('CLIENT_NAME', ''),
                revision=context.get('REVISION', ''),
                prepared_by=context.get('PREPARED_BY', ''),
                user_email=data.get('user_email', ''),
                created_at=datetime.fromisoformat(data.get('created_at', datetime.utcnow().isoformat())),
                updated_at=datetime.fromisoformat(data.get('updated_at', datetime.utcnow().isoformat())),
                locked=data.get('locked', False),
                approvals_json=json.dumps(data.get('approvals', [])),
                approval_notification_sent=data.get('approval_notification_sent', False)
            )

            # Create SAT-specific record
            sat_report = SATReport(
                report_id=submission_id,
                data_json=json.dumps(data),  # Store entire submission as JSON
                date=context.get('DATE', ''),
                purpose=context.get('PURPOSE', ''),
                scope=context.get('SCOPE', ''),
                scada_image_urls=json.dumps(data.get('scada_image_urls', [])),
                trends_image_urls=json.dumps(data.get('trends_image_urls', [])),
                alarm_image_urls=json.dumps(data.get('alarm_image_urls', []))
            )

            db.session.add(report)
            db.session.add(sat_report)

        db.session.commit()

        # Archive the JSON file
        os.rename(submissions_file, archived_file)
        print(f"✅ Successfully imported {len(submissions)} submissions and archived JSON file")

    except Exception as e:
        print(f"❌ Error importing JSON submissions: {e}")
        db.session.rollback()

def test_db_connection():
    """Test database connectivity"""
    try:
        # Try a simple query
        User.query.limit(1).all()
        return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False

def create_admin_user(email='admin@cullyautomation.com', password='admin123', full_name='System Administrator'):
    """Create admin user manually - useful for new database setup"""
    try:
        # Check if admin already exists
        existing_admin = User.query.filter_by(email=email).first()
        if existing_admin:
            print(f"Admin user {email} already exists")
            return existing_admin
        
        # Create new admin user
        admin_user = User(
            email=email,
            full_name=full_name,
            role='Admin',
            status='Active'
        )
        admin_user.set_password(password)
        db.session.add(admin_user)
        db.session.commit()
        
        print(f"✅ Admin user created successfully: {email}")
        print(f"   Password: {password}")
        print("   ⚠️  Please change the password after first login!")
        return admin_user
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.session.rollback()
        return None

class ModuleSpec(db.Model):
    __tablename__ = 'module_specs'

    id = db.Column(db.Integer, primary_key=True)
    company = db.Column(db.String(100), nullable=False)  # ABB, Siemens, etc.
    model = db.Column(db.String(100), nullable=False)    # DI810, SM1231, etc.
    description = db.Column(db.String(500), nullable=True)
    digital_inputs = db.Column(db.Integer, default=0)
    digital_outputs = db.Column(db.Integer, default=0)
    analog_inputs = db.Column(db.Integer, default=0)
    analog_outputs = db.Column(db.Integer, default=0)
    voltage_range = db.Column(db.String(100), nullable=True)  # "24 VDC", "0-10V", etc.
    current_range = db.Column(db.String(100), nullable=True)  # "4-20mA", etc.
    resolution = db.Column(db.String(50), nullable=True)      # "12-bit", "16-bit", etc.
    signal_type = db.Column(db.String(50), nullable=True)     # "Digital", "Analog", "Mixed"
    rack_slot_convention = db.Column(db.String(100), nullable=True)  # Vendor-specific naming
    datasheet_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    verified = db.Column(db.Boolean, default=False)  # Whether spec has been verified

    # Unique constraint on company + model
    __table_args__ = (db.UniqueConstraint('company', 'model', name='unique_company_model'),)

    @classmethod
    def find_or_create(cls, company, model):
        """Find existing module spec or create placeholder for web lookup"""
        spec = cls.query.filter_by(company=company.upper(), model=model.upper()).first()
        if not spec:
            spec = cls(
                company=company.upper(),
                model=model.upper(),
                verified=False
            )
            db.session.add(spec)
            db.session.commit()
        return spec

    def get_total_channels(self):
        """Get total number of I/O channels"""
        return (self.digital_inputs or 0) + (self.digital_outputs or 0) + \
               (self.analog_inputs or 0) + (self.analog_outputs or 0)

    def to_dict(self):
        return {
            'company': self.company,
            'model': self.model,
            'description': self.description,
            'digital_inputs': self.digital_inputs,
            'digital_outputs': self.digital_outputs,
            'analog_inputs': self.analog_inputs,
            'analog_outputs': self.analog_outputs,
            'voltage_range': self.voltage_range,
            'current_range': self.current_range,
            'resolution': self.resolution,
            'signal_type': self.signal_type,
            'total_channels': self.get_total_channels(),
            'verified': self.verified
        }

class Notification(db.Model):
    __tablename__ = 'notifications'
    __table_args__ = (
        db.Index('idx_notification_user_read', 'user_email', 'read'),  # Composite index for unread queries
        db.Index('idx_notification_created', 'created_at'),  # Index for sorting
    )

    id = db.Column(db.Integer, primary_key=True)
    user_email = db.Column(db.String(120), nullable=False, index=True)  # Added index
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'approval_request', 'status_update', 'completion', etc.
    related_submission_id = db.Column(db.String(36), nullable=True, index=True)  # Added index
    read = db.Column(db.Boolean, default=False, index=True)  # Added index
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    action_url = db.Column(db.String(500), nullable=True)

    # Changed 'type' to 'notification_type' and 'related_submission_id' to 'submission_id' in to_dict for clarity
    def to_dict(self):
        """Convert notification to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'notification_type': self.type,
            'read': self.read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'action_url': self.action_url,
            'submission_id': self.related_submission_id
        }

    @staticmethod
    def create_notification(user_email, title, message, notification_type, submission_id=None, action_url=None):
        """Create a new notification for a user"""
        notification = Notification(
            user_email=user_email,
            title=title,
            message=message,
            type=notification_type,
            related_submission_id=submission_id,
            action_url=action_url
        )
        db.session.add(notification)
        db.session.commit()
        return notification

    @staticmethod
    def get_recent_notifications(user_email, limit=10):
        """Get recent notifications for a user"""
        return Notification.query.filter_by(user_email=user_email)\
                                .order_by(Notification.created_at.desc())\
                                .limit(limit).all()

    @staticmethod
    def get_unread_count(user_email):
        """Get count of unread notifications for a user"""
        return Notification.query.filter_by(user_email=user_email, read=False).count()

    def __repr__(self):
        return f'<Notification {self.id}: {self.title}>'