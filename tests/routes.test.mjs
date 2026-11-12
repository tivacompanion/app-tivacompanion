// tests/routes.test.mjs
// Validates that all application routes serve correct HTTP 200 responses,
// enforce standard security headers, and render the core SPA DOM mount point.

import assert from 'node:assert';

const BASE_URL = 'http://localhost:5173';

const ROUTES_TO_TEST = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/institution-login',
  '/request-institution',
  '/emergency-snapshot/mock-qr-card-12345',
  '/accept-institution-invite?token=mock_token_abc',
  '/accept-admin-invite?token=mock_admin_token_xyz',
  '/auth-redirect',
  '/onboarding',
  '/chat',
  '/medications',
  '/health',
  '/vault',
  '/appointments',
  '/emergency',
  '/predictions',
  '/wellness',
  '/memory',
  '/family',
  '/messages',
  '/caregiver',
  '/institution',
  '/institution/reports',
  '/institution/patient/patient-uuid-12345',
  '/subscription',
  '/profile',
  '/settings',
  '/settings/bluetooth',
  '/monthly-checkin',
  '/accept-invite?token=mock_invite_token',
  '/wallpaper',
  '/some-unknown-path-for-spa-fallback',
];

export async function runRoutesTests() {
  console.log(`\n--- [1] Testing Application Routes & Security Headers (${ROUTES_TO_TEST.length} routes) ---`);
  let passed = 0;
  let failed = 0;

  for (const route of ROUTES_TO_TEST) {
    const url = `${BASE_URL}${route}`;
    const start = performance.now();
    try {
      const res = await fetch(url);
      const elapsed = (performance.now() - start).toFixed(1);

      assert.strictEqual(res.status, 200, `Expected status 200 for ${route}, got ${res.status}`);

      const contentType = res.headers.get('content-type') || '';
      assert.ok(contentType.includes('text/html'), `Expected HTML content-type for ${route}, got ${contentType}`);

      // Verify Vite dev/preview security headers
      const nosniff = res.headers.get('x-content-type-options');
      assert.strictEqual(nosniff, 'nosniff', `Expected X-Content-Type-Options: nosniff for ${route}`);

      const frameOptions = res.headers.get('x-frame-options');
      assert.strictEqual(frameOptions, 'DENY', `Expected X-Frame-Options: DENY for ${route}`);

      const bodyText = await res.text();
      assert.ok(bodyText.includes('<div id="root">'), `HTML missing #root mount container for ${route}`);
      assert.ok(bodyText.includes('<!DOCTYPE html>') || bodyText.includes('<!doctype html>'), `HTML missing doctype for ${route}`);

      console.log(`  ✓ [200 OK] ${route.padEnd(45)} (${elapsed}ms)`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL]   ${route}: ${err.message}`);
      failed++;
    }
  }

  console.log(`Routes Summary: ${passed} Passed, ${failed} Failed`);
  return { passed, failed, total: ROUTES_TO_TEST.length };
}

if (process.argv[1]?.endsWith('routes.test.mjs')) {
  runRoutesTests().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
