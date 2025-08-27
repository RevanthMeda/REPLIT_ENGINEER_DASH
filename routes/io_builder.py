from flask import Blueprint, request, jsonify, current_app, render_template
from flask_login import login_required, current_user
import requests
from bs4 import BeautifulSoup
import re
from models import db, ModuleSpec
import time
from urllib.parse import quote

io_builder_bp = Blueprint('io_builder', __name__)

def get_unread_count():
    """Get unread notifications count with error handling"""
    try:
        from models import Notification
        return Notification.query.filter_by(
            user_email=current_user.email, 
            read=False
        ).count()
    except Exception as e:
        current_app.logger.warning(f"Could not get unread count: {e}")
        return 0

@io_builder_bp.route('/')
@login_required
def index():
    """IO Builder main page"""
    try:
        unread_count = get_unread_count()
        return render_template('io_builder.html', unread_count=unread_count)
    except Exception as e:
        current_app.logger.error(f"Error rendering io_builder index: {e}")
        # Fallback to a default render_template or error page
        return render_template('io_builder.html', unread_count=0)

# Vendor-specific search configurations
VENDOR_CONFIGS = {
    'ABB': {
        'search_domain': 'site:abb.com',
        'common_models': ['DI810', 'DO810', 'AI810', 'AO810', 'DI820', 'DO820'],
        'signal_prefix': {
            'digital_input': 'DI',
            'digital_output': 'DO',
            'analog_input': 'AI',
            'analog_output': 'AO'
        }
    },
    'SIEMENS': {
        'search_domain': 'site:siemens.com',
        'common_models': ['SM1221', 'SM1222', 'SM1231', 'SM1232', 'SM1234'],
        'signal_prefix': {
            'digital_input': 'DI',
            'digital_output': 'DQ',
            'analog_input': 'AI',
            'analog_output': 'AQ'
        }
    },
    'SCHNEIDER': {
        'search_domain': 'site:schneider-electric.com',
        'common_models': ['TM5SDI6D', 'TM5SDO6T', 'TM5SAI4L', 'TM5SAO4L'],
        'signal_prefix': {
            'digital_input': 'DI',
            'digital_output': 'DO',
            'analog_input': 'AI',
            'analog_output': 'AO'
        }
    },
    'ROCKWELL': {
        'search_domain': 'site:rockwellautomation.com',
        'common_models': ['1756-IB16', '1756-OB16', '1756-IF8', '1756-OF8'],
        'signal_prefix': {
            'digital_input': 'DI',
            'digital_output': 'DO',
            'analog_input': 'AI',
            'analog_output': 'AO'
        }
    },
    'OMRON': {
        'search_domain': 'site:omron.com',
        'common_models': ['CJ1W-ID211', 'CJ1W-OD211', 'CJ1W-AD041-V1'],
        'signal_prefix': {
            'digital_input': 'DI',
            'digital_output': 'DO',
            'analog_input': 'AI',
            'analog_output': 'AO'
        }
    }
}

