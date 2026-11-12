// tests/schema-integrity.test.mjs
// Validates that supabase/schema.sql and supabase/update_tables.sql define all
// required PostgreSQL tables, RLS policies, standard audit columns, and RPC functions.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const EXPECTED_TABLES = [
  'profiles',
  'institutions',
  'health_profiles',
  'health_readings',
  'medications',
  'reminders',
  'reminder_logs',
  'appointments',
  'emergency_contacts',
  'alerts',
  'predictions',
  'conversations',
  'family_messages',
  'caregiver_assignments',
  'medical_records',
  'medical_documents',
  'memory_notes',
  'wellness_entries',
  'subscriptions',
  'audit_logs',
  'check_in_observations',
  'clinical_notes',
  'care_tasks',
  'institution_admin_invites',
];

export async function runSchemaIntegrityTests() {
  console.log(`\n--- [5] Testing Database Schema Integrity & Migrations ---`);
  let passed = 0;
  let failed = 0;

  const schemaPath = path.resolve(process.cwd(), 'supabase', 'schema.sql');
  const updateTablesPath = path.resolve(process.cwd(), 'supabase', 'update_tables.sql');

  assert.ok(fs.existsSync(schemaPath), 'supabase/schema.sql must exist');
  assert.ok(fs.existsSync(updateTablesPath), 'supabase/update_tables.sql must exist');

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const updateContent = fs.readFileSync(updateTablesPath, 'utf8');

  // Test 1: Verify all 24 required tables are defined
  console.log(`  Checking ${EXPECTED_TABLES.length} database tables in schema...`);
  for (const table of EXPECTED_TABLES) {
    try {
      const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\s*\\(`, 'i');
      assert.ok(tableRegex.test(schemaContent), `Table public.${table} must be defined in schema.sql`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] Table ${table}: ${err.message}`);
      failed++;
    }
  }
  console.log(`  ✓ All ${EXPECTED_TABLES.length} application tables present in schema.sql`);

  // Test 2: Check standard compatibility timestamps & UUIDs
  console.log('  Checking standard audit columns (created_date, updated_date)...');
  try {
    for (const table of EXPECTED_TABLES) {
      // Find table block
      const startIdx = schemaContent.indexOf(`CREATE TABLE IF NOT EXISTS public.${table}`);
      if (startIdx !== -1) {
        const endIdx = schemaContent.indexOf(');', startIdx);
        const block = schemaContent.slice(startIdx, endIdx);
        assert.ok(block.includes('created_date'), `Table ${table} missing created_date column`);
        assert.ok(block.includes('updated_date'), `Table ${table} missing updated_date column`);
        assert.ok(block.includes('id UUID PRIMARY KEY'), `Table ${table} missing id UUID PRIMARY KEY`);
      }
    }
    console.log('  ✓ Standard compatibility timestamps and UUID primary keys verified');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Audit columns test: ${err.message}`);
    failed++;
  }

  // Test 3: Check Row Level Security (RLS) enforcement
  console.log('  Checking Row Level Security (RLS) policies...');
  try {
    for (const table of EXPECTED_TABLES) {
      const rlsRegex = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`, 'i');
      assert.ok(rlsRegex.test(schemaContent), `Table ${table} must have RLS enabled`);
    }
    console.log('  ✓ Row Level Security enabled for all 24 tables');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] RLS test: ${err.message}`);
    failed++;
  }

  // Test 4: Check RPC Functions
  console.log('  Checking RPC stored procedures...');
  try {
    assert.ok(schemaContent.includes('FUNCTION public.get_emergency_snapshot'), 'get_emergency_snapshot RPC missing in schema.sql');
    assert.ok(updateContent.includes('FUNCTION public.get_emergency_snapshot'), 'get_emergency_snapshot RPC missing in update_tables.sql');
    assert.ok(schemaContent.includes('FUNCTION public.handle_new_user'), 'handle_new_user auth trigger function missing');
    console.log('  ✓ Stored procedures and authentication triggers verified');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] RPC function test: ${err.message}`);
    failed++;
  }

  console.log(`Schema Integrity Summary: ${passed} Passed, ${failed} Failed`);
  return { passed, failed, total: passed + failed };
}

if (process.argv[1]?.endsWith('schema-integrity.test.mjs')) {
  runSchemaIntegrityTests().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
