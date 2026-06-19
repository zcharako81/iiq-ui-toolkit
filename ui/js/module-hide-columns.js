/**
 * Module: Hide Columns
 * 
 * Hides specified fields (application, account) from approval item cards.
 * The application field is only hidden when its value is "IdentityIQ"
 * (case-insensitive) — items for other applications remain visible.
 * Works with the Angular sp-card-data layout:
 * 
 *   <div sp-card-data="true">
 *     <span class="col-application">
 *       <span class="sp-card-data-item">Application: IdentityIQ</span>
 *     </span>
 *     <span class="col-accountDisplayName">
 *       <span class="sp-card-data-item">Account: test12356</span>
 *     </span>
 *   </div>
 * 
 * Each column is a <span> with a CSS class like col-<fieldName>.
 * This module hides those spans by adding display:none.
 * 
 * Re-applies on every MutationObserver callback since Angular
 * re-renders cards and strips inline styles.
 */
(function() {

  'use strict';

  var settings = null;

  /**
   * Mapping of setting names to the CSS class on the column <span>.
   */
  var COLUMN_MAP = [
    { key: 'approvalItems.hideApplication',    cssClass: 'col-application' },
    { key: 'approvalItems.hideNativeIdentity',  cssClass: 'col-accountDisplayName' }
  ];

  /**
   * Hide columns based on current settings.
   * Does NOT use a processed marker — re-runs every time since
   * Angular strips inline styles on re-render.
   */
  function processAll() {
    if (!settings) return;

    for (var m = 0; m < COLUMN_MAP.length; m++) {
      var config = COLUMN_MAP[m];
      if (!settings[config.key]) continue;

      // Find all column spans matching the CSS class
      var columns = document.querySelectorAll('span.' + config.cssClass);
      for (var i = 0; i < columns.length; i++) {
        var col = columns[i];

        // For application column: only hide if value is "IdentityIQ"
        if (config.key === 'approvalItems.hideApplication') {
          var valueEl = col.querySelector('.sp-card-data-item-value');
          var valueText = valueEl ? (valueEl.textContent || valueEl.innerText || '').trim() : '';
          if (valueText.toLowerCase() !== 'identityiq') {
            continue; // skip — application is not IdentityIQ
          }
        }

        col.style.display = 'none';
      }
    }
  }

  // Register module — work item pages only
  UIToolkit.registerModule('hide-columns', {
    init: function(s) {
      settings = s;
      processAll();
    },
    onMutation: function() {
      processAll();
    }
  }, '.*(\\/(workitem\\/commonWorkItem|approval\\/approvals)\\.jsf)');

})();
