# SAT Report Generator - Cully Automation (Phase 1b)

A comprehensive Flask-based web application for generating System Acceptance Testing (SAT) reports with **complete user account system, admin approvals, role-based dashboards, and database persistence**.

## 🚀 New Features (Phase 1b)

### User Account System
- **User Registration**: New users can register with role requests (Engineer/TM/PM)
- **Admin Approval Workflow**: Pending users await admin approval before activation
- **Role-Based Access Control**: Admin, Engineer, Technical Manager, Project Manager roles
- **Secure Authentication**: Password hashing, session management, CSRF protection
- **Database Persistence**: User accounts and settings stored in PostgreSQL/SQLite

### Role-Based Dashboards
- **Admin Dashboard**: User management, system settings, database status monitoring
- **Engineer Dashboard**: Create reports, view personal reports (placeholder)
- **Technical Manager Dashboard**: Assigned reviews (placeholder)
- **Project Manager Dashboard**: Final approvals (placeholder)

### User Management (Admin Only)
- **User Approval**: Approve pending registrations and assign roles
- **User Control**: Enable/disable user accounts
- **Role Assignment**: Change user roles (Admin/Engineer/TM/PM)
- **User Filtering**: Filter by status (All/Pending/Active/Disabled)

### System Settings (Admin Only)
- **Company Logo Management**: View current logo (update coming soon)
- **Storage Configuration**: Set default report storage location
- **Database Status**: Real-time connection monitoring
- **Theme Consistency**: Maintains existing visual design

