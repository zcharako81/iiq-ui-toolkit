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
    var de = (navigator.language||'').toLowerCase().indexOf('de') === 0;
    if (isExpired || daysLeft <= 0) return { cls: 'iuitk-exp-red', label: de ? 'Abgelaufen' : 'Expired' };
    if (daysLeft <= 3)  return { cls: 'iuitk-exp-orange', label: de ? ('Läuft in ' + daysLeft + (daysLeft === 1 ? ' Tag ab' : ' Tagen ab')) : 'Expiration in ' + daysLeft + (daysLeft === 1 ? ' day' : ' days') };
    return { cls: 'iuitk-exp-green', label: de ? 'Läuft in ' + daysLeft + ' Tagen ab' : 'Expiration in ' + daysLeft + ' days' };
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

        // Append badge to the section header itself, positioned to the right
        var headerEl = container.querySelector('.panel-heading');
        if (!headerEl) continue;

        var badge = document.createElement('span');
        badge.className = 'iuitk-exp-badge ' + exp.cls;
        badge.textContent = exp.label;

        headerEl.appendChild(badge);
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
