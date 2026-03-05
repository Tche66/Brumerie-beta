# 🔧 Configuration requise — OTP + Parrainage Brumerie

## 1. Firebase Extension "Trigger Email" (pour les emails OTP)

### Installer l'extension :
1. Firebase Console → Extensions → "Trigger Email from Firestore"
2. Configurer avec **SendGrid** (gratuit jusqu'à 100 emails/jour) ou **Mailgun**
3. Collection trigger : `mail` (déjà configurée dans le code)
4. Sender : `noreply@brumerie.app` ou ton domaine

### Règles Firestore à ajouter :
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Collection OTP (temporaire - lecture/écriture serveur uniquement)
    match /otp_verifications/{email} {
      allow read, write: if false; // Accès via SDK admin uniquement
    }

    // Collection mail (écriture uniquement depuis l'app)
    match /mail/{docId} {
      allow create: if request.auth == null; // Avant auth (inscription)
    }

    // Collection users — parrainage
    match /users/{userId} {
      allow read: if true;
      allow update: if request.auth.uid == userId ||
        // Permettre la mise à jour du compteur parrainage par le nouvel inscrit
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['referralCount', 'referralBonusPublications', 'referralBonusChats', 'referralFreeVerifiedUntil', 'isVerified', 'referredBy', 'referralCode']);
    }
  }
}
```

## 2. Règles Firestore — OTP en mode permissif (temporaire pour dev)
Pour permettre la lecture/écriture des OTP sans Firebase Admin :
```javascript
match /otp_verifications/{email} {
  allow read, write: if true; // ⚠️ À sécuriser en prod avec Firebase Functions
}
```

## 3. Alternative sans Firebase Extension — EmailJS
1. Créer un compte sur https://emailjs.com
2. Créer un service (Gmail, Outlook, etc.)
3. Créer un template avec les variables : `{{code}}`, `{{name}}`, `{{to_email}}`
4. Dans otpService.ts, décommenter la section EmailJS et remplir les IDs

## 4. Tester en local
Le code OTP sera stocké en clair dans Firestore (collection `otp_verifications`)
→ Pendant le dev, tu peux récupérer le code directement dans la console Firebase

## 5. Paliers de parrainage configurés dans types.ts :
- 🎯 10 invités → +1 publication/mois
- 🎯 15 invités → +1 pub + +1 chat/jour
- 🎯 20 invités → +2 pub + +1 chat/jour
- 🎯 30 invités → +3 pub + +2 chats/jour
- 🏅 50 invités → Badge Vérifié gratuit 30 jours + +5 pub

