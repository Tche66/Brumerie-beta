# 🔐 Guide — Secrets GitHub pour le build APK Brumerie

## Où ajouter les secrets ?
GitHub → ton repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

---

## Liste des secrets à créer

### 🔥 Firebase (copier depuis ton .env.local)

| Nom du secret | Valeur |
|---|---|
| `VITE_FIREBASE_API_KEY` | Ta clé API Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | ex: brumerie-xxx.firebaseapp.com |
| `VITE_FIREBASE_PROJECT_ID` | ex: brumerie-xxx |
| `VITE_FIREBASE_STORAGE_BUCKET` | ex: brumerie-xxx.appspot.com |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Nombre à 12 chiffres |
| `VITE_FIREBASE_APP_ID` | ex: 1:xxx:android:xxx |

### ☁️ Cloudinary

| Nom du secret | Valeur |
|---|---|
| `VITE_CLOUDINARY_CLOUD_NAME` | Ton cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Ton upload preset |

### 📱 google-services.json
Le fichier entier en une seule ligne JSON :

```bash
# Dans ton terminal, depuis le dossier android/app/ :
cat google-services.json | tr -d '\n'
# Copier le résultat → secret GOOGLE_SERVICES_JSON
```

| Nom du secret | Valeur |
|---|---|
| `GOOGLE_SERVICES_JSON` | Contenu du fichier google-services.json (sur une ligne) |

---

## 🔑 Créer et encoder le Keystore (à faire UNE SEULE FOIS)

### Étape 1 — Générer le keystore sur ta machine

```bash
keytool -genkey -v \
  -keystore brumerie.keystore \
  -alias brumerie \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storepass CHOISIS_UN_MOT_DE_PASSE \
  -keypass CHOISIS_UN_MOT_DE_PASSE \
  -dname "CN=Brumerie, OU=Mobile, O=Brumerie, L=Abidjan, S=Abidjan, C=CI"
```

⚠️ **Garde ce fichier .keystore précieusement** — tu ne pourras jamais mettre à jour l'app sans lui.

### Étape 2 — Encoder en base64 pour GitHub

```bash
# macOS / Linux
base64 -i brumerie.keystore | tr -d '\n'

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("brumerie.keystore"))
```

Copier le résultat → secret `KEYSTORE_BASE64`

### Étape 3 — Ajouter les 3 secrets keystore

| Nom du secret | Valeur |
|---|---|
| `KEYSTORE_BASE64` | Résultat de la commande base64 ci-dessus |
| `KEYSTORE_PASSWORD` | Le mot de passe choisi (storepass) |
| `KEY_ALIAS` | `brumerie` |
| `KEY_PASSWORD` | Le mot de passe choisi (keypass) |

---

## 🚀 Lancer le build

### Automatiquement
Chaque `git push` sur `main` ou `master` déclenche le build.

### Manuellement
GitHub → ton repo → **Actions** → **Build APK Brumerie** → **Run workflow**

---

## 📥 Télécharger l'APK

1. GitHub → **Actions** → Clique sur le dernier run
2. Scroll vers le bas → section **Artifacts**
3. Cliquer **Brumerie-APK** → télécharge un `.zip` contenant l'APK
4. Dézipper → installer sur le téléphone

---

## ✅ Checklist avant premier build

- [ ] Tous les secrets Firebase ajoutés
- [ ] `GOOGLE_SERVICES_JSON` ajouté (fichier entier sur une ligne)
- [ ] Keystore généré et encodé en base64
- [ ] `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` ajoutés
- [ ] `VITE_CLOUDINARY_CLOUD_NAME` et `VITE_CLOUDINARY_UPLOAD_PRESET` ajoutés
- [ ] Code pushé sur `main` ou `master`
