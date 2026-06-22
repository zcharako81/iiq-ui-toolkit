/**
 * Module: Item Aging
 * 
 * Shows expiration countdown badge on the right side of the work
 * item section header. Reads expirationDate from Angular scope.
 * 
 * Colors:
 *   green  — >3 days remaining
 *   orange — 1–3 days remaining
 *   red    — <1 day or expired (shows "Expired")
 * 
 * When no expirationDate is set, no badge is shown.
 */
(function() {

  'use strict';

  var settings = null;

  /**
   * Round up days, min 0.
   */
  function ceilDays(ms) {
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  /**
   * Get expiration CSS class and label.
   */
  function expiryInfo(daysLeft, isExpired) {
    if (isExpired || daysLeft <= 0) return { cls: 'iuitk-exp-red', label: 'Expired' };
    if (daysLeft < 3)  return { cls: 'iuitk-exp-orange', label: 'Expiration in ' + daysLeft + ' days' };
    return { cls: 'iuitk-exp-green', label: 'Expiration in ' + daysLeft + ' days' };
  }

  /**
   * Inject expiration badge on the right side of section header.
   */
  function processAll() {
    if (!settings || !settings['approvalItems.itemAging']) return;

    var containers = document.querySelectorAll('.approval.panel');
    for (var ci = 0; ci < containers.length; ci++) {
      var container = containers[ci];
      if (container.getAttribute('data-iuitk-aging') === 'done') continue;

      // Get scope for expirationDate
      var header = container.querySelector('sp-work-item-header, sp-approval');
      if (!header) continue;
      try {
        var scope = angular.element(header).scope();
        if (!scope || !scope.approval) continue;

        var expiryStr = scope.approval.expirationDate;
        if (!expiryStr) continue; // no expiration — skip gracefully

        var now = new Date();
        var expiry = new Date(expiryStr);
        var isExpired = expiry <= now;
        var daysLeft = ceilDays(expiry - now);

        var exp = expiryInfo(daysLeft, isExpired);

        // Find the right column (col-xs-2) to inject badge
        var rightCol = container.querySelector('sp-work-item-header [class*=col-xs-2], .approval.panel [class*=col-xs-2]');
        // Fallback: if right column not found, use the header itself
        var target = rightCol || container.querySelector('.panel-heading');
        if (!target) continue;

        var badge = document.createElement('span');
        badge.className = 'iuitk-exp-badge ' + exp.cls;
        badge.textContent = exp.label;

        target.appendChild(badge);
        container.setAttribute('data-iuitk-aging', 'done');
      } catch (e) {}
    }
  }

  // Register module — work item pages only
  UIToolkit.registerModule('item-aging', {
    init: function(s) {
      settings = s;
      if (s['approvalItems.itemAging']) {
        setTimeout(processAll, 100);
      }
    },
    onMutation: function() {
      if (settings && settings['approvalItems.itemAging']) {
        processAll();
      }
    }
  }, '.*(\\/(workitem\\/commonWorkItem|approval\\/approvals)\\.jsf)');

})();
