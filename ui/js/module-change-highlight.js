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
    'Lock':    'iuitk-op-disable'
  };

  function getOperationClass(text) {
    if (!text) return null;
    var trimmed = text.replace(/:$/, '').trim();
    for (var op in OPERATION_CLASSES) {
      if (OPERATION_CLASSES.hasOwnProperty(op) &&
          trimmed.indexOf(op) !== -1) {
        return OPERATION_CLASSES[op];
      }
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
      var text = (strong.textContent || strong.innerText || '').trim();
      var opClass = getOperationClass(text);

      if (opClass) {
        var panel = findAncestorPanel(strong);
        if (panel && !panel.classList.contains(opClass)) {
          panel.classList.add(opClass);
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
  }, '.*\\/workitem\\/commonWorkItem\\.jsf');

})();
