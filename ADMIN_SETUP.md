# 🔐 Configuration Admin Brumerie — À faire UNE SEULE FOIS

## Étape 1 — Configurer VITE_ADMIN_UID dans .env

Ajoute cette ligne dans ton fichier `.env` (à la racine du projet) :

```
VITE_ADMIN_UID=TON_UID_FIREBASE_ICI
```

**Trouver ton UID Firebase :**
Console Firebase → Authentication → Users → colonne "User UID"

---

## Étape 2 — Créer le document system/config dans Firestore

Les règles de sécurité Firestore utilisent un document Firestore pour identifier l'admin.
Tu dois créer ce document MANUELLEMENT dans la console Firebase :

1. Va sur **Firebase Console → Firestore Database**
2. Crée une collection `system`
3. Crée un document avec l'ID `config`
4. Ajoute le champ :
   - **Champ** : `adminUid`
   - **Type** : `string`
   - **Valeur** : ton UID Firebase (le même que dans `.env`)

---

## Étape 3 — Déployer les règles Firestore

```bash
firebase deploy --only firestore:rules
```

---

## Résultat

Après ces 3 étapes :
- ✅ Bouton Admin visible dans Paramètres (toi uniquement)
- ✅ Les bannissements bloquent vraiment l'accès
- ✅ L'admin peut modifier produits, users, commandes sans erreur Firebase
- ✅ Le mode maintenance bloque tous les users (sauf toi)
- ✅ Les prix boosts mis à jour via admin s'appliquent en temps réel
