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
3. **Display Name Mapping** — Replace technical attribute names with friendly display names
4. **Change Highlighting** — Color-code approval item rows by operation type (Create/Modify/Delete)
5. **Inline Form Details** — Display form details inline instead of requiring a click on the "View Form" button

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
├── manifest.xml                         # Plugin definition, settings, snippets, SPRights
├── build.xml                            # Ant build
├── build.properties                     # Build tokens
├── ui/
│   ├── js/
│   │   ├── ui-toolkit-core.js           # Core loader: fetches settings, activates modules
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
├── src/
│   └── com/str/iiq/ui/toolkit/
│       └── UIToolkitRestResource.java    # REST endpoint: returns settings as JSON
├── lib/                                  # Compiled JARs
├── import/
│   └── install/
│       └── SPRights.xml                  # Plugin right definition
├── db/                                   # Empty (no DB needed for v1)
└── messages/                             # i18n (future)
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| `manifest.xml` | Plugin metadata, PluginSetting definitions, snippet registration, SPRight |
| `UIToolkitRestResource.java` | Serves plugin settings as JSON to snippet JS |
| `ui-toolkit-core.js` | Fetches settings, determines active modules, loads module JS/CSS dynamically, starts MutationObserver |
| `module-*.js` | Each implements `init(settings)` and `onMutation(mutations)`, registers via `UIToolkit.registerModule()` |
| `module-*.css` | Styles for each module's DOM transformations |
| `ui-toolkit-core.css` | Base styles (always loaded) |

## Plugin Settings

All settings are defined as `PluginSetting` entries in `manifest.xml`. IIQ automatically renders them on the plugin's Configure page. No custom settings UI needed.

| Setting Key | Label | Type | Default | Description |
|---|---|---|---|---|
| `approvalItems.lineBreak` | Display approvalItem attributes with line breaks | boolean | false | Split comma-separated values into separate lines |
| `approvalItems.hideApplication` | Hide application column | boolean | false | Hide the application column in approval grids |
| `approvalItems.hideNativeIdentity` | Hide native identity column | boolean | false | Hide the native identity column |
| `approvalItems.hideOperation` | Hide operation column | boolean | false | Hide the operation column |
| `approvalItems.changeHighlight` | Highlight changes by operation type | boolean | false | Color-code rows by operation type |
| `approvalItems.inlineFormDetails` | Display form details inline | boolean | false | Show form details inline instead of View Form button |
| `displayNames.map` | Display name mappings | string | (empty) | Comma-separated `technicalName=displayName` pairs |

## REST Endpoint

### `GET /identityiq/plugin/IIQ-UI-Toolkit/rest/settings`

Returns all plugin settings as a JSON object. The snippet JS calls this on page load to determine which modules to activate.

```java
@Path("IIQUIToolkit")
@RequiredRight("IIQUIToolkitAccess")
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
        settings.put("approvalItems.inlineFormDetails", getSettingBool("approvalItems.inlineFormDetails"));
        settings.put("displayNames.map", getSettingString("displayNames.map"));
        return Response.ok(settings).build();
    }
}
```

## Snippet Registration

One snippet targets approval/work item pages:

```xml
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
    if (settings['displayNames.map'] && settings['displayNames.map'].trim() !== '') modules.push('display-names');
    if (settings['approvalItems.changeHighlight']) modules.push('change-highlight');
    if (settings['approvalItems.inlineFormDetails']) modules.push('inline-form-details');
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

### Module 3: Display Names (`module-display-names`)

**Config key:** `displayNames.map` (string, comma-separated `technicalName=displayName` pairs)

**Behavior:**
1. Parses the config string into a lookup map: `{ "firstName": "First Name", "lastName": "Last Name", ... }`
2. Scans approval item cells for patterns like `technicalName = 'value'`
3. Replaces the technical name portion with the friendly name from the map
4. Runs before line breaks module (execution order matters)

### Module 4: Change Highlighting (`module-change-highlight`)

**Config key:** `approvalItems.changeHighlight` (boolean)

**Behavior:**
1. Scans the operation column for values: Create, Modify, Delete, Enable, Disable
2. Adds CSS class to the row: `iuitk-op-create`, `iuitk-op-modify`, `iuitk-op-delete`, etc.
3. CSS applies background colors: green for Create, blue for Modify, red for Delete

### Module 5: Inline Form Details (`module-inline-form-details`)

**Config key:** `approvalItems.inlineFormDetails` (boolean)

**Behavior:**
1. Finds "View Form" links/buttons in the approval item area
2. Fetches the form content via the link's URL using AJAX
3. Injects the form content inline, hidden by default with an expand/collapse toggle
4. Hides or removes the original "View Form" button
5. MutationObserver watches for dynamically loaded form content

**Note:** This is the most complex module. IIQ loads form content via AJAX, so the module must handle async responses and render within the approval item context. The specific IIQ JavaScript patterns for modal/popup loading need to be observed in the DOM during implementation.

## Module Execution Order

Modules run in a defined order to avoid conflicts:

1. **Display Names** — transforms text before line breaks split it
2. **Change Highlighting** — adds CSS classes to rows (independent of content)
3. **Approval Line Breaks** — splits comma values after names are replaced
4. **Hide Columns** — removes columns after other modules have processed content
5. **Inline Form Details** — operates on the "View Form" element (independent)

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
2. Toggle the desired checkboxes or update the display name map
3. Save — changes take effect on next page load

## SPRight

A single SPRight `IIQUIToolkitAccess` controls access to both the snippet (who sees the UI enhancements) and the REST endpoint (who can read settings).

```xml
<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE SPRight PUBLIC "sailpoint.dtd" "sailpoint.dtd">
<SPRight name="IIQUIToolkitAccess" displayName="IIQ UI Toolkit Access">
  <Description>Access to the IIQ UI Toolkit plugin features and settings</Description>
</SPRight>
```

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

1. Assign `IIQUIToolkitAccess` SPRight to appropriate identities/roles
2. Navigate to Plugins → IIQ-UI-Toolkit → Configure
3. Toggle desired features
4. Navigate to an approval work item to verify