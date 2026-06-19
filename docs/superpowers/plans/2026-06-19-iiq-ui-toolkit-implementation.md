# IIQ-UI-Toolkit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a generic, extensible SailPoint IdentityIQ 8.5 plugin that manipulates HTML elements (form fields) in approval work items using a module registry pattern.

**Architecture:** Plugin uses IIQ snippet mechanism to inject a core JS loader into approval work item pages. The core fetches settings from a REST endpoint (extending BasePluginResource), determines active modules, and dynamically loads module JS/CSS. All DOM transformations are client-side only, with MutationObserver to handle IIQ's dynamic content loading.

**Tech Stack:** Java 8 (REST endpoint for IIQ plugin), JavaScript (vanilla, no framework), CSS, XML (manifest, Ant build), Apache Ant (build)

---

## File Structure

```
IIQ-UI-Toolkit/
├── build.properties                     # Build tokens (iiq.home, version)
├── build.xml                            # Ant build: compile Java, create ZIP
├── manifest.xml                         # Plugin definition, settings, snippets
├── import/                              # Install-time objects (future use)
├── src/
│   └── com/iiq/ui/toolkit/
│       └── UIToolkitRestResource.java   # REST endpoint serving settings as JSON
├── ui/
│   ├── js/
│   │   ├── ui-toolkit-core.js           # Core loader: fetch settings, activate modules
│   │   ├── module-approval-linebreaks.js
│   │   ├── module-hide-columns.js
│   │   └── module-change-highlight.js
│   └── css/
│       ├── ui-toolkit-core.css
│       ├── module-approval-linebreaks.css
│       ├── module-hide-columns.css
│       └── module-change-highlight.css
├── lib/                                  # Compiled JARs (output)
├── db/                                   # Empty (no DB needed for v1)
└── messages/                             # Empty (i18n future)
```

### Task 1: Project Skeleton and Build Files

**Files:**
- Create: `build.properties`
- Create: `build.xml`

- [ ] **Step 1: Create build.properties**

```properties
# Build properties for IIQ-UI-Toolkit plugin
plugin.name=IIQ-UI-Toolkit
plugin.display.name=IIQ UI Toolkit
plugin.version=1.0.0
plugin.src=src
plugin.build=build
plugin.dist=${plugin.build}/dist
plugin.lib=lib
plugin.ui=ui
plugin.import=import
plugin.db=db
plugin.messages=messages

# Path to IIQ installation (adjust for your environment)
iiq.home=/opt/sailpoint/identityiq
iiq.lib=${iiq.home}/WEB-INF/lib
```

- [ ] **Step 2: Create build.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project name="IIQ-UI-Toolkit" default="build" basedir=".">

  <property file="build.properties"/>
  <property name="pluginClasses" value="${plugin.build}/classes"/>

  <path id="classpath">
    <fileset dir="${iiq.lib}" includes="**/*.jar"/>
  </path>

  <target name="clean">
    <delete dir="${plugin.build}"/>
    <delete dir="${plugin.lib}"/>
  </target>

  <target name="compile" depends="clean">
    <mkdir dir="${pluginClasses}"/>
    <mkdir dir="${plugin.lib}"/>
    <javac srcdir="${plugin.src}" destdir="${pluginClasses}"
           classpathref="classpath" includeantruntime="false"
           source="1.8" target="1.8"/>
    <jar destfile="${plugin.lib}/${plugin.name}-${plugin.version}.jar"
         basedir="${pluginClasses}"/>
  </target>

  <target name="build" depends="compile">
    <mkdir dir="${plugin.dist}"/>
    <zip destfile="${plugin.dist}/${plugin.name}-${plugin.version}.zip">
      <zipfileset dir="." includes="manifest.xml"/>
      <zipfileset dir="${plugin.ui}" prefix="ui"/>
      <zipfileset dir="${plugin.lib}" prefix="lib"/>
      <zipfileset dir="${plugin.import}" prefix="import"/>
      <zipfileset dir="${plugin.db}" prefix="db"/>
      <zipfileset dir="${plugin.messages}" prefix="messages"/>
    </zip>
    <echo>Plugin built: ${plugin.dist}/${plugin.name}-${plugin.version}.zip</echo>
  </target>

