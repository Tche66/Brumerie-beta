/**
 * Brumerie — Script de Migration Firestore -> Neon (v2)
 *
 * Utilise les endpoints /migration/* avec une cle secrete
 *
 * Usage :
 *   node migrate-firestore-to-neon.js [path-to-service-account.json]
 */

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

// -- CONFIG ---------------------------------------------------------------
const BACKEND_URL     = 'https://brumerie-beta-production.up.railway.app';
const MIGRATION_KEY   = 'brumerie-migrate-2026';
const SERVICE_ACCOUNT_PATH = process.argv[2] || path.join(
  process.env.USERPROFILE || process.env.HOME,
  'Downloads',
  (fs.readdirSync(path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads'))
    .find(f => f.includes('firebase-adminsdk') && f.endsWith('.json'))) || 'service-account.json'
);

// -- Couleurs terminal ----------------------------------------------------
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

// -- Stats ----------------------------------------------------------------
const stats = {
  users:    { total: 0, migrated: 0, skipped: 0, errors: 0 },
  products: { total: 0, migrated: 0, skipped: 0, errors: 0 },
  orders:   { total: 0, migrated: 0, skipped: 0, errors: 0 },
};
const errors = [];

// -- Init Firebase Admin --------------------------------------------------
function initFirebase() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(red(`\n  Fichier service account introuvable : ${SERVICE_ACCOUNT_PATH}`));
    console.error(yellow(`  Usage : node migrate-firestore-to-neon.js C:\\chemin\\vers\\service-account.json\n`));
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log(green(`  Firebase Admin OK — projet: ${serviceAccount.project_id}`));
  return admin.firestore();
}

