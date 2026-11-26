#!/usr/bin/env python3
"""Usage: python3 patch2.py <path-to-geminiAssist-checkout>   (run after patch.py)

- System bars follow the page colour (light/dark) instead of black.
- File picker honours the page's accept types and multiple selection.
- Registers the app as a digital assistant (Settings > Default digital assistant app, home long-press).
- Serves static *.gstatic.com files from a persistent disk cache and drops analytics requests.
Fails loudly when an anchor is missing, so upstream changes never go unnoticed.
"""
import re
import shutil
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
assets = here / "assets"
root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
pkg = root / "app/src/main/java/io/github/acidefluorhydrique/geminiassist"
java = pkg / "MainActivity.java"
manifest = root / "app/src/main/AndroidManifest.xml"


def fail(msg):
    sys.exit(f"patch2.py: anchor not found: {msg}")


def replace_once(s, old, new):
    n = s.count(old)
    if n != 1:
        fail(f"({n} matches) {old.strip()[:80]}")
    return s.replace(old, new, 1)


def replace_between(s, start, end, new):
    i = s.find(start)
    if i < 0:
        fail(start.strip()[:80])
    j = s.find(end, i)
    if j < 0:
        fail(end.strip()[:80])
    return s[:i] + new + s[j:]


s = java.read_text(encoding="utf-8")

# Fields
s = replace_once(
    s,
    '    private String urlToLoad = "https://gemini.google.com/";\n',
    '    private String urlToLoad = "https://gemini.google.com/";\n'
    '    private static final String THEME_JS_OBJECT = "geminiLiteTheme";\n'
    "    private AssetCache assetCache;\n"
    "    private boolean focusPromptPending = false;  //opened as the digital assistant, focus the prompt once the page is ready\n"
    "    private final android.os.Handler barHandler = new android.os.Handler(android.os.Looper.getMainLooper());\n"
    "    private final Runnable barSampler = this::sampleBars;\n"
    "    private android.graphics.Bitmap barPixel;\n"
    "    private boolean barSampling = false;\n"
    "    private int pageColor = 0xFFFAF9F9;\n"
    "    private int lastStatusColor = 0;\n"
    "    private int lastNavColor = 0;\n"
    "    private int lastLight = -1;\n"
    "    private int barTargetStatus = 0;\n"
    "    private int barTargetNav = 0;\n"
    "    private long barDeadline = 0;\n"
    "    private boolean barLoop = false;\n",
)

# System bars: stop the black bars, colour them from the page
s = replace_once(
    s,
    "        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);\n",
    "",
)
s = replace_once(
    s,
    "        chatWebView = findViewById(R.id.chatWebView);\n",
    "        chatWebView = findViewById(R.id.chatWebView);\n"
    "        assetCache = new AssetCache(getApplicationContext());\n"
    "        pageColor = savedBarColor();\n"
    "        chatWebView.setBackgroundColor(pageColor);\n"
    "        applySystemBars(pageColor, navFor(pageColor));\n",
)

# WebViewClient: disk cache for static files, focus the prompt when opened as assistant
s = replace_once(
    s,
    "        chatWebView.setWebViewClient(new WebViewClient() {\n",
    r"""        chatWebView.setWebViewClient(new WebViewClient() {
            //Static Gemini files come from the disk cache, analytics requests are dropped
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetCache.intercept(request);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                scheduleBarSample();
                if (focusPromptPending) {
                    focusPromptPending = false;
                    focusPrompt();
                }
            }

""",
)

# File picker: accept types + multiple selection
s = replace_once(
    s,
    r"""                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                return true;
""",
    r"""                //createIntent() carries the accept types the page asked for
                Intent intent = null;
                try {
                    intent = fileChooserParams.createIntent();
                } catch (RuntimeException e) {
                    Log.w(TAG, "[onShowFileChooser] createIntent failed", e);
                }
                if (intent == null) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }
                if (fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                } catch (android.content.ActivityNotFoundException e) {
                    mUploadMessage.onReceiveValue(null);
                    mUploadMessage = null;
                }
                return true;
""",
)
s = replace_between(
    s,
    "            Uri[] result = null;\n",
    "            mUploadMessage.onReceiveValue(result);\n",
    "            //Handles a single file and a multi selection (ClipData)\n"
    "            Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, intent);\n",
)

# Page colour -> system bars
s = replace_once(
    s,
    "        //Set more options\n",
    r"""        //System bars follow the page colour, which Gemini switches between light and dark itself
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)
                && WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addWebMessageListener(chatWebView, THEME_JS_OBJECT, Collections.singleton(GEMINI_ORIGIN),
                    (view, message, sourceOrigin, isMainFrame, replyProxy) -> onPageColor(message.getData()));
            WebViewCompat.addDocumentStartJavaScript(chatWebView, readAsset("theme_sync.js"),
                    Collections.singleton(GEMINI_ORIGIN));
        }

        //Set more options
""",
)

# Assistant launch
s = replace_once(
    s,
    "        chatWebView.loadUrl(urlToLoad);\n",
    "        focusPromptPending = isAssistIntent(getIntent());\n        chatWebView.loadUrl(urlToLoad);\n",
)

