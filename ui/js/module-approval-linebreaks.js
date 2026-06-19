/**
 * Module: Approval Line Breaks
 * 
 * Splits comma-separated attribute values in approval item descriptions
 * into separate lines. Each value (including single-line items) gets
 * wrapped in a <span class="iuitk-attr-line"> element for consistent
 * CSS block display with white full-width background.
 * 
 * Targets the Angular card layout structure:
 *   <div class="more-less-toggle ng-isolate-scope">
 *     <span class="ng-binding ng-scope">
 *       attr1 = 'val1', attr2 = 'val2'
 *     </span>
 *   </div>
 */
(function() {

  'use strict';

  /**
   * Process a single text span element: split comma-separated values
   * into separate lines AND wrap single values too, so every line
   * gets the .iuitk-attr-line styling (white full-width background).
   *
   * Important: only splits on commas when the text contains the
   * `key='value'` quote pattern. Without quotes, commas are part of
   * a single value (e.g. an LDAP DN like "uid=user,ou=users,dc=test").
   */
  function processSpan(span) {
    // Skip if already processed
    if (span.getAttribute('data-iuitk-linebreaks') === 'true') return;

    var text = span.textContent || span.innerText;
    if (!text) return;

    // Only process if the text contains a key=value pattern
    if (text.indexOf('=') === -1) return;

    // Only split on commas when the value is quoted (key='value' or key= 'value').
    // Without quotes, commas are part of a single value (e.g. LDAP DN).
    var hasQuotedValue = text.indexOf("='") !== -1 || text.indexOf("= '") !== -1;

    var items;
    if (hasQuotedValue && text.indexOf(',') !== -1) {
      // Multiple items — split by top-level commas
      items = splitDisplayValue(text);
      if (items.length <= 1) items = [text];
    } else {
      // Single value (no commas, or unquoted single value like an LDAP DN)
      items = [text];
    }

    // Replace content with .iuitk-attr-line spans
    span.setAttribute('data-iuitk-linebreaks', 'true');
    span.innerHTML = '';

    for (var i = 0; i < items.length; i++) {
      var lineSpan = document.createElement('span');
      lineSpan.className = 'iuitk-attr-line';
      lineSpan.textContent = items[i].trim();
      span.appendChild(lineSpan);
    }
  }

  /**
   * Split a display value string by top-level commas.
   * Respects quoted strings — does NOT split inside single quotes.
   */
  function splitDisplayValue(text) {
    var results = [];
    var current = '';
    var inQuote = false;

    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === '\'' || ch === '"') {
        inQuote = !inQuote;
        current += ch;
      } else if (ch === ',' && !inQuote) {
        results.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.length > 0) results.push(current);

    return results;
  }

  /**
   * Find all text spans that contain comma-separated attribute values
   * and process them.
   */
  function processAll() {
    // Target: <span class="ng-binding ng-scope"> inside .more-less-toggle
    // These contain comma-separated values like:
    // "inactive (Inactive) = 'true', Identity_End_Date (Identity End Date) = '23423423234'"
    var spans = document.querySelectorAll('.more-less-toggle .ng-binding.ng-scope');

    for (var i = 0; i < spans.length; i++) {
      processSpan(spans[i]);
    }
  }

  // Register module — work item pages only
  UIToolkit.registerModule('approval-linebreaks', {
    init: function() {
      processAll();
    },
    onMutation: function() {
      processAll();
    }
  }, '.*(\\/(workitem\\/commonWorkItem|approval\\/approvals)\\.jsf)');

})();
