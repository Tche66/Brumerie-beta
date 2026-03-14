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

        createChannel(nm, att, "brumerie_message",      "Messages",      "Nouveau message reçu",      NotificationManager.IMPORTANCE_HIGH,    "notif_message");
        createChannel(nm, att, "brumerie_general",      "Notifications", "Notifications générales",   NotificationManager.IMPORTANCE_DEFAULT, "notif_general");
        createChannel(nm, att, "brumerie_commande",     "Commandes",     "Nouvelle commande reçue",   NotificationManager.IMPORTANCE_HIGH,    "notif_commande");
        createChannel(nm, att, "brumerie_confirmation", "Confirmations", "Paiement confirmé",         NotificationManager.IMPORTANCE_HIGH,    "notif_confirmation");
        createChannel(nm, att, "brumerie_note",         "Avis",          "Nouvel avis",               NotificationManager.IMPORTANCE_DEFAULT, "notif_note");
        createChannel(nm, att, "brumerie_publication",  "Publications",  "Produit publié",            NotificationManager.IMPORTANCE_DEFAULT, "notif_publication");
        createChannel(nm, att, "brumerie_livraison",    "Livraisons",    "Commande livrée",           NotificationManager.IMPORTANCE_HIGH,    "notif_livraison");
        createChannel(nm, att, "brumerie_offre",        "Offres",        "Nouvelle offre",            NotificationManager.IMPORTANCE_HIGH,    "notif_offre");
        createChannel(nm, att, "brumerie_alerte",       "Alertes",       "Alerte urgente",            NotificationManager.IMPORTANCE_HIGH,    "notif_alerte");
        createChannel(nm, att, "brumerie_story",        "Stories",       "Interaction sur une story", NotificationManager.IMPORTANCE_LOW,     "notif_story");
    }

    private void createChannel(NotificationManager nm, AudioAttributes att,
                                String id, String name, String desc,
                                int importance, String soundFile) {
        NotificationChannel channel = new NotificationChannel(id, name, importance);
        channel.setDescription(desc);
        Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/raw/" + soundFile);
        channel.setSound(soundUri, att);
        channel.enableVibration(true);
        nm.createNotificationChannel(channel);
    }
}