## 📋 Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Configuration](#configuration)
3. [User Roles & Permissions](#user-roles--permissions)
4. [User Journey](#user-journey)
5. [Database Schema](#database-schema)
6. [Application Structure](#application-structure)
7. [Security Features](#security-features)
8. [API Endpoints](#api-endpoints)
9. [Deployment](#deployment)

## 🛠 Installation & Setup

### Prerequisites
- Python 3.7+
- PostgreSQL (recommended) or SQLite (development)
- Windows (for PDF export functionality)
- SMTP email account for notifications

### Quick Start
```bash
# Clone the repository
git clone <your-repo-url>
cd sat-report-generator

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configurations

# Run the application
python app.py
```

### Dependencies
```
Flask==2.3.3
Flask-WTF==1.1.1
Flask-SQLAlchemy==3.0.5
Flask-Login==0.6.2
Werkzeug==2.3.7
psycopg2-binary==2.9.7
python-docx==0.8.11
docxtpl==0.16.7
Pillow==10.0.1
python-dotenv==1.0.0
pywin32==306  # Windows only
```

## ⚙️ Configuration

### Environment Variables (.env)
```env
# Flask Configuration
SECRET_KEY=your-secret-key-here
CSRF_SECRET_KEY=your-csrf-secret-key
FLASK_DEBUG=True

# Database Configuration
DATABASE_URL=postgresql://postgres:password@host:5432/database
# For development: DATABASE_URL=sqlite:///sat_reports.db

# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
DEFAULT_SENDER=your-email@gmail.com

# Default Approvers
APPROVER_1=techlead@company.com
APPROVER_2=projectmanager@company.com

# Optional Features
ENABLE_PDF_EXPORT=True
ENABLE_EMAIL_NOTIFICATIONS=True
```

## 👥 User Roles & Permissions

### Admin
- **Full Access**: User management, system settings, database monitoring
- **User Approval**: Approve/disable users, assign roles
- **System Configuration**: Company logo, storage settings
- **Database Status**: Monitor connection health

### Engineer
- **Report Creation**: Access to SAT report generator
- **Personal Reports**: View own reports (placeholder)
- **Limited Access**: Cannot access admin or other users' content

### Technical Manager (TM)
- **Review Access**: Reports assigned for technical review (placeholder)
- **Limited Scope**: Only assigned items visible

### Project Manager (PM)
- **Final Approvals**: Reports assigned for final approval (placeholder)
- **Project Oversight**: Limited to assigned projects

## 🔄 User Journey

### 1. Welcome Page
- New users see "Welcome to Cully SAT Report Generator"
- Options: Register or Log In
- Features overview

### 2. Registration Process
```
User fills registration form → 
Request submitted → 
Admin receives notification → 
Admin approves & assigns role → 
User can log in → 
Redirected to role dashboard
```

### 3. Login Process
```
User enters credentials → 
Status check:
├── Pending → Pending approval page
├── Disabled → Error message
└── Active → Role-based dashboard
```

### 4. Role-Based Experience
- **Admin**: User management, system configuration
- **Engineer**: Report creation, personal dashboard
- **TM**: Review assignments (placeholder)
- **PM**: Final approvals (placeholder)

## 🗄 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20),  -- Admin, Engineer, TM, PM
    status VARCHAR(20) DEFAULT 'Pending',  -- Pending, Active, Disabled
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    requested_role VARCHAR(20)
);
```

### System Settings Table
```sql
CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Default Data
- **Admin User**: admin@cully.ie / admin123 (created automatically)
- **Default Settings**: Company logo, storage location

## 🏗 Application Structure

### Flask Application (app.py)
- **Database Integration**: SQLAlchemy with PostgreSQL/SQLite
- **Authentication**: Flask-Login with role-based access
- **CSRF Protection**: Global CSRF token management
- **Blueprint Architecture**: Modular route organization

### File Structure
```
SAT_Report_App/
├── app.py                    # Main Flask application with auth
├── models.py                 # Database models (User, SystemSettings)
├── auth.py                   # Authentication utilities
├── config.py                 # Configuration with database settings
├── routes/                   # Blueprint routes
│   ├── auth.py              # Authentication routes
│   ├── dashboard.py         # Role-based dashboards
│   ├── main.py              # SAT form (protected)
│   ├── approval.py          # Approval workflow
│   └── status.py            # Status tracking
├── templates/               # HTML templates
│   ├── welcome.html         # Welcome page
│   ├── register.html        # User registration
│   ├── login.html           # User login
│   ├── admin_dashboard.html # Admin dashboard
│   ├── engineer_dashboard.html # Engineer dashboard
│   ├── tm_dashboard.html    # TM dashboard
│   ├── pm_dashboard.html    # PM dashboard
│   ├── user_management.html # User management
│   ├── system_settings.html # System settings
│   └── ... (existing templates)
└── ... (existing structure)
```

### Navigation System
- **Top Bar**: Logo, app title, user info, database status, logout
- **Role-Aware Sidebar**: 
  - Admin: Home, User Management, System Settings, All Reports
  - Engineer: Home, My Reports, Create Report
  - TM: Home, Assigned Reviews
  - PM: Home, Final Approvals

## 🔒 Security Features

### Authentication & Authorization
- **Password Hashing**: Werkzeug secure password hashing
- **Session Management**: Flask-Login user sessions
- **Role-Based Access**: Decorators for route protection
- **CSRF Protection**: Comprehensive form protection

### Database Security
- **Connection Pooling**: SQLAlchemy engine configuration
- **SQL Injection Protection**: ORM-based queries
- **Environment Variables**: Sensitive data in .env

### Access Control
- **Login Required**: Protected routes require authentication
- **Role Validation**: Role-specific route access
- **Status Checking**: Active user validation
- **Admin Protection**: Admin-only functionality secured

## 🌐 API Endpoints

### Authentication Routes
```
GET  /auth/welcome           - Welcome page
GET  /auth/register         - Registration form
POST /auth/register         - Process registration
GET  /auth/login           - Login form
POST /auth/login           - Process login
GET  /auth/logout          - User logout
GET  /auth/pending         - Pending approval page
```

### Dashboard Routes
```
GET  /dashboard/           - Role-based dashboard redirect
GET  /dashboard/admin      - Admin dashboard
GET  /dashboard/engineer   - Engineer dashboard
GET  /dashboard/technical-manager - TM dashboard
GET  /dashboard/project-manager   - PM dashboard
```

### Admin Routes
```
GET  /dashboard/user-management   - User management page
POST /dashboard/approve-user/<id> - Approve user
POST /dashboard/disable-user/<id> - Disable user
POST /dashboard/enable-user/<id>  - Enable user
GET  /dashboard/system-settings   - System settings page
POST /dashboard/update-settings   - Update settings
```

### Protected SAT Routes
```
GET  /form                 - SAT form (login required)
POST /generate            - Generate report (login required)
```

## 📊 Database Status Monitoring

### Connection Health
- **Real-time Status**: Database connectivity check
- **Admin Dashboard**: Visual status indicator
- **Error Handling**: Graceful degradation when disconnected

### Status Indicators
- **Connected** (Green): Database operational
- **Not Connected** (Amber): Database unavailable
- **Warning Banner**: Configuration guidance

## 🎨 Visual Design Consistency

### Design Principles
- **Preserved Styling**: Maintains existing color scheme, fonts, spacing
- **Component Reuse**: Same buttons, inputs, cards, navigation
- **Theme Compatibility**: Light/dark mode support maintained
- **Responsive Design**: Mobile-friendly layouts

### UI Components
- **Buttons**: Primary, secondary, success, danger variants
- **Forms**: Consistent input styling and validation
- **Cards**: Section cards, stat cards, action cards
- **Navigation**: Top bar, sidebar, breadcrumbs
- **Status Badges**: Color-coded status indicators

## 🚀 Deployment

### Environment Setup
1. **Database**: Configure PostgreSQL connection
2. **Environment Variables**: Set production values
3. **Static Files**: Ensure proper asset serving
4. **Security**: Enable HTTPS, secure cookies

### Production Configuration
```python
# config.py - ProductionConfig
DEBUG = False
SESSION_COOKIE_SECURE = True
DATABASE_URL = 'postgresql://...'  # Production database
```

### Health Checks
- Database connectivity monitoring
- User authentication validation
- Role-based access verification

## 🔄 Migration from Phase 1a

### Backward Compatibility
- **Existing Reports**: All previous SAT reports preserved
- **Approval Workflow**: Previous approval system intact
- **File Structure**: No breaking changes to existing files

### New Requirements
- Users must register and be approved by admin
- SAT form access requires login
- Role assignment determines dashboard access

## 🎯 Phase 1b Acceptance Criteria ✅

- ✅ Registration creates Pending user with confirmation page
- ✅ Admin can approve, assign roles, disable/enable users
- ✅ Pending users cannot log in; Active users can
- ✅ Users land on correct role dashboard after login
- ✅ Navigation is role-aware with access control
- ✅ System settings store logo and storage location
- ✅ Database status badge reflects connection state
- ✅ All pages match existing site colors, fonts, spacing

## 📞 Support & Contact

For technical support or questions about the SAT Report Generator:
- **Development Team**: Cully Automation
- **Documentation**: This README file
- **Issue Reporting**: Contact your system administrator

---

**Note**: This Phase 1b implementation adds complete user management while preserving all existing SAT report functionality. The visual design remains identical to maintain consistency across the application.