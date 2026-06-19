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
├── manifest.xml                         # Plugin definition, settings, snippets, resources
├── import/
│   └── install/
│       └── SPRights.xml                 # IIQUIToolkitAccess SPRight
├── src/
│   └── com/str/iiq/ui/toolkit/
│       └── UIToolkitRestResource.java   # REST endpoint serving settings as JSON
├── ui/
│   ├── js/
│   │   ├── ui-toolkit-core.js           # Core loader: fetch settings, activate modules
│   │   ├── module-approval-linebreaks.js
│   │   ├── module-hide-columns.js
│   │   ├── module-display-names.js
│   │   ├── module-change-highlight.js
│   │   └── module-inline-form-details.js
│   └── css/
│       ├── ui-toolkit-core.css
│       ├── module-approval-linebreaks.css
│       ├── module-hide-columns.css
│       ├── module-display-names.css
│       ├── module-change-highlight.css
│       └── module-inline-form-details.css
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
        rightRequired="IIQUIToolkitAccess">

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
              label="Hide application column"
              helpText="Hide the application column in approval item grids"
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

            <PluginSetting name="approvalItems.inlineFormDetails"
              label="Display form details inline"
              helpText="Show form details inline instead of requiring a click on the View Form button"
              dataType="boolean" defaultValue="false"/>

            <PluginSetting name="displayNames.map"
              label="Display name mappings"
              helpText="Comma-separated list of technicalName=displayName pairs (e.g. firstName=First Name,lastName=Last Name)"
              dataType="string" defaultValue=""/>
          </List>
        </value>
      </entry>

      <!-- Snippets -->
      <entry key="snippets">
        <value>
          <List>
            <Snippet name="uiToolkitApproval"
                     regexPattern=".*/identityiq/.*[Ww]ork[Ii]tem.*"
                     rightRequired="IIQUIToolkitAccess">
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

### Task 3: SPRight Definition

**Files:**
- Create: `import/install/SPRights.xml`

- [ ] **Step 1: Create SPRights.xml**

```xml
<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE SPRight PUBLIC "sailpoint.dtd" "sailpoint.dtd">
<SPRight name="IIQUIToolkitAccess" displayName="IIQ UI Toolkit Access">
  <Description>Access to the IIQ UI Toolkit plugin features and settings API</Description>
</SPRight>
```

### Task 4: REST Endpoint

**Files:**
- Create: `src/com/str/iiq/ui/toolkit/UIToolkitRestResource.java`

- [ ] **Step 1: Create UIToolkitRestResource.java**

```java
package com.iiq.ui.toolkit;

import sailpoint.rest.plugin.BasePluginResource;
import sailpoint.rest.plugin.RequiredRight;

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
@RequiredRight("IIQUIToolkitAccess")
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
        settings.put("approvalItems.inlineFormDetails", getSettingBool("approvalItems.inlineFormDetails"));
        settings.put("displayNames.map", getSettingString("displayNames.map"));
        return Response.ok(settings).build();
    }
}
```

### Task 5: Core Loader (ui-toolkit-core.js)

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

    var namesMap = settings['displayNames.map'];
    if (namesMap && namesMap.trim().length > 0) active.push('display-names');

    if (settings['approvalItems.changeHighlight']) active.push('change-highlight');
    if (settings['approvalItems.inlineFormDetails']) active.push('inline-form-details');

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

