# Deploy IIQ UI Toolkit Plugin

## Before You Start

**Bump version.** IIQ rejects uploads with the same version as installed.
Update in three places:
- `manifest.xml` — `version="X.Y.Z"`
- `build.properties` — `plugin.version=X.Y.Z`
- `ui/js/ui-toolkit-core.js` — `var VERSION = 'X.Y.Z'`

## Build

```sh
ant build
# Output: build/dist/IIQ_UI_Toolkit-<version>.zip
```

## Deploy Methods (ranked by reliability)

### 1. Admin UI Upload (most reliable)

Log into IIQ as admin → **Admin** menu → **Plugins** → click expand link → select zip → click upload.

| Step | Detail |
|------|--------|
| Login | `http://<iiq-host>/identityiq/` |
| Navigate | Admin menu (gear icon in top-right) → Plugins |
| Upload | Click "expand the file uploader" link, select `build/dist/IIQ_UI_Toolkit-<version>.zip`, upload |

Takes ~2 minutes. Most reliable because IIQ handles extraction and registration.

### 2. Server-side Replace (fastest, requires filesystem access)

If you have SSH/filesystem access to the IIQ server:

```sh
scp build/dist/IIQ_UI_Toolkit-<version>.zip <user>@<iiq-server>:/path/to/iiq/WEB-INF/plugins/
```

Then restart IIQ or use the plugin management UI to refresh. Some setups allow placing the zip in a hot-deploy directory.

**⚠ Verify:** Check plugin version shows as updated in Admin → Plugins.

### 3. Browser Automation (optional, for CI)

Agent-browser can automate the Admin UI flow. Requires:
- `agent-browser` CLI installed
- `spadmin` credentials in IIQ

```sh
agent-browser open "http://<iiq-host>/identityiq/login.jsf"
# login steps...
agent-browser open "http://<iiq-host>/identityiq/plugins/plugins.jsf"
# expand uploader, set file via base64 DataTransfer, click upload
```

Fragile — refs shift between IIQ versions and page states. Only worth scripting if deploying multiple times per day.

## Verify

After deploy, confirm the module loads on a work item page:

1. Navigate to any approval work item
2. Open browser devtools console
3. Check: `typeof UIToolkit !== 'undefined'`
4. Check: `UIToolkit.getActiveModules()` includes expected modules
5. Verify the feature works on the page

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0   | -    | Initial release |
| 1.0.1   | -    | Form values module (multi-panel support) |
| 1.0.2   | -    | Lightweight CSS for attr lines, cache-buster on module scripts |
