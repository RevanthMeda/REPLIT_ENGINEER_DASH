# Overview

The SAT Report Generator is a comprehensive Flask-based web application designed for creating, managing, and approving System Acceptance Testing (SAT) reports for Cully Automation. The application features a complete user account system with role-based access control, multi-stage approval workflows, and database persistence for all report data.

The system supports four user roles (Admin, Engineer, Technical Manager, Project Manager) with distinct capabilities and dashboards. Engineers create reports, Technical Managers review them, Project Managers provide final approval, and Admins manage the entire system including user accounts and system settings.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Template Engine**: Jinja2 templating with a hierarchical structure using base templates (base.html, base_dashboard.html, admin_base.html)
- **UI Framework**: Custom CSS with Font Awesome icons and Inter font family
- **Component Structure**: Modular dashboard layouts with role-specific views and shared navigation components
- **Responsive Design**: CSS-based responsive layouts with support for mobile and tablet devices
- **Interactive Elements**: JavaScript-based signature pads, form validation, and AJAX for dynamic updates

## Backend Architecture
- **Framework**: Flask with Blueprint-based modular organization
- **Authentication**: Flask-Login with role-based access control and CSRF protection
- **Database ORM**: SQLAlchemy for database operations with lazy loading optimizations
- **Security**: Password hashing with Werkzeug, session management, and CSRF tokens
- **File Handling**: Document generation using python-docx and docxtpl for Word documents
- **Email Integration**: SMTP-based email notifications for approval workflows

## Database Design
- **User Management**: User table with roles, status tracking, and account lifecycle management
- **Report Storage**: Separate tables for Report metadata and SATReport data with JSON storage for complex form data
- **Notification System**: Database-backed notifications with read/unread status tracking
- **System Settings**: Key-value configuration storage for application settings
- **Approval Workflows**: JSON-based approval tracking with stage management and signature storage

## Role-Based Access Control
- **Admin**: Full system access, user management, system settings, database monitoring
- **Engineer**: Report creation, personal report management, form submissions
- **Technical Manager**: Report review capabilities, approval workflow participation
- **Project Manager**: Final approval authority, project oversight capabilities
- **Access Decorators**: Custom decorators for route protection and role enforcement

## Document Processing Pipeline
- **Template Engine**: DocxTemplate for Word document generation from templates
- **Data Processing**: JSON-based form data storage with table row processing utilities
- **File Management**: Secure file upload handling with signature image processing
- **Export Capabilities**: Word document generation with optional PDF conversion (Windows-specific)

# External Dependencies

## Core Framework Dependencies
- **Flask 2.2.3**: Web framework with Werkzeug 2.2.3
- **Flask-Login**: User session management and authentication
- **Flask-SQLAlchemy**: Database ORM and connection management
- **Flask-WTF 1.1.1**: CSRF protection and form handling

## Database Systems
- **PostgreSQL**: Production database with psycopg2-binary driver
- **SQLite**: Development and testing database (fallback option)

## Document Processing
- **python-docx**: Word document manipulation and generation
- **docxtpl 0.16.7**: Template-based document generation
- **Pillow 10.4.0+**: Image processing for signatures and assets

## Windows-Specific Integration
- **pywin32 307+**: Windows COM integration for advanced document processing
- **Platform Detection**: Conditional imports for Windows-only features

## Email and Communication
- **SMTP Integration**: Built-in Python smtplib for email notifications
- **HTML Email Support**: Email message formatting with embedded templates

## Security and Configuration
- **python-dotenv 1.0.0**: Environment variable management
- **itsdangerous**: Secure token generation and verification
- **werkzeug.security**: Password hashing and security utilities

## Web Scraping and External Data
- **BeautifulSoup4**: HTML parsing for I/O Builder component lookup
- **Requests**: HTTP client for external API integration

## Development and Testing
- **Environment Configuration**: Separate development/production configurations
- **Logging Integration**: Built-in Python logging with configurable levels
- **Error Handling**: Comprehensive exception handling with user-friendly error pages