### Task 6: Module 1 — Approval Line Breaks (JS + CSS)

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
   */
  function processCell(cell) {
    // Skip if already processed
    if (cell.getAttribute('data-iuitk-linebreaks') === 'true') return;

    var text = cell.textContent || cell.innerText;
    if (!text) return;

    // Find comma-separated items within the cell
    // Pattern matches: "name = 'value1,value2'" or flat "value1,value2,value3"
    // Also handles the standard IIQ format: "attr1 = 'val1', attr2 = 'val2'"
    var items = splitDisplayValue(text);
    if (items.length <= 1) return;

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
 * Each attribute value item displays on its own line.
 */
.iuitk-attr-line {
  display: block;
  padding: 1px 0;
  line-height: 1.5;
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

### Task 7: Module 2 — Hide Columns (JS + CSS)

**Files:**
- Create: `ui/js/module-hide-columns.js`
- Create: `ui/css/module-hide-columns.css`

- [ ] **Step 1: Create module-hide-columns.js**

```javascript
/**
 * Module: Hide Columns
 * 
 * Hides specified columns (application, native identity, operation)
 * from approval item grids. Works by finding column headers by text
 * content and adding display:none at the correct column index.
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

### Task 8: Module 3 — Display Name Mapping (JS + CSS)

**Files:**
- Create: `ui/js/module-display-names.js`
- Create: `ui/css/module-display-names.css`

- [ ] **Step 1: Create module-display-names.js**

```javascript
/**
 * Module: Display Name Mapping
 * 
 * Replaces technical attribute names with friendly display names
 * in approval item display values.
 * 
 * Config: displayNames.map is a comma-separated string of
 * technicalName=displayName pairs.
 * Example: "firstName=First Name,lastName=Last Name,department=Department"
 */
(function() {

  'use strict';

  var nameMap = null;

  /**
   * Parse the displayNames.map config string into a lookup object.
   * Format: "tech1=Display 1,tech2=Display 2"
   */
  function parseNameMap(configStr) {
    var map = {};
    if (!configStr || configStr.trim().length === 0) return map;

    var pairs = configStr.split(',');
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].trim();
      var eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        var techName = pair.substring(0, eqIdx).trim();
        var displayName = pair.substring(eqIdx + 1).trim();
        if (techName.length > 0 && displayName.length > 0) {
          map[techName] = displayName;
        }
      }
    }
    return map;
  }

  /**
   * Replace attribute names in display value text.
   * Pattern matches: "technicalName = 'value'" → "Display Name = 'value'"
   */
  function replaceNames(text) {
    if (!text || !nameMap) return text;

    var result = text;
    for (var techName in nameMap) {
      if (nameMap.hasOwnProperty(techName)) {
        var displayName = nameMap[techName];
        // Match "techName = '" at the start of a line/item
        var regex = new RegExp(
          '(^|,\\s*|\\n\\s*)' + escapeRegex(techName) + '(\\s*=\\s*\')',
          'gi'
        );
        result = result.replace(regex, '$1' + displayName + '$2');

        // Also match bare "techName =" without quotes (alternative format)
        var regex2 = new RegExp(
          '(^|,\\s*|\\n\\s*)' + escapeRegex(techName) + '(\\s*=)',
          'gi'
        );
        result = result.replace(regex2, '$1' + displayName + '$2');
      }
    }
    return result;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Process all approval item cells, replacing technical names with
   * display names in their text content.
   */
  function processAll() {
    if (!nameMap) return;

    var selectors = [
      '.approval-item-value',
      '.work-item-value',
      'td[class*="value"]',
      '.sailpoint-grid-cell',
      '[data-attribute-value]',
      '.iuitk-attr-line'  // Also process already-line-broken cells
    ];

    for (var s = 0; s < selectors.length; s++) {
      var cells = document.querySelectorAll(selectors[s]);
      for (var c = 0; c < cells.length; c++) {
        var cell = cells[c];
        if (cell.getAttribute('data-iuitk-names') === 'true') continue;
        cell.setAttribute('data-iuitk-names', 'true');
        cell.textContent = replaceNames(cell.textContent);
      }
    }
  }

  // Register module
  UIToolkit.registerModule('display-names', {
    init: function(settings) {
      var configStr = settings['displayNames.map'];
      if (configStr && configStr.trim().length > 0) {
        nameMap = parseNameMap(configStr);
        processAll();
      }
    },
    onMutation: function() {
      if (nameMap) processAll();
    }
  });

})();
```

- [ ] **Step 2: Create module-display-names.css**

```css
/**
 * Module: Display Name Mapping
 * 
 * Minimal styles — the JS handles text replacement.
 * This file ensures a consistent visual for replaced names.
 */