</project>
```

- [ ] **Step 3: Create empty directories**

```bash
mkdir -p src/com/str/iiq/ui/toolkit ui/js ui/css import/install lib db messages
```

### Task 2: Plugin Manifest (manifest.xml)

**Files:**
- Create: `manifest.xml`

- [ ] **Step 1: Create manifest.xml**

```xml
<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE Plugin PUBLIC "sailpoint.dtd" "sailpoint.dtd">
<Plugin name="IIQ-UI-Toolkit" displayName="IIQ UI Toolkit" version="1.0.0"
        minSystemVersion="8.5" maxSystemVersion="8.5"
        rightRequired="">

  <Attributes>
    <Map>

      <!-- REST Resources -->
      <entry key="restResources">
        <value>
          <List>
            <String>com.iiq.ui.toolkit.UIToolkitRestResource</String>
          </List>
        </value>
      </entry>

      <!-- Plugin Settings -->
      <entry key="settings">
        <value>
          <List>
            <PluginSetting name="approvalItems.lineBreak"
              label="Display approvalItem attributes with line breaks"
              helpText="Split comma-separated attribute values into separate lines in approval work items"
              dataType="boolean" defaultValue="false"/>

            <PluginSetting name="approvalItems.hideApplication"
              label="Hide application rows for IdentityIQ"
              helpText="Hide approval items where the application is IdentityIQ. Items for other applications are unaffected."
              dataType="boolean" defaultValue="false"/>

            <PluginSetting name="approvalItems.hideNativeIdentity"
              label="Hide native identity column"
              helpText="Hide the native identity column in approval item grids"
              dataType="boolean" defaultValue="false"/>

            <PluginSetting name="approvalItems.hideOperation"
              label="Hide operation column"
              helpText="Hide the operation column in approval item grids"
              dataType="boolean" defaultValue="false"/>

            <PluginSetting name="approvalItems.changeHighlight"
              label="Highlight changes by operation type"
              helpText="Color-code approval item rows based on operation (Create=green, Modify=blue, Delete=red)"
              dataType="boolean" defaultValue="false"/>


          </List>
        </value>
      </entry>

      <!-- Settings Form (groups settings into sections in the config UI) -->
      <entry key="settingsForm">
        <value>
          <Form name="IIQ UI Toolkit Settings">
            <Attributes>
              <Map>
                <entry key="pageTitle" value="IIQ UI Toolkit Configuration"/>
                <entry key="title" value="IIQ UI Toolkit Configuration"/>
              </Map>
            </Attributes>
            <Description>Configure approval work item UI enhancements</Description>
            <Section name="Approval Item Settings" label="Approval Item Settings">
              <Field name="approvalItems.lineBreak"
                     displayName="Display approvalItem attributes with line breaks"
                     helpKey="Split comma-separated attribute values into separate lines in approval work items"
                     type="boolean"/>
              <Field name="approvalItems.hideApplication"
                     displayName="Hide application rows for IdentityIQ"
                     helpKey="Hide approval items where the application is IdentityIQ. Items for other applications are unaffected."
                     type="boolean"/>
              <Field name="approvalItems.hideNativeIdentity"
                     displayName="Hide native identity column"
                     helpKey="Hide the native identity column in approval item grids"
                     type="boolean"/>
              <Field name="approvalItems.changeHighlight"
                     displayName="Highlight changes by operation type"
                     helpKey="Color-code approval item rows based on operation (Create=green, Modify=blue, Delete=red)"
                     type="boolean"/>
            </Section>
          </Form>
        </value>
      </entry>

      <!-- Snippets -->
      <entry key="snippets">
        <value>
          <List>
            <Snippet name="uiToolkitWorkItem"
                     regexPattern=".*\/workitem\/commonWorkItem\.jsf.*"
                     rightRequired="">
              <scripts>
                <List>
                  <String>js/ui-toolkit-core.js</String>
                </List>
              </scripts>
              <styleSheets>
                <List>
                  <String>css/ui-toolkit-core.css</String>
                </List>
              </styleSheets>
            </Snippet>
            <Snippet name="uiToolkitApprovals"
                     regexPattern=".*\/approval\/approvals\.jsf#\/approvals.*"
                     rightRequired="">
              <scripts>
                <List>
                  <String>js/ui-toolkit-core.js</String>
                </List>
              </scripts>
              <styleSheets>
                <List>
                  <String>css/ui-toolkit-core.css</String>
                </List>
              </styleSheets>
            </Snippet>
          </List>
        </value>
      </entry>

    </Map>
  </Attributes>
