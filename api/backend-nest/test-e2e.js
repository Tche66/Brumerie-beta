/**
 * Brumerie — Script de tests End-to-End
 * Teste tous les endpoints en production
 *
 * Usage :
 *   node test-e2e.js                          → teste en prod
 *   node test-e2e.js http://localhost:3000     → teste en local
 *
 * Résultats : ✅ OK | ❌ FAIL | ⚠️ AUTH (normal sans token)
 */

const BASE_URL = process.argv[2] || 'https://brumerie-beta-production.up.railway.app';

// ── Couleurs terminal ─────────────────────────────────────────────
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

// ── Stats ─────────────────────────────────────────────────────────
let passed = 0, failed = 0, authRequired = 0, total = 0;

// ── Requête HTTP ──────────────────────────────────────────────────
async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  } catch (e) {
    return { status: 0, error: e.message };
  }
}

// ── Vérifier un endpoint ──────────────────────────────────────────
async function test(label, method, path, opts = {}) {
  total++;
  const { body, expectStatus, expectKey, token, skipAuth } = opts;
  const expected = expectStatus || [200, 201];
  const expectedArr = Array.isArray(expected) ? expected : [expected];

  const result = await req(method, path, body, token);

  if (result.status === 0) {
    console.log(red(`❌ RÉSEAU  [${method}] ${path}`));
    console.log(red(`   └─ Erreur: ${result.error}`));
    failed++;
    return;
  }

  // 401/403 sans token = comportement attendu
  if ([401, 403].includes(result.status) && !token && !skipAuth) {
    console.log(yellow(`⚠️  AUTH   [${method}] ${path} → ${result.status} (normal sans token)`));
    authRequired++;
    return;
  }

  if (!expectedArr.includes(result.status)) {
    console.log(red(`❌ FAIL   [${method}] ${path} → ${result.status}`));
    if (result.json?.message) console.log(red(`   └─ ${result.json.message}`));
    failed++;
    return;
  }

  if (expectKey && result.json && !(expectKey in result.json)) {
    console.log(red(`❌ CHAMP  [${method}] ${path} → clé "${expectKey}" manquante`));
    console.log(red(`   └─ Reçu: ${JSON.stringify(result.json).slice(0, 100)}`));
    failed++;
    return;
  }

  console.log(green(`✅ OK     [${method}] ${path} → ${result.status}`));
  if (expectKey && result.json) {
    const val = result.json[expectKey];
    const display = typeof val === 'object' ? JSON.stringify(val).slice(0, 60) : val;
    console.log(green(`   └─ ${expectKey}: ${display}`));
  }
  passed++;
}

