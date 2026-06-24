# IIQ UI Toolkit

Client-side UI enhancement plugin for **SailPoint IdentityIQ** approval work items. Adds color-coding, formatting, badge overlays, and column hiding to the work item and approvals pages via a modular, setting-driven architecture.

## Features

All features are individually toggleable in the plugin settings. Default state: all OFF.

| Module | Setting | Description |
|--------|---------|-------------|
| **Change Highlight** | `approvalItems.changeHighlight` | Color-codes approval panels by operation type: Create/Add (green), Modify/Update/Change (blue), Delete/Remove (red), Enable/Unlock (light green), Disable/Lock (orange). |
| **Approval Line Breaks** | `approvalItems.lineBreak` | Splits comma-separated attribute values into separate lines, one per row. Preserves LDAP DNs as single values. |
| **Hide Application** | `approvalItems.hideApplication` | Hides approval items where the application is `IdentityIQ` itself (internal account changes). |
| **Hide Native Identity** | `approvalItems.hideNativeIdentity` | Hides the native identity column. |
| **Form Values** | `approvalItems.showFormValues` | Replaces raw attribute display with form field label:value pairs from the work item's form definition. Comma-separated list of form name prefixes. |
| **Item Aging** | `approvalItems.itemAging` | Color-coded expiration badge on the work item section header: green (>3 days), orange (1–3 days), red (expired). |
| **European Date Format** | `approvalItems.europeanDateFormat` | Converts `mm/dd/yyyy` date format to `dd.mm.yyyy` in approval work item attribute displays. |

## Locale Support

The plugin detects browser language via `navigator.language` and supports:

- **English** (default)
- **German** — operation names (`Erstellen`, `Ändern`, `Löschen`, `Aktivieren`, `Deaktivieren`, etc.) and item-aging labels (`Abgelaufen`, `Läuft in X Tagen ab`) render in German when the browser is set to a German locale.

Tested with IIQ 8.5 against `de`, `de-DE`, `de-AT`, `de-CH`.

## Requirements

- **SailPoint IdentityIQ** 7.3 or later (tested on 8.5)
- Plugin framework enabled (`plugins.disable=false`)
- Modern browser on the client side; **IE11 is supported** (modules avoid ES6+ methods like `String.prototype.startsWith` and `padStart`)

## Installation

### From prebuilt ZIP (recommended)

1. Download the latest release ZIP from the [Releases](../../releases) page (or build it yourself — see below)
2. Log into IIQ as admin
3. Navigate to **Admin** → **Plugins**
4. Click "expand the file uploader"
5. Select `IIQ_UI_Toolkit-<version>.zip`
6. Wait for upload to complete (~2 minutes)

The plugin becomes active immediately on work item and approval pages.

### Build from source

Requires Apache Ant and a local IIQ installation for the Java compilation classpath.

1. Clone this repository
2. Edit `build.properties` and set `iiq.home` to your local IIQ webapp path:
   ```properties
   iiq.home=/opt/tomcat9/webapps/identityiq
   ```
3. Build:
   ```sh
   ant build
   ```
4. Output: `build/dist/IIQ_UI_Toolkit-<version>.zip`

## Configuration

After installation, configure the plugin at **Admin** → **IIQ UI Toolkit Configuration** (gear icon → Global Settings → IIQ UI Toolkit Configuration).

Each module is a boolean toggle (except `showFormValues` which is a comma-separated list of form name prefixes).

Changes take effect on the next page load.

## Architecture

```
iiq-ui-toolkit/
├── build.properties          # Ant build config (iiq.home required for source builds)
├── build.xml                 # Ant: clean → compile → package ZIP
├── manifest.xml              # Plugin manifest: settings, REST, snippets
├── src/                      # Java REST resource
│   └── com/iiq/ui/toolkit/
│       └── UIToolkitRestResource.java
├── ui/
│   ├── js/
│   │   ├── ui-toolkit-core.js        # Core loader & module registry
│   │   └── module-*.js               # Individual modules
│   └── css/
│       ├── ui-toolkit-core.css
│       └── module-*.css
├── jars/                     # Compiled Java JAR (gitignored)
├── build/                    # Build output (gitignored)
└── docs/                     # Deployment guide
```

### Module Registry Pattern

`ui-toolkit-core.js` is loaded via IIQ snippets on `workitem/commonWorkItem.jsf` and `approval/approvals.jsf`. It:

1. Fetches user settings from the plugin's REST endpoint
2. Dynamically loads only the CSS/JS for active modules
3. Each module self-registers via `UIToolkit.registerModule(name, impl, urlPattern)`
4. After all modules register, a `MutationObserver` watches for Angular re-renders and triggers each module's `onMutation()` callback (debounced 300ms)

This means each module can be enabled/disabled per-deployment without code changes, and modules that fail to load don't break the page.

### REST Endpoint

`GET /identityiq/plugin/rest/IIQUIToolkit/settings` returns the user's plugin settings as JSON. The XSRF token (`SailPoint.XSRF_TOKEN`) is sent as the `X-XSRF-TOKEN` header.

## Development

To add a new module:

1. Create `ui/js/module-<name>.js` and `ui/css/module-<name>.css`
2. Add the module to `manifest.xml` settings (if user-toggleable)
3. Add the REST endpoint exposure in `UIToolkitRestResource.java`
4. Register the module in `getActiveModules()` in `ui-toolkit-core.js`
5. Add the module name to the URL pattern in the module's `registerModule(name, impl, pattern)` call

Each module must be:

- **Defensive** — wrap `init()` and `onMutation()` in try/catch
- **Idempotent** — safe to call `onMutation()` repeatedly on the same DOM
- **IE11-safe** — use `indexOf()` instead of `startsWith()`, `slice(-2)` instead of `padStart()`

## Versioning

Version is set in three places and must match:
- `build.properties` — `plugin.version`
- `manifest.xml` — `version="..."`
- `ui/js/ui-toolkit-core.js` — `var VERSION = '...'`

Use a `-dev` suffix during development to bypass IIQ's version-reuse check.

## Deployment

See [docs/deploy.md](docs/deploy.md) for detailed deployment instructions including:
- Admin UI upload
- Server-side ZIP replacement
- Browser automation for CI
- Post-deploy verification steps

## License

Internal project. License to be determined by the owning organization.

## Related Documentation

- [docs/deploy.md](docs/deploy.md) — deployment guide
- [SailPoint IIQ Plugin SDK](https://documentation.sailpoint.com/identityiq/help/plugins/develop_plugins/) — official plugin documentation