</Plugin>
```

### Task 3: REST Endpoint

**Files:**
- Create: `src/com/str/iiq/ui/toolkit/UIToolkitRestResource.java`

- [ ] **Step 1: Create UIToolkitRestResource.java**

```java
package com.iiq.ui.toolkit;

import sailpoint.rest.plugin.BasePluginResource;
import sailpoint.rest.plugin.AllowAll;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

/**
 * REST endpoint for IIQ-UI-Toolkit plugin settings.
 * Serves plugin settings as JSON so the client-side core loader
 * can determine which modules to activate.
 */
@Path("IIQUIToolkit")
@AllowAll
public class UIToolkitRestResource extends BasePluginResource {

    @Override
    public String getPluginName() {
        return "IIQ-UI-Toolkit";
    }

    @GET
    @Path("settings")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getSettings() {
        Map<String, Object> settings = new HashMap<>();
        settings.put("approvalItems.lineBreak", getSettingBool("approvalItems.lineBreak"));
        settings.put("approvalItems.hideApplication", getSettingBool("approvalItems.hideApplication"));
        settings.put("approvalItems.hideNativeIdentity", getSettingBool("approvalItems.hideNativeIdentity"));
        settings.put("approvalItems.hideOperation", getSettingBool("approvalItems.hideOperation"));
        settings.put("approvalItems.changeHighlight", getSettingBool("approvalItems.changeHighlight"));

        return Response.ok(settings).build();
    }
}
```

### Task 4: Core Loader (ui-toolkit-core.js)

**Files:**
- Create: `ui/js/ui-toolkit-core.js`

- [ ] **Step 1: Create ui-toolkit-core.js**

```javascript
/**
 * IIQ-UI-Toolkit Core Loader
 * 
 * Reads plugin settings from the REST endpoint, determines which modules
 * are active, and dynamically loads their JS/CSS files.
 * 
 * Graceful degradation: if the REST endpoint is unavailable or returns
 * an error, the standard IIQ UI displays without any visible disruption.
 * This is enforced by silent catch at every failure point.
 */