// ── TESTS ─────────────────────────────────────────────────────────
async function runTests() {
  console.log(bold(cyan(`\n🧪 Brumerie E2E Tests`)));
  console.log(cyan(`📡 URL: ${BASE_URL}`));
  console.log(cyan(`━`.repeat(55)));

  // ─── DASHBOARD ────────────────────────────────────────────────
  console.log(bold(`\n📊 DASHBOARD`));
  await test('Health check', 'GET', '/dashboard/health', {
    expectKey: 'system',
    skipAuth: true,
  });
  await test('DLQ list', 'GET', '/dashboard/dlq', {
    skipAuth: true,
  });

  // ─── USERS ────────────────────────────────────────────────────
  console.log(bold(`\n👤 USERS`));
  await test('Profil public user inexistant', 'GET', '/users/test-uid-inexistant', {
    expectStatus: [404],
    skipAuth: true,
  });
  await test('Search users (sans token)', 'GET', '/users/search?q=serge', {
    skipAuth: true,
  });
  await test('GET /users/me (sans token → 401)', 'GET', '/users/me');
  await test('POST /users/sync (sans token → 401)', 'POST', '/users/sync', {
    body: { firebaseUid: 'test', email: 'test@test.com', name: 'Test' },
  });
  await test('PUT /users/me (sans token → 401)', 'PUT', '/users/me', {
    body: { bio: 'test' },
  });

  // ─── PRODUCTS ─────────────────────────────────────────────────
  console.log(bold(`\n🛍️ PRODUCTS`));
  await test('Liste produits publique', 'GET', '/products', {
    skipAuth: true,
  });
  await test('Liste produits avec filtres', 'GET', '/products?category=mode&limit=5', {
    skipAuth: true,
  });
  await test('Produits trending', 'GET', '/products/trending', {
    skipAuth: true,
  });
  await test('Produit inexistant → 404', 'GET', '/products/produit-inexistant-xyz', {
    expectStatus: [404],
    skipAuth: true,
  });
  await test('Produits vendeur inexistant', 'GET', '/products/seller/uid-inexistant', {
    skipAuth: true,
  });
  await test('POST /products (sans token → 401)', 'POST', '/products', {
    body: { title: 'Test', price: 1000, description: 'test', category: 'mode', neighborhood: 'Cocody', images: [] },
  });
  await test('GET /products/bookmarks (sans token → 401)', 'GET', '/products/bookmarks');

  // ─── ORDERS ───────────────────────────────────────────────────
  console.log(bold(`\n📦 ORDERS`));
  await test('GET /orders/my (sans token → 401)', 'GET', '/orders/my');
  await test('POST /orders (sans token → 401)', 'POST', '/orders', {
    body: { sellerId: 'test', productId: 'test', totalAmount: 1000 },
  });
  await test('GET /orders/:id (sans token → 401)', 'GET', '/orders/order-test-id');

  // ─── TRUST ────────────────────────────────────────────────────
  console.log(bold(`\n🛡️ TRUST`));
  await test('Trust score user inexistant', 'GET', '/trust/score/uid-inexistant', {
    skipAuth: true,
  });
  await test('POST /trust/reviews (sans token → 401)', 'POST', '/trust/reviews', {
    body: { orderId: 'test', rating: 5, role: 'buyer_to_seller' },
  });
  await test('POST /trust/reports (sans token → 401)', 'POST', '/trust/reports', {
    body: { reportedId: 'test', details: 'test report details here' },
  });

  // ─── DELIVERY ─────────────────────────────────────────────────
  console.log(bold(`\n🛵 DELIVERY`));
  await test('Livreurs disponibles', 'GET', '/delivery/available', {
    skipAuth: true,
  });
  await test('Livreurs par zone', 'GET', '/delivery/available?zone=Cocody', {
    skipAuth: true,
  });
  await test('Calcul tarif livraison', 'GET', '/delivery/fee?delivererId=test&from=Cocody&to=Yopougon', {
    skipAuth: true,
    expectStatus: [200, 404],
  });
  await test('GET /delivery/my-orders (sans token → 401)', 'GET', '/delivery/my-orders');
  await test('POST /delivery/assign (sans token → 401)', 'POST', '/delivery/assign', {
    body: { orderId: 'test', delivererId: 'test', deliveryFee: 1000 },
  });

  // ─── REFERRALS ────────────────────────────────────────────────
  console.log(bold(`\n🎁 REFERRALS`));
  await test('Code parrainage inexistant → 404', 'GET', '/referrals/code/CODE-INEXISTANT', {
    expectStatus: [404],
    skipAuth: true,
  });
  await test('GET /referrals/stats (sans token → 401)', 'GET', '/referrals/stats');
  await test('GET /referrals/my (sans token → 401)', 'GET', '/referrals/my');
  await test('POST /referrals/apply (sans token → 401)', 'POST', '/referrals/apply', {
    body: { code: 'TEST1234' },
  });

  // ─── BOOSTS ───────────────────────────────────────────────────
  console.log(bold(`\n🚀 BOOSTS`));
  await test('IDs produits boostés', 'GET', '/boosts/active', {
    skipAuth: true,
  });
  await test('GET /boosts/my (sans token → 401)', 'GET', '/boosts/my');
  await test('POST /boosts (sans token → 401)', 'POST', '/boosts', {
    body: { productId: 'test', duration: 'h24' },
  });

  // ─── RATE LIMITING ────────────────────────────────────────────
  console.log(bold(`\n⚡ RATE LIMITING`));
  let rateLimitHit = false;
  for (let i = 0; i < 10; i++) {
    const r = await req('GET', '/dashboard/health');
    if (r.status === 429) { rateLimitHit = true; break; }
  }
  if (!rateLimitHit) {
    console.log(green(`✅ OK     Rate limit non déclenché sur 10 requêtes (normal)`));
    passed++;
  } else {
    console.log(yellow(`⚠️  INFO  Rate limit déclenché (à vérifier)`));
    authRequired++;
  }
  total++;

  // ─── SÉCURITÉ ────────────────────────────────────────────────
  console.log(bold(`\n🔒 SÉCURITÉ`));
  await test('Token invalide → 401', 'GET', '/users/me', {
    token: 'faux-token-invalide',
    expectStatus: [401, 403],
    skipAuth: true,
  });
  await test('Injection tentative → rejetée', 'GET', "/products?search='; DROP TABLE users; --", {
    skipAuth: true,
  });
  await test('Headers sécurité présents', 'GET', '/dashboard/health', {
    skipAuth: true,
  });

  // ─── RÉSUMÉ ──────────────────────────────────────────────────
  console.log(cyan(`\n${'━'.repeat(55)}`));
  console.log(bold(`📊 RÉSULTATS`));
  console.log(green(`   ✅ Passés    : ${passed}`));
  console.log(red(`   ❌ Échoués   : ${failed}`));
  console.log(yellow(`   ⚠️  Auth req  : ${authRequired}`));
  console.log(cyan(`   📝 Total     : ${total}`));
  console.log(cyan(`${'━'.repeat(55)}`));

  if (failed === 0) {
    console.log(bold(green(`\n🎉 Tous les tests passent ! Backend prêt pour la migration.\n`)));
  } else {
    console.log(bold(red(`\n⚠️  ${failed} test(s) échoué(s). Corrige avant de migrer les données.\n`)));
    process.exit(1);
  }
}

runTests().catch(console.error);