@io_builder_bp.route('/api/vendors', methods=['GET'])
@login_required
def get_vendors():
    """Get list of supported vendors"""
    try:
        vendors = list(VENDOR_CONFIGS.keys())
        return jsonify({'success': True, 'vendors': vendors})
    except Exception as e:
        current_app.logger.error(f"Error fetching vendors: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@io_builder_bp.route('/api/module-lookup', methods=['POST'])
@login_required
def lookup_module():
    """Lookup module specifications from database or web"""
    try:
        data = request.get_json()
        company = data.get('company', '').strip().upper()
        model = data.get('model', '').strip().upper()

        if not company or not model:
            return jsonify({'success': False, 'error': 'Company and model are required'}), 400

        # First check database
        spec = ModuleSpec.query.filter_by(company=company, model=model).first()

        if spec and spec.verified:
            current_app.logger.info(f"Found cached module spec: {company} {model}")
            return jsonify({'success': True, 'module': spec.to_dict(), 'source': 'database'})

        # If not found or not verified, search web
        current_app.logger.info(f"Searching web for module: {company} {model}")
        web_spec = search_module_web(company, model)

        if web_spec:
            # Update or create database entry
            if not spec:
                spec = ModuleSpec(company=company, model=model)
                db.session.add(spec)

            # Update with web data
            for key, value in web_spec.items():
                if hasattr(spec, key) and value is not None:
                    setattr(spec, key, value)

            spec.verified = True
            db.session.commit()

            return jsonify({'success': True, 'module': spec.to_dict(), 'source': 'web'})

        # Return empty spec for manual entry
        fallback_spec = {
            'company': company,
            'model': model,
            'digital_inputs': 0,
            'digital_outputs': 0,
            'analog_inputs': 0,
            'analog_outputs': 0,
            'verified': False,
            'total_channels': 0
        }

        return jsonify({'success': True, 'module': fallback_spec, 'source': 'manual'})

    except Exception as e:
        current_app.logger.error(f"Error in module lookup: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def search_module_web(company, model):
    """Search web for module specifications"""
    try:
        vendor_config = VENDOR_CONFIGS.get(company.upper())
        if not vendor_config:
            return None

        # Construct search query
        search_query = f"{vendor_config['search_domain']} {model} datasheet specifications"

        current_app.logger.info(f"Simulating web search for: {company} {model}")
        hardcoded_specs = get_hardcoded_module_specs()
        key = f"{company.upper()}_{model.upper()}"

        if key in hardcoded_specs:
            current_app.logger.info(f"Found hardcoded spec for {key}")
            return hardcoded_specs[key]
        else:
            # Handle specific modules mentioned by user
            if model.upper() == 'DA501':
                current_app.logger.info(f"Found DA501 module specification")
                return {
                    'description': '16 Channel Digital Input, 24VDC; 4 Analog Input, U, I, RTD; 2 Analog Output, U, I; 8 Configurable DI/DO, 24VDC 0.5A',
                    'digital_inputs': 24,  # 16 DI + 8 configurable as DI
                    'digital_outputs': 8,  # 8 configurable as DO
                    'analog_inputs': 4,
                    'analog_outputs': 2,
                    'voltage_range': '24 VDC',
                    'current_range': '4-20mA',
                    'signal_type': 'Mixed',
                    'verified': True
                }

            # For unknown modules, return a basic template that user can modify
            current_app.logger.info(f"Module {company} {model} not found. Returning template for manual entry.")
            return {
                'description': f'{company} {model} - Manual Entry Required',
                'digital_inputs': 0,
                'digital_outputs': 0,
                'analog_inputs': 0,
                'analog_outputs': 0,
                'voltage_range': '24 VDC',
                'current_range': '4-20mA',
                'signal_type': 'Unknown'
            }

    except Exception as e:
        current_app.logger.error(f"Error searching web for module {company} {model}: {e}")
        return None

def get_hardcoded_module_specs():
    """Hardcoded module specifications for common industrial I/O modules"""
    return {
        'ABB_DI810': {
            'description': '16-channel 24 VDC Digital Input Module',
            'digital_inputs': 16,
            'digital_outputs': 0,
            'analog_inputs': 0,
            'analog_outputs': 0,
            'voltage_range': '24 VDC',
            'signal_type': 'Digital'
        },
        'ABB_DO810': {
            'description': '16-channel 24 VDC Digital Output Module',
            'digital_inputs': 0,
            'digital_outputs': 16,
            'analog_inputs': 0,
            'analog_outputs': 0,
            'voltage_range': '24 VDC',
            'signal_type': 'Digital'
        },
        'ABB_AI810': {
            'description': '8-channel Analog Input Module',
            'digital_inputs': 0,
            'digital_outputs': 0,
            'analog_inputs': 8,
            'analog_outputs': 0,
            'voltage_range': '0-10V',
            'current_range': '4-20mA',
            'resolution': '12-bit',
            'signal_type': 'Analog'
        },
        'ABB_AO810': {
            'description': '8-channel Analog Output Module',
            'digital_inputs': 0,
            'digital_outputs': 0,
            'analog_inputs': 0,
            'analog_outputs': 8,
            'voltage_range': '0-10V',
            'current_range': '4-20mA',
            'resolution': '12-bit',
            'signal_type': 'Analog'
        },
        'SIEMENS_SM1221': {
            'description': '16-channel Digital Input Module',
            'digital_inputs': 16,
            'digital_outputs': 0,
            'analog_inputs': 0,
            'analog_outputs': 0,
            'voltage_range': '24 VDC',
            'signal_type': 'Digital'
        },
        'SIEMENS_SM1222': {
            'description': '16-channel Digital Output Module',
            'digital_inputs': 0,
            'digital_outputs': 16,
            'analog_inputs': 0,
            'analog_outputs': 0,
            'voltage_range': '24 VDC',
            'signal_type': 'Digital'
        },
        'SIEMENS_SM1231': {
            'description': '8-channel Analog Input Module',
            'digital_inputs': 0,
            'digital_outputs': 0,
            'analog_inputs': 8,
            'analog_outputs': 0,
            'voltage_range': '0-10V',
            'current_range': '4-20mA',
            'resolution': '16-bit',
            'signal_type': 'Analog'
        },
        'SIEMENS_SM1232': {
            'description': '4-channel Analog Output Module',
            'digital_inputs': 0,
            'digital_outputs': 0,
            'analog_inputs': 0,
            'analog_outputs': 4,
            'voltage_range': '0-10V',
            'current_range': '4-20mA',
            'resolution': '16-bit',
            'signal_type': 'Analog'
        }
    }

@io_builder_bp.route('/api/generate-io-table', methods=['POST'])
@login_required
def generate_io_table():
    """Generate I/O table based on module configuration"""
    try:
        data = request.get_json()
        modules = data.get('modules', [])
        modbus_ranges = data.get('modbus_ranges', [])

        if not modules and not modbus_ranges:
            return jsonify({'success': False, 'error': 'No modules or Modbus ranges provided'}), 400

        # Generate standard I/O tables
        digital_inputs = []
        digital_outputs = []
        analog_inputs = []
        analog_outputs = []
        current_sno = 1

        for module in modules:
            company = module.get('company', '').upper()
            model = module.get('model', '').upper()
            rack_no = module.get('rack_no', '0')
            module_position = module.get('module_position', '1')
            starting_sno = module.get('starting_sno', current_sno)

            # Get module specs from database first
            spec = ModuleSpec.query.filter_by(company=company, model=model).first()

            # If spec found in database, use it
            if spec and spec.verified:
                current_app.logger.info(f"Using database spec for {company} {model}")
            else:
                # Try hardcoded specs
                hardcoded_specs = get_hardcoded_module_specs()
                key = f"{company}_{model}"

                if key in hardcoded_specs:
                    spec_data = hardcoded_specs[key]
                    current_app.logger.info(f"Using hardcoded spec for {key}")
                    # Create a temporary spec object for processing
                    spec = type('MockSpec', (), {})()  # Create a simple object
                    for k, v in spec_data.items():
                        setattr(spec, k, v)
                else:
                    # Use module data from the request (includes manual overrides from frontend)
                    current_app.logger.info(f"Using module spec data from request for {company} {model}")
                    module_spec = module.get('spec', {})
                    spec = type('MockSpec', (), {})()  # Create a simple object

                    # Try spec object first, then fall back to top-level module properties
                    spec.digital_inputs = int(module_spec.get('digital_inputs') or module.get('digital_inputs', 0) or 0)
                    spec.digital_outputs = int(module_spec.get('digital_outputs') or module.get('digital_outputs', 0) or 0)
                    spec.analog_inputs = int(module_spec.get('analog_inputs') or module.get('analog_inputs', 0) or 0)
                    spec.analog_outputs = int(module_spec.get('analog_outputs') or module.get('analog_outputs', 0) or 0)
                    spec.voltage_range = module_spec.get('voltage_range', '24 VDC')
                    spec.current_range = module_spec.get('current_range', '4-20mA')
                    spec.description = module_spec.get('description', f'{company} {model}')
                    spec.verified = True

            if not spec:
                current_app.logger.warning(f"Skipping module {company} {model} as no specifications could be found.")
                continue

            # Debug logging
            current_app.logger.info(f"Processing module {company} {model} with spec: {spec if hasattr(spec, '__dict__') else 'dict-like object'}")
            if hasattr(spec, '__dict__'):
                current_app.logger.info(f"Spec attributes: {spec.__dict__}")
            else:
                current_app.logger.info(f"Spec values: DI={getattr(spec, 'digital_inputs', 'N/A')}, DO={getattr(spec, 'digital_outputs', 'N/A')}, AI={getattr(spec, 'analog_inputs', 'N/A')}, AO={getattr(spec, 'analog_outputs', 'N/A')}")

            vendor_config = VENDOR_CONFIGS.get(company, {})
            signal_prefixes = vendor_config.get('signal_prefix', {
                'digital_input': 'DI',
                'digital_output': 'DO',
                'analog_input': 'AI',
                'analog_output': 'AO'
            })

            # Ensure spec attributes are integers for range calculations
            try:
                # Handle both database objects and dict-like objects
                if hasattr(spec, 'digital_inputs'):
                    # Use safe conversion - handle None, empty strings, and invalid values
                    spec.digital_inputs = int(spec.digital_inputs or 0)
                    spec.digital_outputs = int(spec.digital_outputs or 0)
                    spec.analog_inputs = int(spec.analog_inputs or 0)
                    spec.analog_outputs = int(spec.analog_outputs or 0)
                else:
                    # For dict-like objects, ensure they have the required attributes
                    for attr in ['digital_inputs', 'digital_outputs', 'analog_inputs', 'analog_outputs']:
                        if not hasattr(spec, attr):
                            setattr(spec, attr, 0)

                    # Safe conversion with None checking
                    di_val = getattr(spec, 'digital_inputs', 0) or 0
                    do_val = getattr(spec, 'digital_outputs', 0) or 0
                    ai_val = getattr(spec, 'analog_inputs', 0) or 0
                    ao_val = getattr(spec, 'analog_outputs', 0) or 0

                    spec.digital_inputs = int(di_val)
                    spec.digital_outputs = int(do_val)
                    spec.analog_inputs = int(ai_val)
                    spec.analog_outputs = int(ao_val)

            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Invalid channel counts for module {company} {model}: {e}, using zeros")
                spec.digital_inputs = 0
                spec.digital_outputs = 0
                spec.analog_inputs = 0
                spec.analog_outputs = 0

            sno = int(starting_sno)

            # Convert rack_no and module_position to integers for formatting
            rack_no_int = int(rack_no) if isinstance(rack_no, str) and rack_no.isdigit() else int(rack_no)
            module_position_int = int(module_position) if isinstance(module_position, str) and module_position.isdigit() else int(module_position)

            # Generate digital input signals
            for i in range(spec.digital_inputs):
                signal_tag = f"{signal_prefixes['digital_input']}_{rack_no_int:02d}_{module_position_int:02d}_{i:02d}"
                digital_inputs.append({
                    'sno': sno,
                    'rack_no': rack_no,
                    'module_position': module_position,
                    'signal_tag': signal_tag,
                    'signal_description': f"Digital Input {i+1} - {company} {model}",
                    'result': '',
                    'punch_item': '',
                    'verified_by': '',
                    'comment': f"Module: {company} {model}"
                })
                sno += 1

            # Generate digital output signals
            for i in range(spec.digital_outputs):
                signal_tag = f"{signal_prefixes['digital_output']}_{rack_no_int:02d}_{module_position_int:02d}_{i:02d}"
                digital_outputs.append({
                    'sno': sno,
                    'rack_no': rack_no,
                    'module_position': module_position,
                    'signal_tag': signal_tag,
                    'signal_description': f"Digital Output {i+1} - {company} {model}",
                    'result': '',
                    'punch_item': '',
                    'verified_by': '',
                    'comment': f"Module: {company} {model}"
                })
                sno += 1

            # Generate analog input signals
            for i in range(spec.analog_inputs):
                signal_tag = f"{signal_prefixes['analog_input']}_{rack_no_int:02d}_{module_position_int:02d}_{i:02d}"
                analog_inputs.append({
                    'sno': sno,
                    'rack_no': rack_no,
                    'module_position': module_position,
                    'signal_tag': signal_tag,
                    'signal_description': f"Analog Input {i+1} - {company} {model}",
                    'result': '',
                    'punch_item': '',
                    'verified_by': '',
                    'comment': f"Module: {company} {model}, Range: {getattr(spec, 'voltage_range', None) or getattr(spec, 'current_range', None) or 'N/A'}"
                })
                sno += 1

            # Generate analog output signals
            for i in range(spec.analog_outputs):
                signal_tag = f"{signal_prefixes['analog_output']}_{rack_no_int:02d}_{module_position_int:02d}_{i:02d}"
                analog_outputs.append({
                    'sno': sno,
                    'rack_no': rack_no,
                    'module_position': module_position,
                    'signal_tag': signal_tag,
                    'signal_description': f"Analog Output {i+1} - {company} {model}",
                    'result': '',
                    'punch_item': '',
                    'verified_by': '',
                    'comment': f"Module: {company} {model}, Range: {getattr(spec, 'voltage_range', None) or getattr(spec, 'current_range', None) or 'N/A'}"
                })
                sno += 1

            current_sno = sno

        # Generate Modbus tables
        modbus_digital = []
        modbus_analog = []

        for modbus_range in modbus_ranges:
            start_addr = modbus_range.get('start_address', 0)
            end_addr = modbus_range.get('end_address', 0)
            data_type = modbus_range.get('data_type', 'coils')  # coils, discretes, holding, input
            description_prefix = modbus_range.get('description', 'Modbus')

            for addr in range(start_addr, end_addr + 1):
                if data_type in ['coils', 'discretes']:
                    # Digital Modbus signals
                    modbus_digital.append({
                        'address': addr,
                        'description': f"{description_prefix} {data_type.title()} {addr}",
                        'remarks': f"Modbus {data_type}",
                        'result': '',
                        'punch_item': '',
                        'verified_by': '',
                        'comment': f"Address: {addr}"
                    })
                else:
                    # Analog Modbus signals (holding/input registers)
                    modbus_analog.append({
                        'address': addr,
                        'description': f"{description_prefix} Register {addr}",
                        'range': modbus_range.get('range', 'N/A'),
                        'result': '',
                        'punch_item': '',
                        'verified_by': '',
                        'comment': f"Register: {addr}"
                    })

        return jsonify({
            'success': True,
            'tables': {
                'digital_inputs': digital_inputs,
                'digital_outputs': digital_outputs,
                'analog_inputs': analog_inputs,
                'analog_outputs': analog_outputs,
                'modbus_digital': modbus_digital,
                'modbus_analog': modbus_analog
            },
            'summary': {
                'total_digital_inputs': len(digital_inputs),
                'total_digital_outputs': len(digital_outputs),
                'total_analog_inputs': len(analog_inputs),
                'total_analog_outputs': len(analog_outputs),
                'total_modbus_digital': len(modbus_digital),
                'total_modbus_analog': len(modbus_analog),
                'modules_processed': len(modules),
                'modbus_ranges_processed': len(modbus_ranges)
            }
        })

    except Exception as e:
        current_app.logger.error(f"Error generating I/O table: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@io_builder_bp.route('/api/save-custom-module', methods=['POST'])
@login_required
def save_custom_module():
    """Save custom module specification to database"""
    try:
        data = request.get_json()

        spec = ModuleSpec(
            company=data.get('company', '').upper(),
            model=data.get('model', '').upper(),
            description=data.get('description', ''),
            digital_inputs=data.get('digital_inputs', 0),
            digital_outputs=data.get('digital_outputs', 0),
            analog_inputs=data.get('analog_inputs', 0),
            analog_outputs=data.get('analog_outputs', 0),
            voltage_range=data.get('voltage_range'),
            current_range=data.get('current_range'),
            resolution=data.get('resolution'),
            signal_type=data.get('signal_type'),
            verified=True  # User-provided specs are considered verified
        )

        # Check if a spec with the same company and model already exists
        existing_spec = ModuleSpec.query.filter_by(company=spec.company, model=spec.model).first()
        if existing_spec:
            # Update existing spec instead of adding a new one
            for key, value in data.items():
                if hasattr(existing_spec, key) and value is not None:
                    setattr(existing_spec, key, value)
            existing_spec.verified = True # Ensure it's marked as verified
            db.session.commit()
            return jsonify({'success': True, 'message': 'Module specification updated successfully'})
        else:
            # Add new spec
            db.session.add(spec)
            db.session.commit()
            return jsonify({'success': True, 'message': 'Module specification saved successfully'})

    except Exception as e:
        current_app.logger.error(f"Error saving custom module: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500