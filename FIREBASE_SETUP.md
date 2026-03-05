# 🔥 GUIDE CONFIGURATION FIREBASE

## 1️⃣ CRÉER PROJET FIREBASE

1. Allez sur https://console.firebase.google.com/
2. Cliquez "Ajouter un projet"
3. Nom : `brumerie-mvp` (ou autre)
4. Google Analytics : OUI (recommandé)
5. Créer le projet

---

## 2️⃣ ACTIVER AUTHENTICATION

1. Dans le menu → **Authentication**
2. Cliquez "Commencer"
3. Onglet "Sign-in method"
4. Activez : **Email/Mot de passe**
5. Sauvegardez

---

## 3️⃣ CRÉER FIRESTORE DATABASE

1. Dans le menu → **Firestore Database**
2. Cliquez "Créer une base de données"
3. Emplacement : **europe-west** (ou proche de vous)
4. Mode : **Production**
5. Créer

### **Configurer les règles**

Allez dans "Règles" et collez :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users : lecture publique, écriture propriétaire
    match /users/{userId} {
      allow read: if true;
      allow create: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId;
      allow delete: if false;
    }
    
    // Products : lecture publique, écriture vendeur
    match /products/{productId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
                               request.auth.uid == resource.data.sellerId;
    }
  }
}
```

Cliquez **Publier**.

---

## 4️⃣ CRÉER STORAGE

1. Dans le menu → **Storage**
2. Cliquez "Commencer"
3. Emplacement : **même que Firestore**
4. Mode : **Production**
5. Créer

### **Configurer les règles**

Allez dans "Règles" et collez :

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Images de produits
    match /products/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.auth.uid == userId &&
                      request.resource.size < 5 * 1024 * 1024 &&
                      request.resource.contentType.matches('image/.*');
    }
    
    // Photos de profil
    match /avatars/{userId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.auth.uid == userId &&
                      request.resource.size < 2 * 1024 * 1024;
    }
  }
}
```

Cliquez **Publier**.

---

## 5️⃣ OBTENIR LES CREDENTIALS

1. Allez dans **Paramètres du projet** (⚙️ icône)
2. Onglet "Général"
3. Section "Vos applications" → Cliquez icône **Web** (</>)
4. Nom de l'app : `brumerie-web`
5. Firebase Hosting : NON (on déploie sur Netlify)
6. Cliquez "Enregistrer l'application"

### **Copiez la configuration**

Vous verrez quelque chose comme :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXX",
  authDomain: "brumerie-mvp.firebaseapp.com",
  projectId: "brumerie-mvp",
  storageBucket: "brumerie-mvp.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### **Créez .env.local**

Dans votre projet, créez `.env.local` :

```bash
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=brumerie-mvp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=brumerie-mvp
VITE_FIREBASE_STORAGE_BUCKET=brumerie-mvp.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## 6️⃣ TESTER LA CONFIGURATION

```bash
npm run dev
```

Ouvrez http://localhost:5173

1. Inscrivez-vous avec un email/mot de passe
2. Si ça fonctionne → ✅ Firebase bien configuré !
3. Vérifiez dans Firebase Console → Authentication → Users

---

## 🎯 CHECKLIST

- [ ] Projet Firebase créé
- [ ] Authentication activée (Email/Password)
- [ ] Firestore Database créée
- [ ] Règles Firestore configurées
- [ ] Storage créé
- [ ] Règles Storage configurées
- [ ] Credentials copiés dans .env.local
- [ ] Test inscription fonctionne

---

## ✅ FÉLICITATIONS !

Votre Firebase est prêt pour Brumerie MVP V1 ! 🎉