var UIToolkit = (function() {

  'use strict';

  var modules = {};
  var settings = {};
  var observer = null;
  var debounceTimer = null;

  var PLUGIN_BASE = '/identityiq/plugin/IIQ-UI-Toolkit';
  var SETTINGS_URL = PLUGIN_BASE + '/rest/settings';

  /**
   * Determine which modules should be active based on current settings.
   * Each setting name maps to a module name.
   */
  function getActiveModules() {
    var active = [];
    if (settings['approvalItems.lineBreak']) active.push('approval-linebreaks');

    var hideApp = settings['approvalItems.hideApplication'];
    var hideNI  = settings['approvalItems.hideNativeIdentity'];
    var hideOp  = settings['approvalItems.hideOperation'];
    if (hideApp || hideNI || hideOp) active.push('hide-columns');

    if (settings['approvalItems.changeHighlight']) active.push('change-highlight');

    return active;
  }

  /**
   * Register a module with the core loader.
   * Modules call this during their initial execution.
   */
  function registerModule(name, moduleImpl) {
    modules[name] = moduleImpl;
  }

  /**
   * Activate all active modules by calling their init().
   * Each module init is individually wrapped in try/catch for isolation.
   */
  function activateModules() {
    var active = getActiveModules();
    for (var i = 0; i < active.length; i++) {
      var name = active[i];
      if (modules[name] && typeof modules[name].init === 'function') {
        try {
          modules[name].init(settings);
        } catch (e) {
          // Module init failed silently — continue with other modules
        }
      }
    }
  }

  /**
   * Start MutationObserver on document.body to handle IIQ's
   * dynamic content loading (AJAX partial renders).
   * Forward mutations to active modules.
   */
  function startObserver() {
    if (observer) return; // already started
    observer = new MutationObserver(function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        var active = getActiveModules();
        for (var i = 0; i < active.length; i++) {
          var name = active[i];
          if (modules[name] && typeof modules[name].onMutation === 'function') {
            try {
              modules[name].onMutation();
            } catch (e) {
              // Module mutation handler failed silently
            }
          }
        }
      }, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function loadCSS(href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = PLUGIN_BASE + '/' + href;
    document.head.appendChild(link);
  }

  function loadJS(src) {
    var script = document.createElement('script');
    script.src = PLUGIN_BASE + '/' + src;
    document.head.appendChild(script);
  }

  /**
   * Initialize the plugin: fetch settings, load active modules, activate them.
   */
  function init() {
    // Fetch settings from REST endpoint — fail silently on any error
    var xhr = new XMLHttpRequest();
    xhr.open('GET', SETTINGS_URL, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            settings = JSON.parse(xhr.responseText);
            if (!settings) return;

            var active = getActiveModules();
            if (active.length === 0) return;

            // Load CSS for active modules
            for (var i = 0; i < active.length; i++) {
              loadCSS('css/module-' + active[i] + '.css');
            }

            // Load JS for active modules — they self-register via registerModule
            var loaded = 0;
            for (var j = 0; j < active.length; j++) {
              (function(moduleName) {
                var s = document.createElement('script');
                s.src = PLUGIN_BASE + '/js/module-' + moduleName + '.js';
                s.onload = function() {
                  loaded++;
                  if (loaded === active.length) {
                    // All modules loaded — activate them
                    try {
                      activateModules();
                      startObserver();
                    } catch (e) { /* silent fail */ }
                  }
                };
                s.onerror = function() { /* module load failed — silent */ };
                document.head.appendChild(s);
              })(active[j]);
            }
          } catch (e) { /* JSON parse error — silent fail */ }
        }
        // Non-200 status: REST unavailable — standard UI displays as-is
      }
    };
    xhr.onerror = function() {
      // Network error — standard UI displays as-is
    };
    xhr.send();
  }

  // Public API
  return {
    init: init,
    registerModule: registerModule,
    getActiveModules: getActiveModules
  };

})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { UIToolkit.init(); });
} else {
  UIToolkit.init();
}
```

### Task 5: Module 1 — Approval Line Breaks (JS + CSS)

**Files:**
- Create: `ui/js/module-approval-linebreaks.js`
- Create: `ui/css/module-approval-linebreaks.css`

- [ ] **Step 1: Create module-approval-linebreaks.js**

```javascript
/**
 * Module: Approval Line Breaks
 * 
 * Splits comma-separated attribute values in approval item display cells
 * into separate lines. Each comma-separated item gets wrapped in a
 * <span class="iuitk-attr-line"> element for CSS block display.
 * 
 * Works with both:
 *   - "name = 'value1, value2, value3'" format
 *   - Direct comma-separated lists
 */
