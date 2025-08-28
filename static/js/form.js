// Wrapped in an IIFE to prevent global scope pollution
(function() {
  // Track current step
  let currentStep = 1;

  // Define functions first so they can be used
  function goToStep(step) {
    const currentFs = document.getElementById(`step-${currentStep}`);

    // Clear previous validation states
    if (currentFs) {
      currentFs.classList.remove('invalid');
      currentFs.querySelectorAll('.error').forEach(el => el.style.display = 'none');

      if (step > currentStep) {
        if (!currentFs.checkValidity()) {
          currentFs.classList.add('invalid');

          // Show error messages
          currentFs.querySelectorAll(':invalid').forEach(field => {
            const errorEl = field.nextElementSibling;
            if (errorEl && errorEl.classList.contains('error')) {
              errorEl.style.display = 'inline-block';
            }
          });

          currentFs.querySelector(':invalid')?.focus();
          return;
        }
      }
    }

    currentStep = step;

    for (let i = 1; i <= 10; i++) {
      const stepEl = document.getElementById(`step-${i}`);
      const progEl = document.getElementById(`prog-${i}`);
      if (stepEl) stepEl.classList.toggle('active', i === step);
      if (progEl) {
        progEl.classList.toggle('active', i === step);
        progEl.classList.toggle('disabled', i !== step);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    saveState();
  }

  // Define startProcess function
  function startProcess() {
    document.getElementById('welcomePage').style.display = 'none';
    document.getElementById('reportTypePage').style.display = 'block';
  }

  // Function to show SAT form
  function showSATForm() {
    window.location.href = '/reports/new/sat/full';
  }

  // Function to go back to welcome
  function backToWelcome() {
    document.getElementById('reportTypePage').style.display = 'none';
    document.getElementById('welcomePage').style.display = 'block';
  }

  // LOCALSTORAGE STATE PERSISTENCE
  const FORM_KEY = 'satFormState';
  function saveState() {
    const form = document.getElementById('satForm');
    if (!form) return;

    const data = {};
    Array.from(form.elements).forEach(el => {
      if (!el.name || el.type === 'file') return;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
      data[el.name] = el.value;
    });
    localStorage.setItem(FORM_KEY, JSON.stringify(data));
  }

  function loadState() {
    const stored = localStorage.getItem(FORM_KEY);
    if (!stored) return;

    const data = JSON.parse(stored);
    const form = document.getElementById('satForm');
    if (!form) return;

    Object.entries(data).forEach(([name, val]) => {
      const el = form.elements[name];
      if (el) el.value = val;
    });
  }

  function removeRow(button) {
    const row = button.closest('tr');
    if (row) row.remove();
  }

  function addRow(templateId, tbodyId) {
    // Clear any existing message about scrolling first
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    // Remove any text nodes (which contain the scroll messages)
    Array.from(tbody.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE || 
          (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'TR')) {
        tbody.removeChild(node);
      }
    });

    // Now add the new row
    const tpl = document.getElementById(templateId);
    if (!tpl) return;

    const clone = tpl.content.cloneNode(true);
    const row = clone.querySelector('tr');
    if (row) row.classList.add('fade-in');

    tbody.appendChild(clone);
  }

  function setupEventHandlers() {
    // Wire up progress nav clicks
    document.querySelectorAll('.progress-step').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const step = Number(el.id.split('-')[1]);
        goToStep(step);
      });
    });

    // Setup report type selection handlers
    document.addEventListener('click', (e) => {
      // Handle SAT report selection
      if (e.target.closest('[data-report-type="sat"]')) {
        showSATForm();
      }

      // Handle back to welcome button
      if (e.target.closest('#backToWelcomeButton')) {
        backToWelcome();
      }
    });

    setupAddButtons();

    // Setup navigation buttons with delegation
    document.addEventListener('click', (e) => {
      // Next step
      if (e.target.closest('[data-next-step]')) {
        const btn = e.target.closest('[data-next-step]');
        goToStep(parseInt(btn.dataset.nextStep));
      }
      // Previous step
      if (e.target.closest('[data-prev-step]')) {
        const btn = e.target.closest('[data-prev-step]');
        goToStep(parseInt(btn.dataset.prevStep));
      }
      // Remove row
      if (e.target.closest('.remove-row-btn')) {
        const btn = e.target.closest('.remove-row-btn');
        removeRow(btn);
        saveState();
      }
    });

    // Setup file uploads
    setupFileInputs();

    // Save on input change
    document.getElementById('satForm')?.addEventListener('input', saveState);
  }

  function setupAddButtons() {
    const buttonMappings = [
      { btnId: 'add-related-doc-btn', tmplId: 'tmpl-related-doc', tbodyId: 'related-documents-body' },
      { btnId: 'add-pre-approval-btn', tmplId: 'tmpl-pre-approval', tbodyId: 'pre-approvals-body' },
      { btnId: 'add-post-approval-btn', tmplId: 'tmpl-post-approval', tbodyId: 'post-approvals-body' },
      { btnId: 'add-pretest-btn', tmplId: 'tmpl-pretest', tbodyId: 'pretest-body' },
      { btnId: 'add-keycomp-btn', tmplId: 'tmpl-keycomp', tbodyId: 'key-components-body' },
      { btnId: 'add-iprecord-btn', tmplId: 'tmpl-iprecord', tbodyId: 'ip-records-body' },
      { btnId: 'add-digital-signal-btn', tmplId: 'tmpl-digital-signal', tbodyId: 'digital-signals-body' },
      { btnId: 'add-digital-output-btn', tmplId: 'tmpl-digital-output', tbodyId: 'digital-outputs-body' },
      { btnId: 'add-analogue-input-btn', tmplId: 'tmpl-analogue-input', tbodyId: 'analogue-inputs-body' },
      { btnId: 'add-analogue-output-btn', tmplId: 'tmpl-analogue-output', tbodyId: 'analogue-outputs-body' },
      { btnId: 'add-modbus-digital-btn', tmplId: 'tmpl-modbus-digital', tbodyId: 'modbus-digital-body' },
      { btnId: 'add-modbus-analogue-btn', tmplId: 'tmpl-modbus-analogue', tbodyId: 'modbus-analogue-body' },
      { btnId: 'add-process-test-btn', tmplId: 'tmpl-process-test', tbodyId: 'process-test-body' },
      { btnId: 'add-scada-ver-btn', tmplId: 'tmpl-scada-verification', tbodyId: 'scada-verification-body' },
      { btnId: 'add-trends-testing-btn', tmplId: 'tmpl-trends-testing', tbodyId: 'trends-testing-body' },
      { btnId: 'add-alarm-list-btn', tmplId: 'tmpl-alarm-list', tbodyId: 'alarm-body' }
    ];

    buttonMappings.forEach(mapping => {
      const btn = document.getElementById(mapping.btnId);
      if (btn) {
        // Remove existing listeners first (using cloned button technique)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        // Add new listener
        newBtn.addEventListener('click', () => {
          addRow(mapping.tmplId, mapping.tbodyId);
          saveState();
        });
      }
    });
  }

  function setupFileInputs() {
    // Setup file inputs with image preview
    setupFileInput('scada-input', 'scada-file-list');
    setupFileInput('trends-input', 'trends-file-list');
    setupFileInput('alarm-input', 'alarm-file-list');
  }

  function setupFileInput(inputId, listId) {
    const input = document.getElementById(inputId);
    const listEl = document.getElementById(listId);
    if (!input || !listEl) return;

    // Store files in a custom property to maintain them across selections
    if (!input._accumulatedFiles) {
      input._accumulatedFiles = [];
    }

    input.addEventListener('change', (e) => {
      // Get newly selected files
      const newFiles = Array.from(e.target.files);

      // Add new files to accumulated files (avoid duplicates by name)
      newFiles.forEach(newFile => {
        const exists = input._accumulatedFiles.some(existingFile => 
          existingFile.name === newFile.name && existingFile.size === newFile.size
        );
        if (!exists) {
          input._accumulatedFiles.push(newFile);
        }
      });

      // Update the input's files property with accumulated files
      const dt = new DataTransfer();
      input._accumulatedFiles.forEach(file => {
        dt.items.add(file);
      });
      input.files = dt.files;

      // Update the display
      updateFileList(input, listEl);
      saveState();
    });
  }

  function updateFileList(input, listEl) {
    // Clear the display list
    listEl.innerHTML = '';

    // Re-populate with current files in the input
    Array.from(input.files).forEach((file, idx) => {
      const li = document.createElement('li');
      li.dataset.fileIndex = idx; // Store the file index for removal

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const img = document.createElement('img');
          img.src = reader.result;
          img.alt = file.name;
          img.classList.add('preview-thumb');
          li.appendChild(img);
          addFileDetails(li, file, idx);
        };
        reader.readAsDataURL(file);
      } else {
        addFileDetails(li, file, idx);
      }
      listEl.appendChild(li);
    });
  }

  function addFileDetails(li, file, idx) {
    const span = document.createElement('span');
    span.textContent = file.name;
    span.classList.add('file-name');
    li.appendChild(span);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Remove';
    btn.classList.add('remove-file-btn');
    btn.addEventListener('click', () => {
      const input = li.closest('ul').previousElementSibling;
      const fileIndex = parseInt(li.dataset.fileIndex);
      removeFile(input, fileIndex);
    });

    li.appendChild(btn);
  }

  function removeFile(input, removeIndex) {
    try {
      // Remove from accumulated files array
      if (input._accumulatedFiles && input._accumulatedFiles[removeIndex]) {
        input._accumulatedFiles.splice(removeIndex, 1);
      }

      // Update the input's files property
      const dt = new DataTransfer();
      if (input._accumulatedFiles) {
        input._accumulatedFiles.forEach(file => {
          dt.items.add(file);
        });
      } else {
        // Fallback to current files if accumulated files not available
        Array.from(input.files).forEach((file, i) => {
          if (i !== removeIndex) {
            dt.items.add(file);
          }
        });
      }

      // Update the input's files
      input.files = dt.files;

      // Update the display
      const listEl = input.nextElementSibling;
      if (listEl && listEl.classList.contains('file-list')) {
        updateFileList(input, listEl);
      }

      // Save state after removal
      saveState();

    } catch (error) {
      console.error('Error removing file:', error);
      // Fallback: trigger change event to refresh the list
      input.dispatchEvent(new Event('change'));
    }
  }

  function improveSignaturePad() {
    const canvasId = 'fixed_signature_canvas';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Check if SignaturePad library is available
    if (typeof SignaturePad === 'undefined') {
      console.error("SignaturePad library not loaded.");
      return;
    }

    // Get canvas context with willReadFrequently to address performance warning
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Create a variable to store the signature pad instance
    let signaturePadInstance;

    try {
      // Initialize SignaturePad
      signaturePadInstance = new SignaturePad(canvas, {
        minWidth: 1,
        maxWidth: 2.5,
        penColor: "black",
        backgroundColor: "rgba(255, 255, 255, 0)"
      });

      // Make it available globally for other functions
      window.signaturePadInstance = signaturePadInstance;

      // Handle window resize
      const resizeCanvas = function() {
        // Resize canvas while maintaining content
        const data = signaturePadInstance.toData();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        ctx.scale(ratio, ratio);
        signaturePadInstance.clear(); // Clear canvas without clearing data
        if (data) {
          signaturePadInstance.fromData(data); // Redraw signature
        }
      };

      // Initial sizing
      resizeCanvas();

      // Attach resize event
      window.addEventListener('resize', resizeCanvas);

      // Handle the clear button
      const clearButton = document.getElementById('fixed_clear_btn');
      if (clearButton) {
        clearButton.addEventListener('click', function() {
          signaturePadInstance.clear();
        });
      }

      // Note: Removed the form submit handler from here as it's now consolidated

      console.log("SignaturePad successfully initialized");
    } catch (e) {
      console.error("Error initializing SignaturePad:", e);
    }

    return signaturePadInstance;
  }

  function validateField(field) {
    const formGroup = field.closest('.form-section') || field.parentElement;

    if (!field.checkValidity()) {
      field.classList.add('invalid-field');
      field.classList.remove('valid');
      formGroup.classList.add('has-error');
      formGroup.classList.remove('has-success');

      // Find or create error message
      let errorMsg = field.parentElement.querySelector('.error-message');
      if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.classList.add('error-message');
        field.parentElement.appendChild(errorMsg);
      }

      // Set appropriate error message with icon
      let message = '';
      if (field.validity.valueMissing) {
        message = 'This field is required';
      } else if (field.validity.typeMismatch) {
        if (field.type === 'email') {
          message = 'Please enter a valid email address';
        } else {
          message = `Please enter a valid ${field.type}`;
        }
      } else if (field.validity.patternMismatch) {
        message = 'Please enter a value in the required format';
      } else {
        message = 'Invalid value';
      }

      errorMsg.innerHTML = `<i class="fas fa-exclamation-triangle" aria-hidden="true"></i> ${message}`;
      errorMsg.style.display = 'flex';

      // Announce error to screen readers
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', errorMsg.id || '');
    } else {
      field.classList.remove('invalid-field');
      field.classList.add('valid');
      formGroup.classList.remove('has-error');
      formGroup.classList.add('has-success');

      // Hide error message
      const errorMsg = field.parentElement.querySelector('.error-message');
      if (errorMsg) {
        errorMsg.style.display = 'none';
      }

      // Remove aria attributes
      field.setAttribute('aria-invalid', 'false');
      field.removeAttribute('aria-describedby');
    }
  }

  // Enhanced real-time validation
  function setupRealtimeValidation() {
    document.querySelectorAll('input[required], textarea[required], select[required]').forEach(field => {
      // Validate on blur (when user leaves field)
      field.addEventListener('blur', function() {
        if (this.value.trim() !== '') {
          validateField(this);
        }
      });

      // Clear errors on input (as user types)
      field.addEventListener('input', function() {
        if (this.classList.contains('invalid-field') && this.checkValidity()) {
          validateField(this);
        }
      });

      // Special handling for email fields
      if (field.type === 'email') {
        field.addEventListener('input', function() {
          // Real-time email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (this.value && !emailRegex.test(this.value)) {
            this.setCustomValidity('Please enter a valid email address');
          } else {
            this.setCustomValidity('');
          }
        });
      }
    });
  }

  // Enhanced keyboard navigation
  function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
      // Allow Ctrl+Enter to submit form from any field
      if (e.ctrlKey && e.key === 'Enter') {
        const form = document.getElementById('satForm');
        if (form) {
          form.dispatchEvent(new Event('submit'));
        }
      }

      // Enhanced tab navigation for progress steps
      if (e.key === 'Tab' && e.ctrlKey) {
        e.preventDefault();
        const steps = document.querySelectorAll('.progress-step:not(.disabled)');
        const currentStep = document.querySelector('.progress-step.active');
        const currentIndex = Array.from(steps).indexOf(currentStep);

        if (e.shiftKey) {
          // Go to previous step
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : steps.length - 1;
          goToStep(parseInt(steps[prevIndex].id.split('-')[1]));
        } else {
          // Go to next step
          const nextIndex = currentIndex < steps.length - 1 ? currentIndex + 1 : 0;
          goToStep(parseInt(steps[nextIndex].id.split('-')[1]));
        }
      }
    });
  }

  // Progress step keyboard navigation
  function makeProgressStepsAccessible() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
      step.setAttribute('role', 'tab');
      step.setAttribute('tabindex', step.classList.contains('active') ? '0' : '-1');
      step.setAttribute('aria-selected', step.classList.contains('active').toString());

      step.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const stepNumber = parseInt(this.id.split('-')[1]);
          goToStep(stepNumber);
        }
      });
    });
  }

  function setupFieldValidation() {
    document.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('blur', function() {
        validateField(field);
      });
    });
  }

  function showLoadingOverlay(message) {
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.color = 'white';
    overlay.style.fontFamily = 'Poppins, sans-serif';
    overlay.className = 'loading-overlay'; // Add class for easier selection

    // Create spinner
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.border = '5px solid #f3f3f3';
    spinner.style.borderTop = '5px solid var(--primary)';
    spinner.style.borderRadius = '50%';
    spinner.style.width = '50px';
    spinner.style.height = '50px';
    spinner.style.animation = 'spin 2s linear infinite';
    overlay.appendChild(spinner);

    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    // Add message
    const messageEl = document.createElement('p');
    messageEl.textContent = message || 'Processing...';
    messageEl.style.marginTop = '20px';
    messageEl.style.fontSize = '18px';
    overlay.appendChild(messageEl);

    // Add a tip for large forms
    const tipEl = document.createElement('p');
    tipEl.textContent = 'This may take a minute for large reports.';
    tipEl.style.marginTop = '10px';
    tipEl.style.fontSize = '14px';
    tipEl.style.opacity = '0.8';
    overlay.appendChild(tipEl);

    // Add to the document
    document.body.appendChild(overlay);

    return overlay;
  }

  function hasSignature(pixelBuffer) {
    // Check if there are any non-white pixels
    for (let i = 0; i < pixelBuffer.length; i++) {
      if (pixelBuffer[i] !== 0) {
        return true;
      }
    }
    return false;
  }

  function isCurrentStepActive(stepNumber) {
    return document.getElementById(`step-${stepNumber}`).classList.contains('active');
  }

  // Helper function to show success message (reused in submission)
  function showSuccessMessage(message) {
    // Create a success overlay
    const successOverlay = document.createElement('div');
    successOverlay.style.position = 'fixed';
    successOverlay.style.top = '0';
    successOverlay.style.left = '0';
    successOverlay.style.width = '100%';
    successOverlay.style.height = '100%';
    successOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    successOverlay.style.zIndex = '9999';
    successOverlay.style.display = 'flex';
    successOverlay.style.flexDirection = 'column';
    successOverlay.style.alignItems = 'center';
    successOverlay.style.justifyContent = 'center';
    successOverlay.style.color = 'white';
    successOverlay.style.fontFamily = 'Poppins, sans-serif';

    // Create success icon
    const icon = document.createElement('div');
    icon.innerHTML = '<i class="fa fa-check-circle" style="font-size: 60px; color: #4CAF50;"></i>';
    successOverlay.appendChild(icon);

    // Add message
    const messageEl = document.createElement('h2');
    messageEl.textContent = message;
    messageEl.style.marginTop = '20px';
    messageEl.style.fontSize = '24px';
    successOverlay.appendChild(messageEl);

    // Add details
    const detailsEl = document.createElement('p');
    detailsEl.textContent = 'Please check your email for the approval link.';
    detailsEl.style.marginTop = '10px';
    detailsEl.style.fontSize = '16px';
    successOverlay.appendChild(detailsEl);

    document.body.appendChild(successOverlay);
    return successOverlay; // Return the created overlay
  }

  // Helper function to show error message
  function showErrorMessage(message) {
    // Create an error overlay (similar to success, but with error styling)
    const errorOverlay = document.createElement('div');
    errorOverlay.style.position = 'fixed';
    errorOverlay.style.top = '0';
    errorOverlay.style.left = '0';
    errorOverlay.style.width = '100%';
    errorOverlay.style.height = '100%';
    errorOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    errorOverlay.style.zIndex = '9999';
    errorOverlay.style.display = 'flex';
    errorOverlay.style.flexDirection = 'column';
    errorOverlay.style.alignItems = 'center';
    errorOverlay.style.justifyContent = 'center';
    errorOverlay.style.color = 'white';
    errorOverlay.style.fontFamily = 'Poppins, sans-serif';

    // Create error icon
    const icon = document.createElement('div');
    icon.innerHTML = '<i class="fa fa-times-circle" style="font-size: 60px; color: #f44336;"></i>';
    errorOverlay.appendChild(icon);

    // Add message
    const messageEl = document.createElement('h2');
    messageEl.textContent = 'Submission Failed!';
    messageEl.style.marginTop = '20px';
    messageEl.style.fontSize = '24px';
    errorOverlay.appendChild(messageEl);

    // Add error details
    const detailsEl = document.createElement('p');
    detailsEl.textContent = message;
    detailsEl.style.marginTop = '10px';
    detailsEl.style.fontSize = '16px';
    errorOverlay.appendChild(detailsEl);

    document.body.appendChild(errorOverlay);
    return errorOverlay; // Return the created overlay
  }

  // Function to show messages
  function showMessage(message, type) {
    // Remove any existing messages
    const existingMessages = document.querySelectorAll('.message-banner');
    existingMessages.forEach(msg => msg.remove());

    // Create new message banner
    const banner = document.createElement('div');
    banner.className = `message-banner ${type}`;
    banner.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; float: right; cursor: pointer; font-size: 18px;">&times;</button>
    `;

    // Insert at top of form or body
    const form = document.getElementById('reportForm');
    const container = form || document.body;
    if (container) {
      container.insertBefore(banner, container.firstChild);
    }

    // For success messages, show longer
    const autoRemoveTime = type === 'success' ? 8000 : 5000;

    // Auto-remove after specified time
    setTimeout(() => {
      if (banner.parentElement) {
        banner.remove();
      }
    }, autoRemoveTime);
  }

  function handleFormSubmission(e) {
    e.preventDefault();

    // Show loading overlay
    const overlay = showLoadingOverlay('Submitting your report...');

    // Submit the form via AJAX
    const form = document.getElementById('satForm');
    const formData = new FormData(form);

    fetch(form.action, {
      method: 'POST',
      body: formData,
      redirect: 'follow'
    })
    .then(response => {
      // Hide loading overlay
      const loadingOverlay = document.querySelector('.loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }

      // Handle different response types
      if (response.headers.get('content-type')?.includes('application/json')) {
        // JSON response - likely an error or success message
        return response.json().then(data => {
          if (data.success) {
            // Success case
            if (data.message) {
              showMessage(data.message, 'success');
            }

            // Redirect to status page if provided
            if (data.redirect_url) {
              console.log('Redirecting to:', data.redirect_url);
              setTimeout(() => {
                window.location.href = data.redirect_url;
              }, 2000);
            }
          } else {
            // Error case
            showMessage(data.message || 'An error occurred while generating the report', 'error');
          }
        });
      } else {
        // HTML response - likely a redirect or error page
        return response.text().then(html => {
          if (response.ok) {
            // Successful HTML response, replace page content
            document.open();
            document.write(html);
            document.close();
          } else {
            showMessage('An error occurred while generating the report', 'error');
          }
        });
      }
    })
    .catch(error => {
      console.error('Form submission error:', error);
      showErrorMessage(error.message || 'An error occurred while submitting the form. Please try again.');

      // Hide loading overlay on error
      const loadingOverlay = document.querySelector('.loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }
    })
    .finally(() => {
      // Re-enable submit button
      const submitButton = document.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.getAttribute('data-original-text') || 'Generate Report';
      }

      // Ensure loading overlay is hidden
      const loadingOverlay = document.querySelector('.loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }
    });
  }

  // Auto-save functionality
  function setupAutoSave(form, submissionId) {
    // Configuration
    const AUTOSAVE_INTERVAL = 30000; // 30 seconds
    const FORM_KEY_PREFIX = 'satFormAutoSave_';
    let autoSaveTimer = null;
    let lastSaveTime = 0;
    let isDirty = false;

    // Mark form as dirty when inputs change
    form.addEventListener('input', function() {
      isDirty = true;
    });

    // Setup interval for auto-save
    autoSaveTimer = setInterval(function() {
      if (isDirty && document.visibilityState !== 'hidden') {
        saveFormState(form, submissionId);
        isDirty = false;
      }
    }, AUTOSAVE_INTERVAL);

    // Save when user leaves the page
    window.addEventListener('beforeunload', function() {
      if (isDirty) {
        saveFormState(form, submissionId);
      }
    });

    // Save when visibility changes (user switches tabs)
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden' && isDirty) {
        saveFormState(form, submissionId);
        isDirty = false;
      }
    });

    // Setup manual save button if present
    const saveBtn = document.getElementById('save-progress-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function(e) {
        e.preventDefault();
        saveFormState(form, submissionId, true); // true means show notification
        isDirty = false;
      });
    }
  }

  async function saveFormState(form, submissionId, showNotification = false) {
    // Don't save too frequently
    const now = Date.now();
    if (now - lastSaveTime < 5000) return; // Minimum 5 seconds between saves

    lastSaveTime = now;

    // Use the same auto-save function for consistency
    const success = await saveFormProgress();
    if (success && showNotification) {
      showSaveNotification();
    }
    return;

    // Note: This function now delegates to the server-side auto-save
  }

  function showSaveNotification() {
    // Create or get notification element
    let notification = document.getElementById('save-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'save-notification';
      notification.style.position = 'fixed';
      notification.style.bottom = '20px';
      notification.style.right = '20px';
      notification.style.backgroundColor = '#4CAF50';
      notification.style.color = 'white';
      notification.style.padding = '10px 20px';
      notification.style.borderRadius = '4px';
      notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      notification.style.zIndex = '9999';
      notification.style.transition = 'opacity 0.5s';
      document.body.appendChild(notification);
    }

    notification.textContent = 'Progress saved!';
    notification.style.opacity = '1';

    // Hide after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
    }, 3000);
  }

  function loadAutoSavedState(submissionId) {
    try {
      const savedDataString = localStorage.getItem('satFormAutoSave_' + submissionId);
      if (!savedDataString) return false;

      const savedData = JSON.parse(savedDataString);
      const form = document.getElementById('satForm');

      if (!form || !savedData.fields) return false;

      // Restore form fields
      Object.entries(savedData.fields).forEach(([name, val]) => {
        // Handle multi-value fields (arrays)
        if (Array.isArray(val)) {
          // Find all elements with this base name plus []
          const elements = form.querySelectorAll(`[name="${name}[]"]`);
          elements.forEach((el, index) => {
            if (index < val.length) {
              el.value = val[index];
            }
          });

          // If we need more elements than exist, add them
          const parent = elements.length > 0 ? elements[0].closest('tbody') : null;
          if (parent) {
            const templateId = getTemplateIdForTable(parent.id);
            if (templateId) {
              // Add rows for any additional values
              for (let i = elements.length; i < val.length; i++) {
                addRow(templateId, parent.id);
                // Find the newly added element
                const newElements = parent.querySelectorAll(`[name="${name}[]"]`);
                if (newElements[i]) {
                  newElements[i].value = val[i];
                }
              }
            }
          }
        } else {
          // Handle single value fields
          const el = form.querySelector(`[name="${name}"]`);
          if (el) {
            if (el.type === 'checkbox' || el.type === 'radio') {
              el.checked = (el.value === val);
            } else {
              el.value = val;
            }
          }
        }
      });

      // Restore signature if present
      if (savedData.signature) {
        const signaturePad = document.getElementById('fixed_signature_canvas');
        if (signaturePad) {
          const ctx = signaturePad.getContext('2d', { willReadFrequently: true });
          const img = new Image();
          img.onload = function() {
            ctx.drawImage(img, 0, 0);
          };
          img.src = savedData.signature;
        }
      }

      // Restore current step
      if (savedData.currentStep) {
        goToStep(savedData.currentStep);
      }

      console.log("Form state restored from auto-save");
      showRestoreNotification();
      return true;

    } catch (e) {
      console.error('Error restoring auto-saved form:', e);
      return false;
    }
  }

  function getTemplateIdForTable(tbodyId) {
    const templateMap = {
      'related-documents-body': 'tmpl-related-doc',
      'pre-approvals-body': 'tmpl-pre-approval',
      'post-approvals-body': 'tmpl-post-approval',
      'pretest-body': 'tmpl-pretest',
      'key-components-body': 'tmpl-keycomp',
      'ip-records-body': 'tmpl-iprecord',
      'digital-signals-body': 'tmpl-digital-signal',
      'analogue-signals-body': 'tmpl-analogue-signal',
      'modbus-digital-body': 'tmpl-modbus-digital',
      'modbus-analogue-body': 'tmpl-modbus-analogue',
      'process-test-body': 'tmpl-process-test',
      'scada-verification-body': 'tmpl-scada-verification',
      'trends-testing-body': 'tmpl-trends-testing',
      'alarm-body': 'tmpl-alarm-list'
    };

    return templateMap[tbodyId];
  }

  function showRestoreNotification() {
    // Create or get notification element
    let notification = document.getElementById('restore-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'restore-notification';
      notification.style.position = 'fixed';
      notification.style.bottom = '20px';
      notification.style.right = '20px';
      notification.style.backgroundColor = '#2196F3';
      notification.style.color = 'white';
      notification.style.padding = '10px 20px';
      notification.style.borderRadius = '4px';
      notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      notification.style.zIndex = '9999';
      notification.style.transition = 'opacity 0.5s';
      document.body.appendChild(notification);
    }

    notification.textContent = 'Form restored from saved progress!';
    notification.style.opacity = '1';

    // Hide after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
    }, 3000);
  }

  function cleanupOldSaves() {
    // Find and remove old form saves to make space
    const keys = [];
    const FORM_KEY_PREFIX = 'satFormAutoSave_';

    // Collect all form save keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(FORM_KEY_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          keys.push({
            key: key,
            timestamp: data.timestamp || 0
          });
        } catch (e) {
          // If we can't parse, assume it's old and add with timestamp 0
          keys.push({ key: key, timestamp: 0 });
        }
      }
    }

    // Sort by timestamp (oldest first)
    keys.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest saves (up to half of them)
    const removeCount = Math.ceil(keys.length / 2);
    for (let i = 0; i < removeCount; i++) {
      if (keys[i]) {
        localStorage.removeItem(keys[i].key);
        console.log('Removed old form save:', keys[i].key);
      }
    }
  }

  // ========== RESPONSIVE TABLE SYSTEM ==========
  function initializeResponsiveTables() {
    const tables = document.querySelectorAll('table');

    tables.forEach(table => {
      createMobileCardLayout(table);
      setupColumnPriorities(table);
      setupStickyColumns(table);
      addHeaderTooltips(table);
    });

    // Handle window resize
    window.addEventListener('resize', debounce(handleTableResize, 250));
  }

  function createMobileCardLayout(table) {
    const tableContainer = table.closest('.table-responsive');
    if (!tableContainer) return;

    // Wrap existing table for desktop
    const desktopWrapper = document.createElement('div');
    desktopWrapper.className = 'desktop-table-wrapper';
    table.parentNode.insertBefore(desktopWrapper, table);
    desktopWrapper.appendChild(table);

    // Create mobile cards container
    const mobileContainer = document.createElement('div');
    mobileContainer.className = 'mobile-table-cards';

    // Add scroll hint
    const scrollHint = document.createElement('div');
    scrollHint.className = 'mobile-scroll-hint';
    scrollHint.textContent = '📱 Optimized for mobile viewing';
    mobileContainer.appendChild(scrollHint);

    // Extract table data and create cards
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => ({
      text: th.textContent.trim(),
      priority: getColumnPriority(th),
      index: Array.from(th.parentNode.children).indexOf(th)
    }));

    const rows = Array.from(table.querySelectorAll('tbody tr'));

    rows.forEach((row, index) => {
      const card = createMobileCard(row, headers, index);
      mobileContainer.appendChild(card);
    });

    tableContainer.appendChild(mobileContainer);

    // Watch for table changes and update mobile cards
    const observer = new MutationObserver(() => {
      updateMobileCards(table, mobileContainer, headers);
    });

    observer.observe(table.querySelector('tbody'), {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  function createMobileCard(row, headers, index) {
    const card = document.createElement('div');
    card.className = 'mobile-card';
    card.dataset.rowIndex = index;

    const cells = Array.from(row.querySelectorAll('td'));

    // Card header with primary information
    const header = document.createElement('div');
    header.className = 'mobile-card-header';

    // Get primary identifier (usually first non-empty cell or signal tag)
    let primaryId = `Item ${index + 1}`;
    let signalTag = '';

    // Look for Signal TAG column (usually around index 3-4)
    const signalTagCell = cells.find((cell, idx) => {
      const headerText = headers[idx]?.text.toLowerCase() || '';
      return headerText.includes('signal') && headerText.includes('tag');
    });

    if (signalTagCell) {
      const input = signalTagCell.querySelector('input');
      signalTag = input ? input.value : signalTagCell.textContent.trim();
    }

    // Use S.No if available
    if (cells[0]) {
      const input = cells[0].querySelector('input');
      const sno = input ? input.value : cells[0].textContent.trim();
      if (sno) primaryId = sno;
    }

    header.innerHTML = `
      <span class="mobile-card-title">${signalTag || 'Signal'}</span>
      <span class="mobile-card-number">#${primaryId}</span>
    `;

    card.appendChild(header);

    // Card body with essential fields
    const body = document.createElement('div');
    body.className = 'mobile-card-body';

    // Essential fields (high priority columns)
    const essentialFields = document.createElement('div');
    essentialFields.className = 'mobile-essential-fields';

    headers.forEach((header, colIndex) => {
      if (header.priority === 'high' && colIndex < cells.length - 1) { // Exclude actions column
        const cell = cells[colIndex];
        if (cell) {
          const fieldGroup = createMobileField(header.text, cell, colIndex);
          essentialFields.appendChild(fieldGroup);
        }
      }
    });

    body.appendChild(essentialFields);

    // Expandable section for other fields
    const expandable = document.createElement('div');
    expandable.className = 'mobile-expandable';

    const toggle = document.createElement('button');
    toggle.className = 'mobile-expand-toggle';
    toggle.innerHTML = `
      <span>More Details</span>
      <i class="fas fa-chevron-down"></i>
    `;

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      expandable.classList.toggle('expanded');
    });

    const expandableContent = document.createElement('div');
    expandableContent.className = 'mobile-expandable-content';

    headers.forEach((header, colIndex) => {
      if (header.priority !== 'high' && colIndex < cells.length - 1) { // Exclude actions column
        const cell = cells[colIndex];
        if (cell) {
          const fieldGroup = createMobileField(header.text, cell, colIndex);
          expandableContent.appendChild(fieldGroup);
        }
      }
    });

    expandable.appendChild(toggle);
    expandable.appendChild(expandableContent);
    body.appendChild(expandable);

    // Actions
    const actionsCell = cells[cells.length - 1];
    if (actionsCell) {
      const actions = document.createElement('div');
      actions.className = 'mobile-card-actions';

      const buttons = actionsCell.querySelectorAll('button');
      buttons.forEach(btn => {
        const mobileBtn = btn.cloneNode(true);
        mobileBtn.className = `mobile-action-btn ${btn.classList.contains('remove-row-btn') ? 'delete' : 'edit'}`;

        // Ensure the cloned button maintains functionality
        if (btn.classList.contains('remove-row-btn')) {
          mobileBtn.addEventListener('click', () => {
            // Remove both the original row and the mobile card
            btn.click();
            card.remove();
          });
        }

        actions.appendChild(mobileBtn);
      });

      body.appendChild(actions);
    }

    card.appendChild(body);
    return card;
  }

  function createMobileField(label, cell, colIndex) {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'mobile-field-group';

    const fieldLabel = document.createElement('div');
    fieldLabel.className = 'mobile-field-label';
    fieldLabel.textContent = label;

    const fieldValue = document.createElement('div');
    fieldValue.className = 'mobile-field-value';

    // Clone the input/content from the cell
    const input = cell.querySelector('input, select, textarea');
    if (input) {
      const clonedInput = input.cloneNode(true);

      // Sync values between original table input and mobile card input
      clonedInput.addEventListener('input', () => {
        input.value = clonedInput.value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      input.addEventListener('input', () => {
        clonedInput.value = input.value;
      });

      fieldValue.appendChild(clonedInput);
    } else {
      fieldValue.textContent = cell.textContent.trim();
    }

    fieldGroup.appendChild(fieldLabel);
    fieldGroup.appendChild(fieldValue);

    return fieldGroup;
  }

  function setupColumnPriorities(table) {
    const headers = table.querySelectorAll('thead th');
    const rows = table.querySelectorAll('tbody tr');

    headers.forEach((header, index) => {
      const priority = getColumnPriority(header);
      header.classList.add(`col-priority-${priority}`);

      // Apply same class to all cells in this column
      rows.forEach(row => {
        const cell = row.cells[index];
        if (cell) {
          cell.classList.add(`col-priority-${priority}`);
        }
      });

      // Add sticky classes for important columns
      const text = header.textContent.toLowerCase();
      if (text.includes('signal') && text.includes('tag')) {
        header.classList.add('col-sticky');
        rows.forEach(row => {
          const cell = row.cells[index];
          if (cell) cell.classList.add('col-sticky');
        });
      }

      // Make actions column sticky
      if (text.includes('action') || index === headers.length - 1) {
        header.classList.add('col-sticky-actions');
        rows.forEach(row => {
          const cell = row.cells[index];
          if (cell) cell.classList.add('col-sticky-actions');
        });
      }
    });
  }

  function getColumnPriority(header) {
    const text = header.textContent.toLowerCase();

    // High priority: essential for identification and results
    if (text.includes('signal') || text.includes('tag') || text.includes('description') || 
        text.includes('result') || text.includes('action')) {
      return 'high';
    }

    // Medium priority: important but not critical
    if (text.includes('rack') || text.includes('position') || text.includes('verified') || 
        text.includes('punch')) {
      return 'medium';
    }

    // Low priority: can be hidden on smaller screens
    return 'low';
  }

  function updateMobileCards(table, mobileContainer, headers) {
    // Find existing cards (skip the scroll hint)
    const cards = Array.from(mobileContainer.querySelectorAll('.mobile-card'));
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    // Remove excess cards
    if (cards.length > rows.length) {
      for (let i = rows.length; i < cards.length; i++) {
        if (cards[i]) cards[i].remove();
      }
    }

    // Add new cards for new rows
    if (rows.length > cards.length) {
      for (let i = cards.length; i < rows.length; i++) {
        const card = createMobileCard(rows[i], headers, i);
        mobileContainer.appendChild(card);
      }
    }

    // Update existing cards
    cards.forEach((card, index) => {
      if (rows[index]) {
        // Update card content if needed
        const newCard = createMobileCard(rows[index], headers, index);
        card.replaceWith(newCard);
      }
    });
  }

  function handleTableResize() {
    // Refresh mobile cards when window resizes
    setTimeout(() => {
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const mobileContainer = table.closest('.table-responsive')?.querySelector('.mobile-table-cards');
        if (mobileContainer) {
          const headers = Array.from(table.querySelectorAll('thead th')).map(th => ({
            text: th.textContent.trim(),
            priority: getColumnPriority(th),
            index: Array.from(th.parentNode.children).indexOf(th)
          }));
          updateMobileCards(table, mobileContainer, headers);
        }
      });
    }, 100);
  }

  // ========== FULL-WIDTH TABLE ENHANCEMENTS ==========
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize responsive tables
    initializeResponsiveTables();

    // Optimize tables for full-width display
    const tables = document.querySelectorAll('table');

    tables.forEach(table => {
      // Skip if already optimized
      if (table.classList.contains('full-width-optimized')) return;

      // Mark as optimized
      table.classList.add('full-width-optimized');

      // Ensure table uses full available width
      const tableResponsive = table.closest('.table-responsive');
      if (tableResponsive) {
        // Set table to use full container width
        table.style.width = '100%';
        table.style.tableLayout = 'fixed';

        // Ensure inputs fit within their cells
        const inputs = table.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          input.style.width = 'calc(100% - 4px)';
          input.style.boxSizing = 'border-box';
        });
      }

      // Optimize table for available space
      const headers = table.querySelectorAll('thead th');
      if (headers.length > 0) {
        // Apply percentage-based widths
        const columnWidths = ['6%', '10%', '12%', '16%', '20%', '10%', '10%', '12%', '16%', '8%'];
        headers.forEach((header, index) => {
          if (columnWidths[index]) {
            header.style.width = columnWidths[index];
          }
        });

        // Apply same widths to body cells
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          cells.forEach((cell, index) => {
            if (columnWidths[index]) {
              cell.style.width = columnWidths[index];
            }
          });
        });
      }
    });

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        tables.forEach(table => {
          if (table.classList.contains('full-width-optimized')) {
            // Refresh table layout
            table.style.width = '100%';
            const inputs = table.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
              input.style.width = 'calc(100% - 4px)';
            });
          }
        });
      }, 250);
    });

    // Clean up any duplicate elements
    document.querySelectorAll('tbody').forEach(tbody => {
      Array.from(tbody.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().includes('Scroll')) {
          tbody.removeChild(node);
        }
      });
    });
  });

  // ========== CONSOLIDATED FORM SUBMISSION HANDLER ==========
  // This replaces all previous form submission handlers
  document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('satForm');
    if (!form) return;

    // Remove any existing submit handlers by cloning the form
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Add the single, clean submit handler
    newForm.addEventListener('submit', async function(e) {
      console.log("Form submission triggered");

      // Prevent default submission initially
      e.preventDefault();

      // First, try to refresh CSRF token
      const tokenRefreshed = await refreshCsrfToken();
      if (!tokenRefreshed) {
        alert('Session validation failed. Please refresh the page and try again.');
        return false;
      }

      // Update form's CSRF token with the new one
      const newTokenInput = newForm.querySelector('[name="csrf_token"]');
      const newToken = document.querySelector('[name="csrf_token"]').value;
      if (newTokenInput && newToken) {
        newTokenInput.value = newToken;
      }

      // Check if we're on the final step
      const onFinalStep = isCurrentStepActive(10);
      console.log("On final step:", onFinalStep);

      // Only validate signature if on final step
      if (onFinalStep) {
        // Check global signaturePad instance (preferred method)
        if (window.signaturePadInstance) {
          const isEmpty = window.signaturePadInstance.isEmpty();
          console.log("SignaturePad is empty:", isEmpty);

          if (isEmpty) {
            e.preventDefault();
            alert('Please sign the document before submitting');
            return false;
          }

          // Set the hidden field value with the signature data
          const hiddenField = document.getElementById('sig_prepared_data');
          if (hiddenField) {
            hiddenField.value = window.signaturePadInstance.toDataURL('image/png');
            console.log("Signature data saved to hidden field");
          }
        } else {
          // Fallback to canvas pixel inspection if global instance not available
          const signaturePad = document.getElementById('fixed_signature_canvas');
          if (signaturePad) {
            const ctx = signaturePad.getContext('2d');
            const pixelBuffer = new Uint32Array(
              ctx.getImageData(0, 0, signaturePad.width, signaturePad.height).data.buffer
            );

            if (!hasSignature(pixelBuffer)) {
              e.preventDefault();
              alert('Please sign the document before submitting');
              return false;
            }

            // Set the hidden field value
            const hiddenField = document.getElementById('sig_prepared_data');
            if (hiddenField) {
              hiddenField.value = signaturePad.toDataURL('image/png');
            }
          }
        }
      }

      // If we get here, the form is valid to submit
      console.log("Form validation passed, proceeding with submission");

      // Show loading overlay
      showLoadingOverlay('Submitting your report...');

      // Submit the form programmatically
      newForm.submit();
    });
  });

  // Auto-save initialization
  document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('satForm');
    if (!form) return;

    // Get the submission ID or generate a temporary one
    const submissionId = form.querySelector('[name="submission_id"]')?.value || 
                         'temp_' + Math.random().toString(36).substring(2, 15);

    // Set up auto-save functionality
    setupAutoSave(form, submissionId);

    // Look for a recovery notification element
    const recoveryNotification = document.getElementById('recovery-notification');

    // Check if there's a saved state to recover
    const savedState = localStorage.getItem('satFormAutoSave_' + submissionId);
    if (savedState && recoveryNotification) {
      // Show recovery notification
      recoveryNotification.style.display = 'block';

      // Setup recovery actions
      const recoverBtn = recoveryNotification.querySelector('.recover-btn');
      const dismissBtn = recoveryNotification.querySelector('.dismiss-btn');

      if (recoverBtn) {
        recoverBtn.addEventListener('click', function() {
          loadAutoSavedState(submissionId);
          recoveryNotification.style.display = 'none';
        });
      }

      if (dismissBtn) {
        dismissBtn.addEventListener('click', function() {
          recoveryNotification.style.display = 'none';
        });
      }
    }
  });

  // Graceful error handling for external library dependencies
  (function checkLibraries() {
    const requiredLibraries = [
      { name: 'SignaturePad', checker: () => typeof SignaturePad !== 'undefined' }
    ];

    requiredLibraries.forEach(lib => {
      if (!lib.checker()) {
        console.warn(`Warning: ${lib.name} library is not loaded. Some functionality may be limited.`);

        // Optional: Create a notification for missing libraries
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '10px';
        notification.style.right = '10px';
        notification.style.backgroundColor = '#f44336';
        notification.style.color = 'white';
        notification.style.padding = '10px';
        notification.style.zIndex = '9999';
        notification.textContent = `Missing ${lib.name} library. Some features may not work correctly.`;

        document.body.appendChild(notification);

        // Remove notification after 5 seconds
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 5000);
      }
    });
  })();

  // Shortcut functions for adding rows (convenience methods)
  function addRelatedDoc() {
    addRow('tmpl-related-doc', 'related-documents-body');
    saveState();
  }

  function addPreApprovalRow() {
    addRow('tmpl-pre-approval', 'pre-approvals-body');
    saveState();
  }

  function addPostApprovalRow() {
    addRow('tmpl-post-approval', 'post-approvals-body');
    saveState();
  }

  function addPretestRow() {
    addRow('tmpl-pretest', 'pretest-body');
    saveState();
  }

  function addKeyComponentRow() {
    addRow('tmpl-keycomp', 'key-components-body');
    saveState();
  }

  function addIPRecordRow() {
    addRow('tmpl-iprecord', 'ip-records-body');
    saveState();
  }

  function addSignalListRow() {
    addRow('tmpl-digital-signal', 'digital-signals-body');
    saveState();
  }

  function addDigitalOutputRow() {
    addRow('tmpl-digital-output', 'digital-outputs-body');
    saveState();
  }

  function addAnalogueInputRow() {
    addRow('tmpl-analogue-input', 'analogue-inputs-body');
    saveState();
  }

  function addAnalogueOutputRow() {
    addRow('tmpl-analogue-output', 'analogue-outputs-body');
    saveState();
  }

  function addModbusDigitalRow() {
    addRow('tmpl-modbus-digital', 'modbus-digital-body');
    saveState();
  }

  function addModbusAnalogueRow() {
    addRow('tmpl-modbus-analogue', 'modbus-analogue-body');
    saveState();
  }

  function addProcessTestRow() {
    addRow('tmpl-process-test', 'process-test-body');
    saveState();
  }

  function addScadaVerificationRow() {
    addRow('tmpl-scada-verification', 'scada-verification-body');
    saveState();
  }

  function addTrendsTestingRow() {
    addRow('tmpl-trends-testing', 'trends-testing-body');
    saveState();
  }

  function addAlarmListRow() {
    addRow('tmpl-alarm-list', 'alarm-body');
    saveState();
  }

  // CSRF Protection (if jQuery is available)
  function setupCSRF() {
    if (typeof jQuery !== 'undefined') {
      $.ajaxSetup({
        beforeSend: function(xhr, settings) {
          if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", $('input[name="csrf_token"]').val());
          }
        }
      });
    }
  }

  // Add this function to your code to refresh the CSRF token periodically

  // Initialize lastSaveTime variable
  let lastSaveTime = null;

  // Save state function
  function saveState() {
    lastSaveTime = new Date().getTime();
    console.log('State saved at:', lastSaveTime);

    // Also save to server every few seconds when user is actively editing
    if (lastSaveTime % 30000 < 1000) { // Every 30 seconds approximately
      saveFormProgress();
    }
  }
function setupCsrfRefresh() {
  // Refresh every 5 minutes (more frequent to prevent expiration)
  const REFRESH_INTERVAL = 5 * 60 * 1000; 

  // Also refresh when the user comes back to the tab
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      refreshCsrfToken();
    }
  });

  setInterval(refreshCsrfToken, REFRESH_INTERVAL);
}

async function refreshCsrfToken() {
  try {
    // Fetch a new token from the server
    const response = await fetch('/refresh_csrf', {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (response.ok) {
      const data = await response.json();
      // Update all CSRF token inputs on the page
      document.querySelectorAll('input[name="csrf_token"]').forEach(input => {
        input.value = data.csrf_token;
      });

      // Update cookie as well
      document.cookie = `csrf_token=${data.csrf_token}; path=/; SameSite=Lax`;

      console.log('CSRF token refreshed successfully');
      return true;
    } else {
      console.error('Failed to refresh CSRF token:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error refreshing CSRF token:', error);
    return false;
  }
}

// Auto-save function for form progress
async function saveFormProgress() {
  const form = document.getElementById('satForm');
  if (!form) return false;

  try {
    // First refresh CSRF token
    await refreshCsrfToken();

    // Collect form data as FormData to include CSRF token
    const formData = new FormData(form);

    const response = await fetch('/auto_save_progress', {
      method: 'POST',
      body: formData  // Send as FormData with CSRF token
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Auto-save completed:', result.message);

      // Update submission ID if it was generated
      if (result.submission_id) {
        const submissionIdInput = form.querySelector('[name="submission_id"]');
        if (submissionIdInput) {
          submissionIdInput.value = result.submission_id;
        }
      }

      return true;
    } else {
      console.error('Auto-save failed');
      return false;
    }
  } catch (error) {
    console.error('Error in auto-save:', error);
    return false;
  }
}

  // I/O Builder functionality
  let configuredModules = [];
  let configuredModbusRanges = [];
  let currentModuleSpec = null;

  function initializeIOBuilder() {
    // Module lookup
    document.getElementById('lookup_module_btn')?.addEventListener('click', lookupModule);

    // Add module
    document.getElementById('add_module_btn')?.addEventListener('click', addModule);

    // Add Modbus range
    document.getElementById('add_modbus_btn')?.addEventListener('click', addModbusRange);

    // Generate tables
    document.getElementById('generate_tables_btn')?.addEventListener('click', generateIOTables);

    // Preview tables
    document.getElementById('preview_tables_btn')?.addEventListener('click', previewTables);

    // Module company change - reset model field
    document.getElementById('module_company')?.addEventListener('change', function() {
      document.getElementById('module_model').value = '';
      hideModuleSpec();
    });

    // Enable manual override inputs
    document.querySelectorAll('#manual_override input').forEach(input => {
      input.addEventListener('input', updateManualSpec);
      input.addEventListener('change', updateManualSpec);
    });
  }

  async function lookupModule() {
    const company = document.getElementById('module_company').value;
    const model = document.getElementById('module_model').value.trim();

    if (!company || !model) {
      alert('Please select a company and enter a module model.');
      return;
    }

    const lookupBtn = document.getElementById('lookup_module_btn');
    lookupBtn.textContent = '🔍 Searching...';
    lookupBtn.disabled = true;

    try {
      const response = await fetch('/io-builder/api/module-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.querySelector('[name="csrf_token"]').value
        },
        body: JSON.stringify({
          company: company,
          model: model
        })
      });

      const data = await response.json();

      if (data.success) {
        currentModuleSpec = data.module;
        showModuleSpec(data.module, data.source);
        document.getElementById('add_module_btn').disabled = false;
      } else {
        alert(`Error looking up module: ${data.error}`);
        showManualOverride();
      }
    } catch (error) {
      console.error('Module lookup error:', error);
      alert('Error connecting to module lookup service');
      showManualOverride();
    } finally {
      lookupBtn.textContent = '🔍 Lookup';
      lookupBtn.disabled = false;
    }
  }

  function showModuleSpec(spec, source) {
    const specDisplay = document.getElementById('module_spec_display');
    specDisplay.classList.remove('hidden');

    document.getElementById('spec_description').textContent = spec.description || 'N/A';
    document.getElementById('spec_di').textContent = spec.digital_inputs || 0;
    document.getElementById('spec_do').textContent = spec.digital_outputs || 0;
    document.getElementById('spec_ai').textContent = spec.analog_inputs || 0;
    document.getElementById('spec_ao').textContent = spec.analog_outputs || 0;
    document.getElementById('spec_total').textContent = spec.total_channels || 0;

    // Show source indicator
    const sourceIndicator = document.createElement('div');
    sourceIndicator.className = 'source-indicator';
    sourceIndicator.innerHTML = `
      <span class="source-badge source-${source}">
        ${source === 'database' ? '📂 Cached' : source === 'web' ? '🌐 Web' : '✏️ Manual'}
        ${source}
      </span>
    `;
    specDisplay.prepend(sourceIndicator);

    // Always show manual override section for user modifications
    showManualOverride();

    // Update manual override section title and message based on source
    const manualSection = document.getElementById('manual_override');
    if (manualSection) {
      // Remove any existing messages
      const existingMessage = manualSection.querySelector('.manual-entry-message');
      if (existingMessage) {
        existingMessage.remove();
      }

      // Create appropriate message
      const manualMessage = document.createElement('div');
      manualMessage.className = 'manual-entry-message';

      if (source === 'manual' || (spec.total_channels === 0 && source !== 'web')) {
        manualMessage.innerHTML = `
          <p style="color: #f39c12; font-weight: bold; margin: 10px 0;">
            ⚠️ Module not found in database. Please enter channel counts manually below:
          </p>
        `;
      } else {
        manualMessage.innerHTML = `
          <p style="color: #28a745; font-weight: bold; margin: 10px 0;">
            ✅ Module found! You can modify the values below if needed:
          </p>
        `;
      }

      manualSection.prepend(manualMessage);

      // Pre-fill manual override fields with looked-up values
      document.getElementById('manual_di').value = spec.digital_inputs || 0;
      document.getElementById('manual_do').value = spec.digital_outputs || 0;
      document.getElementById('manual_ai').value = spec.analog_inputs || 0;
      document.getElementById('manual_ao').value = spec.analog_outputs || 0;
    }
  }

  function showManualOverride() {
    document.getElementById('manual_override').classList.remove('hidden');
  }

  function hideManualOverride() {
    document.getElementById('manual_override').classList.add('hidden');
  }

  function hideModuleSpec() {
    document.getElementById('module_spec_display').classList.add('hidden');
    document.getElementById('add_module_btn').disabled = true;
    currentModuleSpec = null;
  }

  function updateManualSpec() {
    const di = parseInt(document.getElementById('manual_di').value) || 0;
    const do_ = parseInt(document.getElementById('manual_do').value) || 0;
    const ai = parseInt(document.getElementById('manual_ai').value) || 0;
    const ao = parseInt(document.getElementById('manual_ao').value) || 0;
    const total = di + do_ + ai + ao;

    // Update displayed values
    document.getElementById('spec_di').textContent = di;
    document.getElementById('spec_do').textContent = do_;
    document.getElementById('spec_ai').textContent = ai;
    document.getElementById('spec_ao').textContent = ao;
    document.getElementById('spec_total').textContent = total;

    // Update currentModuleSpec if it exists
    if (currentModuleSpec) {
      currentModuleSpec.digital_inputs = di;
      currentModuleSpec.digital_outputs = do_;
      currentModuleSpec.analog_inputs = ai;
      currentModuleSpec.analog_outputs = ao;
      currentModuleSpec.total_channels = total;
    }
  }

  function addModule() {
    if (!currentModuleSpec) {
      alert('Please lookup a module specification first.');
      return;
    }

    console.log('Current module spec before adding:', currentModuleSpec);

    const company = document.getElementById('module_company').value;
    const model = document.getElementById('module_model').value.trim();
    const rackNo = document.getElementById('module_rack').value;
    const modulePosition = document.getElementById('module_position').value;
    const startingSno = document.getElementById('module_starting_sno').value;

    // Check for duplicate rack/position
    const duplicate = configuredModules.find(m => 
      m.rack_no === rackNo && m.module_position === modulePosition
    );

    if (duplicate) {
      alert(`A module is already configured at Rack ${rackNo}, Position ${modulePosition}`);
      return;
    }

    // Get manual override values
    const manualDI = document.getElementById('manual_di').value.trim();
    const manualDO = document.getElementById('manual_do').value.trim();
    const manualAI = document.getElementById('manual_ai').value.trim();
    const manualAO = document.getElementById('manual_ao').value.trim();

    // Use manual values if provided, otherwise use the displayed values (which are from lookup)
    const digitalInputs = manualDI !== '' ? parseInt(manualDI) : parseInt(document.getElementById('spec_di').textContent) || 0;
    const digitalOutputs = manualDO !== '' ? parseInt(manualDO) : parseInt(document.getElementById('spec_do').textContent) || 0;
    const analogInputs = manualAI !== '' ? parseInt(manualAI) : parseInt(document.getElementById('spec_ai').textContent) || 0;
    const analogOutputs = manualAO !== '' ? parseInt(manualAO) : parseInt(document.getElementById('spec_ao').textContent) || 0;

    const moduleConfig = {
      company: company,
      model: model,
      rack_no: rackNo,
      module_position: modulePosition,
      starting_sno: parseInt(startingSno) || 1,
      digital_inputs: digitalInputs,
      digital_outputs: digitalOutputs,
      analog_inputs: analogInputs,
      analog_outputs: analogOutputs,
      spec: {
        digital_inputs: digitalInputs,
        digital_outputs: digitalOutputs,
        analog_inputs: analogInputs,
        analog_outputs: analogOutputs,
        description: currentModuleSpec.description || `${company} ${model}`,
        voltage_range: currentModuleSpec.voltage_range || '24 VDC',
        current_range: currentModuleSpec.current_range || '4-20mA',
        verified: true
      }
    };

    console.log('Module config being added:', moduleConfig);

    configuredModules.push(moduleConfig);
    updateModulesList();
    updateModuleStats();

    // Clear form and manual overrides
    document.getElementById('module_model').value = '';
    document.getElementById('module_position').value = parseInt(modulePosition) + 1;
    document.getElementById('manual_di').value = '';
    document.getElementById('manual_do').value = '';
    document.getElementById('manual_ai').value = '';
    document.getElementById('manual_ao').value = '';
    hideModuleSpec();

    // Enable generation buttons
    updateGenerationButtons();
  }

  function addModbusRange() {
    const startAddr = parseInt(document.getElementById('modbus_start').value);
    const endAddr = parseInt(document.getElementById('modbus_end').value);
    const dataType = document.getElementById('modbus_type').value;
    const description = document.getElementById('modbus_description').value.trim() || 'Modbus Range';
    const range = document.getElementById('modbus_range').value.trim();

    if (isNaN(startAddr) || isNaN(endAddr)) {
      alert('Please enter valid start and end addresses.');
      return;
    }

    if (startAddr > endAddr) {
      alert('Start address must be less than or equal to end address.');
      return;
    }

    // Check for overlapping ranges
    const overlap = configuredModbusRanges.find(r => 
      r.data_type === dataType && (
        (startAddr >= r.start_address && startAddr <= r.end_address) ||
        (endAddr >= r.start_address && endAddr <= r.end_address) ||
        (startAddr <= r.start_address && endAddr >= r.end_address)
      )
    );

    if (overlap) {
      alert(`Address range ${startAddr}-${endAddr} overlaps with existing ${dataType} range ${overlap.start_address}-${overlap.end_address}`);
      return;
    }

    const rangeConfig = {
      start_address: startAddr,
      end_address: endAddr,
      data_type: dataType,
      description: description,
      range: range
    };

    configuredModbusRanges.push(rangeConfig);
    updateModbusRangesList();

    // Clear form
    document.getElementById('modbus_start').value = '';
    document.getElementById('modbus_end').value = '';
    document.getElementById('modbus_description').value = '';
    document.getElementById('modbus_range').value = '';

    // Enable generation buttons
    updateGenerationButtons();
  }

  function updateModulesList() {
    const container = document.getElementById('modules_container');

    if (configuredModules.length === 0) {
      container.innerHTML = '<p class="no-modules">No modules configured yet. Add modules above to get started.</p>';
      return;
    }

    const modulesHtml = configuredModules.map((module, index) => {
      // Get channel counts from either spec object or top-level properties
      const di = module.spec?.digital_inputs || module.digital_inputs || 0;
      const do_ = module.spec?.digital_outputs || module.digital_outputs || 0;
      const ai = module.spec?.analog_inputs || module.analog_inputs || 0;
      const ao = module.spec?.analog_outputs || module.analog_outputs || 0;
      const total = di + do_ + ai + ao;

      return `
        <div class="module-item" data-index="${index}">
          <div class="module-header">
            <h5>${module.company} ${module.model}</h5>
            <button type="button" class="remove-module-btn" onclick="removeModule(${index})">
              <i class="fa fa-trash"></i>
            </button>
          </div>
          <div class="module-details">
            <span>Rack: ${module.rack_no}</span>
            <span>Position: ${module.module_position}</span>
            <span>DI: ${di}</span>
            <span>DO: ${do_}</span>
            <span>AI: ${ai}</span>
            <span>AO: ${ao}</span>
            <span>Total: ${total} channels</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = modulesHtml;
  }

  function updateModbusRangesList() {
    const container = document.getElementById('modbus_ranges_container');

    if (configuredModbusRanges.length === 0) {
      container.innerHTML = '<p class="no-ranges">No Modbus ranges configured.</p>';
      return;
    }

    const rangesHtml = configuredModbusRanges.map((range, index) => `
      <div class="range-item" data-index="${index}">
        <div class="range-header">
          <h6>${range.description}</h6>
          <button type="button" class="remove-range-btn" onclick="removeModbusRange(${index})">
            <i class="fa fa-trash"></i>
          </button>
        </div>
        <div class="range-details">
          <span>Addresses: ${range.start_address}-${range.end_address}</span>
          <span>Type: ${range.data_type}</span>
          <span>Count: ${range.end_address - range.start_address + 1}</span>
          ${range.range ? `<span>Range: ${range.range}</span>` : ''}
        </div>
      </div>
    `).join('');

    container.innerHTML = rangesHtml;
  }

  function updateModuleStats() {
    const totalModules = configuredModules.length;

    const digitalModules = configuredModules.filter(m => {
      const di = m.spec?.digital_inputs || m.digital_inputs || 0;
      const do_ = m.spec?.digital_outputs || m.digital_outputs || 0;
      const ai = m.spec?.analog_inputs || m.analog_inputs || 0;
      const ao = m.spec?.analog_outputs || m.analog_outputs || 0;
      return (di > 0 || do_ > 0) && ai === 0 && ao === 0;
    }).length;

    const analogModules = configuredModules.filter(m => {
      const di = m.spec?.digital_inputs || m.digital_inputs || 0;
      const do_ = m.spec?.digital_outputs || m.digital_outputs || 0;
      const ai = m.spec?.analog_inputs || m.analog_inputs || 0;
      const ao = m.spec?.analog_outputs || m.analog_outputs || 0;
      return (ai > 0 || ao > 0) && di === 0 && do_ === 0;
    }).length;

    const mixedModules = configuredModules.filter(m => {
      const di = m.spec?.digital_inputs || m.digital_inputs || 0;
      const do_ = m.spec?.digital_outputs || m.digital_outputs || 0;
      const ai = m.spec?.analog_inputs || m.analog_inputs || 0;
      const ao = m.spec?.analog_outputs || m.analog_outputs || 0;
      return (di > 0 || do_ > 0) && (ai > 0 || ao > 0);
    }).length;

    document.getElementById('total_modules').value = totalModules;
    document.getElementById('digital_modules').value = digitalModules;
    document.getElementById('analog_modules').value = analogModules;
    document.getElementById('mixed_modules').value = mixedModules;
  }

  function updateGenerationButtons() {
    const hasModules = configuredModules.length > 0;
    const hasModbus = configuredModbusRanges.length > 0;
    const canGenerate = hasModules || hasModbus;

    document.getElementById('generate_tables_btn').disabled = !canGenerate;
    document.getElementById('preview_tables_btn').disabled = !canGenerate;
  }

  function removeModule(index) {
    if (confirm('Are you sure you want to remove this module?')) {
      configuredModules.splice(index, 1);
      updateModulesList();
      updateModuleStats();
      updateGenerationButtons();
    }
  }

  function removeModbusRange(index) {
    if (confirm('Are you sure you want to remove this Modbus range?')) {
      configuredModbusRanges.splice(index, 1);
      updateModbusRangesList();
      updateGenerationButtons();
    }
  }

  async function generateIOTables() {
    if (configuredModules.length === 0 && configuredModbusRanges.length === 0) {
      alert('Please configure at least one module or Modbus range first.');
      return;
    }

    const generateBtn = document.getElementById('generate_tables_btn');
    generateBtn.textContent = '⚙️ Generating...';
    generateBtn.disabled = true;

    showGenerationStatus('Generating I/O tables...', 'info');

    try {
      const response = await fetch('/io-builder/api/generate-io-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.querySelector('[name="csrf_token"]').value
        },
        body: JSON.stringify({
          modules: configuredModules,
          modbus_ranges: configuredModbusRanges
        })
      });

      const data = await response.json();

      if (data.success) {
        populateIOTables(data.tables);
        showGenerationStatus(`Successfully generated ${data.summary.total_digital_inputs + data.summary.total_digital_outputs + data.summary.total_analog_inputs + data.summary.total_analog_outputs + data.summary.total_modbus_digital + data.summary.total_modbus_analog} signals`, 'success');

        // Move to next step automatically
        setTimeout(() => {
          goToStep(7); // Go to I/O Testing step
        }, 2000);
      } else {
        showGenerationStatus(`Error: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Generation error:', error);
      showGenerationStatus('Error connecting to generation service', 'error');
    } finally {
      generateBtn.textContent = '📋 Generate I/O Tables';
      generateBtn.disabled = false;
    }
  }

  async function previewTables() {
    if (configuredModules.length === 0 && configuredModbusRanges.length === 0) {
      alert('Please configure at least one module or Modbus range first.');
      return;
    }

    // Show a preview modal or expand a preview section
    showGenerationStatus('Generating preview...', 'info');

    try {
      const response = await fetch('/io-builder/api/generate-io-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.querySelector('[name="csrf_token"]').value
        },
        body: JSON.stringify({
          modules: configuredModules,
          modbus_ranges: configuredModbusRanges
        })
      });

      const data = await response.json();

      if (data.success) {
        // Create a preview display
        let previewContent = `
          <h4>Table Preview</h4>
          <p><strong>Digital Inputs:</strong> ${data.summary.total_digital_inputs}</p>
          <p><strong>Digital Outputs:</strong> ${data.summary.total_digital_outputs}</p>
          <p><strong>Analog Inputs:</strong> ${data.summary.total_analog_inputs}</p>
          <p><strong>Analog Outputs:</strong> ${data.summary.total_analog_outputs}</p>
          <p><strong>Modbus Digital:</strong> ${data.summary.total_modbus_digital}</p>
          <p><strong>Modbus Analog:</strong> ${data.summary.total_modbus_analog}</p>
          <p><em>Click "Generate I/O Tables" to populate the forms.</em></p>
        `;

        alert(previewContent.replace(/<[^>]*>/g, '')); // Simple text preview
        showGenerationStatus('Preview generated successfully', 'success');
      } else {
        showGenerationStatus(`Error: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Preview error:', error);
      showGenerationStatus('Error generating preview', 'error');
    }
  }

  function populateIOTables(tables) {
    console.log('Populating I/O tables with data:', tables);

    // Populate Digital Input Signals table
    if (tables.digital_inputs && tables.digital_inputs.length > 0) {
      console.log('Populating digital inputs:', tables.digital_inputs.length, 'signals');
      populateTableFromData('digital-signals-body', tables.digital_inputs, 'tmpl-digital-signal');
    }

    // Populate Digital Output Signals table
    if (tables.digital_outputs && tables.digital_outputs.length > 0) {
      console.log('Populating digital outputs:', tables.digital_outputs.length, 'signals');
      populateTableFromData('digital-outputs-body', tables.digital_outputs, 'tmpl-digital-output');
    }

    // Populate Analogue Input Signals table  
    if (tables.analog_inputs && tables.analog_inputs.length > 0) {
      console.log('Populating analog inputs:', tables.analog_inputs.length, 'signals');
      populateTableFromData('analogue-inputs-body', tables.analog_inputs, 'tmpl-analogue-input');
    }

    // Populate Analogue Output Signals table  
    if (tables.analog_outputs && tables.analog_outputs.length > 0) {
      console.log('Populating analog outputs:', tables.analog_outputs.length, 'signals');
      populateTableFromData('analogue-outputs-body', tables.analog_outputs, 'tmpl-analogue-output');
    }

    // Populate Modbus Digital table
    if (tables.modbus_digital && tables.modbus_digital.length > 0) {
      console.log('Populating modbus digital:', tables.modbus_digital.length, 'signals');
      populateTableFromData('modbus-digital-body', tables.modbus_digital, 'tmpl-modbus-digital');
    }

    // Populate Modbus Analogue table
    if (tables.modbus_analog && tables.modbus_analog.length > 0) {
      console.log('Populating modbus analog:', tables.modbus_analog.length, 'signals');
      populateTableFromData('modbus-analogue-body', tables.modbus_analog, 'tmpl-modbus-analogue');
    }

    console.log('I/O table population completed');
  }

  function populateTableFromData(tbodyId, data, templateId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody || !data || data.length === 0) {
      console.log(`No data to populate for ${tbodyId}:`, data);
      return;
    }

    console.log(`Populating ${tbodyId} with ${data.length} rows:`, data);

    // Clear existing rows
    tbody.innerHTML = '';

    data.forEach((rowData, index) => {
      const template = document.getElementById(templateId);
      if (!template) {
        console.error(`Template ${templateId} not found`);
        return;
      }

      const clone = template.content.cloneNode(true);
      const row = clone.querySelector('tr');

      // Define direct field mappings based on actual template field names
      const fieldMappings = {
        'digital-signals-body': {
          'sno': 'sno[]',
          'rack_no': 'rack_no[]', 
          'module_position': 'module_position[]',
          'signal_tag': 'signal_tag[]',
          'signal_description': 'signal_description[]',
          'result': 'result[]',
          'punch_item': 'punch_item[]',
          'verified_by': 'verified_by[]',
          'comment': 'comment[]'
        },
        'digital-outputs-body': {
          'sno': 'output_sno[]',
          'rack_no': 'output_rack_no[]',
          'module_position': 'output_module_position[]',
          'signal_tag': 'output_signal_tag[]',
          'signal_description': 'output_signal_description[]',
          'result': 'output_result[]',
          'punch_item': 'output_punch_item[]',
          'verified_by': 'output_verified_by[]',
          'comment': 'output_comment[]'
        },
        'analogue-inputs-body': {
          'sno': 'analog_sno[]',
          'rack_no': 'analog_rack_no[]',
          'module_position': 'analog_module_position[]',
          'signal_tag': 'analog_signal_tag[]',
          'signal_description': 'analog_signal_description[]',
          'result': 'analog_result[]',
          'punch_item': 'analog_punch_item[]',
          'verified_by': 'analog_verified_by[]',
          'comment': 'analog_comment[]'
        },
        'analogue-outputs-body': {
          'sno': 'analog_output_sno[]',
          'rack_no': 'analog_output_rack_no[]',
          'module_position': 'analog_output_module_position[]',
          'signal_tag': 'analog_output_signal_tag[]',
          'signal_description': 'analog_output_signal_description[]',
          'result': 'analog_output_result[]',
          'punch_item': 'analog_output_punch_item[]',
          'verified_by': 'analog_output_verified_by[]',
          'comment': 'analog_output_comment[]'
        },
        'modbus-digital-body': {
          'address': 'Address[]',
          'description': 'Description[]',
          'remarks': 'Remarks[]',
          'result': 'Digital_Result[]',
          'punch_item': 'Digital_Punch Item[]',
          'verified_by': 'Digital_Verified By[]',
          'comment': 'Digital_Comment[]'
        },
        'modbus-analogue-body': {
          'address': 'Address Analogue[]',
          'description': 'Description Analogue[]',
          'range': 'Range Analogue[]',
          'result': 'Result Analogue[]',
          'punch_item': 'Punch Item Analogue[]',
          'verified_by': 'Verified By Analogue[]',
          'comment': 'Comment Analogue[]'
        }
      };

      const mapping = fieldMappings[tbodyId] || {};

      // Fill in the data using direct field mapping
      Object.entries(rowData).forEach(([serverKey, value]) => {
        let input = null;

        // First try direct mapping
        const mappedFieldName = mapping[serverKey];
        if (mappedFieldName) {
          input = row.querySelector(`[name="${mappedFieldName}"]`);
          if (input) {
            console.log(`Direct mapping: ${serverKey} -> ${mappedFieldName}`);
          }
        }

        // If direct mapping failed, try some variations
        if (!input) {
          const possibleNames = [
            `${serverKey}[]`,
            `${serverKey.charAt(0).toUpperCase() + serverKey.slice(1)}[]`,
            `${serverKey.toUpperCase()}[]`,
            `${serverKey.replace(/_/g, ' ')}[]`,
            `${serverKey.replace(/_/g, '_').charAt(0).toUpperCase() + serverKey.replace(/_/g, '_').slice(1)}[]`
          ];

          for (const name of possibleNames) {
            input = row.querySelector(`[name="${name}"]`);
            if (input) {
              console.log(`Found via variation: ${serverKey} -> ${name}`);
              break;
            }
          }
        }

        // Set the value if input found
        if (input) {
          if (input.tagName === 'TEXTAREA') {
            input.value = value || '';
            input.textContent = value || '';
          } else {
            input.value = value || '';
          }
          console.log(`✓ Populated ${serverKey} with: "${value}"`);
        } else {
          console.warn(`✗ No input found for field: ${serverKey} in table ${tbodyId}`);
          // Debug: list all available inputs
          const availableInputs = Array.from(row.querySelectorAll('input, textarea, select')).map(inp => ({
            name: inp.name,
            placeholder: inp.placeholder
          }));
          console.log('Available inputs:', availableInputs);
        }
      });

      tbody.appendChild(clone);
    });

    console.log(`Successfully populated ${data.length} rows in ${tbodyId}`);
  }

  function showGenerationStatus(message, type) {
    const statusDiv = document.getElementById('generation_status');
    const statusText = document.getElementById('status_text');

    statusDiv.classList.remove('hidden');
    statusText.textContent = message;

    // Update styling based on type
    statusDiv.className = `generation-status ${type}`;
  }

  // Setup Quick Actions dropdown
  function setupQuickActionsDropdown() {
    const quickActionsBtn = document.getElementById('quick-actions-btn');
    const quickActionsDropdown = document.getElementById('quick-actions-dropdown');

    if (quickActionsBtn && quickActionsDropdown) {
      quickActionsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        quickActionsDropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!quickActionsBtn.contains(e.target) && !quickActionsDropdown.contains(e.target)) {
          quickActionsDropdown.classList.remove('show');
        }
      });
    }
  }

  // Add to global functions for I/O Builder
  window.removeModule = removeModule;
  window.removeModbusRange = removeModbusRange;
  window.lookupModule = lookupModule;
  window.addModule = addModule;
  window.addModbusRange = addModbusRange;
  window.generateIOTables = generateIOTables;
  window.previewTables = previewTables;

  // Initialize the form
  window.addEventListener('DOMContentLoaded', () => {
    loadState();
    goToStep(1);
    setupEventHandlers();
    setupFileInputs();
    improveSignaturePad();
    setupFieldValidation(); // Added this line to initialize field validation
    setupRealtimeValidation(); // Add real-time validation
    setupKeyboardNavigation(); // Add keyboard navigation
    makeProgressStepsAccessible(); // Add accessibility features
    setupCsrfRefresh();
    setupSaveProgressButtons();
    initializeIOBuilder(); // Add I/O builder initialization
    setupQuickActionsDropdown(); // Add quick actions setup

    // Form submission handling is already set up in the consolidated handler above
    // Auto-save on form changes
    const form = document.querySelector('form');
    if (form) {
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.addEventListener('change', debounce(saveFormProgress, 2000));
      });
    }

    // Initialize email selection functionality
    initializeEmailSelection();

    // Display version information
    displayVersionInfo();

    // Initialize user dropdown
    setupUserDropdown();

    // Announce form readiness to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.textContent = 'SAT Report form loaded. Use Tab to navigate, Ctrl+Tab to switch between steps.';
    document.body.appendChild(announcement);
  });

  // Setup save progress buttons
  function setupSaveProgressButtons() {
    document.querySelectorAll('.save-progress-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const success = await saveFormProgress();
        if (success) {
          // Show success message
          const notification = document.createElement('div');
          notification.style.position = 'fixed';
          notification.style.bottom = '20px';
          notification.style.right = '20px';
          notification.style.backgroundColor = '#4CAF50';
          notification.style.color = 'white';
          notification.style.padding = '10px 20px';
          notification.style.borderRadius = '4px';
          notification.style.zIndex = '9999';
          notification.textContent = 'Progress saved successfully!';
          document.body.appendChild(notification);

          setTimeout(() => {
            document.body.removeChild(notification);
          }, 3000);
        }
      });
    });
  }

  // Column management functions
  window.toggleAllColumns = function(button) {
    const table = button.closest('.table-responsive').querySelector('table');
    const hiddenCols = table.querySelectorAll('.col-priority-low, .col-priority-medium');

    hiddenCols.forEach(col => {
      col.style.display = col.style.display === 'none' ? '' : 'none';
    });

    button.innerHTML = hiddenCols[0]?.style.display === 'none' ? 
      '<i class="fas fa-columns"></i> Show All Columns' : 
      '<i class="fas fa-eye-slash"></i> Hide Extra Columns';
  };

  window.toggleEssentialColumns = function(button) {
    const table = button.closest('.table-responsive').querySelector('table');
    const nonEssentialCols = table.querySelectorAll('.col-priority-low, .col-priority-medium');
    const essentialCols = table.querySelectorAll('.col-priority-high');

    const isShowingEssential = nonEssentialCols[0]?.style.display === 'none';

    if (isShowingEssential) {
      // Show all columns
      nonEssentialCols.forEach(col => col.style.display = '');
      button.innerHTML = '<i class="fas fa-eye"></i> Essential Only';
    } else {
      // Show only essential columns
      nonEssentialCols.forEach(col => col.style.display = 'none');
      button.innerHTML = '<i class="fas fa-columns"></i> Show All Columns';
    }
  };

  // Utility function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Expose public methods
  window.startProcess = startProcess;
  window.showSATForm = showSATForm;
  window.backToWelcome = backToWelcome;
  window.goToStep = goToStep;
  window.addRelatedDoc = addRelatedDoc;
  window.addPreApprovalRow = addPreApprovalRow;
  window.addPostApprovalRow = addPostApprovalRow;
  window.addPretestRow = addPretestRow;
  window.addKeyComponentRow = addKeyComponentRow;
  window.addIPRecordRow = addIPRecordRow;
  window.addSignalListRow = addSignalListRow;
  window.addDigitalOutputRow = addDigitalOutputRow;
  window.addAnalogueInputRow = addAnalogueInputRow;
  window.addAnalogueOutputRow = addAnalogueOutputRow;
  window.addModbusDigitalRow = addModbusDigitalRow;
  window.addModbusAnalogueRow = addModbusAnalogueRow;
  window.addProcessTestRow = addProcessTestRow;
  window.addScadaVerificationRow = addScadaVerificationRow;
  window.addTrendsTestingRow = addTrendsTestingRow;
  window.addAlarmListRow = addAlarmListRow;

  // Debounce function to limit auto-save frequency
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Initialize email selection functionality
  function initializeEmailSelection() {
    // Fetch users by role
    fetch('/api/get-users-by-role')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          populateEmailSelectors(data.users);
        } else {
          console.error('Failed to fetch users:', data.error);
        }
      })
      .catch(error => {
        console.error('Error fetching users:', error);
      });

    // Set up event listeners for email selectors
    document.querySelectorAll('.email-select').forEach(select => {
      select.addEventListener('change', function() {
        const targetInput = document.getElementById(this.dataset.target);
        if (targetInput && this.value) {
          targetInput.value = this.value;
          // Trigger change event for auto-save
          targetInput.dispatchEvent(new Event('change'));
        }
      });
    });
  }

  // Populate email selector dropdowns
  function populateEmailSelectors(users) {
    // Technical Manager (TM role users)
    const techManagerSelect = document.getElementById('approver_1_select');
    if (techManagerSelect && users.TM) {
      // Clear existing options except the first one
      const firstOption = techManagerSelect.querySelector('option');
      techManagerSelect.innerHTML = '';
      if (firstOption) {
        techManagerSelect.appendChild(firstOption);
      }

      users.TM.forEach(user => {
        const option = document.createElement('option');
        option.value = user.email;
        option.textContent = `${user.name} (${user.email})`;
        techManagerSelect.appendChild(option);
      });
    }

    // Project Manager (PM role users)
    const pmSelect = document.getElementById('approver_2_select');
    if (pmSelect && users.PM) {
      // Clear existing options except the first one
      const firstOption = pmSelect.querySelector('option');
      pmSelect.innerHTML = '';
      if (firstOption) {
        pmSelect.appendChild(firstOption);
      }

      users.PM.forEach(user => {
        const option = document.createElement('option');
        option.value = user.email;
        option.textContent = `${user.name} (${user.email})`;
        pmSelect.appendChild(option);
      });
    }

    // Client (All users can be clients, but primarily show admins and engineers)
    const clientSelect = document.getElementById('approver_3_select');
    if (clientSelect) {
      // Clear existing options except the first one
      const firstOption = clientSelect.querySelector('option');
      clientSelect.innerHTML = '';
      if (firstOption) {
        clientSelect.appendChild(firstOption);
      }

      // Add all user types for client selection
      ['Admin', 'Engineer', 'TM', 'PM'].forEach(role => {
        if (users[role] && users[role].length > 0) {
          const optgroup = document.createElement('optgroup');
          optgroup.label = role === 'TM' ? 'Technical Managers' : role + 's';

          users[role].forEach(user => {
            const option = document.createElement('option');
            option.value = user.email;
            option.textContent = `${user.name} (${user.email})`;
            optgroup.appendChild(option);
          });

          clientSelect.appendChild(optgroup);
        }
      });
    }
  }

  // Display version information
  function displayVersionInfo() {
    // This function can be implemented to show version information
    console.log('SAT Report Generator v2.0');
  }

  // Setup user dropdown functionality
  function setupUserDropdown() {
    const userDetails = document.querySelector('.user-details');
    const userDropdown = document.querySelector('.user-dropdown-menu');

    if (userDetails && userDropdown) {
      userDetails.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!userDetails.contains(e.target)) {
          userDropdown.classList.remove('show');
        }
      });
    }
  }

  // Initialize responsive tables with mobile card layout
  function initializeResponsiveTables() {
    const tables = document.querySelectorAll('table');

    tables.forEach(table => {
      createMobileCardLayout(table);
      setupColumnPriorities(table);
      setupStickyColumns(table);
      addHeaderTooltips(table);
    });

    // Handle window resize
    window.addEventListener('resize', debounce(handleTableResize, 250));
  }

  function createMobileCardLayout(table) {
    const tableContainer = table.closest('.table-responsive');
    if (!tableContainer) return;

    // Wrap existing table for desktop
    const desktopWrapper = document.createElement('div');
    desktopWrapper.className = 'desktop-table-wrapper';
    table.parentNode.insertBefore(desktopWrapper, table);
    desktopWrapper.appendChild(table);

    // Create mobile cards container
    const mobileContainer = document.createElement('div');
    mobileContainer.className = 'mobile-table-cards';

    // Add scroll hint
    const scrollHint = document.createElement('div');
    scrollHint.className = 'mobile-scroll-hint';
    scrollHint.textContent = '📱 Optimized for mobile viewing';
    mobileContainer.appendChild(scrollHint);

    // Extract table data and create cards
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => ({
      text: th.textContent.trim(),
      priority: getColumnPriority(th),
      index: Array.from(th.parentNode.children).indexOf(th)
    }));

    const rows = Array.from(table.querySelectorAll('tbody tr'));

    rows.forEach((row, index) => {
      const card = createMobileCard(row, headers, index);
      mobileContainer.appendChild(card);
    });

    tableContainer.appendChild(mobileContainer);

    // Watch for table changes and update mobile cards
    const observer = new MutationObserver(() => {
      updateMobileCards(table, mobileContainer, headers);
    });

    observer.observe(table.querySelector('tbody'), {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  function createMobileCard(row, headers, index) {
    const card = document.createElement('div');
    card.className = 'mobile-card';
    card.dataset.rowIndex = index;

    const cells = Array.from(row.querySelectorAll('td'));

    // Card header with primary information
    const header = document.createElement('div');
    header.className = 'mobile-card-header';

    // Get primary identifier (usually first non-empty cell or signal tag)
    let primaryId = `Item ${index + 1}`;
    let signalTag = '';

    // Look for Signal TAG column (usually around index 3-4)
    const signalTagCell = cells.find((cell, idx) => {
      const headerText = headers[idx]?.text.toLowerCase() || '';
      return headerText.includes('signal') && headerText.includes('tag');
    });

    if (signalTagCell) {
      const input = signalTagCell.querySelector('input');
      signalTag = input ? input.value : signalTagCell.textContent.trim();
    }

    // Use S.No if available
    if (cells[0]) {
      const input = cells[0].querySelector('input');
      const sno = input ? input.value : cells[0].textContent.trim();
      if (sno) primaryId = sno;
    }

    header.innerHTML = `
      <span class="mobile-card-title">${signalTag || 'Signal'}</span>
      <span class="mobile-card-number">#${primaryId}</span>
    `;

    card.appendChild(header);

    // Card body with essential fields
    const body = document.createElement('div');
    body.className = 'mobile-card-body';

    // Essential fields (high priority columns)
    const essentialFields = document.createElement('div');
    essentialFields.className = 'mobile-essential-fields';

    headers.forEach((header, colIndex) => {
      if (header.priority === 'high' && colIndex < cells.length - 1) { // Exclude actions column
        const cell = cells[colIndex];
        if (cell) {
          const fieldGroup = createMobileField(header.text, cell, colIndex);
          essentialFields.appendChild(fieldGroup);
        }
      }
    });

    body.appendChild(essentialFields);

    // Expandable section for other fields
    const expandable = document.createElement('div');
    expandable.className = 'mobile-expandable';

    const toggle = document.createElement('button');
    toggle.className = 'mobile-expand-toggle';
    toggle.innerHTML = `
      <span>More Details</span>
      <i class="fas fa-chevron-down"></i>
    `;

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      expandable.classList.toggle('expanded');
    });

    const expandableContent = document.createElement('div');
    expandableContent.className = 'mobile-expandable-content';

    headers.forEach((header, colIndex) => {
      if (header.priority !== 'high' && colIndex < cells.length - 1) { // Exclude actions column
        const cell = cells[colIndex];
        if (cell) {
          const fieldGroup = createMobileField(header.text, cell, colIndex);
          expandableContent.appendChild(fieldGroup);
        }
      }
    });

    expandable.appendChild(toggle);
    expandable.appendChild(expandableContent);
    body.appendChild(expandable);

    // Actions
    const actionsCell = cells[cells.length - 1];
    if (actionsCell) {
      const actions = document.createElement('div');
      actions.className = 'mobile-card-actions';

      const buttons = actionsCell.querySelectorAll('button');
      buttons.forEach(btn => {
        const mobileBtn = btn.cloneNode(true);
        mobileBtn.className = `mobile-action-btn ${btn.classList.contains('remove-row-btn') ? 'delete' : 'edit'}`;

        // Ensure the cloned button maintains functionality
        if (btn.classList.contains('remove-row-btn')) {
          mobileBtn.addEventListener('click', () => {
            // Remove both the original row and the mobile card
            btn.click();
            card.remove();
          });
        }

        actions.appendChild(mobileBtn);
      });

      body.appendChild(actions);
    }

    card.appendChild(body);
    return card;
  }

  function createMobileField(label, cell, colIndex) {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'mobile-field-group';

    const fieldLabel = document.createElement('div');
    fieldLabel.className = 'mobile-field-label';
    fieldLabel.textContent = label;

    const fieldValue = document.createElement('div');
    fieldValue.className = 'mobile-field-value';

    // Clone the input/content from the cell
    const input = cell.querySelector('input, select, textarea');
    if (input) {
      const clonedInput = input.cloneNode(true);

      // Sync values between original table input and mobile card input
      clonedInput.addEventListener('input', () => {
        input.value = clonedInput.value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      input.addEventListener('input', () => {
        clonedInput.value = input.value;
      });

      fieldValue.appendChild(clonedInput);
    } else {
      fieldValue.textContent = cell.textContent.trim();
    }

    fieldGroup.appendChild(fieldLabel);
    fieldGroup.appendChild(fieldValue);

    return fieldGroup;
  }

  function setupColumnPriorities(table) {
    const headers = table.querySelectorAll('thead th');
    const rows = table.querySelectorAll('tbody tr');

    headers.forEach((header, index) => {
      const priority = getColumnPriority(header);
      header.classList.add(`col-priority-${priority}`);

      // Apply same class to all cells in this column
      rows.forEach(row => {
        const cell = row.cells[index];
        if (cell) {
          cell.classList.add(`col-priority-${priority}`);
        }
      });

      // Add sticky classes for important columns
      const text = header.textContent.toLowerCase();
      if (text.includes('signal') && text.includes('tag')) {
        header.classList.add('col-sticky');
        rows.forEach(row => {
          const cell = row.cells[index];
          if (cell) cell.classList.add('col-sticky');
        });
      }

      // Make actions column sticky
      if (text.includes('action') || index === headers.length - 1) {
        header.classList.add('col-sticky-actions');
        rows.forEach(row => {
          const cell = row.cells[index];
          if (cell) cell.classList.add('col-sticky-actions');
        });
      }
    });
  }

  function getColumnPriority(header) {
    const text = header.textContent.toLowerCase();

    // High priority: essential for identification and results
    if (text.includes('signal') || text.includes('tag') || text.includes('description') || 
        text.includes('result') || text.includes('action')) {
      return 'high';
    }

    // Medium priority: important but not critical
    if (text.includes('rack') || text.includes('position') || text.includes('verified') || 
        text.includes('punch')) {
      return 'medium';
    }

    // Low priority: can be hidden on smaller screens
    return 'low';
  }

  function updateMobileCards(table, mobileContainer, headers) {
    // Find existing cards (skip the scroll hint)
    const cards = Array.from(mobileContainer.querySelectorAll('.mobile-card'));
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    // Remove excess cards
    if (cards.length > rows.length) {
      for (let i = rows.length; i < cards.length; i++) {
        if (cards[i]) cards[i].remove();
      }
    }

    // Add new cards for new rows
    if (rows.length > cards.length) {
      for (let i = cards.length; i < rows.length; i++) {
        const card = createMobileCard(rows[i], headers, i);
        mobileContainer.appendChild(card);
      }
    }

    // Update existing cards
    cards.forEach((card, index) => {
      if (rows[index]) {
        // Update card content if needed
        const newCard = createMobileCard(rows[index], headers, index);
        card.replaceWith(newCard);
      }
    });
  }

  function handleTableResize() {
    // Refresh mobile cards when window resizes
    setTimeout(() => {
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const mobileContainer = table.closest('.table-responsive')?.querySelector('.mobile-table-cards');
        if (mobileContainer) {
          const headers = Array.from(table.querySelectorAll('thead th')).map(th => ({
            text: th.textContent.trim(),
            priority: getColumnPriority(th),
            index: Array.from(th.parentNode.children).indexOf(th)
          }));
          updateMobileCards(table, mobileContainer, headers);
        }
      });
    }, 100);
  }

  // Setup user dropdown functionality
  function setupUserDropdown() {
    const userDetails = document.querySelector('.user-details');
    const userDropdown = document.querySelector('.user-dropdown-menu');

    if (userDetails && userDropdown) {
      userDetails.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!userDetails.contains(e.target)) {
          userDropdown.classList.remove('show');
        }
      });
    }
  }

  // Display version information
  function displayVersionInfo() {
    // This function can be implemented to show version information
    console.log('SAT Report Generator v2.0');
  }

  // Setup user dropdown functionality
  function setupUserDropdown() {
    const userDetails = document.querySelector('.user-details');
    const userDropdown = document.querySelector('.user-dropdown-menu');

    if (userDetails && userDropdown) {
      userDetails.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!userDetails.contains(e.target)) {
          userDropdown.classList.remove('show');
        }
      });
    }
  }

  // Initialize responsive tables with mobile card layout
  function initializeResponsiveTables() {
    const tables = document.querySelectorAll('table');

    tables.forEach(table => {
      createMobileCardLayout(table);
      setupColumnPriorities(table);
      setupStickyColumns(table);
      addHeaderTooltips(table);
    });

    // Handle window resize
    window.addEventListener('resize', debounce(handleTableResize, 250));
  }

  function createMobileCardLayout(table) {
    const tableContainer = table.closest('.table-responsive');
    if (!tableContainer) return;

    // Wrap existing table for desktop
    const desktopWrapper = document.createElement('div');
    desktopWrapper.className = 'desktop-table-wrapper';
    table.parentNode.insertBefore(desktopWrapper, table);
    desktopWrapper.appendChild(table);

    // Create mobile cards container
    const mobileContainer = document.createElement('div');
    mobileContainer.className = 'mobile-table-cards';

    // Add scroll hint
    const scrollHint = document.createElement('div');
    scrollHint.className = 'mobile-scroll-hint';
    scrollHint.textContent = '📱 Optimized for mobile viewing';
    mobileContainer.appendChild(scrollHint);

    // Extract table data and create cards
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => ({
      text: th.textContent.trim(),
      priority: getColumnPriority(th),
      index: Array.from(th.parentNode.children).indexOf(th)
    }));

    const rows = Array.from(table.querySelectorAll('tbody tr'));

    rows.forEach((row, index) => {
      const card = createMobileCard(row, headers, index);
      mobileContainer.appendChild(card);
    });

    tableContainer.appendChild(mobileContainer);

    // Watch for table changes and update mobile cards
    const observer = new MutationObserver(() => {
      updateMobileCards(table, mobileContainer, headers);
    });

    observer.observe(table.querySelector('tbody'), {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  function createMobileCard(row, headers, index) {
    const card = document.createElement('div');
    card.className = 'mobile-card';
    card.dataset.rowIndex = index;

    const cells = Array.from(row.querySelectorAll('td'));

    // Card header with primary information
    const header = document.createElement('div');
    header.className = 'mobile-card-header';

    // Get primary identifier (usually first non-empty cell or signal tag)
    let primaryId = `Item ${index + 1}`;
    let signalTag = '';

    // Look for Signal TAG column (usually around index 3-4)
    const signalTagCell = cells.find((cell, idx) => {
      const headerText = headers[idx]?.text.toLowerCase() || '';
      return headerText.includes('signal') && headerText.includes('tag');
    });

    if (signalTagCell) {
      const input = signalTagCell.querySelector('input');
      signalTag = input ? input.value : signalTagCell.textContent.trim();
    }

    // Use S.No if available
    if (cells[0]) {
      const input = cells[0].querySelector('input');
      const sno = input ? input.value : cells[0].textContent.trim();
      if (sno) primaryId = sno;
    }

    header.innerHTML = `
      <span class="mobile-card-title">${signalTag || 'Signal'}</span>
      <span class="mobile-card-number">#${primaryId}</span>
    `;

    card.appendChild(header);

    // Card body with essential fields
    const body = document.createElement('div');
    body.className = 'mobile-card-body';

    // Essential fields (high priority columns)
    const essentialFields = document.createElement('div');
    essentialFields.className = 'mobile-essential-fields';

    headers.forEach((header, colIndex) => {
      if (header.priority === 'high' && colIndex < cells.length - 1) { // Exclude actions column
        const cell = cells[colIndex];
        if (cell) {
          const fieldGroup = createMobileField(header.text, cell, colIndex);
          essentialFields.appendChild(fieldGroup);
        }
      }
    });

    body.appendChild(essentialFields);

    // Expandable section for other fields
    const expandable = document.createElement('div');
    expandable.className = 'mobile-expandable';

    const toggle = document.createElement('button');
    toggle.className = 'mobile-expand-toggle';
    toggle.innerHTML = `
      <span>More Details</span>
      <i class="fas fa-chevron-down"></i>
    `;

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      expandable.classList.toggle('expanded');
    });

    const expandableContent = document.createElement('div');
    expandableContent.className = 'mobile-expandable-content';

    headers.forEach((header, colIndex) => {
      if (header.priority !== 'high' && colIndex < cells.length - 1) { // Exclude actions column
        const cell = cells[colIndex];
        if (cell) {
          const fieldGroup = createMobileField(header.text, cell, colIndex);
          expandableContent.appendChild(fieldGroup);
        }
      }
    });

    expandable.appendChild(toggle);
    expandable.appendChild(expandableContent);
    body.appendChild(expandable);

    // Actions
    const actionsCell = cells[cells.length - 1];
    if (actionsCell) {
      const actions = document.createElement('div');
      actions.className = 'mobile-card-actions';

      const buttons = actionsCell.querySelectorAll('button');
      buttons.forEach(btn => {
        const mobileBtn = btn.cloneNode(true);
        mobileBtn.className = `mobile-action-btn ${btn.classList.contains('remove-row-btn') ? 'delete' : 'edit'}`;

        // Ensure the cloned button maintains functionality
        if (btn.classList.contains('remove-row-btn')) {
          mobileBtn.addEventListener('click', () => {
            // Remove both the original row and the mobile card
            btn.click();
            card.remove();
          });
        }

        actions.appendChild(mobileBtn);
      });

      body.appendChild(actions);
    }

    card.appendChild(body);
    return card;
  }

  function createMobileField(label, cell, colIndex) {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'mobile-field-group';

    const fieldLabel = document.createElement('div');
    fieldLabel.className = 'mobile-field-label';
    fieldLabel.textContent = label;

    const fieldValue = document.createElement('div');
    fieldValue.className = 'mobile-field-value';

    // Clone the input/content from the cell
    const input = cell.querySelector('input, select, textarea');
    if (input) {
      const clonedInput = input.cloneNode(true);

      // Sync values between original table input and mobile card input
      clonedInput.addEventListener('input', () => {
        input.value = clonedInput.value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      input.addEventListener('input', () => {
        clonedInput.value = input.value;
      });

      fieldValue.appendChild(clonedInput);
    } else {
      fieldValue.textContent = cell.textContent.trim();
    }

    fieldGroup.appendChild(fieldLabel);
    fieldGroup.appendChild(fieldValue);

    return fieldGroup;
  }

  function setupColumnPriorities(table) {
    const headers = table.querySelectorAll('thead th');
    const rows = table.querySelectorAll('tbody tr');

    headers.forEach((header, index) => {
      const priority = getColumnPriority(header);
      header.classList.add(`col-priority-${priority}`);

      // Apply same class to all cells in this column
      rows.forEach(row => {
        const cell = row.cells[index];
        if (cell) {
          cell.classList.add(`col-priority-${priority}`);
        }
      });

      // Add sticky classes for important columns
      const text = header.textContent.toLowerCase();
      if (text.includes('signal') && text.includes('tag')) {
        header.classList.add('col-sticky');
        rows.forEach(row => {
          const cell = row.cells[index];
          if (cell) cell.classList.add('col-sticky');
        });
      }

      // Make actions column sticky
      if (text.includes('action') || index === headers.length - 1) {
        header.classList.add('col-sticky-actions');
        rows.forEach(row => {
          const cell = row.cells[index];
          if (cell) cell.classList.add('col-sticky-actions');
        });
      }
    });
  }

  function getColumnPriority(header) {
    const text = header.textContent.toLowerCase();

    // High priority: essential for identification and results
    if (text.includes('signal') || text.includes('tag') || text.includes('description') || 
        text.includes('result') || text.includes('action')) {
      return 'high';
    }

    // Medium priority: important but not critical
    if (text.includes('rack') || text.includes('position') || text.includes('verified') || 
        text.includes('punch')) {
      return 'medium';
    }

    // Low priority: can be hidden on smaller screens
    return 'low';
  }

  function updateMobileCards(table, mobileContainer, headers) {
    // Find existing cards (skip the scroll hint)
    const cards = Array.from(mobileContainer.querySelectorAll('.mobile-card'));
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    // Remove excess cards
    if (cards.length > rows.length) {
      for (let i = rows.length; i < cards.length; i++) {
        if (cards[i]) cards[i].remove();
      }
    }

    // Add new cards for new rows
    if (rows.length > cards.length) {
      for (let i = cards.length; i < rows.length; i++) {
        const card = createMobileCard(rows[i], headers, i);
        mobileContainer.appendChild(card);
      }
    }

    // Update existing cards
    cards.forEach((card, index) => {
      if (rows[index]) {
        // Update card content if needed
        const newCard = createMobileCard(rows[index], headers, index);
        card.replaceWith(newCard);
      }
    });
  }

  function handleTableResize() {
    // Refresh mobile cards when window resizes
    setTimeout(() => {
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const mobileContainer = table.closest('.table-responsive')?.querySelector('.mobile-table-cards');
        if (mobileContainer) {
          const headers = Array.from(table.querySelectorAll('thead th')).map(th => ({
            text: th.textContent.trim(),
            priority: getColumnPriority(th),
            index: Array.from(th.parentNode.children).indexOf(th)
          }));
          updateMobileCards(table, mobileContainer, headers);
        }
      });
    }, 100);
  }

  // Setup user dropdown functionality
  function setupUserDropdown() {
    const userDetails = document.querySelector('.user-details');
    const userDropdown = document.querySelector('.user-dropdown-menu');

    if (userDetails && userDropdown) {
      userDetails.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!userDetails.contains(e.target)) {
          userDropdown.classList.remove('show');
        }
      });
    }
  }

  // Display version information
  function displayVersionInfo() {
    // This function can be implemented to show version information
    console.log('SAT Report Generator v2.0');
  }

  // Setup user dropdown functionality
  function setupUserDropdown() {
    const userDetails = document.querySelector('.user-details');
    const userDropdown = document.querySelector('.user-dropdown-menu');

    if (userDetails && userDropdown) {
      userDetails.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!userDetails.contains(e.target)) {
          userDropdown.classList.remove('show');
        }
      });
    }
  }

  // Initialize responsive tables with mobile card layout
  function initializeResponsiveTables() {
    const tables = document.querySelectorAll('table');

    tables.forEach(table => {
      createMobileCardLayout(table);
      setupColumnPriorities(table);
      setupStickyColumns(table);
      addHeaderTooltips(table);
    });

    // Handle window resize
    window.addEventListener('resize', debounce(handleTableResize, 250));
  }

  function createMobileCardLayout(table) {
    const tableContainer = table.closest('.table-responsive');
    if (!tableContainer) return;

    // Wrap existing table for desktop
    const desktopWrapper = document.createElement('div');
    desktopWrapper.className = 'desktop-table-wrapper';
    table.parentNode.insertBefore(desktopWrapper, table);
    desktopWrapper.appendChild(table);

    // Create mobile cards container
    const mobileContainer = document.createElement('div');
    mobileContainer.className = 'mobile-table-cards';

    // Add scroll hint
    const scrollHint = document.createElement('div');
    scrollHint.className = 'mobile-scroll-hint';
    scrollHint.textContent = '📱 Optimized for mobile viewing';
    mobileContainer.appendChild(scrollHint);

    // Extract table data and create cards
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => ({
      text: th.textContent.trim(),
      priority: getColumnPriority(th),
      index: Array.from(th.parentNode.children).indexOf(th)
    }));

    const rows = Array.from(table.querySelectorAll('tbody tr'));

    rows.forEach((row, index) => {
      const card = createMobileCard(row, headers, index);
      mobileContainer.appendChild(card);
    });

    tableContainer.appendChild(mobileContainer);

    // Watch for table changes and update mobile cards
    const observer = new MutationObserver(() => {
      updateMobileCards(table, mobileContainer, headers);
    });

    observer.observe(table.querySelector('tbody'), {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  function createMobileCard(row, headers, index) {
    const card = document.createElement('div');
    card.className = 'mobile-card';
    card.dataset.rowIndex = index;

    const cells = Array.from(row.querySelectorAll('td'));

    // Card header with primary information
    const header = document.createElement('div');
    header.className = 'mobile-card-header';

    // Get primary identifier (usually first non-empty cell or signal tag)
    let primaryId = `Item ${index + 1}`;
    let signalTag = '';

    // Look for Signal TAG column (usually around index 3-4)
    const signalTagCell = cells.find((cell, idx) => {
      const headerText = headers[idx]?.text.toLowerCase() || '';
      return headerText.includes('signal') && headerText.includes('tag');
    });

    if (signalTagCell) {
      const input = signalTagCell.querySelector('input');
      signalTag = input ? input.value : signalTagCell.textContent.trim();
    }

    // Use S.No if available
    if (cells[0]) {
      const input = cells[0].querySelector('input');
      const sno = input ? input.value : cells[0].textContent.trim();
      if (sno) primaryId = sno;
    }

    header.innerHTML = `
      <span class="mobile-card-title">${signalTag || 'Signal'}</span>
      <span class="mobile-card-number">#${primaryId}</span>
    `;

    card.appendChild(header);

    // Card body with essential fields
    const body = document.createElement('div');
    body.className = 'mobile-card-body';

    // Essential fields (high priority columns)
    const essentialFields = document.createElement('div');
    essentialFields.className = 'mobile-essential-fields';

    headers.forEach((header, colIndex) => {
      if (header.priority === 'high' && colIndex < cells.length - 1) { // Exclude actions column
        const cell = cells[colIndex];
        if (cell) {
          const fieldGroup = createMobileField(header.text, cell, colIndex);
          essentialFields.appendChild(fieldGroup);
        }
      }
    });

    body.appendChild(essentialFields);

    // Expandable section for other fields
    const expandable = document.createElement('div');
    expandable.className = 'mobile-expandable';

    const toggle = document.createElement('button');
    toggle.className = 'mobile-expand-toggle';
    toggle.innerHTML = `
      <span>More Details</span>
      <i class="fas fa-chevron-down"></i>
    `;

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      expandable.classList.toggle('expanded');
    });

    const expandableContent = document.createElement('div');
    expandableContent.className = 'mobile-expandable-content';

    headers.forEach((header, colIndex) => {
      if (header.priority !== 'high' && colIndex < cells.length - 1) { // Exclude actions column
        const cell = cells[colIndex];
        if (cell) {
          const fieldGroup = createMobileField(header.text, cell, colIndex);
          expandableContent.appendChild(fieldGroup);
        }
      }
    });

    expandable.appendChild(toggle);
    expandable.appendChild(expandableContent);
    body.appendChild(expandable);

    // Actions
    const actionsCell = cells[cells.length - 1];
    if (actionsCell) {
      const actions = document.createElement('div');
      actions.className = 'mobile-card-actions';

      const buttons = actionsCell.querySelectorAll('button');
      buttons.forEach(btn => {
        const mobileBtn = btn.cloneNode(true);
        mobileBtn.className = `mobile-action-btn ${btn.classList.contains('remove-row-btn') ? 'delete' : 'edit'}`;

        // Ensure the cloned button maintains functionality
        if (btn.classList.contains('remove-row-btn')) {
          mobileBtn.addEventListener('click', () => {
            // Remove both the original row and the mobile card
            btn.click();
            card.remove();
          });
        }

        actions.appendChild(mobileBtn);
      });

      body.appendChild(actions);
    }

    card.appendChild(body);
    return card;
  }

  function createMobileField(label, cell, colIndex) {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'mobile-field-group';

    const fieldLabel = document.createElement('div');
    fieldLabel.className = 'mobile-field-label';
    fieldLabel.textContent = label;

    const fieldValue = document.createElement('div');
    fieldValue.className = 'mobile-field-value';

    // Clone the input/content from the cell
    const input = cell.querySelector('input, select, textarea');
    if (input) {
      const clonedInput = input.cloneNode(true);

      // Sync values between original table input and mobile card input
      clonedInput.addEventListener('input', () => {
        input.value = clonedInput.value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      input.addEventListener('input', () => {
        clonedInput.value = input.value;
      });

      fieldValue.appendChild(clonedInput);
    } else {
      fieldValue.textContent = cell.textContent.trim();
    }

    fieldGroup.appendChild(fieldLabel);
    fieldGroup.appendChild(fieldValue);

    return fieldGroup;
  }

  function setupColumnPriorities(table) {
    const headers = table.querySelectorAll('thead th');
    const rows = table.querySelectorAll('tbody tr');

    headers.forEach((header, index) => {
      const priority = getColumnPriority(header);
      header.classList.add(`col-priority-${priority}`);

      // Apply same class to all cells in this column
      rows.forEach(row => {
        const cell = row.cells[index];
        if (cell) {
          cell.classList.add(`col-priority-${priority}`);
        }
      });

      // Add sticky classes for important columns
      const text = header.textContent.toLowerCase();
      if (text.includes('signal') && text.includes('tag')) {
        header.classList.add('col-sticky');
        rows.forEach(row => {
          const cell = row.cells[index];
          if (cell) cell.classList.add('col-sticky');
        });
      }

      // Make actions column sticky
      if (text.includes('action') || index === headers.length - 1) {
        header.classList.add('col-sticky-actions');
        rows.forEach(row => {
          const cell = row.cells[index];
          if (cell) cell.classList.add('col-sticky-actions');
        });
      }
    });
  }

  function getColumnPriority(header) {
    const text = header.textContent.toLowerCase();

    // High priority: essential for identification and results
    if (text.includes('signal') || text.includes('tag') || text.includes('description') || 
        text.includes('result') || text.includes('action')) {
      return 'high';
    }

    // Medium priority: important but not critical
    if (text.includes('rack') || text.includes('position') || text.includes('verified') || 
        text.includes('punch')) {
      return 'medium';
    }

    // Low priority: can be hidden on smaller screens
    return 'low';
  }

  function updateMobileCards(table, mobileContainer, headers) {
    // Find existing cards (skip the scroll hint)
    const cards = Array.from(mobileContainer.querySelectorAll('.mobile-card'));
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    // Remove excess cards
    if (cards.length > rows.length) {
      for (let i = rows.length; i < cards.length; i++) {
        if (cards[i]) cards[i].remove();
      }
    }

    // Add new cards for new rows
    if (rows.length > cards.length) {
      for (let i = cards.length; i < rows.length; i++) {
        const card = createMobileCard(rows[i], headers, i);
        mobileContainer.appendChild(card);
      }
    }

    // Update existing cards
    cards.forEach((card, index) => {
      if (rows[index]) {
        // Update card content if needed
        const newCard = createMobileCard(rows[index], headers, index);
        card.replaceWith(newCard);
      }
    });
  }

  function handleTableResize() {
    // Refresh mobile cards when window resizes
    setTimeout(() => {
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const mobileContainer = table.closest('.table-responsive')?.querySelector('.mobile-table-cards');
        if (mobileContainer) {
          const headers = Array.from(table.querySelectorAll('thead th')).map(th => ({
            text: th.textContent.trim(),
            priority: getColumnPriority(th),
            index: Array.from(th.parentNode.children).indexOf(th)
          }));
          updateMobileCards(table, mobileContainer, headers);
        }
      });
    }, 100);
  }

  // Setup user dropdown functionality
  function setupUserDropdown() {
    const userDetails = document.querySelector('.user-details');
    const userDropdown = document.querySelector('.user-dropdown-menu');

    if (userDetails && userDropdown) {
      userDetails.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!userDetails.contains(e.target)) {
          userDropdown.classList.remove('show');
        }
      });
    }
  }

  // Display version information
  function displayVersionInfo() {
    // This function can be implemented to show version information
    console.log('SAT Report Generator v2.0');
  }

  // Setup user dropdown functionality
  function setupUserDropdown() {
    const userDetails = document.querySelector('.user-details');
    const userDropdown = document.querySelector('.user-dropdown-menu');

    if (userDetails && userDropdown) {
      userDetails.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!userDetails.contains(e.target)) {
          userDropdown.classList.remove('show');
        }
      });
    }
  }

  // Initialize responsive tables with mobile card layout
  function initializeResponsiveTables() {
    const tables = document.querySelectorAll('table');

    tables.forEach(table => {
      createMobileCardLayout(table);
      setupColumnPriorities(table);
      setupStickyColumns(table);
      addHeaderTooltips(table);
    });

    // Handle window resize
    window.addEventListener('resize', debounce(handleTableResize, 250));
  }

  function createMobileCardLayout(table) {
    const tableContainer = table.closest('.table-responsive');
    if (!tableContainer) return;

    // Wrap existing table for desktop
    const desktopWrapper = document.createElement('div');
    desktopWrapper.className = 'desktop-table-wrapper';
    table.parentNode.insertBefore(desktopWrapper, table);
    desktopWrapper.appendChild(table);

    // Create mobile cards container
    const mobileContainer = document.createElement('div');
    mobileContainer.className = 'mobile-table-cards';

    // Add scroll hint
    const scrollHint = document.createElement('div');
    scrollHint.className = 'mobile-scroll-hint';
    scrollHint.textContent = '📱 Optimized for mobile viewing';
    mobileContainer.appendChild(scrollHint);

    // Extract table data and create cards
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => ({
      text: th.textContent.trim(),
      priority: getColumnPriority(th),
      index: Array.from(th.parentNode.children).indexOf(th)
    }));

    const rows = Array.from(table.querySelectorAll('tbody tr'));

    rows.forEach((row, index) => {
      const card = createMobileCard(row, headers, index);
      mobileContainer.appendChild(card);
    });

    tableContainer.appendChild(mobileContainer);

    // Watch for table changes and update mobile cards
    const observer = new MutationObserver(() => {
      updateMobileCards(table, mobileContainer, headers);
    });

    observer.observe(table.querySelector('tbody'), {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  function createMobileCard(row, headers, index) {
    const card = document.createElement('div');
    card.className = 'mobile-card';
    card.dataset.rowIndex = index;

    const cells = Array.from(row.querySelectorAll('td'));

    // Card header with primary information
    const header = document.createElement('div');
    header.className = 'mobile-card-header';

    // Get primary identifier (usually first non-empty cell or signal tag)
    let primaryId = `Item ${index + 1}`;
    let signalTag = '';

    // Look for Signal TAG column (usually around index 3-4)
    const signalTagCell = cells.find((cell, idx) => {
      const headerText = headers[idx]?.text.toLowerCase() || '';
      return headerText.includes('signal') && headerText.includes('tag');
    });

    if (signalTagCell) {
      const input = signalTagCell.querySelector('input');
      signalTag = input ? input.value : signalTagCell.textContent.trim();
    }

    // Use S.No if available
    if (cells[0]) {
      const input = cells[0].querySelector('input');
      const sno = input ? input.value : cells[0].textContent.trim();
      if (sno) primaryId = sno;
    }

    header.innerHTML = `
      <span class="mobile-card-title">${signalTag || 'Signal'}</span>
      <span class="mobile-card-number">#${primaryId}</span>
    `;

    card.appendChild(header);

    // Card body with essential fields
    const body = document.createElement('div');
    body.className = 'mobile-card-body';

    // Essential fields (high priority columns)
    const essentialFields = document.createElement('div');
    essentialFields.className = 'mobile-essential-fields';

    headers.forEach((header, colIndex) => {
      if (header.priority === 'high' && colIndex < cells.length - 1) { // Exclude actions column
        const cell = cells[colIndex];
        if (cell) {
          const fieldGroup = createMobileField(header.text, cell, colIndex);
          essentialFields.appendChild(fieldGroup);
        }
      }
    });

    body.appendChild(essentialFields);

    // Expandable section for other fields
    const expandable = document.createElement('div');
    expandable.className = 'mobile-expandable';

    const toggle = document.createElement('button');
    toggle.className = 'mobile-expand-toggle';
    toggle.innerHTML = `
      <span>More Details</span>
      <i class="fas fa-chevron-down"></i>
    `;

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      expandable.classList.toggle('expanded');
    });

    const expandableContent = document.createElement('div');
    expandableContent.className = 'mobile-expandable-content';

    headers.forEach((header, colIndex) => {
      if (header.priority !== 'high' && colIndex < cells.length - 1) { // Exclude actions column
        const cell = cells[colIndex];
        if (cell) {
          const fieldGroup = createMobileField(header.text, cell, colIndex);
          expandableContent.appendChild(fieldGroup);
        }
      }
    });

    expandable.appendChild(toggle);
    expandable.appendChild(expandableContent);
    body.appendChild(expandable);

    // Actions
    const actionsCell = cells[cells.length - 1];
    if (actionsCell) {
      const actions = document.createElement('div');
      actions.className = 'mobile-card-actions';

      const buttons = actionsCell.querySelectorAll('button');
      buttons.forEach(btn => {
        const mobileBtn = btn.cloneNode(true);
        mobileBtn.className = `mobile-action-btn ${btn.classList.contains('remove-row-btn') ? 'delete' : 'edit'}`;

        // Ensure the cloned button maintains functionality
        if (btn.classList.contains('remove-row-btn')) {
          mobileBtn.addEventListener('click', () => {
            // Remove both the original row and the mobile card
            btn.click();
            card.remove();
          });
        }

        actions.appendChild(mobileBtn);
      });

      body.appendChild(actions);
    }

    card.appendChild(body);
    return card;
  }

  function createMobileField(label, cell, colIndex) {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'mobile-field-group';

    const fieldLabel = document.createElement('div');
    fieldLabel.className = 'mobile-field-label';
    fieldLabel.textContent = label;

    const fieldValue = document.createElement('div');
    fieldValue.className = 'mobile-field-value';

    // Clone the input/content from the cell
    const input = cell.querySelector('input, select, textarea');
    if (input) {
      const clonedInput = input.cloneNode(true);

      // Sync values between original table input and mobile card input
      clonedInput.addEventListener('input', () => {
        input.value = clonedInput.value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      input.addEventListener('input', () => {
        clonedInput.value = input.value;
      });

      fieldValue.appendChild(clonedInput);
    } else {
      fieldValue.textContent = cell.textContent.trim();
    }

    fieldGroup.appendChild(fieldLabel);
    fieldGroup.appendChild(fieldValue);

    return fieldGroup;
  }

  function setupColumnPriorities(table) {
    const headers = table.querySelectorAll('thead th');
    const rows = table.querySelectorAll('tbody tr');

    headers.forEach((header, index) => {
      const priority = getColumnPriority(header);
      header.classList.add(`col-priority-${priority}`);

      // Apply same class to all cells in this column
      rows.forEach(row => {
        const cell = row.cells[index];
        if (cell) {
          cell.classList.add(`col-priority-${priority}`);
        }
      });

      // Add sticky classes for important columns
      const text = header.textContent.toLowerCase();
      if (text.includes('signal') && text.includes('tag')) {
        header.classList.add('col-sticky');
        rows.forEach(row => {
          const cell = row.cells[index];
          if (cell) cell.classList.add('col-sticky');
        });
      }

      // Make actions column sticky
      if (text.includes('action') || index === headers.length - 1) {
        header.classList.add('col-sticky-actions');
        rows.forEach(row => {
          const cell = row.cells[index];
          if (cell) cell.classList.add('col-sticky-actions');
        });
      }
    });
  }

  function getColumnPriority(header) {
    const text = header.textContent.toLowerCase();

    // High priority: essential for identification and results
    if (text.includes('signal') || text.includes('tag') || text.includes('description') || 
        text.includes('result') || text.includes('action')) {
      return 'high';
    }

    // Medium priority: important but not critical
    if (text.includes('rack') || text.includes('position') || text.includes('verified') || 
        text.includes('punch')) {
      return 'medium';
    }

    // Low priority: can be hidden on smaller screens
    return 'low';
  }

  function updateMobileCards(table, mobileContainer, headers) {
    // Find existing cards (skip the scroll hint)
    const cards = Array.from(mobileContainer.querySelectorAll('.mobile-card'));
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    // Remove excess cards
    if (cards.length > rows.length) {
      for (let i = rows.length; i < cards.length; i++) {
        if (cards[i]) cards[i].remove();
      }
    }

    // Add new cards for new rows
    if (rows.length > cards.length) {
      for (let i = cards.length; i < rows.length; i++) {
        const card = createMobileCard(rows[i], headers, i);
        mobileContainer.appendChild(card);
      }
    }

    // Update existing cards
    cards.forEach((card, index) => {
      if (rows[index]) {
        // Update card content if needed
        const newCard = createMobileCard(rows[index], headers, index);
        card.replaceWith(newCard);
      }
    });
  }

  function handleTableResize() {
    // Refresh mobile cards when window resizes
    setTimeout(() => {
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const mobileContainer = table.closest('.table-responsive')?.querySelector('.mobile-table-cards');
        if (mobileContainer) {
          const headers = Array.from(table.querySelectorAll('thead th')).map(th => ({
            text: th.textContent.trim(),
            priority: getColumnPriority(th),
            index: Array.from(th.parentNode.children).indexOf(th)
          }));
          updateMobileCards(table, mobileContainer, headers);
        }
      });
    }, 100);
  }
})();