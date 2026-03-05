# ✅ CHECKLIST DE VÉRIFICATION - AVANT DÉPLOIEMENT

## 🔧 ÉTAPE 1 : Installation (2 min)

```bash
# 1. Décompressez le ZIP
cd brumerie-mvp-v1-clean

# 2. Installez les dépendances
npm install

# ✅ Doit terminer sans erreurs
```

**Vérification :** Le dossier `node_modules/` est créé

---

## 🔥 ÉTAPE 2 : Configuration Firebase (5 min)

```bash
# 1. Copiez l'exemple
cp .env.example .env.local

# 2. Éditez .env.local avec vos vraies credentials Firebase
nano .env.local
# ou
code .env.local
```

**Contenu attendu dans .env.local :**
```
VITE_FIREBASE_API_KEY=AIza... (votre vraie clé)
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-projet-id
VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc...
```

**✅ Vérification :**
```bash
cat .env.local | grep VITE_FIREBASE_API_KEY
# Doit afficher votre vraie clé
```

---

## 🚀 ÉTAPE 3 : Démarrage (30 sec)

```bash
npm run dev
```

**✅ Sortie attendue :**
```
VITE v6.4.1  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: http://X.X.X.X:5173/
➜  press h + enter to show help
```

**⚠️ Si erreur "Cannot find module" :**
- Vérifiez que `npm install` a bien fonctionné
- Supprimez `node_modules` et relancez `npm install`

---

## 🧪 ÉTAPE 4 : Tests fonctionnels (5 min)

### **Test 1 : Page s'affiche**
- [ ] Ouvrir http://localhost:5173
- [ ] Voir le logo 🛍️ et "Brumerie"
- [ ] Voir les boutons "Connexion" et "Inscription"

**✅ Si ça marche :** React fonctionne

**❌ Si page blanche :**
- Ouvrir F12 → Console
- Chercher erreurs rouges
- Vérifier `.env.local` existe et est correct

---

### **Test 2 : Inscription**
- [ ] Cliquer "Inscription"
- [ ] Remplir tous les champs
- [ ] Choisir "Vendeur"
- [ ] Cliquer "S'inscrire"

**✅ Si succès :**
- Vous voyez la page Accueil
- Voir votre nom en haut à droite

**❌ Si erreur Firebase :**
- Vérifier Firebase Authentication activée
- Vérifier Firestore créé
- Vérifier Storage créé
- Voir FIREBASE_SETUP.md

---

### **Test 3 : Publier un produit**
- [ ] Cliquer icône "➕ Vendre" en bas
- [ ] Ajouter 1-3 photos
- [ ] Remplir titre, prix, catégorie, description
- [ ] Cliquer "Publier"

**✅ Si succès :**
- Message "Publication..."
- Retour à l'accueil
- Voir votre produit en premier

**❌ Si erreur Storage :**
- Vérifier Storage créé dans Firebase
- Vérifier règles Storage configurées

---

### **Test 4 : Voir un produit**
- [ ] Cliquer sur un produit
- [ ] Voir galerie photos
- [ ] Voir bouton WhatsApp

---

### **Test 5 : Contact WhatsApp**
- [ ] Cliquer "Contacter sur WhatsApp"
- [ ] Lire le modal d'avertissement
- [ ] Cliquer "Continuer"

**✅ Si succès :**
- WhatsApp s'ouvre (web ou app)
- Message pré-rempli visible

---

## 🏗️ ÉTAPE 5 : Build production (2 min)

```bash
npm run build
```

**✅ Sortie attendue :**
```
vite v6.4.1 building for production...
✓ XXX modules transformed.
dist/index.html                   X.XX kB
dist/assets/index-XXXXX.css      XX.XX kB
dist/assets/index-XXXXX.js      XXX.XX kB
✓ built in XXXms
```

**Vérification :**
```bash
ls -la dist/
# Doit contenir : index.html, assets/
```

**❌ Si erreur TypeScript :**
- Erreurs de compilation à corriger
- Voir les lignes indiquées dans l'erreur

---

## 📊 CHECKLIST FINALE

Avant de déployer, vérifiez :

### **Configuration**
- [ ] `.env.local` créé avec vraies credentials
- [ ] Firebase Authentication activée
- [ ] Firestore Database créé
- [ ] Storage créé
- [ ] Règles Firestore configurées
- [ ] Règles Storage configurées

### **Tests fonctionnels**
- [ ] Inscription fonctionne
- [ ] Connexion fonctionne
- [ ] Publication produit fonctionne
- [ ] Upload images fonctionne
- [ ] WhatsApp link fonctionne
- [ ] Filtres catégorie/quartier fonctionnent
- [ ] Recherche fonctionne

### **Build**
- [ ] `npm run build` réussit sans erreur
- [ ] Dossier `dist/` créé
- [ ] Fichiers dans `dist/assets/`

---

## 🚀 PRÊT À DÉPLOYER !

Si toutes les cases sont cochées → ✅ **Vous pouvez déployer !**

### **Déploiement Netlify**

1. Allez sur https://app.netlify.com/
2. Drag & drop le dossier `dist/`
3. Configurez variables d'environnement (même que .env.local)
4. Déployé !

### **Déploiement Firebase Hosting**

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## 🆘 PROBLÈMES COURANTS

### **Erreur : "Cannot find module '@/...'"**
**Cause :** TypeScript paths pas reconnus

**Solution :**
```bash
rm -rf node_modules
npm install
```

### **Page blanche en production**
**Cause :** Variables d'environnement manquantes

**Solution :**
- Configurez TOUTES les variables `VITE_FIREBASE_*` dans Netlify

### **Erreur Firebase 403**
**Cause :** Règles trop strictes

**Solution :**
- Vérifier règles Firestore/Storage dans Firebase Console

---

## ✅ VALIDATION FINALE

Si vous avez :
- ✅ Tous les tests passent
- ✅ Build réussit
- ✅ Pas d'erreurs console

**→ Vous êtes PRÊT à déployer en production !** 🎉