(function() {

  'use strict';

  /**
   * Process a single cell element: find comma-separated items and
   * wrap each in a line-break element.
   *
   * Important: only splits on commas when the text contains the
   * `key='value'` quote pattern. Without quotes, commas are part of
   * a single value (e.g. an LDAP DN like "uid=user,ou=users,dc=test").
   */
  function processCell(cell) {
    // Skip if already processed
    if (cell.getAttribute('data-iuitk-linebreaks') === 'true') return;

    var text = cell.textContent || cell.innerText;
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

    // Replace content with individual line spans
    cell.setAttribute('data-iuitk-linebreaks', 'true');
    cell.innerHTML = '';

    for (var i = 0; i < items.length; i++) {
      var span = document.createElement('span');
      span.className = 'iuitk-attr-line';
      span.textContent = items[i].trim();
      cell.appendChild(span);
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
   * Find approval item cells that may contain comma-separated values.
   * Looks for table/div cells within the work item renderer that match
   * the approval item pattern.
   */
  function processAll() {
    // Try common selectors for approval item value cells
    var selectors = [
      '.approval-item-value',           // Common IIQ class
      '.work-item-value',               // Alternative class
      'td[class*="value"]',             // Any value column
      'div[class*="approvalItem"] td',  // Approval item tables
      '.sailpoint-grid-cell',           // Grid cells
      '[data-attribute-value]'          // Data attribute pattern
    ];

    for (var s = 0; s < selectors.length; s++) {
      var cells = document.querySelectorAll(selectors[s]);
      for (var c = 0; c < cells.length; c++) {
        processCell(cells[c]);
      }
    }
  }

  // Register module
  UIToolkit.registerModule('approval-linebreaks', {
    init: function() {
      processAll();
    },
    onMutation: function() {
      processAll();
    }
  });

})();
```

- [ ] **Step 2: Create module-approval-linebreaks.css**

```css
/**
 * Module: Approval Line Breaks
 * 
 * Each attribute value item displays on its own line with a white
 * full-width background, visually separated from the panel heading
 * (badge + action buttons).
 */
.iuitk-attr-line {
  display: block;
  width: 100%;
  background-color: #fff;
  padding: 6px 10px;
  margin-bottom: 2px;
  line-height: 1.5;
  border-radius: 3px;
}

.iuitk-attr-line:not(:last-child) {
  border-bottom: none;
}

/* Add a bullet or visual separator to each line */
.iuitk-attr-line::before {
  content: "\2022";
  margin-right: 6px;
  color: #666;
}
```

### Task 6: Module 2 — Hide Columns (JS + CSS)

**Files:**
- Create: `ui/js/module-hide-columns.js`
- Create: `ui/css/module-hide-columns.css`

- [ ] **Step 1: Create module-hide-columns.js**

```javascript
/**
 * Module: Hide Columns
 * 
 * Hides specified fields (application, native identity) from approval items.
 * The application field is only hidden when its value is "IdentityIQ"
 * (case-insensitive) — items for other applications remain visible.
 * 
 * Re-applies on DOM mutations for IIQ's dynamic loading.
 */
(function() {

  'use strict';

  var settings = null;

  /**
   * Mapping of setting names to column header keywords used for matching.
   */
  var COLUMN_MAP = [
    { key: 'approvalItems.hideApplication',    keywords: ['Application', 'application', 'APP'] },
    { key: 'approvalItems.hideNativeIdentity',  keywords: ['Native Identity', 'native identity', 'Native Identity', 'Account'] },
    { key: 'approvalItems.hideOperation',       keywords: ['Operation', 'operation', 'Action', 'action'] }
  ];

  function processAll() {
    if (!settings) return;

    // Find all tables in the work item page
    var tables = document.querySelectorAll('table');

    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
      // Skip already-processed tables
      if (table.getAttribute('data-iuitk-columns-processed') === 'true') continue;

      var headers = table.querySelectorAll('th, thead td');
      if (!headers || headers.length === 0) continue;

      // For each column setting that's enabled, find and hide the matching column
      for (var m = 0; m < COLUMN_MAP.length; m++) {
        var config = COLUMN_MAP[m];
        if (!settings[config.key]) continue;

        for (var h = 0; h < headers.length; h++) {
          var headerText = (headers[h].textContent || headers[h].innerText || '').trim();

          for (var kw = 0; kw < config.keywords.length; kw++) {
            if (headerText.indexOf(config.keywords[kw]) !== -1) {
              // Found matching column — hide it
              var colIndex = h;
              hideColumn(table, colIndex);
              break;
            }
          }
        }
      }

      table.setAttribute('data-iuitk-columns-processed', 'true');
    }
  }

  /**
   * Hide a column by index in a given table.
   * Hides both the header cell and all data cells at that index.
   */
  function hideColumn(table, colIndex) {
    var rows = table.querySelectorAll('tr');
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r].querySelectorAll('td, th');
      if (cells.length > colIndex) {
        cells[colIndex].style.display = 'none';
      }
    }
  }

  // Register module
  UIToolkit.registerModule('hide-columns', {
    init: function(s) {
      settings = s;
      processAll();
    },
    onMutation: function() {
      // Re-process tables to catch dynamically added ones
      // Already-processed tables are skipped via data attribute
      processAll();
    }
  });

})();
```

- [ ] **Step 2: Create module-hide-columns.css**

```css
/**
 * Module: Hide Columns
 * 
 * Additional styles for hidden columns (the JS does the main work,
 * but this ensures hidden columns don't cause layout shift).
 */