[data-iuitk-names="true"] {
  /* Visual cue that name mapping has been applied (optional) */
}
```

### Task 9: Module 4 — Change Highlighting (JS + CSS)

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
```

### Task 10: Module 5 — Inline Form Details (JS + CSS)

**Files:**
- Create: `ui/js/module-inline-form-details.js`
- Create: `ui/css/module-inline-form-details.css`

- [ ] **Step 1: Create module-inline-form-details.js**

```javascript
/**
 * Module: Inline Form Details
 * 
 * Displays approval form content inline in the work item display
 * area, replacing the "View Form" button/link with expandable
 * inline content.
 * 
 * This module intercepts the View Form link, fetches its content
 * via AJAX, and renders it directly in the work item display area.
 */
(function() {

  'use strict';

  /**
   * Find "View Form" links/buttons in the approval work item page
   * and replace them with inline expandable content.
   */
  function processAll() {
    // Common patterns for "View Form" links in IIQ
    var viewFormSelectors = [
      'a:contains("View Form")',
      'a:contains("view form")',
      'a:contains("View Details")',
      'button:contains("View Form")',
      'a[href*="form"]',
      'a[href*="Form"]',
      '[class*="viewForm"]',
      '[class*="view-form"]'
    ];

    // querySelectorAll doesn't support :contains, so we do it manually
    var allLinks = document.querySelectorAll('a, button, span');
    for (var i = 0; i < allLinks.length; i++) {
      var el = allLinks[i];
      if (el.getAttribute('data-iuitk-form') === 'true') continue;

      var text = (el.textContent || el.innerText || '').trim().toLowerCase();
      if (text.indexOf('view form') !== -1 || text.indexOf('view details') !== -1) {
        replaceViewForm(el);
      } else if (text.indexOf('form') !== -1 && el.tagName === 'A' && el.href) {
        replaceViewForm(el);
      } else {
        // Check for class-based indicators
        var className = (el.className || '').toLowerCase();
        if (className.indexOf('viewform') !== -1 || className.indexOf('formdetails') !== -1) {
          replaceViewForm(el);
        }
      }
    }
  }

  /**
   * Replace a "View Form" element with an inline toggle.
   * Fetches the form content from the link's href.
   */
  function replaceViewForm(el) {
    el.setAttribute('data-iuitk-form', 'true');

    // Get the href or the parent link's href
    var href = el.href;
    if (!href) {
      var parentLink = findParentLink(el);
      if (parentLink) href = parentLink.href;
    }

    // Hide the original element
    el.style.display = 'none';

    // Create toggle container
    var container = document.createElement('div');
    container.className = 'iuitk-form-inline';

    // Create toggle button
    var toggle = document.createElement('button');
    toggle.className = 'iuitk-form-toggle';
    toggle.textContent = 'Show Details';
    toggle.setAttribute('type', 'button');
    container.appendChild(toggle);

    // Create content area
    var content = document.createElement('div');
    content.className = 'iuitk-form-content';
    content.style.display = 'none';

    // Insert the container after the original element
    el.parentNode.insertBefore(container, el.nextSibling);

    // Handle click to toggle and fetch content
    toggle.addEventListener('click', function() {
      if (content.style.display === 'none') {
        // Fetch content if not already loaded
        if (!content.getAttribute('data-loaded') && href) {
          toggle.textContent = 'Loading...';
          fetchFormContent(href, content, toggle);
        } else {
          content.style.display = 'block';
          toggle.textContent = 'Hide Details';
        }
      } else {
        content.style.display = 'none';
        toggle.textContent = 'Show Details';
      }
    });

    container.appendChild(content);
  }

  /**
   * Fetch form content from a URL.
   * Falls back to displaying the URL if the fetch fails.
   */
  function fetchFormContent(url, contentEl, toggleEl) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          // Extract and display the form content
          var html = xhr.responseText;
          contentEl.innerHTML = html;
          // Try to extract the main form area
          extractFormArea(contentEl);
          contentEl.setAttribute('data-loaded', 'true');
          contentEl.style.display = 'block';
          toggleEl.textContent = 'Hide Details';
        } else {
          // Fallback: show the URL
          contentEl.textContent = 'Form details unavailable. Please try again.';
          contentEl.style.display = 'block';
          toggleEl.textContent = 'Hide Details';
        }
      }
    };
    xhr.onerror = function() {
      contentEl.textContent = 'Form details unavailable. Please try again.';
      contentEl.style.display = 'block';
      toggleEl.textContent = 'Hide Details';
    };
    xhr.send();
  }

  /**
   * Extract the main form area from fetched HTML.
   * This handles IIQ's form rendering where the response may contain
   * a full page that needs to be scoped to the form content.
   */
  function extractFormArea(container) {
    // Try to find a form element or content area within the fetched HTML
    var formElements = container.querySelectorAll('form, .form-area, .form-content, [class*="form"]');
    if (formElements.length > 0) {
      // Replace container content with the form content
      var formContent = formElements[0].innerHTML;
      container.innerHTML = formContent;
    }
  }

  function findParentLink(el) {
    while (el && el.tagName !== 'A') {
      el = el.parentElement;
    }
    return el;
  }

  // Register module
  UIToolkit.registerModule('inline-form-details', {
    init: function() {
      processAll();
    },
    onMutation: function() {
      processAll();
    }
  });

})();
```

