package io.github.acidefluorhydrique.geminiassist;

import android.content.Context;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Keeps Gemini's static files (scripts, styles, fonts, images on *.gstatic.com) on disk, so they are
 * downloaded once instead of on every launch, and drops analytics requests.
 * Everything else, including the page itself and all API calls, is left to the WebView.
 */
final class AssetCache {
    private static final String TAG = "AssetCache";
    private static final long MAX_TOTAL = 256L * 1024 * 1024;
    private static final long MAX_ENTRY = 24L * 1024 * 1024;
    private static final long DEFAULT_TTL_MS = 7L * 24 * 3600 * 1000;
    private static final long MAX_TTL_MS = 30L * 24 * 3600 * 1000;
    private static final long MIN_MAX_AGE_S = 3600;  //shorter lived files are not worth keeping

    private static final String[] CACHE_HOSTS = {"gstatic.com"};
    private static final String[] BLOCK_HOSTS = {
            "googletagmanager.com", "google-analytics.com", "analytics.google.com",
            "doubleclick.net", "googleadservices.com", "googlesyndication.com"};
    private static final String[] SKIP_REQUEST_HEADERS = {
            "accept-encoding", "cookie", "range", "if-none-match", "if-modified-since", "if-range",
            "cache-control", "pragma", "host", "connection", "content-length", "x-requested-with"};
    private static final String[] KEEP_RESPONSE_HEADERS = {
            "access-control-allow-origin", "access-control-expose-headers", "timing-allow-origin",
            "cross-origin-resource-policy", "x-content-type-options"};

    private final File dir;
    private final AtomicInteger stores = new AtomicInteger();
    private final AtomicBoolean trimming = new AtomicBoolean();

    AssetCache(Context context) {
        dir = new File(context.getCacheDir(), "asset-cache");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        trimAsync();
    }

    /** Returns a response to serve, or null to let the WebView load the request itself. */
    WebResourceResponse intercept(WebResourceRequest request) {
        try {
            return handle(request);
        } catch (Exception e) {
            Log.w(TAG, "[intercept] " + request.getUrl(), e);
            return null;
        }
    }

