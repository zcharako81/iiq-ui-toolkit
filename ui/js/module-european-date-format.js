/**
 * Module: European Date Format
 *
 * Converts US date format (mm/dd/yyyy) to European format (dd.mm.yyyy)
 * in approval work item attribute displays and form values.
 *
 * Dates displayed in US format (month/day/year) from IIQ's default
 * attribute display are converted to European day.month.year format.
 */
(function() {

  'use strict';

  function processSpans() {
    var count = 0;

    // Process .iuitk-attr-line if approval-linebreaks already split
    var lines = document.querySelectorAll('.iuitk-attr-line');
    for (var i = 0; i < lines.length; i++) {
      var el = lines[i];
      var text = el.textContent || el.innerText;
      if (!text) continue;
      var newText = text.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, function(match, m, d, y) {
        return d + '.' + m + '.' + y;
      });
      if (newText !== text) {
        el.textContent = newText;
        count++;
      }
    }

    // Process raw .ng-binding.ng-scope if approval-linebreaks not active
    var spans = document.querySelectorAll('.more-less-toggle .ng-binding.ng-scope');
    for (var i = 0; i < spans.length; i++) {
      var span = spans[i];
      if (span.querySelector('.iuitk-attr-line')) continue;
      var text = span.textContent || span.innerText;
      if (!text) continue;
      var newText = text.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, function(match, m, d, y) {
        return d + '.' + m + '.' + y;
      });
      if (newText !== text) {
        span.textContent = newText;
        span.removeAttribute('data-iuitk-linebreaks');
        count++;
      }
    }

    if (count) console.log('[IIQ_UI_Toolkit] european-date-format: converted ' + count + ' date(s)');
  }

  // Register module — work item pages only
  UIToolkit.registerModule('european-date-format', {
    init: function() {
      // Delay to let Angular finish rendering the template first
      setTimeout(processSpans, 200);
    },
    onMutation: function() {
      processSpans();
    }
  }, '.*(\\/(workitem\\/commonWorkItem|approval\\/approvals)\\.jsf)');

})();
