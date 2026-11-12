// tests/pwa-assets.test.mjs
// Validates Progressive Web App manifest, offline fallback, and icon assets.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:5173';

export async function runPwaAssetsTests() {
  console.log(`\n--- [4] Testing PWA Manifest, Offline Fallback & Static Assets ---`);
  let passed = 0;
  let failed = 0;

  const publicDir = path.resolve(process.cwd(), 'public');

  // Test 1: manifest.json schema and icon files
  try {
    const manifestPath = path.join(publicDir, 'manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist in public/');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(manifest.name, 'Tiva — AI Health Companion');
    assert.strictEqual(manifest.display, 'standalone');
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'manifest.icons should have entries');

    console.log(`  ✓ manifest.json is valid (${manifest.icons.length} icons declared)`);
    passed++;

    // Check each declared icon exists
    for (const icon of manifest.icons) {
      const relPath = icon.src.replace(/^\//, '');
      const fullPath = path.join(publicDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Icon file missing: ${relPath}`);
    }
    console.log(`  ✓ All ${manifest.icons.length} declared icon files exist on disk`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] manifest icon test: ${err.message}`);
    failed++;
  }

  // Test 2: offline.html validity
  try {
    const offlinePath = path.join(publicDir, 'offline.html');
    assert.ok(fs.existsSync(offlinePath), 'offline.html must exist');
    const offlineHtml = fs.readFileSync(offlinePath, 'utf8');
    assert.ok(offlineHtml.includes('Tiva'), 'offline.html should mention Tiva');
    assert.ok(offlineHtml.includes('offline'), 'offline.html should contain offline text');
    console.log('  ✓ offline.html fallback file verified');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] offline.html test: ${err.message}`);
    failed++;
  }

  // Test 3: HTTP Serving of PWA assets via dev server
  const endpoints = ['/manifest.json', '/offline.html', '/favicon.png', '/icons/icon-192x192.png'];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep}`);
      assert.strictEqual(res.status, 200, `Expected 200 for ${ep}`);
      console.log(`  ✓ [200 OK] Served ${ep}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] HTTP serve ${ep}: ${err.message}`);
      failed++;
    }
  }

  // Test 4: Deployment SPA redirect manifests
  try {
    const redirectsPath = path.join(publicDir, '_redirects');
    assert.ok(fs.existsSync(redirectsPath), 'public/_redirects must exist for Netlify/Cloudflare SPA routing');
    const vercelPath = path.resolve(process.cwd(), 'vercel.json');
    assert.ok(fs.existsSync(vercelPath), 'vercel.json must exist for Vercel SPA routing');
    console.log('  ✓ Production SPA rewrites verified (public/_redirects & vercel.json)');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] SPA redirects test: ${err.message}`);
    failed++;
  }

  console.log(`PWA Assets Summary: ${passed} Passed, ${failed} Failed`);
  return { passed, failed, total: passed + failed };
}

if (process.argv[1]?.endsWith('pwa-assets.test.mjs')) {
  runPwaAssetsTests().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