th[style*="display: none"],
td[style*="display: none"] {
  visibility: hidden !important;
  padding: 0 !important;
  width: 0 !important;
  overflow: hidden;
}
```

### Task 7: Module 3 — Change Highlighting (JS + CSS)

**Files:**
- Create: `ui/js/module-change-highlight.js`
- Create: `ui/css/module-change-highlight.css`

- [ ] **Step 1: Create module-change-highlight.js**

```javascript
/**
 * Module: Change Highlighting
 * 
 * Color-codes approval item rows based on their operation type:
 *   - Create  → green background
 *   - Modify  → blue background
 *   - Delete  → red background
 *   - Enable  → green (lighter)
 *   - Disable → orange
 * 
 * The module scans the operation column for operation keywords
 * and adds a CSS class to the parent row.
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

  /**
   * Find operation column text in approval item cells and
   * highlight the parent row.
   */
  function processAll() {
    // Look for operation-related cells
    var selectors = [
      'td[class*="operation"]',
      'td[class*="op"]',
      '.sailpoint-grid-cell',
      'tr'
    ];

    for (var s = 0; s < selectors.length; s++) {
      var elements = document.querySelectorAll(selectors[s]);
      for (var e = 0; e < elements.length; e++) {
        var el = elements[e];
        if (el.getAttribute('data-iuitk-op') === 'true') continue;

        var text = (el.textContent || el.innerText || '').trim();
        var opClass = getOperationClass(text);

        if (opClass) {
          // Find the parent row (tr)
          var row = findParentRow(el);
          if (row && !row.classList.contains(opClass)) {
            row.classList.add(opClass);
          }
          el.setAttribute('data-iuitk-op', 'true');
        }
      }
    }
  }

  function getOperationClass(text) {
    if (!text) return null;
    for (var op in OPERATION_CLASSES) {
      if (OPERATION_CLASSES.hasOwnProperty(op) &&
          text.indexOf(op) !== -1) {
        return OPERATION_CLASSES[op];
      }
    }
    return null;
  }

  function findParentRow(el) {
    while (el && el.tagName !== 'TR') {
      el = el.parentElement;
    }
    return el;
  }

  // Register module
  UIToolkit.registerModule('change-highlight', {
    init: function() {
      processAll();
    },
    onMutation: function() {
      processAll();
    }
  });

})();
```

- [ ] **Step 2: Create module-change-highlight.css**

```css
/**
 * Module: Change Highlighting
 * 
 * Color-codes approval item rows by operation type.
 * Uses subtle tints that work with most IIQ themes.
 */

.iuitk-op-create {
  background-color: #e8f5e9 !important;
}

.iuitk-op-modify {
  background-color: #e3f2fd !important;
}

.iuitk-op-delete {
  background-color: #fbe9e7 !important;
}

.iuitk-op-enable {
  background-color: #f1f8e9 !important;
}

.iuitk-op-disable {
  background-color: #fff3e0 !important;
}

/* Darken the first cell to indicate the row start */
.iuitk-op-create td:first-child,
.iuitk-op-modify td:first-child,
.iuitk-op-delete td:first-child {
  border-left: 3px solid;
}

