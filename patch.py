#!/usr/bin/env python3
"""Usage: python3 patch.py <path-to-geminiAssist-checkout>

Removes the URL-restriction hand button and allows all URLs.
Renames the app to Gemini-Lite and replaces the launcher icon with assets/ (next to this file).
Fails loudly when an anchor is missing, so upstream changes never go unnoticed.
"""
import re
import shutil
import sys
from pathlib import Path

APP_NAME = "Gemini-Lite"

here = Path(__file__).resolve().parent
assets = here / "assets"
root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
res = root / "app/src/main/res"
java = root / "app/src/main/java/io/github/acidefluorhydrique/geminiassist/MainActivity.java"
layout = root / "app/src/main/res/layout/activity_main.xml"
delete = [
    "app/src/main/java/io/github/acidefluorhydrique/geminiassist/SwipeTouchListener.java",
    "app/src/main/res/drawable/restricted.xml",
    "app/src/main/res/drawable/unrestricted.xml",
    "app/src/main/res/drawable/button_background.xml",
    "app/src/main/res/drawable/ic_launcher_foreground.xml",
    "app/src/main/res/drawable/ic_launcher_monochrome.xml",
]


def fail(msg):
    sys.exit(f"patch.py: anchor not found: {msg}")


def remove(s, text, optional=False):
    if text not in s:
        if optional:
            return s
        fail(text.strip()[:80])
    return s.replace(text, "", 1)


def cut(s, start, end):
    i = s.find(start)
    if i < 0:
        fail(start.strip()[:80])
    j = s.find(end, i)
    if j < 0:
        fail(end.strip()[:80])
    return s[:i] + s[j:]


s = java.read_text(encoding="utf-8")

for line in [
    "    private ImageButton restrictedButton = null;\n",
    "    private SwipeTouchListener swipeTouchListener;\n",
    "    private static boolean restricted = true;\n",
    "    private boolean buttonDragging = false;  //the user is moving the button, do not snap it back on layout\n",
    "    private static final ArrayList<String> allowedDomains = new ArrayList<String>();\n\n",
    "        swipeTouchListener = null;\n",
    "        restrictedButton = findViewById(R.id.restricted);\n        makeButtonDraggable();\n",
    "        //Restrict what gets loaded\n        initURLs();\n",
]:
    s = remove(s, line)

s = remove(s, "        restricted = true;\n", optional=True)
s = remove(s, "        //Remember the last mode and whether the button was hidden; a fresh install starts restricted\n", optional=True)
s = remove(s, "        SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(this);\n", optional=True)
s = remove(s, '        restricted = prefs.getBoolean("restricted", true);\n', optional=True)
s = remove(s, '        if (prefs.getBoolean("buttonHidden", false)) restrictedButton.setVisibility(View.GONE);\n', optional=True)

s = cut(s, "    @Override\n    protected void onResume()", "    @Override\n    protected void onCreate")
s = cut(s, "            //Keep these in sync!", "            //WebResourceError is API 23+")
s = cut(s, "    public void resetChat()", "    //A blob URL only exists inside")
s = cut(s, "    private static void initURLs()", "    @Override\n    protected void onActivityResult")

# context menu: drop link branches and copyIfNotAllowed, close image branch
a = s.find("            } else if (result.getType() == SRC_IMAGE_ANCHOR_TYPE)")
b = s.find("    public String modUserAgent()")
if a < 0 or b < 0:
    fail("context menu / modUserAgent")
s = s[:a] + "            }\n        }\n    }\n\n" + s[b:]

# user agent at startup (Google login needs it)
js = "        chatWebSettings.setJavaScriptEnabled(true);"
if js not in s:
    fail(js.strip())
s = s.replace(js, "        chatWebSettings.setUserAgentString(modUserAgent());  //needed for login via Google\n" + js, 1)

# Desktop-like user agent made Gemini serve its desktop popover menu. Keep the mobile layout,
# only hide the WebView markers ("; wv", "Version/x") so Google sign-in still works.
s = cut(s, "    public String modUserAgent()", "    @Override\n    public void onRequestPermissionsResult")
ua = (
    "    public String modUserAgent() {\n"
    "        return WebSettings.getDefaultUserAgent(context)\n"
    "                .replace(\"; wv\", \"\")\n"
    "                .replaceAll(\"Version/[\\\\d.]+\\\\s\", \"\");\n"
    "    }\n\n"
)
k = s.find("    @Override\n    public void onRequestPermissionsResult")
s = s[:k] + ua + s[k:]

for name in [
    "static android.webkit.WebView.HitTestResult.SRC_ANCHOR_TYPE",
    "static android.webkit.WebView.HitTestResult.SRC_IMAGE_ANCHOR_TYPE",
    "android.content.ClipData", "android.content.ClipboardManager",
    "android.content.SharedPreferences", "android.os.Handler", "android.os.Looper",
    "android.os.Message", "android.preference.PreferenceManager",
    "android.view.MotionEvent", "android.view.ViewConfiguration",
    "android.webkit.WebResourceResponse", "android.webkit.WebStorage",
    "android.widget.ImageButton", "android.content.ActivityNotFoundException",
    "java.util.ArrayList",
]:
    s = s.replace(f"import {name};\n", "")

for leftover in ["restricted", "isAllowed", "SwipeTouchListener", "allowedDomains"]:
    if re.search(r"\b" + leftover + r"\b", s):
        fail(f"leftover reference to {leftover} after patching")
java.write_text(s, encoding="utf-8")

x = layout.read_text(encoding="utf-8")
x, n = re.subn(r"\n*[ \t]*<ImageButton\b.*?/>\n*", "\n\n", x, count=1, flags=re.S)
if n != 1:
    fail("<ImageButton> in activity_main.xml")
layout.write_text(x, encoding="utf-8")

for f in delete:
    p = root / f
    if p.exists():
        p.unlink()

# App name: every locale that defines app_name
renamed = []
for f in res.glob("values*/strings.xml"):
    t = f.read_text(encoding="utf-8")
    t, n = re.subn(
        r'(<string\s+name="app_name"[^>]*>)[^<]*(</string>)',
        lambda m: m.group(1) + APP_NAME + m.group(2),
        t,
    )
    if n:
        f.write_text(t, encoding="utf-8")
        renamed.append(f.parent.name)
if "values" not in renamed:
    fail('app_name in res/values/strings.xml')

# Icon: legacy mipmaps, adaptive foreground and monochrome (PNG), white adaptive background
if not (assets / "res").is_dir() or not (assets / "ic_launcher-playstore.png").is_file():
    fail("assets/res and assets/ic_launcher-playstore.png next to patch.py")
bg = res / "values/ic_launcher_background.xml"
x = bg.read_text(encoding="utf-8")
x, n = re.subn(r'(<color\s+name="ic_launcher_background">)[^<]*(</color>)', r"\g<1>#FFFFFF\g<2>", x)
if n != 1:
    fail("ic_launcher_background color")
bg.write_text(x, encoding="utf-8")
shutil.copytree(assets / "res", res, dirs_exist_ok=True)
shutil.copy2(assets / "ic_launcher-playstore.png", root / "app/src/main/ic_launcher-playstore.png")

print("patch.py: done")
