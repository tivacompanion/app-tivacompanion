// tests/device-detect.test.mjs
// Validates responsive gating, device detection, and session override logic.

import assert from 'node:assert';

export async function runDeviceDetectTests() {
  console.log(`\n--- [2] Testing Device Detection & Override Engine ---`);
  let passed = 0;
  let failed = 0;

  // Mock a browser global environment
  const mockStorage = new Map();
  const mockSessionStorage = {
    getItem: (k) => mockStorage.get(`session:${k}`) ?? null,
    setItem: (k, v) => mockStorage.set(`session:${k}`, String(v)),
    removeItem: (k) => mockStorage.delete(`session:${k}`),
    clear: () => mockStorage.clear(),
  };
  const mockLocalStorage = {
    getItem: (k) => mockStorage.get(`local:${k}`) ?? null,
    setItem: (k, v) => mockStorage.set(`local:${k}`, String(v)),
    removeItem: (k) => mockStorage.delete(`local:${k}`),
    clear: () => mockStorage.clear(),
  };

  globalThis.sessionStorage = mockSessionStorage;
  globalThis.localStorage = mockLocalStorage;

  // Dynamic import of deviceDetect
  const { isMobileDevice, isDesktopDevice, hasDeviceOverride, setDeviceOverride } =
    await import('../src/utils/deviceDetect.js');

  const testCases = [
    {
      name: 'Mobile Phone User-Agent (iPhone)',
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      mediaMatches: true,
      expectMobile: true,
      expectDesktop: false,
    },
    {
      name: 'Android Mobile Device (Pixel 7)',
      ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Mobile Safari/537.36',
      mediaMatches: true,
      expectMobile: true,
      expectDesktop: false,
    },
    {
      name: 'Desktop Browser (Chrome Windows 11)',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      mediaMatches: false,
      expectMobile: false,
      expectDesktop: true,
    },
    {
      name: 'Desktop Browser with narrow window resize (Responsive DevTools)',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      mediaMatches: true,
      expectMobile: true,
      expectDesktop: false,
    },
  ];

  for (const tc of testCases) {
    Object.defineProperty(globalThis.navigator, 'userAgent', {
      value: tc.ua,
      configurable: true,
      writable: true,
    });
    globalThis.window = {
      matchMedia: (q) => ({ matches: tc.mediaMatches }),
    };

    try {
      const mob = isMobileDevice();
      const desk = isDesktopDevice();
      assert.strictEqual(mob, tc.expectMobile, `Mobile mismatch for ${tc.name}`);
      assert.strictEqual(desk, tc.expectDesktop, `Desktop mismatch for ${tc.name}`);
      console.log(`  ✓ ${tc.name}: mobile=${mob}, desktop=${desk}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${tc.name}: ${err.message}`);
      failed++;
    }
  }

  // Test Override flags
  console.log('  Testing override persistence...');
  try {
    mockStorage.clear();
    assert.strictEqual(hasDeviceOverride(), false, 'Expected no override initially');

    setDeviceOverride(true);
    assert.strictEqual(hasDeviceOverride(), true, 'Expected override active after setDeviceOverride(true)');
    assert.strictEqual(mockSessionStorage.getItem('tiva:device_override'), 'true');
    assert.strictEqual(mockLocalStorage.getItem('tiva:device_override'), 'true');

    setDeviceOverride(false);
    assert.strictEqual(hasDeviceOverride(), false, 'Expected override cleared after setDeviceOverride(false)');
    assert.strictEqual(mockSessionStorage.getItem('tiva:device_override'), null);
    assert.strictEqual(mockLocalStorage.getItem('tiva:device_override'), null);

    console.log('  ✓ Device override lifecycle verified (set, persist, clear)');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Device override test: ${err.message}`);
    failed++;
  }

  console.log(`Device Detect Summary: ${passed} Passed, ${failed} Failed`);
  return { passed, failed, total: testCases.length + 1 };
}

if (process.argv[1]?.endsWith('device-detect.test.mjs')) {
  runDeviceDetectTests().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
