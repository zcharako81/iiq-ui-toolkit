# IIQ-UI-Toolkit Plugin Design

**Date:** 2026-06-19  
**Status:** Draft  
**Target:** SailPoint IdentityIQ 8.5  

## Overview

IIQ-UI-Toolkit is a generic, extensible SailPoint IdentityIQ plugin that manipulates HTML elements in the IIQ web interface. It uses the IIQ plugin snippet mechanism to inject JavaScript and CSS into targeted pages, with a module registry architecture that allows administrators to toggle features via the IIQ plugin configuration UI and developers to add new manipulation modules without modifying core code.

## Requirements

### v1 Scope

1. **Approval Item Line Breaks** — Split comma-separated attribute values in approval work item display into separate lines
2. **Hide Columns** — Hide specified columns (application, native identity, operation) from approval item grids
3. **Change Highlighting** — Color-code approval item rows by operation type (Create/Modify/Delete)

### Non-Functional Requirements

- **Graceful degradation** — If the REST endpoint is unavailable or returns an error, the standard IIQ UI displays without any visible error or disruption
- **Admin-configurable** — All features toggled via the IIQ plugin configuration UI (PluginSetting entries)
- **Developer-extensible** — New modules can be added by creating a JS/CSS pair and registering them in the core loader
- **Dynamic content aware** — MutationObserver handles IIQ's AJAX partial renders and dynamic content loading
- **No workflow changes** — All transformations are client-side only; no server-side workflow or rule modifications required

## Architecture

### Approach: Module Registry

Each UI manipulation is a self-contained module (JS + CSS pair). A core loader reads plugin settings from a REST endpoint and dynamically loads only the active modules. Modules register themselves with the core and implement a standard interface.

**Why this approach over alternatives:**
- **Settings-driven (Approach A):** Every new feature requires editing core code and the manifest. Settings page becomes cluttered.
- **Full Angular module system (Approach C):** Overkill for v1 scope. IIQ's Angular version varies across pages (AngularJS on legacy, Angular 18 on modernized). Adds significant complexity.
- **Module Registry (chosen):** Clean separation, independent enable/disable, new features don't touch existing code, settings stay organized.

### Directory Structure

```
IIQ-UI-Toolkit/
├── manifest.xml                         # Plugin definition, settings, snippets
├── build.xml                            # Ant build
├── build.properties                     # Build tokens
├── ui/
│   ├── js/
│   │   ├── ui-toolkit-core.js           # Core loader: fetches settings, activates modules
│   │   ├── ui-toolkit-core.js           # Core loader: fetches settings, activates modules
│   │   ├── module-approval-linebreaks.js
│   │   ├── module-hide-columns.js
│   │   └── module-change-highlight.js
│   └── css/
│       ├── ui-toolkit-core.css
│       ├── module-approval-linebreaks.css
│       ├── module-hide-columns.css
│       └── module-change-highlight.css
├── src/
│   └── com/iiq/ui/toolkit/
│       └── UIToolkitRestResource.java    # REST endpoint: returns settings as JSON
├── lib/                                  # Compiled JARs
├── import/                               # Install-time objects (future use)
├── db/                                   # Empty (no DB needed for v1)
└── messages/                             # i18n (future)
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| `manifest.xml` | Plugin metadata, PluginSetting definitions, snippet registration |
| `UIToolkitRestResource.java` | Serves plugin settings as JSON to snippet JS |
| `ui-toolkit-core.js` | Fetches settings, determines active modules, loads module JS/CSS dynamically, starts MutationObserver |
| `module-*.js` | Each implements `init(settings)` and `onMutation(mutations)`, registers via `UIToolkit.registerModule()` |
| `module-*.css` | Styles for each module's DOM transformations |
| `ui-toolkit-core.css` | Base styles (always loaded) |

## Plugin Settings

Settings are defined both as `PluginSetting` entries (for the settings API) and as a `settingsForm` entry (for UI layout with section grouping). IIQ renders the form on the plugin's Configure page with settings organized under the **Approval Item Settings** section heading.

| Setting Key | Label | Type | Default | Description |
|---|---|---|---|---|
| `approvalItems.lineBreak` | Display approvalItem attributes with line breaks | boolean | false | Split comma-separated values into separate lines |
| `approvalItems.hideApplication` | Hide application rows for IdentityIQ | boolean | false | Hide approval items where the application is IdentityIQ; items for other applications are unaffected |
| `approvalItems.hideNativeIdentity` | Hide native identity column | boolean | false | Hide the native identity column |
| `approvalItems.hideOperation` | Hide operation column | boolean | false | Hide the operation column |
| `approvalItems.changeHighlight` | Highlight changes by operation type | boolean | false | Color-code rows by operation type |


## REST Endpoint

### `GET /identityiq/plugin/IIQ-UI-Toolkit/rest/settings`

Returns all plugin settings as a JSON object. The snippet JS calls this on page load to determine which modules to activate.

```java
@Path("IIQUIToolkit")
@AllowAll
public class UIToolkitRestResource extends BasePluginResource {

