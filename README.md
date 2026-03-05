# 🛍️ BRUMERIE MVP V1 - CLEAN

Marketplace locale C2C simplifiée pour la Côte d'Ivoire.

![Brumerie Logo](public/logo.jpg)

---

## ✨ FONCTIONNALITÉS

### **Pages (5)**
1. ✅ Authentification (Connexion/Inscription)
2. ✅ Accueil (Liste produits + Filtres)
3. ✅ Détail produit + Contact WhatsApp
4. ✅ Publier un produit (50 max/mois)
5. ✅ Profil utilisateur

### **Fonctionnalités principales**
- Authentification Firebase (Email/Password)
- Publication produits avec images (limite 50/mois)
- Filtres par catégorie et quartier
- Recherche simple
- Contact vendeur via WhatsApp
- Badge vendeur vérifié (manuel admin)
- Compteur de ventes (manuel admin)
- Upload images avec compression automatique

---

## 🚀 DÉMARRAGE RAPIDE

### **1. Installer les dépendances**
```bash
npm install
```

### **2. Configuration Firebase**

Créez `.env.local` à la racine :

```bash
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre_projet_id
VITE_FIREBASE_STORAGE_BUCKET=votre_projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### **3. Lancer en développement**
```bash
npm run dev
```

Ouvrez http://localhost:5173

### **4. Build production**
```bash
npm run build
```

Le dossier `dist/` contient les fichiers à déployer.

---

## 📂 STRUCTURE DU PROJET

```
src/
├── App.tsx                 # Navigation principale
├── main.tsx                # Point d'entrée
├── types.ts                # Types TypeScript
├── components/             # Composants UI
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Header.tsx
│   ├── BottomNav.tsx
│   └── ProductCard.tsx
├── pages/                  # Pages
│   ├── AuthPage.tsx
│   ├── HomePage.tsx
│   ├── ProductDetailPage.tsx
│   ├── SellPage.tsx
│   ├── ProfilePage.tsx
│   └── SellerProfilePage.tsx
├── contexts/               # Contextes React
│   └── AuthContext.tsx
├── services/               # Services Firebase
│   ├── productService.ts
│   └── userService.ts
├── utils/                  # Utilitaires
│   └── helpers.ts
└── config/
    └── firebase.ts         # Config Firebase
```

---

## 🔥 CONFIGURATION FIREBASE

### **Firestore Rules**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    
    match /products/{productId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.sellerId;
    }
  }
}
```

### **Storage Rules**

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /avatars/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 📊 KPIs À SUIVRE

- Inscriptions (acheteurs + vendeurs)
- Produits publiés/semaine
- Clics WhatsApp par produit
- Transactions déclarées
- Conversion visite → contact

---

## 🚀 DÉPLOIEMENT

### **Netlify (Recommandé)**

1. Build le projet :
```bash
npm run build
```

2. Glissez-déposez le dossier `dist/` sur Netlify

3. Configurez les variables d'environnement dans Netlify

---

## 📝 ADMIN (Manuel V1)

Pour gérer l'app en tant qu'admin :

1. Connectez-vous à Firebase Console
2. Allez dans Firestore Database

**Activer badge vérifié :**
- Collection `users` → Sélectionnez un user
- Modifiez `isVerified`: `false` → `true`

**Incrémenter ventes :**
- Collection `users` → Sélectionnez un user
- Modifiez `salesCount`: `0` → `1`, `2`, etc.

---

## 🎯 PROCHAINES ÉTAPES (V2)

- [ ] Admin panel web
- [ ] Système d'avis/notes
- [ ] Paiement intégré Wave
- [ ] Escrow protection
- [ ] Notifications push
- [ ] App mobile native

---

## 📞 SUPPORT

Pour toute question : support@brumerie.app

---

**MVP V1 - Clean & Functional** ✅
