## Règles Firestore à ajouter pour l'OTP

Dans la Firebase Console → Firestore → Règles, ajoute ces règles :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── OTP verifications ─────────────────────────────────────
    // Écriture permise avant auth (inscription)
    // Lecture permise uniquement depuis le code (pas de navigation directe)
    match /otp_verifications/{email} {
      allow write: if true;  // L'utilisateur non-connecté doit pouvoir écrire
      allow read: if true;   // Pour vérification côté client (à durcir en prod)
    }

    // ── Users ─────────────────────────────────────────────────
    match /users/{userId} {
      allow read: if true;
      allow create: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId
        || request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['referralCount','referralBonusPublications',
                       'referralBonusChats','referralFreeVerifiedUntil',
                       'isVerified','referredBy','referralCode']);
    }

    // ── Autres collections ────────────────────────────────────
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
