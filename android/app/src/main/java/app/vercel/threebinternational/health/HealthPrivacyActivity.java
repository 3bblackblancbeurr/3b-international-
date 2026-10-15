package app.vercel.threebinternational.health;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import app.vercel.threebinternational.MainActivity;

/** Offline rationale reached from Health Connect as well as its onboarding links. */
public final class HealthPrivacyActivity extends Activity {
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.rgb(7, 20, 16));
        scroll.setFillViewport(true);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (24 * getResources().getDisplayMetrics().density);
        content.setPadding(pad, pad * 2, pad, pad * 2);
        scroll.addView(content);
        text(content, "3B · SANTÉ", 16, Color.rgb(218, 197, 148));
        text(content, "Vos pas. Votre choix.", 30, Color.WHITE);
        text(content, "Lecture uniquement", 21, Color.rgb(218, 197, 148));
        text(content, "Après votre accord, Santé 3B lit seulement vos totaux de pas : aujourd’hui et jusqu’aux 29 jours précédents. Santé Connect agrège les sources pour limiter les doublons. 3B n’ajoute, ne modifie et ne supprime aucune donnée dans Santé Connect.", 17, Color.WHITE);
        text(content, "Sur votre appareil", 21, Color.rgb(218, 197, 148));
        text(content, "Les pas lus servent à votre journal Santé 3B. Ils ne sont transmis à aucun serveur 3B, service publicitaire ou outil d’analyse. Les lectures ont lieu quand vous utilisez Santé 3B ; aucun service 3B ne lit vos données santé en arrière-plan. Le comptage continue dans Santé Connect ou votre application source, selon leur compatibilité.", 17, Color.WHITE);
        text(content, "Sauvegarde et suppression", 21, Color.rgb(218, 197, 148));
        text(content, "Par défaut, le journal est temporaire. Une sauvegarde locale est proposée séparément, sur votre appareil, pendant 90 jours au maximum. Elle n’est pas chiffrée par 3B : évitez un appareil partagé. Dans Santé 3B, vous pouvez exporter ou effacer votre journal. Retirer l’accès Santé Connect ne supprime pas automatiquement une copie déjà sauvegardée ; utilisez aussi Effacer le journal si vous le souhaitez.", 17, Color.WHITE);
        text(content, "Vous gardez la main", 21, Color.rgb(218, 197, 148));
        text(content, "Autorisez ou refusez la lecture des pas dans l’écran système. Vous pouvez ensuite retirer cet accès dans Santé 3B ou Santé Connect → Autorisations des applications → 3B. Un refus n’empêche pas d’utiliser les recettes, routines et autres outils.", 17, Color.WHITE);
        text(content, "Samsung Health et rappels", 21, Color.rgb(218, 197, 148));
        text(content, "Pour recevoir les pas de Samsung Health, activez son partage vers Santé Connect dans ses réglages. Les pas ne sont pas nécessairement actualisés instantanément. Les rappels 3B sont facultatifs et locaux ; leur horaire peut être retardé par Android. Seuls leur identifiant et l’heure choisie sont conservés séparément du journal, jusqu’à leur désactivation. Le texte des notifications reste générique, sans mesure de santé.", 17, Color.WHITE);
        Button back = new Button(this);
        back.setText("Ouvrir Santé 3B");
        back.setOnClickListener(v -> {
            Intent intent = new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(HealthReminderStore.OPEN_HEALTH, true);
            startActivity(intent);
            finish();
        });
        content.addView(back);
        setContentView(scroll);
    }

    private void text(LinearLayout parent, String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value); view.setTextSize(size); view.setTextColor(color);
        view.setGravity(Gravity.START);
        view.setLineSpacing(5, 1.05f);
        int gap = (int) (16 * getResources().getDisplayMetrics().density);
        view.setPadding(0, 0, 0, gap);
        parent.addView(view);
    }
}
