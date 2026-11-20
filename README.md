# Gemini-Lite

Gemini-Lite is a patched build of [geminiAssist](https://github.com/AcideFluorhydrique/geminiAssist), a lightweight WebView wrapper for Gemini.

This repository does not carry modified app sources. A GitHub Actions workflow clones upstream, applies `patch.py`, builds the APK and publishes it as a release.

## What the patch does

### Removes URL restriction

Upstream blocks every request that is not on a small Google allowlist or not HTTPS. Gemini-Lite allows all URLs.

- Removes the allowlist and the request interception and URL-override logic.
- Removes the hand button that toggled restricted mode.
- Removes the swipe-to-hide handling, the drag-and-snap logic and the button drawables.
- Removes the long-press "Reset chat" action that lived on that button.
- Removes the link long-press "copy blocked URL" behavior. Image long-press and saving are unchanged.
- Removes the matching layout button and now-unused imports.
- Fails the build if any anchor or leftover reference is found, so upstream changes never go unnoticed.

### Fixes user agent and Google sign-in

- Upstream applied its user agent only when the restriction toggle was switched. Gemini-Lite applies it at startup, so Google sign-in works without any toggle.
- Upstream used a desktop-style Linux user agent, which made Gemini serve its desktop popover menu.
- Gemini-Lite keeps the mobile user agent and strips only the WebView markers (`; wv` and `Version/x.x`). The mobile layout stays and Google sign-in still works.

### Branding

- App name is changed to **Gemini-Lite** in all locales that define `app_name`.
- Launcher icon is replaced with the Gemini-Lite icon:
  - Legacy `ic_launcher.png` for mdpi to xxxhdpi.
  - Adaptive icon foreground and monochrome (themed icon) layers.
  - Adaptive icon background set to white.
  - Play Store icon at `app/src/main/ic_launcher-playstore.png`.
- The application ID is unchanged.

## Repository layout

| Path | Purpose |
| --- | --- |
| `patch.py` | Applies all changes to an upstream checkout. |
| `assets/res/` | Icon resources copied into `app/src/main/res/`. |
| `assets/ic_launcher-playstore.png` | Source icon, 512x512. |
| `.github/workflows/BuildFork.yml` | Clones upstream, patches, builds and releases. |
| `.github/workflows/SyncUpstream.yml` | Merges upstream into this repository. |

## Build

The workflow runs on every push to `main` and manually from the Actions tab. It builds only when the upstream commit or `patch.py` changed since the last release. Run it manually with **force** to rebuild. Manual runs publish a release only when **release** is enabled.

## Sync

`SyncUpstream.yml` merges upstream `main` into this repository every 12 hours and on manual run. On conflict, `README.md` and `.github/` always keep this repository's version. Sync commits do not trigger a build.

To patch locally:

```
git clone https://github.com/AcideFluorhydrique/geminiAssist upstream
python3 patch.py upstream
cd upstream && ./gradlew assembleDebug
```

`patch.py` is not idempotent. Run it on a fresh checkout only.

## Updating the icon

Replace the files in `assets/`, then change `patch.py` (any edit) so the workflow detects a new build.

## License

GPLv3, same as upstream.

The app uses:
- Parts from gptAssist (https://github.com/woheller69/gptAssist), GPLv3
- Parts from GMaps WV (https://gitlab.com/divested-mobile/maps), GPLv3

Upstream project and credit: `AcideFluorhydrique`.
