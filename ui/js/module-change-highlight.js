/**
 * Module: Change Highlighting
 * 
 * Color-codes approval item panels based on their operation type:
 *   - Create  → green
 *   - Modify  → blue
 *   - Delete  → red
 *   - Enable  → green (lighter)
 *   - Disable → orange
 * 
 * Finds the operation (e.g. "Create:") in the panel header via
 * the precise selector: span.description > strong.ng-binding
 * and adds a CSS class to the parent <section class="panel">.
 */
(function() {

  'use strict';

  var OPERATION_CLASSES = {
    // English
    'Create':  'iuitk-op-create',
    'Add':     'iuitk-op-create',
    'Modify':  'iuitk-op-modify',
    'Update':  'iuitk-op-modify',
    'Change':  'iuitk-op-modify',
    'Delete':  'iuitk-op-delete',
    'Remove':  'iuitk-op-delete',
    'Enable':  'iuitk-op-enable',
    'Disable': 'iuitk-op-disable',
    'Unlock':  'iuitk-op-enable',
    'Lock':    'iuitk-op-disable',
    // German
    'Erstellen':  'iuitk-op-create',
    'Hinzufügen': 'iuitk-op-create',
    'Ändern':     'iuitk-op-modify',
    'Aktualisieren': 'iuitk-op-modify',
    'Löschen':    'iuitk-op-delete',
    'Entfernen':  'iuitk-op-delete',
    'Aktivieren': 'iuitk-op-enable',
    'Deaktivieren': 'iuitk-op-disable',
    'Entsperren': 'iuitk-op-enable',
    'Sperren':    'iuitk-op-disable'
  };

  function getOperationClass(text) {
    if (!text) return null;
    var trimmed = text.replace(/:$/, '').trim();
    if (OPERATION_CLASSES.hasOwnProperty(trimmed)) {
      return { opClass: OPERATION_CLASSES[trimmed], opName: trimmed };
    }
    return null;
  }

  function findAncestorPanel(el) {
    while (el) {
      if (el.tagName === 'SECTION' && el.classList.contains('panel')) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function processAll() {
    // Precise selector: <strong> that is a direct child of <span class="description">
    // This matches: <span class="description"><strong class="ng-binding">Create:</strong>
    // But NOT: panel title, requested on, work item ID, etc.
    var strongs = document.querySelectorAll('span.description > strong.ng-binding');
    for (var i = 0; i < strongs.length; i++) {
      var strong = strongs[i];
      var desc = strong.parentNode;

      // If we already wrapped this description's badge into a header
      // row, just remove the redundant strong (Angular recreated it).
      if (desc.getAttribute('data-iuitk-op') === 'true') {
        strong.parentNode.removeChild(strong);
        continue;
      }

      var text = (strong.textContent || strong.innerText || '').trim();
      var result = getOperationClass(text);

      if (result) {
        var panel = findAncestorPanel(strong);
        if (panel && !panel.classList.contains(result.opClass)) {
          panel.classList.add(result.opClass);
        }

        // Remove the original <strong> from the DOM
        strong.parentNode.removeChild(strong);

        // Mark the description so the CSS can style it as a full-width
        // container for the attribute values (no badge/toggle split).
        desc.setAttribute('data-iuitk-op', 'true');

        // Create the operation badge
        var badge = document.createElement('div');
        badge.className = 'iuitk-op-badge ' + result.opClass;
        badge.textContent = result.opName;

        // Find the sibling .pull-right (action buttons) and wrap it
        // together with the badge in a single header row element.
        // The col-xs-12 is the parent of both desc and pull-right.
      var col = desc.parentNode;
      var pullRight = col.querySelector('.pull-right');

        if (pullRight) {
          // Insert the badge just before the pull-right inside col
          col.insertBefore(badge, pullRight);

          // Wrap the badge + pull-right in a single container
          var headerRow = document.createElement('div');
          headerRow.className = 'iuitk-op-header-row';
          col.insertBefore(headerRow, badge);
          headerRow.appendChild(badge);
          headerRow.appendChild(pullRight);

          // Move the header row to the TOP of the col, so it appears
          // above the description (badge + buttons on top, attribute
          // values below).
          col.insertBefore(headerRow, col.firstChild);
        } else {
          // No pull-right found — fall back to inserting the badge
          // in the description, before the more-less-toggle.
          var toggle = desc.querySelector('.more-less-toggle');
          if (toggle) {
            desc.insertBefore(badge, toggle);
          }
        }
      }
    }
  }

  // Register module — work item pages only
  UIToolkit.registerModule('change-highlight', {
    init: function() {
      processAll();
    },
    onMutation: function() {
      processAll();
    }
  }, '.*(\\/(workitem\\/commonWorkItem|approval\\/approvals)\\.jsf)');

})();