- [ ] **Step 2: Create module-inline-form-details.css**

```css
/**
 * Module: Inline Form Details
 * 
 * Styles for the inline form toggle and content area.
 */

.iuitk-form-inline {
  margin: 8px 0;
  font-size: 0.9em;
}

.iuitk-form-toggle {
  background: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 0.9em;
  color: #333;
}

.iuitk-form-toggle:hover {
  background: #e0e0e0;
}

.iuitk-form-content {
  margin-top: 8px;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.5;
}

/* Style form fields within the inline content */
.iuitk-form-content table {
  width: 100%;
  border-collapse: collapse;
}

.iuitk-form-content td,
.iuitk-form-content th {
  padding: 4px 8px;
  border: 1px solid #eee;
  text-align: left;
}

.iuitk-form-content th {
  background: #f0f0f0;
  font-weight: 600;
}
```

### Task 11: Core CSS (ui-toolkit-core.css)

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

### Task 12: Build and Verify

**Files:**
- None needed (build step)

- [ ] **Step 1: Verify directory structure is complete**

```bash
# Verify all required files exist
ls -la \
  build.properties \
  build.xml \
  manifest.xml \
  import/install/SPRights.xml \
  src/com/str/iiq/ui/toolkit/UIToolkitRestResource.java \
  ui/js/ui-toolkit-core.js \
  ui/js/module-approval-linebreaks.js \
  ui/js/module-hide-columns.js \
  ui/js/module-display-names.js \
  ui/js/module-change-highlight.js \
  ui/js/module-inline-form-details.js \
  ui/css/ui-toolkit-core.css \
  ui/css/module-approval-linebreaks.css \
  ui/css/module-hide-columns.css \
  ui/css/module-display-names.css \
  ui/css/module-change-highlight.css \
  ui/css/module-inline-form-details.css
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
3. Task 3 (SPRights.xml) — adds access right
4. Task 4 (REST endpoint) — Java class, needs compilation
5. Task 5 (core loader) — needs to exist before modules
6. Tasks 6-10 (modules) — each independent, but ordered for clarity
7. Task 11 (core CSS) — needs to exist before modules
8. Task 12 (build + verify) — final integration check

Task 4 (REST) and Tasks 5-11 (JS/CSS) are independent and could theoretically be built in parallel, but the subagent-driven approach processes them sequentially for clean review gates.