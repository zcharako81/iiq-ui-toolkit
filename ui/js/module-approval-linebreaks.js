/**
 * Module: Approval Line Breaks
 * 
 * Splits comma-separated attribute values in approval item descriptions
 * into separate lines. Each comma-separated item gets wrapped in a
 * <span class="iuitk-attr-line"> element for CSS block display.
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
   * Process a single text span element: find comma-separated items
   * and wrap each in a line-break element.
   */
  function processSpan(span) {
    // Skip if already processed
    if (span.getAttribute('data-iuitk-linebreaks') === 'true') return;

    var text = span.textContent || span.innerText;
    if (!text) return;

    // Only process if the text contains comma-separated pattern
    // like: attr = 'value', nextAttr = 'value'
    if (text.indexOf(',') === -1) return;
    if (text.indexOf("='") === -1 && text.indexOf("= '") === -1) return;

    var items = splitDisplayValue(text);
    if (items.length <= 1) return;

    // Replace content with individual line spans
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
  }, '.*\\/workitem\\/commonWorkItem\\.jsf');

})();
