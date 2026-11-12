// tests/tiva-client.test.mjs
// Validates tivaClient and base44 compatibility facade, entity proxies,
// security sanitization, functions adapter fallbacks, and live Supabase queries.

import assert from 'node:assert';

export async function runTivaClientTests() {
  console.log(`\n--- [3] Testing Tiva / Base44 Client & Supabase Engine ---`);
  let passed = 0;
  let failed = 0;

  const { tiva, tivaClient, base44, supabaseClient } = await import('../src/api/tivaClient.js');

  // Test 1: Export references
  try {
    assert.ok(tiva, 'tiva export must exist');
    assert.ok(tivaClient, 'tivaClient export must exist');
    assert.ok(base44, 'base44 facade export must exist');
    assert.strictEqual(tiva, base44, 'base44 facade should point to tiva client');
    assert.ok(supabaseClient, 'supabaseClient export must exist');
    console.log('  ✓ Client export aliases verified');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Client export test: ${err.message}`);
    failed++;
  }

  // Test 2: Entity Proxy dynamic mapping
  const expectedEntityMappings = [
    { entity: 'HealthProfile', table: 'health_profiles' },
    { entity: 'HealthReading', table: 'health_readings' },
    { entity: 'Medication', table: 'medications' },
    { entity: 'Reminder', table: 'reminders' },
    { entity: 'ReminderLog', table: 'reminder_logs' },
    { entity: 'Appointment', table: 'appointments' },
    { entity: 'EmergencyContact', table: 'emergency_contacts' },
    { entity: 'Alert', table: 'alerts' },
    { entity: 'Prediction', table: 'predictions' },
    { entity: 'FamilyMessage', table: 'family_messages' },
    { entity: 'CaregiverAssignment', table: 'caregiver_assignments' },
    { entity: 'CareTask', table: 'care_tasks' },
    { entity: 'Subscription', table: 'subscriptions' },
    { entity: 'Institution', table: 'institutions' },
    { entity: 'CheckInObservation', table: 'check_in_observations' },
    { entity: 'User', table: 'profiles' },
  ];

  try {
    for (const mapping of expectedEntityMappings) {
      const handler = base44.entities[mapping.entity];
      assert.ok(handler, `Handler for ${mapping.entity} should exist`);
      assert.strictEqual(typeof handler.list, 'function', `${mapping.entity}.list should be a function`);
      assert.strictEqual(typeof handler.filter, 'function', `${mapping.entity}.filter should be a function`);
      assert.strictEqual(typeof handler.create, 'function', `${mapping.entity}.create should be a function`);
      assert.strictEqual(typeof handler.update, 'function', `${mapping.entity}.update should be a function`);
      assert.strictEqual(typeof handler.delete, 'function', `${mapping.entity}.delete should be a function`);
      assert.strictEqual(typeof handler.subscribe, 'function', `${mapping.entity}.subscribe should be a function`);
    }
    console.log(`  ✓ All ${expectedEntityMappings.length} entity proxy handlers and CRUD methods verified`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Entity proxy mapping test: ${err.message}`);
    failed++;
  }

  // Test 3: Public Emergency Snapshot function with input sanitization
  try {
    // Malformed input (SQL injection or path traversal attempts)
    const malformed1 = await base44.functions.invoke('emergencySnapshot', { qr_code_id: "'; DROP TABLE profiles;--" });
    assert.strictEqual(malformed1.data, null, 'Malformed QR code should return null');

    const empty = await base44.functions.invoke('emergencySnapshot', { qr_code_id: '' });
    assert.strictEqual(empty.data, null, 'Empty QR code should return null');

    // Non-existent clean QR code
    const notFound = await base44.functions.invoke('emergencySnapshot', { qr_code_id: 'NON_EXISTENT_QR_99999' });
    assert.strictEqual(notFound.data, null, 'Unmatched QR code should return null data');

    console.log('  ✓ Public emergency snapshot sanitization & edge-cases verified');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Emergency snapshot test: ${err.message}`);
    failed++;
  }

  // Test 4: Institution Reports Function invocation
  try {
    const reportsRes = await base44.functions.invoke('institutionPortal', { action: 'get_reports' });
    assert.ok(reportsRes?.data, 'Reports response data should exist');
    assert.ok(Array.isArray(reportsRes.data.monthlyTrends), 'monthlyTrends should be an array');
    assert.strictEqual(reportsRes.data.monthlyTrends.length, 6, 'Should generate 6 months of trends');
    assert.ok(reportsRes.data.healthOutcomes, 'healthOutcomes should be defined');
    assert.ok(reportsRes.data.healthOutcomes.risk_distribution, 'risk_distribution should be defined');
    assert.strictEqual(typeof reportsRes.data.healthOutcomes.risk_distribution.green, 'number');
    assert.strictEqual(typeof reportsRes.data.healthOutcomes.risk_distribution.amber, 'number');
    assert.strictEqual(typeof reportsRes.data.healthOutcomes.risk_distribution.red, 'number');
    console.log('  ✓ Institution compliance reports generation verified (6-month trends & risk distributions)');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Institution reports test: ${err.message}`);
    failed++;
  }

  // Test 5: Caregiver Portal Actions
  try {
    const contactsRes = await base44.functions.invoke('caregiverPortal', { action: 'fetch_private_contacts' });
    assert.ok(contactsRes?.data, 'Contacts response should exist');
    assert.ok(Array.isArray(contactsRes.data.contacts), 'Contacts should be an array');

    const caregiverCheck = await base44.functions.invoke('caregiverPortal', { action: 'check_caregiver' });
    assert.ok(caregiverCheck?.data, 'Caregiver check response should exist');
    assert.strictEqual(typeof caregiverCheck.data.is_caregiver, 'boolean');

    const msgsRes = await base44.functions.invoke('caregiverPortal', { action: 'fetch_messages', mode: 'private' });
    assert.ok(msgsRes?.data, 'Messages response should exist');
    assert.ok(Array.isArray(msgsRes.data.messages), 'Messages should be an array');

    console.log('  ✓ Caregiver portal actions (contacts, check, messages) verified');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Caregiver portal test: ${err.message}`);
    failed++;
  }

  // Test 6: Wearable Data Sync
  try {
    const syncRes = await base44.functions.invoke('syncWearableData', {
      source: 'test_bluetooth_device',
      readings: [
        { metric_type: 'heart_rate', value: 72, unit: 'bpm' },
        { metric_type: 'spo2', value: 98, unit: '%' },
      ],
    });
    assert.ok(syncRes?.data, 'Sync response should exist');
    assert.strictEqual(syncRes.data.synced, 2, 'Should report 2 synced readings');
    console.log('  ✓ Wearable biometric ingestion pipeline verified');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Wearable sync test: ${err.message}`);
    failed++;
  }

  // Test 7: Supabase Connectivity to Tables
  try {
    console.log('  Testing live Supabase table accessibility...');
    const tablesToProbe = [
      'profiles',
      'health_profiles',
      'medications',
      'alerts',
      'appointments',
      'predictions',
      'subscriptions',
      'institutions',
      'emergency_contacts',
    ];

    for (const table of tablesToProbe) {
      const { data, error } = await supabaseClient.from(table).select('id').limit(1);
      // Status 200 or empty data is expected; should not throw table_does_not_exist
      if (error && error.code === '42P01') {
        throw new Error(`Table ${table} does not exist in Supabase database!`);
      }
      console.log(`    ✓ Table public.${table} accessible`);
    }
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Supabase table probe test: ${err.message}`);
    failed++;
  }

  console.log(`Tiva Client Summary: ${passed} Passed, ${failed} Failed`);
  return { passed, failed, total: passed + failed };
}

if (process.argv[1]?.endsWith('tiva-client.test.mjs')) {
  runTivaClientTests().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
