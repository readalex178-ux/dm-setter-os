# Fix the extension version showing as v1.0

## The real problem
The extension's `manifest.json` is already `4.0.0`, but the popup window you see is driven by `extension/popup.html`, which has the version **hardcoded** in its header:

```html
<span class="version">v1.0</span>
```

That static text is why the popup still reads "v1.0" no matter how many times the zip is rebuilt. The previous rebuilds were real, but none touched this line.

## What I'll change

1. **`extension/popup.html`** — make the version dynamic instead of a static string:
   - Give the span an id (`id="version"`).
   - In `extension/popup.js`, set it from the manifest at load time:
     `document.getElementById("version").textContent = "v" + chrome.runtime.getManifest().version;`
   - This way the popup always matches the manifest and can never drift again.

2. **Repackage** `public/dm-setter-os-extension.zip` from the `extension/` folder so the download serves the corrected popup.

## After this
- You must remove the old extension at `chrome://extensions` and **Load unpacked** the freshly unzipped folder (Chrome caches the old popup).
- The popup header will then read **v4.0.0**, pulled live from the manifest.

## Out of scope
No changes to extension logic, edge functions, or backend — this is a label fix plus repackage.
