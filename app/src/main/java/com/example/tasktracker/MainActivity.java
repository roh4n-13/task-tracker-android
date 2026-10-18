package com.example.tasktracker;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                return handleNavigation(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(Uri.parse(url));
            }

            private boolean handleNavigation(Uri uri) {
                if (uri == null) return true;
                if ("file".equalsIgnoreCase(uri.getScheme())
                        && uri.toString().startsWith("file:///android_asset/")) {
                    return false;
                }
                if ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (Exception ignored) {
                        Toast.makeText(MainActivity.this, "Could not open this link.", Toast.LENGTH_SHORT).show();
                    }
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new AppBridge(this), "AndroidBridge");
        setContentView(webView);
        TaskReminderReceiver.scheduleDailyReminder(this);
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    public static final class AppBridge {
        private final MainActivity activity;
        private final Context appContext;

        AppBridge(MainActivity activity) {
            this.activity = activity;
            this.appContext = activity.getApplicationContext();
        }

        @JavascriptInterface
        public void updateReminderTasks(String tasksJson) {
            appContext.getSharedPreferences(TaskReminderReceiver.PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putString(TaskReminderReceiver.TASKS_JSON_KEY, tasksJson == null ? "[]" : tasksJson)
                    .apply();
        }

        @JavascriptInterface
        public void copyText(String text) {
            activity.runOnUiThread(() -> {
                ClipboardManager clipboard = (ClipboardManager) appContext.getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard != null) {
                    clipboard.setPrimaryClip(ClipData.newPlainText("Daily task report", text == null ? "" : text));
                    Toast.makeText(activity, "Daily report copied. Paste it into WhatsApp.", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }
}
