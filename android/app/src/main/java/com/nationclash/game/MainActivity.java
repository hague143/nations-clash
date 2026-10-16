package com.nationclash.game;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/** Offline host: every game request is answered by Android's AssetManager. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/assets/index.html";
    private static final String PAUSE = "(function(){var g=window.NationClash;"
        + "if(g&&g.fight&&!g.paused&&g.fight.phase!=='complete')"
        + "document.getElementById('pause').click();})()";
    private WebView web;
    private FrameLayout root;
    private LinearLayout notice;
    private TextView message;
    private ProgressBar progress;
    private Button retry;
    private boolean pageFailed;
    private OnBackInvokedCallback backCallback;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8, 13, 22));
        setContentView(root);
        createNotice();
        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = new OnBackInvokedCallback() {
                @Override public void onBackInvoked() { handleBack(); }
            };
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
        try {
            web = new WebView(this);
            web.setBackgroundColor(Color.rgb(8, 13, 22));
            WebSettings s = web.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true);
            s.setAllowFileAccess(false);
            s.setAllowContentAccess(false);
            s.setAllowFileAccessFromFileURLs(false);
            s.setAllowUniversalAccessFromFileURLs(false);
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            s.setJavaScriptCanOpenWindowsAutomatically(false);
            s.setSupportMultipleWindows(false);
            s.setMediaPlaybackRequiresUserGesture(true);
            s.setTextZoom(100);
            s.setBuiltInZoomControls(false);
            s.setDisplayZoomControls(false);
            web.setOverScrollMode(View.OVER_SCROLL_NEVER);
            web.setWebViewClient(new LocalClient());
            web.setWebChromeClient(new WebChromeClient() {
                @Override public boolean onConsoleMessage(ConsoleMessage m) {
                    // Kept in logcat for validating this test build on a device.
                    if (m.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                        android.util.Log.e("NationClash", m.message() + " @ " + m.sourceId() + ":" + m.lineNumber());
                    }
                    return true;
                }
            });
            // Test manifests enable diagnostics; the Play release sets this flag false.
            WebView.setWebContentsDebuggingEnabled(
                (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
            root.addView(web, 0, new FrameLayout.LayoutParams(-1, -1));
            root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
              @Override public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                int l = 0, t = 0, r = 0, b = 0;
                if (Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {
                    l = insets.getDisplayCutout().getSafeInsetLeft();
                    t = insets.getDisplayCutout().getSafeInsetTop();
                    r = insets.getDisplayCutout().getSafeInsetRight();
                    b = insets.getDisplayCutout().getSafeInsetBottom();
                }
                v.setPadding(l, t, r, b);
                return insets;
              }
            });
            immersive();
            web.loadUrl(START);
        } catch (RuntimeException e) {
            error("Enable or update Android System WebView or Chrome, then tap Retry.");
            android.util.Log.e("NationClash", "WebView unavailable", e);
        }
    }

    private void createNotice() {
        notice = new LinearLayout(this);
        notice.setOrientation(LinearLayout.VERTICAL);
        notice.setGravity(Gravity.CENTER);
        notice.setPadding(32, 24, 32, 24);
        notice.setBackgroundColor(Color.rgb(8, 13, 22));
        progress = new ProgressBar(this);
        notice.addView(progress);
        message = new TextView(this);
        message.setTextColor(Color.rgb(225, 245, 230));
        message.setTextSize(17);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, 20, 0, 20);
        message.setText("Preparing NationClash…");
        notice.addView(message);
        retry = new Button(this);
        retry.setText("Retry");
        retry.setVisibility(View.GONE);
        retry.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { recreate(); }
        });
        notice.addView(retry);
        root.addView(notice, new FrameLayout.LayoutParams(-1, -1));
    }

    private void error(String text) {
        notice.setVisibility(View.VISIBLE);
        progress.setVisibility(View.GONE);
        message.setText(text);
        retry.setVisibility(View.VISIBLE);
    }

    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN);
        }
    }

    private boolean local(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443) && uri.getPath() != null
            && uri.getPath().startsWith("/assets/");
    }

    private WebResourceResponse response(String mime, int status, String reason, InputStream body) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-cache");
        headers.put("X-Content-Type-Options", "nosniff");
        return new WebResourceResponse(mime, mime.startsWith("text/") || mime.contains("javascript")
            ? "UTF-8" : null, status, reason, headers, body);
    }

    private final class LocalClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!local(uri) || !"GET".equals(request.getMethod())) {
                return response("text/plain", 403, "Blocked", new ByteArrayInputStream(new byte[0]));
            }
            String path = uri.getPath().substring("/assets/".length());
            if (path.length() == 0) path = "index.html";
            if (path.contains("..") || path.contains("\\") || path.indexOf('\0') >= 0) {
                return response("text/plain", 403, "Blocked", new ByteArrayInputStream(new byte[0]));
            }
            String mime = path.endsWith(".html") ? "text/html" : path.endsWith(".js") ? "text/javascript"
                : path.endsWith(".css") ? "text/css" : path.endsWith(".webp") ? "image/webp"
                : path.endsWith(".svg") ? "image/svg+xml" : path.endsWith(".wav") ? "audio/wav"
                : path.endsWith(".json") ? "application/json" : "application/octet-stream";
            try {
                return response(mime, 200, "OK", getAssets().open(path));
            } catch (IOException e) {
                android.util.Log.e("NationClash", "Missing bundled asset: " + path);
                return response("text/plain", 404, "Not Found", new ByteArrayInputStream(new byte[0]));
            }
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return !local(request.getUrl());
        }

        @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
            pageFailed = false;
        }

        @Override public void onPageFinished(WebView view, String url) {
            if (!pageFailed) notice.setVisibility(View.GONE);
            immersive();
        }

        @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError e) {
            if (request.isForMainFrame()) {
                pageFailed = true;
                error("The game could not load. Tap Retry.");
            }
        }

        @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            root.removeView(view);
            view.destroy();
            web = null;
            error("The game stopped. Close other apps, then tap Retry.");
            return true;
        }
    }

    @Override public void onBackPressed() {
        handleBack();
    }

    private void handleBack() {
        if (web == null) { finish(); return; }
        web.evaluateJavascript("(function(){var g=window.NationClash;if(g&&g.fight){"
            + "if(g.paused||g.fight.phase==='complete')document.getElementById('back').click();"
            + "else document.getElementById('pause').click();return true;}return false;})()",
            new ValueCallback<String>() {
                @Override public void onReceiveValue(String value) {
                    if (!"true".equals(value)) finish();
                }
            });
    }

    @Override protected void onPause() {
        if (web != null) { web.evaluateJavascript(PAUSE, null); web.onPause(); web.pauseTimers(); }
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) { web.resumeTimers(); web.onResume(); web.evaluateJavascript(PAUSE, null); }
        immersive();
    }

    @Override public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }

    @Override protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
            backCallback = null;
        }
        if (web != null) { root.removeView(web); web.destroy(); web = null; }
        super.onDestroy();
    }
}
