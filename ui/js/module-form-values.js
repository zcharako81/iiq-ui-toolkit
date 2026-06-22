/**
 * Module: Form Values
 * 
 * Replaces approval item attribute display values with form field
 * label:value pairs from the work item's form definition.
 * 
 * For work items whose description starts with a configured form name
 * (comma-separated list in approvalItems.showFormValues setting), this
 * module loads the form definition via angular formService API and
 * replaces the .description span content (where attribute key=value
 * pairs normally appear) with form field labels and values.
 * 
 * No dialog is opened — form data is fetched programmatically via
 * the formService API without user interaction.
 */
(function() {

  'use strict';

  var settings = null;

  /**
   * Resolve display value from a form item.
   * Objects (identity refs) resolve to displayName/name.
   */
  function resolveValue(item) {
    var v = item.value;
    if (v == null) return '';
    if (typeof v === 'object') {
      return v.displayName || v.displayableName || v.name || '';
    }
    return String(v);
  }

  /**
   * Flatten form field tree into label:value pairs.
   * Walks items[0].rows (standard fieldset layout in IIQ forms).
   */
  function extractFields(formConfig) {
    var fields = [];
    if (!formConfig || !formConfig.items) return fields;

    var top = formConfig.items[0];
    if (!top) return fields;

    function addItem(item) {
      if (!item || item.hidden) return;
      // Skip secret fields (passwords)
      if (item.type === 'secret') return;
      // Skip fieldset containers (they hold rows, not values)
      if (item.type === 'fieldset') return;
      fields.push({
        label: item.fieldLabel || item.name || item.itemId,
        value: resolveValue(item),
        type: item.type
      });
    }

    // Walk rows (standard layout)
    if (top.rows) {
      for (var ri = 0; ri < top.rows.length; ri++) {
        var row = top.rows[ri];
        if (!row) continue;
        for (var ci = 0; ci < row.length; ci++) {
          addItem(row[ci]);
        }
      }
    }

    return fields;
  }

  /**
   * Check if a description string starts with any configured form name.
   */
  function matchesForm(description, formList) {
    if (!description || !formList) return false;
    var trimmed = description.trim();
    var forms = formList.split(',');
    for (var i = 0; i < forms.length; i++) {
      var prefix = forms[i].trim();
      if (prefix && trimmed.indexOf(prefix) === 0) return true;
    }
    return false;
  }

  /**
   * Get angular formService from the page's injector.
   */
  function getFormService() {
    var el = document.querySelector('.approval.panel');
    if (!el) return null;
    try {
      var injector = angular.element(el).injector();
      if (!injector) return null;
      return injector.get('formService');
    } catch (e) {
      return null;
    }
  }

  /**
   * Get the workItem Angular object from container's scope.
   * Pass panel to scope lookup to the correct .approval.panel.
   */
  function getWorkItem(panel) {
    var container = panel.closest('.approval.panel');
    if (!container) return null;
    var header = container.querySelector('sp-work-item-header, sp-approval');
    if (!header) return null;
    try {
      var scope = angular.element(header).scope();
      if (scope && scope.approval && typeof scope.approval.isTransient === 'function') {
        return scope.approval;
      }
    } catch (e) {}
    return null;
  }

  /**
   * Get the work item description from DOM (for form name matching).
   */
  function getWorkItemDescription(panel) {
    var container = panel.closest('.approval.panel');
    if (!container) return null;
    var titleEl = container.querySelector('.panel-title strong.ng-binding');
    if (!titleEl) return null;
    return (titleEl.textContent || titleEl.innerText || '').trim();
  }

  /**
   * Set comma-separated label='value' text into .more-less-toggle span.
   * Format matches approval-linebreaks module (key='value' pattern),
   * which then splits into separate .iuitk-attr-line elements.
   */
  function injectFormValues(panel, fields) {
    if (!fields.length) return;

    // Build: Label = 'value', Label = 'value', ...
    var parts = [];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      // Escape single quotes in value
      var val = String(f.value).replace(/'/g, "\\'");
      parts.push(f.label + " = '" + val + "'");
    }
    var text = parts.join(', ');

    // Set text into the .more-less-toggle span (approval-linebreaks targets this)
    var span = panel.querySelector('.more-less-toggle .ng-binding.ng-scope');
    if (span) {
      // Remove linebreaks marker so it re-processes the new text
      span.removeAttribute('data-iuitk-linebreaks');
      span.textContent = text;
      panel.setAttribute('data-iuitk-fv', 'done');
    }
  }

  /**
   * Process unprocessed panels that match the configured form list.
   * Handles both single work item page and multi-work item approvals list.
   */
  function processPanels() {
    if (!settings) return;
    var formList = settings['approvalItems.showFormValues'];
    if (!formList) return;

    var panels = document.querySelectorAll('section.panel');
    if (!panels.length) return;

    var fs = getFormService();
    if (!fs) return;

    for (var pi = 0; pi < panels.length; pi++) {
      (function(panel) {
        // Skip already processed or loading
        if (panel.getAttribute('data-iuitk-fv') === 'done') return;
        if (panel.getAttribute('data-iuitk-fv') === 'loading') return;

        // Check form name match
        var description = getWorkItemDescription(panel);
        if (!description) return;
        if (!matchesForm(description, formList)) return;

        // Get workItem for this panel
        var wi = getWorkItem(panel);
        if (!wi) return;

        // Mark loading to avoid duplicate fetches
        panel.setAttribute('data-iuitk-fv', 'loading');

        fs.getWorkItemForm(wi).then(function(formData) {
          if (!formData || !formData.config) {
            panel.removeAttribute('data-iuitk-fv');
            return;
          }
          var fields = extractFields(formData.config);
          if (!fields.length) {
            panel.removeAttribute('data-iuitk-fv');
            return;
          }
          injectFormValues(panel, fields);
        }).catch(function() {
          panel.removeAttribute('data-iuitk-fv'); // retry on next mutation
        });
      })(panels[pi]);
    }
  }

  // Register module — work item pages only
  UIToolkit.registerModule('form-values', {
    init: function(s) {
      settings = s;
      if (s['approvalItems.showFormValues']) {
        // Delay slightly to let Angular fully render the work item
        setTimeout(processPanels, 100);
      }
    },
    onMutation: function() {
      if (settings && settings['approvalItems.showFormValues']) {
        processPanels();
      }
    }
  }, '.*(\\/(workitem\\/commonWorkItem|approval\\/approvals)\\.jsf)');

})();
