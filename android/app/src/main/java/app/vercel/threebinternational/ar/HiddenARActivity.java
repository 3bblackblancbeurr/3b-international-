package app.vercel.threebinternational.ar;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.opengl.GLSurfaceView;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.google.ar.core.ArCoreApk;
import com.google.ar.core.Config;
import com.google.ar.core.Session;

/** ARCore owns the camera; the WebView scanner is stopped before this activity opens. */
public class HiddenARActivity extends Activity {
    private GLSurfaceView surface;
    private PortalRenderer renderer;
    private TextView guidance, capabilities;
    private Button place;
    private Session session;
    private boolean installRequested, resumed, permissionRequested, failed;
    private String lastGuidance = "";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout root = new FrameLayout(this); root.setBackgroundColor(Color.rgb(5,10,17));
        surface = new GLSurfaceView(this); surface.setEGLContextClientVersion(2);
        surface.setEGLConfigChooser(8,8,8,8,24,0);
        renderer = new PortalRenderer(this, this::updateGuidance, this::fail);
        surface.setRenderer(renderer); surface.setPreserveEGLContextOnPause(true);
        root.addView(surface, new FrameLayout.LayoutParams(-1,-1));
        LinearLayout header = new LinearLayout(this); header.setOrientation(LinearLayout.VERTICAL); header.setPadding(dp(22),dp(18),dp(22),dp(16));
        header.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,new int[]{0xf2080e16,0x00080e16}));
        TextView title = label("3B  /  LE PASSAGE", 19); title.setTextColor(0xffe4cf9e); title.setTypeface(null, Typeface.BOLD); header.addView(title);
        capabilities = label("Démonstration visuelle · aucune énigme",12); header.addView(capabilities);
        FrameLayout.LayoutParams top = new FrameLayout.LayoutParams(-1,-2,Gravity.TOP); top.topMargin=dp(24); root.addView(header,top);
        LinearLayout controls = new LinearLayout(this); controls.setOrientation(LinearLayout.VERTICAL); controls.setPadding(dp(20),dp(20),dp(20),dp(24));
        controls.setBackground(new GradientDrawable(GradientDrawable.Orientation.BOTTOM_TOP,new int[]{0xff080e16,0x00080e16}));
        guidance = label("Ouverture du regard…",16); guidance.setGravity(Gravity.CENTER); controls.addView(guidance);
        place = button("Placer le portail", true); place.setEnabled(false); place.setOnClickListener(v -> renderer.requestPlacement()); controls.addView(place);
        LinearLayout row = new LinearLayout(this);
        Button reset = button("Replacer",false); reset.setOnClickListener(v -> surface.queueEvent(renderer::resetAnchor)); row.addView(reset,new LinearLayout.LayoutParams(0,dp(56),1));
        Button close = button("Fermer",false); close.setOnClickListener(v -> finish()); row.addView(close,new LinearLayout.LayoutParams(0,dp(56),1)); controls.addView(row);
        FrameLayout.LayoutParams bottom=new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM); bottom.bottomMargin=dp(16);root.addView(controls,bottom);
        root.setOnApplyWindowInsetsListener((v,insets)->{top.topMargin=insets.getSystemWindowInsetTop();bottom.bottomMargin=insets.getSystemWindowInsetBottom();header.setLayoutParams(top);controls.setLayoutParams(bottom);return insets;});
        setContentView(root);
    }
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
    private TextView label(String text,int size){TextView view=new TextView(this);view.setText(text);view.setTextSize(size);view.setTextColor(0xfff3f0e8);view.setPadding(0,dp(4),0,dp(8));return view;}
    private Button button(String text,boolean primary){Button button=new Button(this);button.setText(text);button.setAllCaps(false);button.setTextSize(16);button.setMinHeight(dp(56));button.setTextColor(primary?0xff080e16:0xfff3f0e8);GradientDrawable bg=new GradientDrawable();bg.setColor(primary?0xffe4cf9e:0xaa101c2b);bg.setCornerRadius(dp(12));button.setBackground(bg);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(56));lp.topMargin=dp(10);button.setLayoutParams(lp);return button;}

    private void updateGuidance(String text, boolean canPlace) {
        // Renderer runs on GL thread. Only changed HUD text crosses to the main thread.
        String key=text+canPlace;if(key.equals(lastGuidance))return;lastGuidance=key;
        runOnUiThread(()->{if(!isFinishing()){guidance.setText(text);place.setEnabled(canPlace);}});
    }
    private void fail(String message) {
        runOnUiThread(()->{if(failed||isFinishing())return;failed=true;setResult(RESULT_CANCELED,new Intent().putExtra("message",message));finish();});
    }
    @Override protected void onResume(){super.onResume();resumed=true;openSession();}
    private void openSession(){
        if(!resumed||failed)return;
        if(ContextCompat.checkSelfPermission(this,Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED){
            if(!permissionRequested){permissionRequested=true;ActivityCompat.requestPermissions(this,new String[]{Manifest.permission.CAMERA},71);}return;
        }
        try {
            if(session==null){
                if(ArCoreApk.getInstance().requestInstall(this,!installRequested)==ArCoreApk.InstallStatus.INSTALL_REQUESTED){installRequested=true;return;}
                session=new Session(this);
                Config config=new Config(session);
                config.setFocusMode(Config.FocusMode.AUTO);
                config.setLightEstimationMode(Config.LightEstimationMode.ENVIRONMENTAL_HDR);
                boolean depth=session.isDepthModeSupported(Config.DepthMode.AUTOMATIC);
                config.setDepthMode(depth?Config.DepthMode.AUTOMATIC:Config.DepthMode.DISABLED);
                config.setPlaneFindingMode(Config.PlaneFindingMode.HORIZONTAL);
                session.configure(config);
                capabilities.setText(depth?"Suivi spatial · lumière HDR · profondeur":"Suivi spatial · lumière HDR · profondeur indisponible");
            }
            session.resume();renderer.setSession(session);surface.onResume();
        } catch(Exception error){fail("Le regard spatial est indisponible. Vérifie les Services Google Play pour la RA et l’accès à la caméra.");}
    }
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grants){super.onRequestPermissionsResult(requestCode,permissions,grants);if(requestCode==71){if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)openSession();else fail("Autorisation caméra refusée. Tu peux continuer avec l’aperçu photo.");}}
    @Override protected void onPause(){resumed=false;surface.onPause();renderer.setSession(null);if(session!=null)session.pause();super.onPause();}
    @Override protected void onDestroy(){if(session!=null){renderer.resetAnchor();session.close();session=null;}getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);super.onDestroy();}
}