    public String getPluginName() { return "IIQ-UI-Toolkit"; }

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

## Snippet Registration

One snippet targets approval/work item pages:

```xml
<Snippet name="uiToolkitApproval" 
         regexPattern=".*/identityiq/.*[Ww]ork[Ii]tem.*"
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
```

Only the core JS and CSS are loaded by the snippet. Active modules are loaded dynamically based on settings.

## Core Loader

### Graceful Degradation

The core loader must never disrupt the standard IIQ UI. If the REST endpoint is unavailable, returns an error, or any module fails, the page renders normally without any visible error.

```javascript
var UIToolkit = {
  modules: {},
  observer: null,
  debounceTimer: null,
  settings: {},

  init: function() {
    fetch('/identityiq/plugin/IIQ-UI-Toolkit/rest/settings')
      .then(function(response) {
        if (!response.ok) return null;
        return response.json();
      })
      .then(function(settings) {
        if (!settings) return;

        UIToolkit.settings = settings;
        var activeModules = UIToolkit.getActiveModules(settings);
        if (activeModules.length === 0) return;

        try {
          activeModules.forEach(function(name) {
            UIToolkit.loadCSS('css/module-' + name + '.css');
          });
          activeModules.forEach(function(name) {
            UIToolkit.loadJS('js/module-' + name + '.js');
          });
          setTimeout(function() {
            try {
              UIToolkit.activateModules(settings);
              UIToolkit.startObserver();
            } catch (e) { /* silent fail */ }
          }, 500);
        } catch (e) { /* silent fail */ }
      })
      .catch(function() { /* network error — silent fail */ });
  },

  getActiveModules: function(settings) {
    var modules = [];
    if (settings['approvalItems.lineBreak']) modules.push('approval-linebreaks');
    if (settings['approvalItems.hideApplication'] || 
        settings['approvalItems.hideNativeIdentity'] || 
        settings['approvalItems.hideOperation']) modules.push('hide-columns');
    if (settings['approvalItems.changeHighlight']) modules.push('change-highlight');
    return modules;
  },

  registerModule: function(name, module) {
    this.modules[name] = module;
  },

  activateModules: function(settings) {
    var active = this.getActiveModules(settings);
    active.forEach(function(name) {
      if (UIToolkit.modules[name] && typeof UIToolkit.modules[name].init === 'function') {
        try {
          UIToolkit.modules[name].init(settings);
        } catch (e) { /* skip failing module */ }
      }
    });
  },

  startObserver: function() {
    this.observer = new MutationObserver(function(mutations) {
      clearTimeout(UIToolkit.debounceTimer);
      UIToolkit.debounceTimer = setTimeout(function() {
        var active = UIToolkit.getActiveModules(UIToolkit.settings);
        active.forEach(function(name) {
          if (UIToolkit.modules[name] && typeof UIToolkit.modules[name].onMutation === 'function') {
            try {
              UIToolkit.modules[name].onMutation(mutations);
            } catch (e) { /* skip failing module */ }
          }
        });
      }, 300);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  },

  loadCSS: function(href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/identityiq/plugin/IIQ-UI-Toolkit/' + href;
    document.head.appendChild(link);
  },

  loadJS: function(src) {
    var script = document.createElement('script');
    script.src = '/identityiq/plugin/IIQ-UI-Toolkit/' + src;
    document.head.appendChild(script);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { UIToolkit.init(); });
} else {
  UIToolkit.init();
}
```

## Module Specifications

### Module Interface

Each module implements:

```javascript
UIToolkit.registerModule('module-name', {
  init: function(settings) { /* run on activation */ },
  onMutation: function(mutations) { /* run on DOM changes */ }
});
```

### Module 1: Approval Line Breaks (`module-approval-linebreaks`)

**Config key:** `approvalItems.lineBreak` (boolean)

**Behavior:**
1. MutationObserver detects approval item cells in the work item grid
2. For each cell, checks if content contains comma-separated items matching the pattern `name = 'value'`
3. Splits on commas, wraps each item in `<div class="iuitk-attr-line">`
4. CSS applies `display: block` for line breaks

**CSS:** `.iuitk-attr-line { display: block; }` with optional bullet styling

### Module 2: Hide Columns (`module-hide-columns`)

**Config keys:** `approvalItems.hideApplication`, `approvalItems.hideNativeIdentity`, `approvalItems.hideOperation` (booleans)

**Behavior:**
1. Maps each config key to the corresponding column header text or CSS class
2. Finds matching `<th>` elements, captures column index
3. Hides `<th>` and all `<td>` at that column index
4. MutationObserver re-applies when new rows appear dynamically

### Module 3: Change Highlighting (`module-change-highlight`)

**Config key:** `approvalItems.changeHighlight` (boolean)

**Behavior:**
1. Scans the operation column for values: Create, Modify, Delete, Enable, Disable
2. Adds CSS class to the row: `iuitk-op-create`, `iuitk-op-modify`, `iuitk-op-delete`, etc.
3. CSS applies background colors: green for Create, blue for Modify, red for Delete

## Module Execution Order

Modules run in a defined order to avoid conflicts:

1. **Change Highlighting** — adds CSS classes to rows (independent of content)
2. **Approval Line Breaks** — splits comma separated values
3. **Hide Columns** — removes columns after other modules have processed content

## Extensibility

### Adding a New Module (Developer)

1. Create `ui/js/module-<name>.js` implementing the module interface
2. Create `ui/css/module-<name>.css` with module styles
3. Add `PluginSetting` entries in `manifest.xml` for the module's configuration
4. Add the setting key to `UIToolkitRestResource.java`'s `getSettings()` method
5. Add the module name to `getActiveModules()` in `ui-toolkit-core.js`
6. Rebuild and reinstall the plugin

### Adding a New Feature (Administrator)

1. Navigate to gear menu → Plugins → IIQ-UI-Toolkit → Configure
2. Toggle the desired checkboxes
3. Save — changes take effect on next page load

## Build & Deployment

### Build

```bash
ant build
```

Produces `build/dist/IIQ-UI-Toolkit-1.0.0.zip`.

### Install

Via IIQ Plugins page (drag and drop) or console:

```bash
iiq console plugin install file=/path/to/IIQ-UI-Toolkit-1.0.0.zip
```

### Post-Install

1. Navigate to Plugins → IIQ-UI-Toolkit → Configure
2. Toggle desired features
3. Navigate to an approval work item to verify