.iuitk-op-create td:first-child {
  border-left-color: #4caf50;
}

.iuitk-op-modify td:first-child {
  border-left-color: #2196f3;
}

.iuitk-op-delete td:first-child {
  border-left-color: #f44336;
}

.iuitk-op-enable td:first-child {
  border-left-color: #8bc34a;
}

.iuitk-op-disable td:first-child {
  border-left-color: #ff9800;
}

/* Override IIQ's display:inline-flex on the description span so the
   badge and the more-less-toggle stack on separate lines, while still
   flowing inline with the sibling .pull-right button bar. */
span.description[data-iuitk-op] {
  display: inline-block;
  vertical-align: top;
  max-width: calc(100% - 240px);
}

/* Operation label pill badge — block-level, inserted before .more-less-toggle */
.iuitk-op-badge {
  display: block;
  width: fit-content;
  white-space: nowrap;
  color: #fff;
  border-radius: 999px;
  padding: 2px 10px;
  margin-bottom: 4px;
  font-weight: 600;
  font-size: 0.85em;
  line-height: 1.4;
}

.iuitk-op-create .iuitk-op-badge,
.iuitk-op-enable .iuitk-op-badge {
  background-color: #4caf50;
}

.iuitk-op-modify .iuitk-op-badge {
  background-color: #2196f3;
}

.iuitk-op-delete .iuitk-op-badge {
  background-color: #f44336;
}

.iuitk-op-disable .iuitk-op-badge {
  background-color: #ff9800;
}
```

### Task 8: Core CSS (ui-toolkit-core.css)

**Files:**
- Create: `ui/css/ui-toolkit-core.css`

- [ ] **Step 1: Create ui-toolkit-core.css**

```css
/**
 * IIQ-UI-Toolkit Core Styles
 * 
 * Always loaded on targeted pages. Provides base styles
 * and utility classes used by multiple modules.
 */

/* Ensure the plugin doesn't interfere with IIQ's own styles */
.iuitk-attr-line {
  /* Base definition — overridden by module CSS if needed */
  white-space: normal;
  word-break: break-word;
}

/* Utility: subtle transitions for module animations */
.iuitk-fade-in {
  animation: iuitkFadeIn 0.3s ease-in;
}

@keyframes iuitkFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Task 9: Build and Verify

**Files:**
- None needed (build step)

- [ ] **Step 1: Verify directory structure is complete**

```bash
# Verify all required files exist
ls -la \
  build.properties \
  build.xml \
  manifest.xml \
  src/com/iiq/ui/toolkit/UIToolkitRestResource.java \
  ui/js/ui-toolkit-core.js \
  ui/js/module-approval-linebreaks.js \
  ui/js/module-hide-columns.js \
  ui/js/module-change-highlight.js \
  ui/css/ui-toolkit-core.css \
  ui/css/module-approval-linebreaks.css \
  ui/css/module-hide-columns.css \
  ui/css/module-change-highlight.css
```

- [ ] **Step 2: Run Ant build**

```bash
ant build
```

Expected output: `[echo] Plugin built: build/dist/IIQ-UI-Toolkit-1.0.0.zip`

- [ ] **Step 3: Verify ZIP contents**

```bash
unzip -l build/dist/IIQ-UI-Toolkit-1.0.0.zip
```

Expected: All plugin files listed in the ZIP archive.

---

## Execution Order

Tasks must be executed in order:
1. Task 1 (skeleton) — needed for directory structure
2. Task 2 (manifest.xml) — defines the plugin
3. Task 3 (REST endpoint) — Java class, needs compilation
4. Task 4 (core loader) — needs to exist before modules
5. Tasks 5-7 (modules) — each independent, but ordered for clarity
6. Task 8 (core CSS) — needs to exist before modules
7. Task 9 (build + verify) — final integration check

Task 3 (REST) and Tasks 4-8 (JS/CSS) are independent and could theoretically be built in parallel, but the subagent-driven approach processes them sequentially for clean review gates.