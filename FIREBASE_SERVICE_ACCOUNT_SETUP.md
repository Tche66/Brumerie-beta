# 🔑 Configuration FIREBASE_SERVICE_ACCOUNT — Netlify

Cette variable permet à ta Netlify Function de modifier les mots de passe
Firebase côté serveur (nécessaire pour le reset mot de passe par OTP).

## Étape 1 — Télécharger la clé privée Firebase

1. Va sur **console.firebase.google.com**
2. Clique sur ⚙️ **Paramètres du projet** (engrenage en haut à gauche)
3. Onglet **Comptes de service** (Service accounts)
4. Clique **Générer une nouvelle clé privée** (Generate new private key)
5. Confirme → un fichier `.json` se télécharge (garde-le SECRET)

Le fichier ressemble à :
```json
{
  "type": "service_account",
  "project_id": "brumerie-app",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxx@brumerie-app.iam.gserviceaccount.com",
  ...
}
```

## Étape 2 — Ajouter dans Netlify

1. Va sur **app.netlify.com** → ton site Brumerie
2. **Site configuration** → **Environment variables**
3. Clique **Add a variable**
4. Nom : `FIREBASE_SERVICE_ACCOUNT`
5. Valeur : **copie-colle tout le contenu du fichier JSON** (sur une seule ligne si possible)
6. Clique **Save**

## Étape 3 — Redéployer

Après avoir ajouté la variable, redéploie pour que Netlify la prenne en compte :
```
Deploys → Trigger deploy → Deploy site
```

## ⚠️ Sécurité importante

- Ne jamais committer le fichier `.json` dans ton repo GitHub
- Ne jamais partager cette clé
- Si tu penses qu'elle a été compromise : Firebase → Comptes de service → Supprimer → Régénérer

## ✅ Test

Une fois configuré, le flow complet fonctionne :
1. User clique "Mot de passe oublié ?"
2. Saisit son email → reçoit un code à 6 chiffres par Brevo
3. Saisit le code → choisit un nouveau mot de passe
4. La Netlify Function appelle Firebase Admin SDK → mot de passe changé
