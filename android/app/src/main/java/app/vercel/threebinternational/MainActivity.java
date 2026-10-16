package app.vercel.threebinternational;

import android.os.Bundle;
import android.content.Intent;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import app.vercel.threebinternational.health.ThreeBHealthPlugin;
import app.vercel.threebinternational.health.ThreeBHealthRemindersPlugin;
import app.vercel.threebinternational.health.HealthReminderStore;

public class MainActivity extends BridgeActivity {
    private boolean healthWebReady;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Capacitor builds the bridge inside super.onCreate(). All local plugins
        // MUST be registered first, otherwise Capacitor.isPluginAvailable()
        // can return false even though the Android APK compiled successfully.
        registerPlugin(CompanionPlugin.class);
        registerPlugin(ImmersivePlugin.class);
        registerPlugin(HiddenWorldARPlugin.class);
        registerPlugin(ThreeBHealthPlugin.class);
        registerPlugin(ThreeBHealthRemindersPlugin.class);
        super.onCreate(savedInstanceState);
        getBridge().addWebViewListener(new WebViewListener() {
            @Override public void onPageLoaded(WebView webView) {
                healthWebReady = true;
                openRequestedHealthRoute();
            }
        });
        ImmersivePlugin.setImmersive(this, true);
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openRequestedHealthRoute();
    }

    private void openRequestedHealthRoute() {
        Intent intent = getIntent();
        if (!healthWebReady || intent == null || !intent.getBooleanExtra(HealthReminderStore.OPEN_HEALTH, false)
            || getBridge() == null || getBridge().getWebView() == null) return;
        intent.removeExtra(HealthReminderStore.OPEN_HEALTH);
        // Fixed first-party route only: notification extras never become script text.
        getBridge().getWebView().evaluateJavascript("window.location.hash = 'sante';", null);
    }
}
