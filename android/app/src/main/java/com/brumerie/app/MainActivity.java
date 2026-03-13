package com.brumerie.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            createNotificationChannels();
        }
    }

    private void createNotificationChannels() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        AudioAttributes att = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        // ── Message reçu ─────────────────────────────────────────
        createChannel(nm, att, "brumerie_message", "Messages",
            "Nouveau message reçu", NotificationManager.IMPORTANCE_HIGH,
            "notif_message");

        // ── Notification générale ─────────────────────────────────
        createChannel(nm, att, "brumerie_general", "Notifications",
            "Notifications générales Brumerie", NotificationManager.IMPORTANCE_DEFAULT,
            "notif_general");

        // ── Nouvelle commande ─────────────────────────────────────
        createChannel(nm, att, "brumerie_commande", "Commandes",
            "Nouvelle commande reçue", NotificationManager.IMPORTANCE_HIGH,
            "notif_commande");

        // ── Confirmation / paiement ───────────────────────────────
        createChannel(nm, att, "brumerie_confirmation", "Confirmations",
            "Paiement ou commande confirmée", NotificationManager.IMPORTANCE_HIGH,
            "notif_confirmation");

        // ── Avis / note ───────────────────────────────────────────
        createChannel(nm, att, "brumerie_note", "Avis",
            "Nouvel avis sur un produit", NotificationManager.IMPORTANCE_DEFAULT,
            "notif_note");

        // ── Produit publié ────────────────────────────────────────
        createChannel(nm, att, "brumerie_publication", "Publications",
            "Ton produit a été publié", NotificationManager.IMPORTANCE_DEFAULT,
            "notif_publication");

        // ── Commande livrée ───────────────────────────────────────
        createChannel(nm, att, "brumerie_livraison", "Livraisons",
            "Commande livrée avec succès", NotificationManager.IMPORTANCE_HIGH,
            "notif_livraison");

        // ── Offre / négociation ───────────────────────────────────
        createChannel(nm, att, "brumerie_offre", "Offres",
            "Nouvelle offre ou négociation", NotificationManager.IMPORTANCE_HIGH,
            "notif_offre");

        // ── Alerte système ────────────────────────────────────────
        createChannel(nm, att, "brumerie_alerte", "Alertes",
            "Alerte ou notification urgente", NotificationManager.IMPORTANCE_HIGH,
            "notif_alerte");

        // ── Stories ───────────────────────────────────────────────
        createChannel(nm, att, "brumerie_story", "Stories",
            "Vue ou interaction sur une story", NotificationManager.IMPORTANCE_LOW,
            "notif_story");
    }

    private void createChannel(NotificationManager nm, AudioAttributes att,
                                String id, String name, String desc,
                                int importance, String soundFile) {
        NotificationChannel channel = new NotificationChannel(id, name, importance);
        channel.setDescription(desc);
        // Son depuis res/raw/
        Uri soundUri = Uri.parse(
            "android.resource://" + getPackageName() + "/raw/" + soundFile
        );
        channel.setSound(soundUri, att);
        channel.enableVibration(true);
        nm.createNotificationChannel(channel);
    }
}
