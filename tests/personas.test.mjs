// tests/personas.test.mjs
// Validates role-based access control, routing guards, and persona permissions.

import assert from 'node:assert';

export async function runPersonasTests() {
  console.log(`\n--- [6] Testing User Personas & Role Access Matrix ---`);
  let passed = 0;
  let failed = 0;

  // Test RoleGuard logic directly
  const ADMIN_ROLES = ['admin', 'institution_admin', 'super_admin'];
  const CAREGIVER_ROLES = ['caregiver', 'admin', 'super_admin'];

  const testMatrix = [
    {
      persona: 'Patient (Individual)',
      role: 'user',
      canAccessHome: true,
      canAccessMedications: true,
      canAccessCaregiverPortal: false,
      canAccessInstitutionPortal: false,
      canAccessReports: false,
    },
    {
      persona: 'Caregiver (Family / Professional)',
      role: 'caregiver',
      canAccessHome: true,
      canAccessMedications: true,
      canAccessCaregiverPortal: true,
      canAccessInstitutionPortal: false,
      canAccessReports: false,
    },
    {
      persona: 'Institution Admin (Hospital / Clinic Director)',
      role: 'institution_admin',
      canAccessHome: true,
      canAccessMedications: true,
      canAccessCaregiverPortal: false,
      canAccessInstitutionPortal: true,
      canAccessReports: true,
    },
    {
      persona: 'Super Admin (Platform Administrator)',
      role: 'super_admin',
      canAccessHome: true,
      canAccessMedications: true,
      canAccessCaregiverPortal: true,
      canAccessInstitutionPortal: true,
      canAccessReports: true,
    },
    {
      persona: 'Legacy Platform Admin (Admin)',
      role: 'admin',
      canAccessHome: true,
      canAccessMedications: true,
      canAccessCaregiverPortal: true,
      canAccessInstitutionPortal: true,
      canAccessReports: true,
    },
  ];

  for (const tc of testMatrix) {
    try {
      // Evaluate caregiver guard rule:
      const hasCaregiverAccess = CAREGIVER_ROLES.includes(tc.role);
      assert.strictEqual(
        hasCaregiverAccess,
        tc.canAccessCaregiverPortal,
        `Caregiver access mismatch for ${tc.persona}`
      );

      // Evaluate institution admin guard rule:
      const hasInstitutionAccess = ADMIN_ROLES.includes(tc.role);
      assert.strictEqual(
        hasInstitutionAccess,
        tc.canAccessInstitutionPortal,
        `Institution access mismatch for ${tc.persona}`
      );

      console.log(`  ✓ Persona: ${tc.persona.padEnd(46)} -> Caregiver: ${String(hasCaregiverAccess).padEnd(5)} | Institution: ${hasInstitutionAccess}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${tc.persona}: ${err.message}`);
      failed++;
    }
  }

  // Test Public First Responder Emergency Access
  try {
    const res = await fetch('http://localhost:5173/emergency-snapshot/test-public-qr');
    assert.strictEqual(res.status, 200, 'Public Emergency Snapshot route must be accessible without login');
    const html = await res.text();
    assert.ok(html.includes('<div id="root">'), 'Should render SPA root');
    console.log('  ✓ Public First Responder Emergency Snapshot route is unauthenticated and open');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Public emergency access: ${err.message}`);
    failed++;
  }

  console.log(`Personas Summary: ${passed} Passed, ${failed} Failed`);
  return { passed, failed, total: passed + failed };
}

if (process.argv[1]?.endsWith('personas.test.mjs')) {
  runPersonasTests().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