// -- Appel API migration --------------------------------------------------
async function migrationCall(endpoint, body) {
  const res = await fetch(`${BACKEND_URL}/migration/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-migration-key': MIGRATION_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// -- Appel API users/sync (utilise le token admin) ------------------------
async function syncUser(body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}/users/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

// -- Generer un token admin -----------------------------------------------
async function getAdminToken() {
  const FIREBASE_WEB_KEY = 'AIzaSyB4OOSVAXJsC-WEnzNitGIlRS3ubTZZBcw';
  const db = admin.firestore();
  const configSnap = await db.collection('system').doc('config').get();
  const adminUid = configSnap.exists ? configSnap.data()?.adminUid : null;
  if (!adminUid) {
    console.log(yellow('  adminUid introuvable — migration users en mode direct'));
    return null;
  }
  const customToken = await admin.auth().createCustomToken(adminUid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_WEB_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.idToken;
}

// -- Migrer USERS ---------------------------------------------------------
async function migrateUsers(db, token) {
  console.log(bold(cyan('\n  USERS...')));
  const snap = await db.collection('users').get();
  stats.users.total = snap.size;
  console.log(cyan(`  ${snap.size} users dans Firestore`));

  for (const docSnap of snap.docs) {
    const user = docSnap.data();
    const uid = docSnap.id;
    if (!user.email || !user.name) { stats.users.skipped++; continue; }

    try {
      const res = await syncUser({
        firebaseUid: uid,
        email: user.email,
        name: user.displayName || user.name || 'Utilisateur',
        phone: user.phone || undefined,
        photoURL: user.photoURL || undefined,
        role: user.role || 'buyer',
      }, token);

      if ([200, 201].includes(res.status)) {
        stats.users.migrated++;
        process.stdout.write(green('.'));
      } else if (res.status === 409) {
        stats.users.skipped++;
        process.stdout.write(yellow('s'));
      } else {
        stats.users.errors++;
        process.stdout.write(red('x'));
        errors.push(`User ${uid}: ${res.status} — ${JSON.stringify(res.data).slice(0,120)}`);
      }
    } catch (e) {
      stats.users.errors++;
      process.stdout.write(red('x'));
      errors.push(`User ${uid}: ${e.message}`);
    }
    await sleep(50);
  }
  console.log(`\n  ${green(stats.users.migrated)} migres | ${yellow(stats.users.skipped)} skips | ${red(stats.users.errors)} erreurs`);
}

// -- Migrer PRODUCTS ------------------------------------------------------
async function migrateProducts(db) {
  console.log(bold(cyan('\n  PRODUCTS...')));
  // Ne migrer que les produits actifs/vendus/en pause/brouillons (pas les supprimes)
  const snap = await db.collection('products')
    .where('status', 'in', ['active', 'sold', 'paused', 'draft'])
    .get();
  stats.products.total = snap.size;
  console.log(cyan(`  ${snap.size} produits dans Firestore`));

  for (const docSnap of snap.docs) {
    const p = docSnap.data();
    if (!p.title || !p.sellerId) { stats.products.skipped++; continue; }

    try {
      const res = await migrationCall('product', {
        firebaseId:    docSnap.id,
        sellerId:      p.sellerId,
        title:         p.title,
        description:   p.description || p.title,
        price:         Number(p.price) || 0,
        originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
        category:      p.category || 'autre',
        neighborhood:  p.neighborhood || p.location || 'Abidjan',
        neighborhoods: p.neighborhoods || [p.neighborhood || 'Abidjan'],
        images:        Array.isArray(p.images) ? p.images : (p.imageUrl ? [p.imageUrl] : []),
        condition:     p.condition || undefined,
        quantity:      p.quantity || 1,
        status:        p.status || 'active',
      });

      if ([200, 201].includes(res.status)) {
        if (res.data.status === 'skipped') {
          stats.products.skipped++;
          process.stdout.write(yellow('s'));
        } else {
          stats.products.migrated++;
          process.stdout.write(green('.'));
        }
      } else {
        stats.products.errors++;
        process.stdout.write(red('x'));
        errors.push(`Product ${docSnap.id}: ${res.status} — ${JSON.stringify(res.data).slice(0,120)}`);
      }
    } catch (e) {
      stats.products.errors++;
      process.stdout.write(red('x'));
      errors.push(`Product ${docSnap.id}: ${e.message}`);
    }
    await sleep(50);
  }
  console.log(`\n  ${green(stats.products.migrated)} migres | ${yellow(stats.products.skipped)} skips | ${red(stats.products.errors)} erreurs`);
}

// -- Migrer ORDERS --------------------------------------------------------
async function migrateOrders(db) {
  console.log(bold(cyan('\n  ORDERS...')));
  const snap = await db.collection('orders').get();
  stats.orders.total = snap.size;
  console.log(cyan(`  ${snap.size} commandes dans Firestore`));

  for (const docSnap of snap.docs) {
    const o = docSnap.data();
    if (!o.buyerId || !o.sellerId) { stats.orders.skipped++; continue; }

    // Mapper le status Firestore vers les enum Neon
    let status = 'initiated';
    const statusMap = {
      'initiated': 'initiated',
      'proof_sent': 'proof_sent',
      'confirmed': 'confirmed',
      'ready': 'ready',
      'picked': 'picked',
      'delivered': 'delivered',
      'cod_pending': 'cod_pending',
      'cod_confirmed': 'cod_confirmed',
      'cod_delivered': 'cod_delivered',
      'disputed': 'disputed',
      'cancelled': 'cancelled',
    };
    status = statusMap[o.status] || 'initiated';

    try {
      const res = await migrationCall('order', {
        firebaseId:        docSnap.id,
        buyerId:           o.buyerId,
        sellerId:          o.sellerId,
        productFirebaseId: o.productId,
        productTitle:      o.productTitle || 'Produit',
        productImage:      o.productImage || o.productImageUrl || '',
        productPrice:      Number(o.productPrice || o.amount || 0),
        deliveryFee:       Number(o.deliveryFee || 0),
        totalAmount:       Number(o.totalAmount || o.productPrice || o.amount || 0),
        brumerieFee:       Number(o.brumerieFee || 0),
        sellerReceives:    Number(o.sellerReceives || o.productPrice || 0),
        paymentMethod:     o.paymentInfo?.method || o.paymentMethod || 'wave',
        paymentPhone:      o.paymentInfo?.phone || o.paymentPhone || '',
        paymentHolderName: o.paymentInfo?.holderName || o.paymentHolderName || '',
        deliveryType:      o.deliveryType || 'delivery',
        isCOD:             o.isCOD || false,
        status,
      });

      if ([200, 201].includes(res.status)) {
        if (res.data.status === 'skipped') {
          stats.orders.skipped++;
          process.stdout.write(yellow('s'));
        } else {
          stats.orders.migrated++;
          process.stdout.write(green('.'));
        }
      } else {
        stats.orders.errors++;
        process.stdout.write(red('x'));
        errors.push(`Order ${docSnap.id}: ${res.status} — ${JSON.stringify(res.data).slice(0,120)}`);
      }
    } catch (e) {
      stats.orders.errors++;
      process.stdout.write(red('x'));
      errors.push(`Order ${docSnap.id}: ${e.message}`);
    }
    await sleep(100);
  }
  console.log(`\n  ${green(stats.orders.migrated)} migres | ${yellow(stats.orders.skipped)} skips | ${red(stats.orders.errors)} erreurs`);
}

// -- Helper sleep ---------------------------------------------------------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// -- Reset Neon (supprimer produits + orders) --------------------------------
async function resetNeon() {
  console.log(bold(yellow('\n  RESET — Suppression produits & orders dans Neon...')));
  const res = await fetch(`${BACKEND_URL}/migration/reset`, {
    method: 'DELETE',
    headers: { 'x-migration-key': MIGRATION_KEY },
  });
  if (res.ok) console.log(green('  Reset OK — Neon videe'));
  else console.log(red(`  Reset echoue: ${res.status}`));
}

// -- MAIN -----------------------------------------------------------------
async function main() {
  const doReset = process.argv.includes('--reset');

  console.log(bold(cyan('\n  Brumerie — Migration Firestore -> Neon (v2)')));
  console.log(cyan(`  Backend: ${BACKEND_URL}`));
  console.log(cyan(`  Service Account: ${SERVICE_ACCOUNT_PATH}`));
  if (doReset) console.log(yellow('  MODE: --reset (purge avant migration)'));
  console.log(cyan('  ' + '-'.repeat(50)));

  const db = initFirebase();

  // Health check
  const health = await fetch(`${BACKEND_URL}/dashboard/health`).catch(() => ({ ok: false }));
  if (!health.ok) {
    console.error(red('\n  Backend inaccessible. Verifie Railway.\n'));
    process.exit(1);
  }
  console.log(green('  Backend OK'));

  // Reset si demande
  if (doReset) await resetNeon();

  // Token admin pour /users/sync
  let token = null;
  try {
    token = await getAdminToken();
    if (token) console.log(green('  Token admin OK'));
    else console.log(yellow('  Mode sans token — users sync peut echouer'));
  } catch { console.log(yellow('  Token non disponible')); }

  const start = Date.now();

  // Ordre : users -> products -> orders
  await migrateUsers(db, token);
  await migrateProducts(db);
  await migrateOrders(db);

  const duration = Math.round((Date.now() - start) / 1000);

  // -- Resume -------------------------------------------------------------
  console.log(cyan('\n  ' + '-'.repeat(50)));
  console.log(bold('  RESUME MIGRATION'));
  const totalMigrated = stats.users.migrated + stats.products.migrated + stats.orders.migrated;
  const totalErrors   = stats.users.errors   + stats.products.errors   + stats.orders.errors;
  const totalSkipped  = stats.users.skipped  + stats.products.skipped  + stats.orders.skipped;

  console.log(`  Users    : ${stats.users.migrated}/${stats.users.total}`);
  console.log(`  Products : ${stats.products.migrated}/${stats.products.total}`);
  console.log(`  Orders   : ${stats.orders.migrated}/${stats.orders.total}`);
  console.log(`  Total    : ${green(totalMigrated)} migres, ${yellow(totalSkipped)} skips, ${totalErrors > 0 ? red(totalErrors) : green('0')} erreurs`);
  console.log(`  Duree    : ${duration}s`);

  if (errors.length > 0) {
    console.log(red(`\n  ERREURS DETAILLEES:`));
    errors.forEach(e => console.log(red(`    - ${e}`)));
  }

  console.log(cyan('  ' + '-'.repeat(50)));
  if (totalErrors === 0) console.log(bold(green('\n  Migration terminee avec succes !\n')));
  else console.log(bold(yellow(`\n  Migration terminee avec ${totalErrors} erreur(s).\n`)));

  process.exit(0);
}

main().catch(e => {
  console.error(red(`\n  Erreur fatale: ${e.message}\n`));
  process.exit(1);
});
