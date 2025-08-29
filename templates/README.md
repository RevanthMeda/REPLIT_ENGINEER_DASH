# Templates Directory Structure

## Overview
This directory contains all HTML templates for the Cully SAT Report Generator application. The templates use Jinja2 templating engine with a hierarchical structure for maintainability and reusability.

## Template Hierarchy

### Base Templates
- **`base_unified.html`** - Main base template that all other templates extend from
  - Contains core layout structure, navigation, and JavaScript
  - Includes CSRF protection and user authentication checks
  - Defines blocks for: title, body_class, navigation, content_header, content, footer, extra_css, extra_js

### Utility Templates
- **`macros.html`** - Reusable Jinja2 macros for common UI components
  - `render_flash_messages()` - Display flash messages
  - `nav_link()` - Navigation link component
  - `user_avatar()` - User avatar display
  - `status_badge()` - Status indicator badges
  - `stat_card()` - Statistics card component
  - `widget_card()` - Widget container
  - `action_card()` - Action button cards
  - `empty_state()` - Empty state placeholder
  - `data_table()` - Table wrapper
  - `form_field()` - Form input component
  - `modal()` - Modal dialog component

### Dashboard Templates
- **`engineer_dashboard.html`** - Engineer role dashboard (extends base_unified.html)
- **`tm_dashboard.html`** - Technical Manager dashboard (extends base_unified.html)
- **`pm_dashboard.html`** - Project Manager dashboard (extends base_unified.html)
- **`admin_dashboard.html`** - Administrator dashboard (extends base_unified.html)

### Authentication Templates
- **`login.html`** - User login page
- **`register.html`** - New user registration
- **`register_confirmation.html`** - Registration success page
- **`forgot_password.html`** - Password reset request
- **`change_password.html`** - Change password form
- **`welcome.html`** - Welcome landing page

### Report Templates
- **`SAT.html`** - SAT report form (main multi-step form)
- **`sat_wizard.html`** - SAT report wizard interface
- **`report_selector.html`** - Report type selection page
- **`my_reports.html`** - User's reports list
- **`admin_reports.html`** - Admin view of all reports
- **`approve.html`** - Report approval interface
- **`pending_approval.html`** - List of pending approvals
- **`status.html`** - Report status view
- **`submissions_list.html`** - All submissions view

### System Templates
- **`user_management.html`** - User administration interface
- **`system_settings.html`** - System configuration page
- **`notification_center.html`** - Notifications interface
- **`io_builder.html`** - I/O Builder tool interface

### Error Templates
- **`404.html`** - Page not found error
- **`csrf_error.html`** - CSRF token error page

### Document Templates
- **`SAT_Template.docx`** - Word template for SAT report generation

## Usage Examples

### Extending Base Template
```jinja2
{% extends "base_unified.html" %}
{% import 'macros.html' as macros %}

{% block title %}Page Title{% endblock %}

{% block content %}
  <!-- Page content here -->
{% endblock %}
```

### Using Macros
```jinja2
{{ macros.stat_card('users', user_count, 'Total Users') }}
{{ macros.action_button(url_for('reports.new'), 'Create Report', 'plus-circle') }}
```

### Adding Custom CSS/JS
```jinja2
{% block extra_css %}
  <link rel="stylesheet" href="{{ url_for('static', filename='css/custom.css') }}">
{% endblock %}

{% block extra_js %}
  <script src="{{ url_for('static', filename='js/custom.js') }}"></script>
{% endblock %}
```

## Template Conventions

1. **Naming**: Use lowercase with underscores for template files
2. **Extensions**: Always extend from `base_unified.html` for consistency
3. **Macros**: Use macros from `macros.html` for repeated UI components
4. **Blocks**: Use appropriate blocks for content placement
5. **Static Files**: Reference static files using `url_for('static', filename='...')`
6. **CSRF**: All forms must include CSRF token protection
7. **User Context**: Check `current_user.is_authenticated` before showing user-specific content

## Maintenance Notes

- Regularly review and remove unused templates
- Keep macros.html updated with new reusable components
- Ensure all templates follow the same styling conventions
- Test templates across different user roles and screen sizes
- Validate HTML output for accessibility compliance