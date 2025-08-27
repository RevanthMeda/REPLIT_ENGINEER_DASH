// Wrapped in an IIFE to prevent global scope pollution
(function() {
  // Track current step
  let currentStep = 1;

  // On load, restore saved state
  window.addEventListener('DOMContentLoaded', () => {
    loadState();
    goToStep(1);
    setupEventHandlers();
    setupFileInputs();
    improveSignaturePad();
  });

  function setupEventHandlers() {
    // Wire up progress nav clicks
    document.querySelectorAll('.progress-step').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const step = Number(el.id.split('-')[1]);
        goToStep(step);
      });
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
      { btnId: 'add-analogue-signal-btn', tmplId: 'tmpl-analogue-signal', tbodyId: 'analogue-signals-body' },
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
        btn.addEventListener('click', () => {
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
    
    input.addEventListener('change', () => {
      listEl.innerHTML = '';
      Array.from(input.files).forEach((file, idx) => {
        const li = document.createElement('li');
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
        saveState();
      });
    });
  }

  function addFileDetails(li, file, idx) {
    const span = document.createElement('span');
    span.textContent = file.name;
    li.appendChild(span);
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Remove';
    btn.addEventListener('click', () => {
      const input = li.closest('ul').previousElementSibling;
      removeFile(input, idx);
    });
    
    li.appendChild(btn);
    const listEl = document.getElementById(li.closest('ul').id);
    if (listEl) listEl.appendChild(li);
  }

  function removeFile(input, removeIndex) {
    const dt = new DataTransfer();
    Array.from(input.files).forEach((file, i) => {
      if (i !== removeIndex) dt.items.add(file);
    });
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
  }

  function goToStep(step) {
    const currentFs = document.getElementById(`step-${currentStep}`);
    
    // Clear previous validation states
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

    currentStep = step;
    
    for (let i = 1; i <= 9; i++) {
      const stepEl = document.getElementById(`step-${i}`);
      const progEl = document.getElementById(`prog-${i}`);
      stepEl.classList.toggle('active', i === step);
      progEl.classList.toggle('active', i === step);
      progEl.classList.toggle('disabled', i !== step);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    saveState();
  }

  function addRow(templateId, tbodyId) {
    const tpl = document.getElementById(templateId);
    if (!tpl) return;
    const clone = tpl.content.cloneNode(true);
    const row = clone.querySelector('tr');
    row.classList.add('fade-in');
    document.getElementById(tbodyId).appendChild(clone);
  }

  function removeRow(button) {
    button.closest('tr')?.remove();
  }

  function startProcess() {
    document.getElementById('welcomePage').style.display = 'none';
    document.getElementById('formContainer').style.display = 'block';
    goToStep(1);
  }
  window.startProcess = startProcess;

  // LOCALSTORAGE STATE PERSISTENCE
  const FORM_KEY = 'satFormState';
  function saveState() {
    const form = document.getElementById('satForm');
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
    Object.entries(data).forEach(([name, val]) => {
      const el = form.elements[name];
      if (el) el.value = val;
    });
  }

  // Form validation and error handling
  document.addEventListener('DOMContentLoaded', function() {
    // Mark required fields for better visual cues
    document.querySelectorAll('input[required], textarea[required], select[required]').forEach(field => {
      // Add visual indicator
      field.classList.add('required-field');
      
      // Add validation on blur
      field.addEventListener('blur', function() {
        validateField(this);
      });
      
      // Add validation on change
      field.addEventListener('change', function() {
        validateField(this);
      });
    });
    
    function validateField(field) {
      if (!field.checkValidity()) {
        field.classList.add('invalid-field');
        
        // Find or create error message
        let errorMsg = field.nextElementSibling;
        if (!errorMsg || !errorMsg.classList.contains('error')) {
          errorMsg = document.createElement('span');
          errorMsg.classList.add('error');
          field.parentNode.insertBefore(errorMsg, field.nextSibling);
        }
        
        // Set appropriate error message
        if (field.validity.valueMissing) {
          errorMsg.textContent = 'This field is required';
        } else if (field.validity.typeMismatch) {
          errorMsg.textContent = `Please enter a valid ${field.type}`;
        } else if (field.validity.patternMismatch) {
          errorMsg.textContent = 'Please enter a value in the required format';
        } else {
          errorMsg.textContent = 'Invalid value';
        }
        
        // Show error message
        errorMsg.style.display = 'block';
      } else {
        field.classList.remove('invalid-field');
        
        // Hide error message
        const errorMsg = field.nextElementSibling;
        if (errorMsg && errorMsg.classList.contains('error')) {
          errorMsg.style.display = 'none';
        }
      }
    }
  });

  // Mobile table responsiveness
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.table-responsive').forEach(table => {
      // Create the wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'mobile-table-wrapper';
      
      // Create the notice
      const notice = document.createElement('div');
      notice.className = 'mobile-table-notice';
      notice.textContent = 'Scroll horizontally to see more';
      
      // Get the parent
      const parent = table.parentNode;
      
      // Insert the wrapper
      parent.insertBefore(wrapper, table);
      
      // Move the table into the wrapper
      wrapper.appendChild(notice);
      wrapper.appendChild(table);
    });
  });

  // Signature Pad Improvement
  function improveSignaturePad() {
    const canvasId = 'fixed_signature_canvas';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    // Clear any existing event listeners by replacing the canvas
    const newCanvas = document.createElement('canvas');
    newCanvas.id = canvasId;
    newCanvas.className = canvas.className;
    newCanvas.style.width = '100%';
    newCanvas.style.height = '100%';
    canvas.parentNode.replaceChild(newCanvas, canvas);
    
    // Initialize SignaturePad library (which should be already loaded)
    if (typeof SignaturePad === 'undefined') {
      console.error("SignaturePad library not loaded!");
      return;
    }
    
    const signaturePad = new SignaturePad(newCanvas, {
      minWidth: 1,
      maxWidth: 2.5,
      penColor: "black",
      backgroundColor: "rgba(255, 255, 255, 0)"
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
      // Resize canvas while maintaining content
      const data = signaturePad.toData();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      newCanvas.width = newCanvas.offsetWidth * ratio;
      newCanvas.height = newCanvas.offsetHeight * ratio;
      newCanvas.getContext("2d").scale(ratio, ratio);
      signaturePad.clear(); // Clear canvas without clearing data
      signaturePad.fromData(data); // Redraw signature
    });
    
    // Initial sizing
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    newCanvas.width = newCanvas.offsetWidth * ratio;
    newCanvas.height = newCanvas.offsetHeight * ratio;
    newCanvas.getContext("2d").scale(ratio, ratio);
	
	// Handle the clear button
    const clearButton = document.getElementById('fixed_clear_btn');
    if (clearButton) {
      clearButton.addEventListener('click', function() {
        signaturePad.clear();
      });
    }
    
    // Handle form submission
    const form = document.getElementById('satForm');
    const hiddenField = document.getElementById('sig_prepared_data');
    if (form && hiddenField) {
      form.addEventListener('submit', function() {
        if (!signaturePad.isEmpty()) {
          hiddenField.value = signaturePad.toDataURL('image/png');
        }
      });
    }
  }

  // Form Submission Prevention and Handling
  document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('satForm');
    if (form) {
      let isSubmitting = false;
      
      form.addEventListener('submit', function(e) {
        // Prevent multiple submissions
        if (isSubmitting) {
          e.preventDefault();
          return false;
        }
        
        isSubmitting = true;
        
        // Check if signature is required and provided
        const signaturePad = document.getElementById('fixed_signature_canvas');
        const hiddenSignatureField = document.getElementById('sig_prepared_data');
        
        if (signaturePad && hiddenSignatureField) {
          // Get the canvas context
          const ctx = signaturePad.getContext('2d');
          
          // Check if canvas is empty (all white)
          const pixelBuffer = new Uint32Array(
            ctx.getImageData(0, 0, signaturePad.width, signaturePad.height).data.buffer
          );
          
          // If signature is required and not provided on final step
          if (!hasSignature(pixelBuffer) && isCurrentStepActive(9)) {
            e.preventDefault();
            alert('Please sign the document before submitting');
            isSubmitting = false;
            return false;
          }
          
          // If we got here, signature is valid, set the hidden field
          if (!signaturePad.isEmpty()) {
            hiddenSignatureField.value = signaturePad.toDataURL();
          }
        }
        
        // Show loading overlay
        showLoadingOverlay('Submitting your report...');
        
        // Re-enable submit button after 10 seconds in case of failure
        setTimeout(() => {
          isSubmitting = false;
        }, 10000);
      });
    }
    
    // Function to check if the signature has been drawn
    function hasSignature(pixelBuffer) {
      // Check if there are any non-white pixels
      for (let i = 0; i < pixelBuffer.length; i++) {
        if (pixelBuffer[i] !== 0) {
          return true;
        }
      }
      return false;
    }
    
    // Function to check if a specific step is currently active
    function isCurrentStepActive(stepNumber) {
      return document.getElementById(`step-${stepNumber}`).classList.contains('active');
    }
  });

  // Form Submission Handler
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
      if (response.redirected) {
        // Remove loading overlay
        document.body.removeChild(overlay);
        
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
        messageEl.textContent = 'Report Submitted Successfully!';
        messageEl.style.marginTop = '20px';
        messageEl.style.fontSize = '24px';
        successOverlay.appendChild(messageEl);
        
        // Add details
        const detailsEl = document.createElement('p');
        detailsEl.textContent = 'Please check your email for the approval link.';
        detailsEl.style.marginTop = '10px';
        detailsEl.style.fontSize = '16px';
        successOverlay.appendChild(detailsEl);
        
        // Add button to go to home page
        const homeBtn = document.createElement('button');
        homeBtn.textContent = 'Return to Home';
        homeBtn.style.marginTop = '30px';
        homeBtn.style.padding = '10px 20px';
        homeBtn.style.backgroundColor = '#4CAF50';
        homeBtn.style.color = 'white';
        homeBtn.style.border = 'none';
        homeBtn.style.borderRadius = '4px';
        homeBtn.style.cursor = 'pointer';
        homeBtn.onclick = function() {
          window.location.href = response.url;
        };
        successOverlay.appendChild(homeBtn);
        
        document.body.appendChild(successOverlay);
      } else {
        // If there's an error, redirect to the response URL
        window.location.href = response.url;
      }
    })
    .catch(error => {
      console.error('Error during form submission:', error);
      window.location.reload(); // Fallback is to reload the page
    });
  }

  // Loading Overlay Function
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

  // Auto-Save Functionality (Simplified Version)
  (function() {
    // Configuration
    const AUTOSAVE_INTERVAL = 30000; // 30 seconds
    const FORM_KEY_PREFIX = 'satFormAutoSave_';
    let autoSaveTimer = null;
    let lastSaveTime = 0;
    let isDirty = false;
    
    // Initialize auto-save when DOM is loaded
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
      const savedState = localStorage.getItem(FORM_KEY_PREFIX + submissionId);
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
    
    function setupAutoSave(form, submissionId) {
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
    
    function saveFormState(form, submissionId, showNotification = false) {
      // Don't save too frequently
      const now = Date.now();
      if (now - lastSaveTime < 5000) return; // Minimum 5 seconds between saves
      
      lastSaveTime = now;
      
      // Create object to store the form data
      const formData = {
        timestamp: now,
        currentStep: currentStep,
        fields: {}
      };
      
      // Collect all form fields
      Array.from(form.elements).forEach(el => {
        if (!el.name || el.type === 'file' || el.type === 'submit' || el.type === 'button') return;
        
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked) {
            if (formData.fields[el.name]) {
              if (!Array.isArray(formData.fields[el.name])) {
                formData.fields[el.name] = [formData.fields[el.name]];
              }
              formData.fields[el.name].push(el.value);
            } else {
              formData.fields[el.name] = el.value;
            }
          }
        } else {
          if (el.name.endsWith('[]')) {
            const baseName = el.name.slice(0, -2);
            if (!formData.fields[baseName]) {
              formData.fields[baseName] = [];
            }
            formData.fields[baseName].push(el.value);
          } else {
            formData.fields[el.name] = el.value;
          }
        }
      });
      
      // Save signature if present
      const signaturePad = document.getElementById('fixed_signature_canvas');
      if (signaturePad) {
        formData.signature = signaturePad.toDataURL();
      }
      
      // Store in localStorage
      try {
        localStorage.setItem(FORM_KEY_PREFIX + submissionId, JSON.stringify(formData));
        console.log('Form auto-saved at ' + new Date().toLocaleTimeString());
        
        if (showNotification) {
          showSaveNotification();
        }
      } catch (e) {
        console.error('Error auto-saving form:', e);
        // If localStorage is full, try to clear old saves
        if (e.name === 'QuotaExceededError') {
          cleanupOldSaves();
          try {
            localStorage.setItem(FORM_KEY_PREFIX + submissionId, JSON.stringify(formData));
          } catch (e2) {
            console.error('Still could not save after cleanup');
          }
        }
      }
    }
    
    function loadAutoSavedState(submissionId) {
      try {
        const savedDataString = localStorage.getItem(FORM_KEY_PREFIX + submissionId);
        if (!savedDataString) return false;
        
        const savedData = JSON.parse(savedDataString);
        const form = document.getElementById('satForm');
        
        if (!form || !savedData.fields) return false;
        
        // Restore form fields
        Object.entries(savedData.fields).forEach(([name, value]) => {
          // Handle multi-value fields (arrays)
          if (Array.isArray(value)) {
            // Find all elements with this base name plus []
            const elements = form.querySelectorAll(`[name="${name}[]"]`);
            elements.forEach((el, index) => {
              if (index < value.length) {
                el.value = value[index];
              }
            });
            
            // need more elements than exist, add them
            const parent = elements.length > 0 ? elements[0].closest('tbody') : null;
            if (parent) {
              const templateId = getTemplateIdForTable(parent.id);
              if (templateId) {
                // Add rows for any additional values
                for (let i = elements.length; i < value.length; i++) {
                  addRow(templateId, parent.id);
                  // Find the newly added element
                  const newElements = parent.querySelectorAll(`[name="${name}[]"]`);
                  if (newElements[i]) {
                    newElements[i].value = value[i];
                  }
                }
              }
            }
          } else {
            // Handle single value fields
            const el = form.querySelector(`[name="${name}"]`);
            if (el) {
              if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = (el.value === value);
              } else {
                el.value = value;
              }
            }
          }
        });
        
        // Restore signature if present
        if (savedData.signature) {
          const signaturePad = document.getElementById('fixed_signature_canvas');
          if (signaturePad) {
            const ctx = signaturePad.getContext('2d');
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
        
        console.log('Form state restored from auto-save');
        showRestoreNotification();
        return true;
        
      } catch (e) {
        console.error('Error restoring auto-saved form:', e);
        return false;
      }
    }
    
    // Get the template ID for a table based on its tbody ID
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
      
      // Collect all form save keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(FORM_KEY_PREFIX)) {
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
  })();

  // Graceful error handling for external library dependencies
  (function checkLibraries() {
    const requiredLibraries = [
      //{ name: 'SignaturePad', checker: () => typeof SignaturePad !== 'undefined' },
      //{ name: 'jQuery', checker: () => typeof jQuery !== 'undefined' }
      
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

  function addAnalogueListRow() {
    addRow('tmpl-analogue-signal', 'analogue-signals-body');
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

  // Expose public methods
  window.startProcess = startProcess;
  window.goToStep = goToStep;
  window.addRelatedDoc = addRelatedDoc;
  window.addPreApprovalRow = addPreApprovalRow;
  window.addPostApprovalRow = addPostApprovalRow;
  window.addPretestRow = addPretestRow;
  window.addKeyComponentRow = addKeyComponentRow;
  window.addIPRecordRow = addIPRecordRow;
  window.addSignalListRow = addSignalListRow;
  window.addAnalogueListRow = addAnalogueListRow;
  window.addModbusDigitalRow = addModbusDigitalRow;
  window.addModbusAnalogueRow = addModbusAnalogueRow;
  window.addProcessTestRow = addProcessTestRow;
  window.addScadaVerificationRow = addScadaVerificationRow;
  window.addTrendsTestingRow = addTrendsTestingRow;
  window.addAlarmListRow = addAlarmListRow;
})();