    private WebResourceResponse handle(WebResourceRequest request) throws Exception {
        String host = request.getUrl().getHost();
        if (host == null) return null;
        if (matches(host, BLOCK_HOSTS)) {
            return new WebResourceResponse("text/plain", "utf-8", 204, "No Content",
                    new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
        }
        if (!"GET".equals(request.getMethod()) || !"https".equals(request.getUrl().getScheme())
                || !matches(host, CACHE_HOSTS)) {
            return null;
        }
        Map<String, String> headers = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        if (request.getRequestHeaders() != null) headers.putAll(request.getRequestHeaders());
        if (headers.containsKey("Range")) return null;

        String url = request.getUrl().toString();
        String key = hash(normalize(url));
        File body = new File(dir, key + ".body");
        File meta = new File(dir, key + ".meta");

        WebResourceResponse hit = read(body, meta);
        if (hit != null) return hit;
        return download(url, headers, body, meta);
    }

    private WebResourceResponse read(File body, File meta) {
        try {
            if (!body.isFile() || !meta.isFile()) return null;
            Properties p = new Properties();
            try (InputStream in = new FileInputStream(meta)) {
                p.load(in);
            }
            if (System.currentTimeMillis() > Long.parseLong(p.getProperty("exp", "0"))) {
                //noinspection ResultOfMethodCallIgnored
                body.delete();
                //noinspection ResultOfMethodCallIgnored
                meta.delete();
                return null;
            }
            InputStream in = new FileInputStream(body);
            long now = System.currentTimeMillis();
            //noinspection ResultOfMethodCallIgnored
            body.setLastModified(now);  //least recently used files are trimmed first
            //noinspection ResultOfMethodCallIgnored
            meta.setLastModified(now);
            Map<String, String> headers = new HashMap<>();
            for (String name : KEEP_RESPONSE_HEADERS) {
                String value = p.getProperty("h." + name);
                if (value != null) headers.put(name, value);
            }
            return response(p.getProperty("mime", "application/octet-stream"), p.getProperty("enc"), headers, in);
        } catch (Exception e) {
            Log.w(TAG, "[read] " + body.getName(), e);
            return null;
        }
    }

    private WebResourceResponse download(String url, Map<String, String> requestHeaders, File body, File meta)
            throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(30000);
        for (Map.Entry<String, String> e : requestHeaders.entrySet()) {
            if (!contains(SKIP_REQUEST_HEADERS, e.getKey().toLowerCase(Locale.US))) {
                c.setRequestProperty(e.getKey(), e.getValue());
            }
        }
        boolean handedOver = false;
        try {
            if (c.getResponseCode() != 200) return null;  //let the WebView show its own error handling

            String contentType = c.getContentType();
            String mime = "application/octet-stream";
            String enc = null;
            if (contentType != null) {
                String[] parts = contentType.split(";");
                mime = parts[0].trim().toLowerCase(Locale.US);
                for (int i = 1; i < parts.length; i++) {
                    String part = parts[i].trim();
                    if (part.toLowerCase(Locale.US).startsWith("charset=")) enc = part.substring(8).replace("\"", "");
                }
            }
            if (enc == null && isText(mime)) enc = "utf-8";

            Map<String, String> headers = new HashMap<>();
            for (String name : KEEP_RESPONSE_HEADERS) {
                String value = c.getHeaderField(name);
                if (value != null) headers.put(name, value);
            }

            String cacheControl = c.getHeaderField("Cache-Control");
            long maxAge = maxAge(cacheControl);
            boolean storable = isStorable(mime)
                    && (cacheControl == null || !cacheControl.toLowerCase(Locale.US).matches(".*(no-store|no-cache).*"))
                    && (maxAge < 0 || maxAge >= MIN_MAX_AGE_S)
                    && c.getContentLength() <= MAX_ENTRY
                    && c.getHeaderField("Set-Cookie") == null;

            if (!storable) {
                //Not worth keeping, stream it straight through
                InputStream stream = c.getInputStream();
                handedOver = true;
                return response(mime, enc, headers, new Disconnecting(stream, c));
            }

            File tmp = new File(dir, body.getName() + "." + Long.toHexString(System.nanoTime()) + ".tmp");
            long size = 0;
            try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(tmp)) {
                byte[] buffer = new byte[16384];
                int read;
                while ((read = in.read(buffer)) > 0) {
                    size += read;
                    if (size > MAX_ENTRY) {
                        //noinspection ResultOfMethodCallIgnored
                        tmp.delete();
                        return null;
                    }
                    out.write(buffer, 0, read);
                }
            } catch (IOException e) {
                //noinspection ResultOfMethodCallIgnored
                tmp.delete();
                throw e;
            }

            long ttl = maxAge < 0 ? DEFAULT_TTL_MS : Math.min(MAX_TTL_MS, maxAge * 1000);
            Properties p = new Properties();
            p.setProperty("exp", Long.toString(System.currentTimeMillis() + ttl));
            p.setProperty("mime", mime);
            if (enc != null) p.setProperty("enc", enc);
            for (Map.Entry<String, String> h : headers.entrySet()) p.setProperty("h." + h.getKey(), h.getValue());
            File metaTmp = new File(dir, meta.getName() + "." + Long.toHexString(System.nanoTime()) + ".tmp");
            try (OutputStream out = new FileOutputStream(metaTmp)) {
                p.store(out, null);
            }
            //Body first: read() needs both files, so a half written entry is never served
            if (!tmp.renameTo(body) || !metaTmp.renameTo(meta)) {
                //noinspection ResultOfMethodCallIgnored
                tmp.delete();
                //noinspection ResultOfMethodCallIgnored
                metaTmp.delete();
                return null;
            }
            if (stores.incrementAndGet() % 20 == 0) trimAsync();
            return response(mime, enc, headers, new FileInputStream(body));
        } finally {
            if (!handedOver) c.disconnect();
        }
    }

    private static WebResourceResponse response(String mime, String enc, Map<String, String> headers, InputStream in) {
        Map<String, String> h = new HashMap<>(headers);
        //These are public static files; the page loads them as modules, fonts and images from another origin
        if (!containsKeyIgnoreCase(h, "access-control-allow-origin")) h.put("Access-Control-Allow-Origin", "*");
        if (!containsKeyIgnoreCase(h, "cross-origin-resource-policy")) h.put("Cross-Origin-Resource-Policy", "cross-origin");
        return new WebResourceResponse(mime, enc, 200, "OK", h, in);
    }

    private static boolean isStorable(String mime) {
        return mime.contains("javascript") || mime.contains("ecmascript") || mime.equals("text/css")
                || mime.contains("font") || mime.startsWith("image/") || mime.equals("application/wasm")
                || mime.equals("application/json");
    }

    private static boolean isText(String mime) {
        return mime.startsWith("text/") || mime.contains("javascript") || mime.contains("ecmascript")
                || mime.contains("json") || mime.contains("svg") || mime.contains("xml");
    }

    private static long maxAge(String cacheControl) {
        if (cacheControl == null) return -1;
        for (String part : cacheControl.split(",")) {
            part = part.trim().toLowerCase(Locale.US);
            if (part.startsWith("max-age=")) {
                try {
                    return Long.parseLong(part.substring(8).replace("\"", "").trim());
                } catch (NumberFormatException ignored) {
                    return -1;
                }
            }
        }
        return -1;
    }

    //The wli query parameter only carries loading info and changes between loads
    private static String normalize(String url) {
        String u = url.replaceAll("([?&])wli=[^&]*(&|$)", "$1");
        while (u.endsWith("?") || u.endsWith("&")) u = u.substring(0, u.length() - 1);
        return u;
    }

    private static String hash(String s) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-1").digest(s.getBytes("UTF-8"));
        StringBuilder sb = new StringBuilder();
        for (byte b : d) sb.append(String.format(Locale.US, "%02x", b));
        return sb.toString();
    }

    private static boolean matches(String host, String[] domains) {
        for (String domain : domains) {
            if (host.equals(domain) || host.endsWith("." + domain)) return true;
        }
        return false;
    }

    private static boolean contains(String[] list, String value) {
        return Arrays.asList(list).contains(value);
    }

    private static boolean containsKeyIgnoreCase(Map<String, String> map, String key) {
        for (String k : map.keySet()) if (k.equalsIgnoreCase(key)) return true;
        return false;
    }

    private void trimAsync() {
        if (!trimming.compareAndSet(false, true)) return;
        Thread t = new Thread(() -> {
            try {
                trim();
            } finally {
                trimming.set(false);
            }
        }, "asset-cache-trim");
        t.setPriority(Thread.MIN_PRIORITY);
        t.start();
    }

    private void trim() {
        File[] files = dir.listFiles();
        if (files == null) return;
        long total = 0;
        for (File f : files) total += f.length();
        if (total <= MAX_TOTAL) return;
        Arrays.sort(files, (a, b) -> Long.compare(a.lastModified(), b.lastModified()));
        for (File f : files) {
            if (total <= MAX_TOTAL * 8 / 10) break;
            total -= f.length();
            //noinspection ResultOfMethodCallIgnored
            f.delete();
        }
    }

    private static final class Disconnecting extends FilterInputStream {
        private final HttpURLConnection connection;

        Disconnecting(InputStream in, HttpURLConnection connection) {
            super(in);
            this.connection = connection;
        }

        @Override
        public void close() throws IOException {
            try {
                super.close();
            } finally {
                connection.disconnect();
            }
        }
    }
}
