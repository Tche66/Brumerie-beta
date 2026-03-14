package com.brumerie.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "BrumerieGoogle";
    private GoogleSignInClient googleSignInClient;
    private ActivityResultLauncher<Intent> googleSignInLauncher;

    // Callback JS à appeler quand on a le token
    private String pendingJsCallback = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ── Channels de notifications ──────────────────────────
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            createNotificationChannels();
        }

        // ── Google Sign-In natif ────────────────────────────────
        // Récupère le Web Client ID depuis les ressources (injecté par le build)
        String webClientId = getResources().getString(R.string.google_web_client_id);

        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(webClientId)
            .requestEmail()
            .requestProfile()
            .build();

        googleSignInClient = GoogleSignIn.getClient(this, gso);

        // Launcher pour le résultat du sélecteur de compte
        googleSignInLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            this::handleGoogleSignInResult
        );

        // ── Exposer le bridge JS → Java ─────────────────────────
        // Permet à React d'appeler window.AndroidGoogleAuth.signIn()
        bridge.getWebView().addJavascriptInterface(new GoogleAuthBridge(), "AndroidGoogleAuth");
    }

    // ── Interface exposée à React/JS ─────────────────────────────
    public class GoogleAuthBridge {
        @JavascriptInterface
        public void signIn(String callbackName) {
            Log.d(TAG, "signIn appelé depuis JS, callback: " + callbackName);
            pendingJsCallback = callbackName;
            runOnUiThread(() -> {
                // Déconnecter le compte précédent pour forcer le sélecteur
                googleSignInClient.signOut().addOnCompleteListener(task -> {
                    Intent signInIntent = googleSignInClient.getSignInIntent();
                    googleSignInLauncher.launch(signInIntent);
                });
            });
        }
    }

    // ── Résultat du sélecteur de compte Google ────────────────────
    private void handleGoogleSignInResult(ActivityResult result) {
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(result.getData());
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            String idToken = account.getIdToken();
            Log.d(TAG, "Google Sign-In réussi, idToken obtenu");

            // Envoyer le token à React via JS
            String js = String.format(
                "window['%s'] && window['%s']({success:true, idToken:'%s'})",
                pendingJsCallback, pendingJsCallback, idToken
            );
            bridge.getWebView().post(() ->
                bridge.getWebView().evaluateJavascript(js, null)
            );

        } catch (ApiException e) {
            Log.e(TAG, "Google Sign-In échoué: " + e.getStatusCode());
            String js = String.format(
                "window['%s'] && window['%s']({success:false, error:'%s'})",
                pendingJsCallback, pendingJsCallback, e.getMessage()
            );
            bridge.getWebView().post(() ->
                bridge.getWebView().evaluateJavascript(js, null)
            );
        }
        pendingJsCallback = null;
    }

    // ── Channels notifications ────────────────────────────────────
    private void createNotificationChannels() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        AudioAttributes att = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        createChannel(nm, att, "brumerie_message",      "Messages",      "Nouveau message reçu",          NotificationManager.IMPORTANCE_HIGH,    "notif_message");
        createChannel(nm, att, "brumerie_general",      "Notifications", "Notifications générales",       NotificationManager.IMPORTANCE_DEFAULT, "notif_general");
        createChannel(nm, att, "brumerie_commande",     "Commandes",     "Nouvelle commande reçue",       NotificationManager.IMPORTANCE_HIGH,    "notif_commande");
        createChannel(nm, att, "brumerie_confirmation", "Confirmations", "Paiement confirmé",             NotificationManager.IMPORTANCE_HIGH,    "notif_confirmation");
        createChannel(nm, att, "brumerie_note",         "Avis",          "Nouvel avis",                   NotificationManager.IMPORTANCE_DEFAULT, "notif_note");
        createChannel(nm, att, "brumerie_publication",  "Publications",  "Produit publié",                NotificationManager.IMPORTANCE_DEFAULT, "notif_publication");
        createChannel(nm, att, "brumerie_livraison",    "Livraisons",    "Commande livrée",               NotificationManager.IMPORTANCE_HIGH,    "notif_livraison");
        createChannel(nm, att, "brumerie_offre",        "Offres",        "Nouvelle offre",                NotificationManager.IMPORTANCE_HIGH,    "notif_offre");
        createChannel(nm, att, "brumerie_alerte",       "Alertes",       "Alerte urgente",                NotificationManager.IMPORTANCE_HIGH,    "notif_alerte");
        createChannel(nm, att, "brumerie_story",        "Stories",       "Interaction sur une story",     NotificationManager.IMPORTANCE_LOW,     "notif_story");
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
