// tests/run-all.mjs
// Master End-to-End Test Suite Orchestrator for Tiva Health Companion.

import { runRoutesTests } from './routes.test.mjs';
import { runDeviceDetectTests } from './device-detect.test.mjs';
import { runTivaClientTests } from './tiva-client.test.mjs';
import { runPwaAssetsTests } from './pwa-assets.test.mjs';
import { runSchemaIntegrityTests } from './schema-integrity.test.mjs';
import { runPersonasTests } from './personas.test.mjs';
import { runLruCacheTests } from './lru-cache.test.mjs';

async function main() {
  const overallStart = performance.now();
  console.log('================================================================');
  console.log('   TIVA HEALTH COMPANION — COMPREHENSIVE PROJECT TEST SUITE    ');
  console.log('================================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Environment: Node.js ${process.version} | Windows`);

  const results = [];

  // Suite 1: Routes
  try {
    const r1 = await runRoutesTests();
    results.push({ name: 'Application Routes & Security Headers', ...r1 });
  } catch (err) {
    results.push({ name: 'Application Routes & Security Headers', passed: 0, failed: 1, error: err.message });
  }

  // Suite 2: Device Detect
  try {
    const r2 = await runDeviceDetectTests();
    results.push({ name: 'Device Detection & Responsive Gating', ...r2 });
  } catch (err) {
    results.push({ name: 'Device Detection & Responsive Gating', passed: 0, failed: 1, error: err.message });
  }

  // Suite 3: Tiva Client & Supabase
  try {
    const r3 = await runTivaClientTests();
    results.push({ name: 'Tiva Client & Supabase Database Queries', ...r3 });
  } catch (err) {
    results.push({ name: 'Tiva Client & Supabase Database Queries', passed: 0, failed: 1, error: err.message });
  }

  // Suite 4: PWA Assets
  try {
    const r4 = await runPwaAssetsTests();
    results.push({ name: 'PWA Manifest & Offline Assets', ...r4 });
  } catch (err) {
    results.push({ name: 'PWA Manifest & Offline Assets', passed: 0, failed: 1, error: err.message });
  }

  // Suite 5: Schema Integrity
  try {
    const r5 = await runSchemaIntegrityTests();
    results.push({ name: 'PostgreSQL Schema Integrity & RLS', ...r5 });
  } catch (err) {
    results.push({ name: 'PostgreSQL Schema Integrity & RLS', passed: 0, failed: 1, error: err.message });
  }

  // Suite 6: User Personas
  try {
    const r6 = await runPersonasTests();
    results.push({ name: 'User Personas & Role Access Control', ...r6 });
  } catch (err) {
    results.push({ name: 'User Personas & Role Access Control', passed: 0, failed: 1, error: err.message });
  }

  // Suite 7: LRU Cache Engine
  try {
    const r7 = await runLruCacheTests();
    results.push({ name: 'LRU Cache Engine & Memory Constraints', ...r7 });
  } catch (err) {
    results.push({ name: 'LRU Cache Engine & Memory Constraints', passed: 0, failed: 1, error: err.message });
  }

  const overallElapsed = ((performance.now() - overallStart) / 1000).toFixed(2);
  let totalPassed = 0;
  let totalFailed = 0;

  console.log('\n================================================================');
  console.log('                     FINAL TEST SCORECARD                       ');
  console.log('================================================================');
  for (const s of results) {
    totalPassed += s.passed || 0;
    totalFailed += s.failed || 0;
    const status = s.failed === 0 ? '✓ PASS' : '✗ FAIL';
    console.log(`[${status}] ${s.name.padEnd(45)} ${s.passed} passed, ${s.failed} failed`);
    if (s.error) {
      console.log(`       Error: ${s.error}`);
    }
  }
  console.log('----------------------------------------------------------------');
  console.log(`TOTALS: ${totalPassed} PASSED | ${totalFailed} FAILED | Duration: ${overallElapsed}s`);
  console.log('================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main();