s = replace_once(
    s,
    "    @Override\n    protected void onDestroy() {\n",
    r"""    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (isAssistIntent(intent) && chatWebView != null) focusPrompt();
    }

    private static boolean isAssistIntent(Intent intent) {
        return intent != null && Intent.ACTION_ASSIST.equals(intent.getAction());
    }

    //Opened from the home long-press: put the cursor in the prompt box, the page may still be rendering
    private void focusPrompt() {
        chatWebView.evaluateJavascript("(function(){var n=0;(function t(){"
                + "var e=document.querySelector('rich-textarea .ql-editor,.ql-editor,textarea');"
                + "if(e){e.focus();return;}if(++n<60)setTimeout(t,250);})();})();", null);
    }

    private boolean isNight() {
        return (getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK)
                == android.content.res.Configuration.UI_MODE_NIGHT_YES;
    }

    //Last page colour per system theme, so the bars are right before the page has loaded
    private int savedBarColor() {
        boolean night = isNight();
        return getSharedPreferences("gemini_lite", MODE_PRIVATE)
                .getInt(night ? "bar_dark" : "bar_light", night ? 0xFF000000 : 0xFFFAF9F9);
    }

    private void onPageColor(String css) {
        int color = parseCssColor(css);
        if (color == 0) return;
        pageColor = color;
        if (chatWebView != null) chatWebView.setBackgroundColor(color);
        getSharedPreferences("gemini_lite", MODE_PRIVATE).edit()
                .putInt(isNight() ? "bar_dark" : "bar_light", color).apply();
        applySystemBars(color, navFor(color));
        scheduleBarSample();
    }

    private static int parseCssColor(String css) {
        if (css == null) return 0;
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("rgba?\\(\\s*(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)(?:[,/\\s]+([\\d.]+))?\\s*\\)").matcher(css);
        if (!m.find()) return 0;
        try {
            if (m.group(4) != null && Float.parseFloat(m.group(4)) < 0.5f) return 0;  //transparent
            return 0xFF000000 | ((Integer.parseInt(m.group(1)) & 0xFF) << 16)
                    | ((Integer.parseInt(m.group(2)) & 0xFF) << 8) | (Integer.parseInt(m.group(3)) & 0xFF);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static boolean isLight(int color) {
        return (android.graphics.Color.red(color) * 299 + android.graphics.Color.green(color) * 587
                + android.graphics.Color.blue(color) * 114) / 1000 > 140;
    }

    private static int navFor(int page) {
        return isLight(page) ? 0xFFF0F4F9 : 0xFF1E1F20;
    }

    private static boolean differs(int a, int b) {
        return Math.abs(android.graphics.Color.red(a) - android.graphics.Color.red(b)) >= 4
                || Math.abs(android.graphics.Color.green(a) - android.graphics.Color.green(b)) >= 4
                || Math.abs(android.graphics.Color.blue(a) - android.graphics.Color.blue(b)) >= 4;
    }

    private void scheduleBarSample() {
        barDeadline = android.os.SystemClock.uptimeMillis() + 1000;
        if (barLoop) return;
        barLoop = true;
        barHandler.post(barSampler);
    }

    private static int lum(int c) {
        return android.graphics.Color.red(c) * 299 + android.graphics.Color.green(c) * 587 + android.graphics.Color.blue(c) * 114;
    }

    private static int approach(int cur, int target) {
        if (cur == 0 || cur == target) return target;
        int out = 0xFF000000;
        for (int shift = 16; shift >= 0; shift -= 8) {
            int c = (cur >> shift) & 0xFF;
            int t = (target >> shift) & 0xFF;
            int d = t - c;
            out |= (Math.abs(d) <= 2 ? t : c + d / 2) << shift;
        }
        return out;
    }

    private static int dimmed(int base, int top, int page) {
        int out = 0xFF000000;
        for (int shift = 16; shift >= 0; shift -= 8) {
            float f = Math.min(1f, ((top >> shift) & 0xFF) / (float) Math.max(1, (page >> shift) & 0xFF));
            out |= Math.round(((base >> shift) & 0xFF) * f) << shift;
        }
        return out;
    }

    private void barStep(int targetStatus, int targetNav) {
        long now = android.os.SystemClock.uptimeMillis();
        if (targetStatus != barTargetStatus || targetNav != barTargetNav) {
            barTargetStatus = targetStatus;
            barTargetNav = targetNav;
            barDeadline = Math.max(barDeadline, now + 400);
        }
        int status = approach(lastStatusColor, targetStatus);
        int nav = approach(lastNavColor, targetNav);
        applySystemBars(status, nav);
        barSampling = false;
        if (now < barDeadline || status != targetStatus || nav != targetNav) {
            barHandler.postDelayed(barSampler, 24);
        } else {
            barLoop = false;
        }
    }

    private interface PixelListener {
        void onPixel(int color);
    }

    private void samplePixel(int x, int y, PixelListener listener) {
        try {
            android.view.PixelCopy.request(getWindow(), new Rect(x, y, x + 1, y + 1), barPixel,
                    result -> listener.onPixel(result == android.view.PixelCopy.SUCCESS
                            ? (barPixel.getPixel(0, 0) | 0xFF000000) : 0),
                    barHandler);
        } catch (IllegalArgumentException e) {
            listener.onPixel(0);
        }
    }

    private void sampleBars() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || chatWebView == null
                || !chatWebView.isShown() || chatWebView.getWidth() < 16 || chatWebView.getHeight() < 16) {
            barLoop = false;
            return;
        }
        if (barSampling) {
            barHandler.postDelayed(barSampler, 24);
            return;
        }
        if (barPixel == null) barPixel = android.graphics.Bitmap.createBitmap(1, 1, android.graphics.Bitmap.Config.ARGB_8888);
        int[] loc = new int[2];
        chatWebView.getLocationInWindow(loc);
        final int x = loc[0] + 6;
        final int topY = loc[1] + 3;
        final int bottomY = loc[1] + chatWebView.getHeight() - 3;
        barSampling = true;
        samplePixel(x, topY, top -> {
            if (top == 0) {
                barSampling = false;
                barLoop = false;
                return;
            }
            if (!differs(top, pageColor)) {
                barStep(pageColor, navFor(pageColor));
                return;
            }
            samplePixel(x, bottomY, bottom -> {
                int estimate = dimmed(navFor(pageColor), top, pageColor);
                barStep(top, bottom != 0 && lum(bottom) > lum(estimate) ? bottom : estimate);
            });
        });
    }

    private static final class BarsBackground extends android.graphics.drawable.Drawable {
        private final View root;
        private final int top;
        private final int bottom;
        private final android.graphics.Paint paint = new android.graphics.Paint();

        BarsBackground(View root, int top, int bottom) {
            this.root = root;
            this.top = top;
            this.bottom = bottom;
        }

        @Override
        public void draw(android.graphics.Canvas canvas) {
            Rect b = getBounds();
            int inset = root == null ? 0 : root.getPaddingBottom();
            paint.setColor(top);
            canvas.drawRect(b.left, b.top, b.right, b.bottom - inset, paint);
            paint.setColor(bottom);
            canvas.drawRect(b.left, b.bottom - inset, b.right, b.bottom, paint);
        }

        @Override
        public void setAlpha(int alpha) {
        }

        @Override
        public void setColorFilter(android.graphics.ColorFilter colorFilter) {
        }

        @SuppressWarnings("deprecation")
        @Override
        public int getOpacity() {
            return android.graphics.PixelFormat.OPAQUE;
        }
    }

    @SuppressWarnings("deprecation")
    private void applySystemBars(int status, int nav) {
        if (status == lastStatusColor && nav == lastNavColor) return;
        lastStatusColor = status;
        lastNavColor = nav;
        int light = (isLight(status) ? 1 : 0) | (isLight(nav) ? 2 : 0);
        boolean appearanceChanged = light != lastLight;
        lastLight = light;
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setBackgroundDrawable(new BarsBackground(chatWebView == null ? null : (View) chatWebView.getParent(), status, nav));
        window.setStatusBarColor(status);
        window.setNavigationBarColor(nav);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) window.setNavigationBarContrastEnforced(false);

        if (!appearanceChanged) return;
        boolean lightStatus = isLight(status);
        boolean lightNav = isLight(nav);
        View decor = window.getDecorView();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            android.view.WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                int s = android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS;
                int n = android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                controller.setSystemBarsAppearance(lightStatus ? s : 0, s);
                controller.setSystemBarsAppearance(lightNav ? n : 0, n);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int flags = decor.getSystemUiVisibility();
            flags = lightStatus ? flags | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR : flags & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags = lightNav ? flags | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : flags & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            decor.setSystemUiVisibility(flags);
        }
    }

    @Override
    public boolean dispatchTouchEvent(android.view.MotionEvent ev) {
        int action = ev.getActionMasked();
        if (action == android.view.MotionEvent.ACTION_UP || action == android.view.MotionEvent.ACTION_CANCEL) scheduleBarSample();
        return super.dispatchTouchEvent(ev);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_UP) scheduleBarSample();
        return super.dispatchKeyEvent(event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        scheduleBarSample();
    }

    @Override
    protected void onDestroy() {
""",
)
java.write_text(s, encoding="utf-8")

# Manifest: selectable in Settings > Default digital assistant app
x = manifest.read_text(encoding="utf-8")
x, n = re.subn(
    r'(<category android:name="android\.intent\.category\.LAUNCHER"\s*/>\s*</intent-filter>)',
    r"""\1
            <intent-filter>
                <action android:name="android.intent.action.ASSIST" />

                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>""",
    x,
)
if n != 1:
    fail("LAUNCHER intent-filter in AndroidManifest.xml")
manifest.write_text(x, encoding="utf-8")

# New files
for src, dst in [
    (assets / "AssetCache.java", pkg / "AssetCache.java"),
    (assets / "theme_sync.js", root / "app/src/main/assets/theme_sync.js"),
]:
    if not src.is_file():
        fail(f"{src}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)

print("patch2.py: done")
