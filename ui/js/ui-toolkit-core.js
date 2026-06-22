/**
 * IIQ-UI-Toolkit Core Loader
 */
var UIToolkit = (function() {

  'use strict';

  var modules = {};
  var settings = {};
  var observer = null;
  var debounceTimer = null;
  var activeModuleNames = []; // URL-filtered list, cached after activation

  var CTX = '/identityiq';
  if (typeof SailPoint !== 'undefined' && SailPoint.CONTEXT_PATH != null) {
    CTX = SailPoint.CONTEXT_PATH;
  }
  CTX = CTX.replace(/\/+$/, '') || ''; // strip trailing slash, handle root context
  var XSRF = (typeof SailPoint !== 'undefined' && SailPoint.XSRF_TOKEN) ? SailPoint.XSRF_TOKEN : '';
  var VERSION = '1.0.5';
  var PLUGIN_BASE = CTX + '/plugin/IIQ_UI_Toolkit';
  var SETTINGS_URL = CTX + '/plugin/rest/IIQUIToolkit/settings';

  function log(msg) { console.log('[IIQ_UI_Toolkit] ' + msg); }

  /**
   * Check if the current page URL matches a module's regex pattern.
   * If no pattern is set, the module activates on all pages.
   */
  function urlMatches(pattern) {
    if (!pattern) return true;
    try { return new RegExp(pattern).test(window.location.href); }
    catch (e) { return false; }
  }

  /**
   * Determine which modules should be active based on settings.
   * URL filtering is NOT done here — modules may not be registered yet.
   */
  function getActiveModules() {
    var active = [];
    if (settings['approvalItems.lineBreak']) active.push('approval-linebreaks');
    var hideApp = settings['approvalItems.hideApplication'];
    var hideNI  = settings['approvalItems.hideNativeIdentity'];
    if (hideApp || hideNI) active.push('hide-columns');
    if (settings['approvalItems.changeHighlight']) active.push('change-highlight');
    if (settings['approvalItems.showFormValues']) active.push('form-values');
    if (settings['approvalItems.itemAging']) active.push('item-aging');
    return active;
  }

  /**
   * Register a module with an optional URL pattern.
   * @param {string} name       - Unique module name
   * @param {object} impl       - Module with init(settings) and onMutation()
   * @param {string} [pattern]  - Regex pattern for URL matching (optional)
   */
  function registerModule(name, impl, pattern) {
    log('module registered: ' + name + (pattern ? ' [scope: ' + pattern + ']' : ''));
    modules[name] = { impl: impl, pattern: pattern };
  }

  function activateModules() {
    var active = getActiveModules();
    // Filter by URL pattern (modules are registered by now)
    active = active.filter(function(name) {
      var mod = modules[name];
      return mod && urlMatches(mod.pattern);
    });
    activeModuleNames = active;
    log('activating ' + active.length + ' modules: ' + active.join(', '));
    for (var i = 0; i < active.length; i++) {
      var name = active[i];
      var mod = modules[name];
      if (mod && typeof mod.impl.init === 'function') {
        try { mod.impl.init(settings); log('module ' + name + ' init() OK'); }
        catch (e) { log('module ' + name + ' init() ERROR: ' + e.message); }
      }
    }
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        for (var i = 0; i < activeModuleNames.length; i++) {
          var name = activeModuleNames[i];
          var mod = modules[name];
          if (mod && typeof mod.impl.onMutation === 'function') {
            try { mod.impl.onMutation(); } catch(e) {}
          }
        }
      }, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    log('MutationObserver started');
  }

  function loadCSS(href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = PLUGIN_BASE + '/ui/' + href + '?v=' + VERSION;
    document.head.appendChild(link);
  }

  function loadJS(src) {
    var script = document.createElement('script');
    script.src = PLUGIN_BASE + '/ui/' + src + '?v=' + VERSION;
    document.head.appendChild(script);
  }

  function init() {
    log('init() called, fetching settings from ' + SETTINGS_URL);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', SETTINGS_URL, true);
    if (XSRF) xhr.setRequestHeader('X-XSRF-TOKEN', XSRF);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        log('XHR complete: status=' + xhr.status);
        if (xhr.status === 200) {
          try {
            settings = JSON.parse(xhr.responseText);

            var active = getActiveModules();
            if (active.length === 0) {
              log('no active modules (all settings disabled)');
              return;
            }

            // Load CSS (cache-busted)
            for (var i = 0; i < active.length; i++) {
              loadCSS('css/module-' + active[i] + '.css');
            }

            // Load JS — modules self-register via registerModule
            var loaded = 0;
            for (var j = 0; j < active.length; j++) {
              (function(moduleName) {
                var s = document.createElement('script');
                s.src = PLUGIN_BASE + '/ui/js/module-' + moduleName + '.js?v=' + VERSION;
                s.onload = function() {
                  loaded++;
                  log('loaded module JS: ' + moduleName + ' (' + loaded + '/' + active.length + ')');
                  if (loaded === active.length) {
                    try { activateModules(); startObserver(); }
                    catch (e) { log('activation error: ' + e.message); }
                  }
                };
                s.onerror = function() { log('FAILED to load module JS: ' + moduleName); };
                document.head.appendChild(s);
              })(active[j]);
            }
          } catch (e) { log('JSON parse error: ' + e.message); }
        } else {
          log('REST call failed (status ' + xhr.status + ')');
        }
      }
    };
    xhr.onerror = function() { log('XHR network error'); };
    xhr.send();
  }

  return {
    init: init,
    registerModule: registerModule,
    getActiveModules: getActiveModules
  };

})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { UIToolkit.init(); });
} else {
  UIToolkit.init();
}
