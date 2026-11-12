// tests/lru-cache.test.mjs
// Validates LRU cache eviction order, TTL expiration, and memoization.

import assert from 'node:assert';

export async function runLruCacheTests() {
  console.log(`\n--- [7] Testing LRU (Least Recently Used) Cache Engine ---`);
  let passed = 0;
  let failed = 0;

  const {
    LRUCache,
    ttsLRUCache,
    llmLRUCache,
    emergencySnapshotLRUCache,
    documentAnalysisLRUCache,
  } = await import('../src/utils/lruCache.js');

  // Test 1: Capacity & Eviction Order
  try {
    const cache = new LRUCache({ capacity: 3 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    assert.strictEqual(cache.size, 3);
    assert.strictEqual(cache.get('a'), 1); // Access 'a', making 'b' the LRU!

    cache.set('d', 4); // Should evict 'b'

    assert.strictEqual(cache.get('b'), undefined, 'Expected "b" to be evicted as LRU');
    assert.strictEqual(cache.get('a'), 1, 'Expected "a" to remain in cache');
    assert.strictEqual(cache.get('c'), 3, 'Expected "c" to remain in cache');
    assert.strictEqual(cache.get('d'), 4, 'Expected "d" to remain in cache');
    assert.strictEqual(cache.size, 3);

    console.log('  ✓ LRU eviction order strictly respected (O(1) capacity constraint)');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Eviction order test: ${err.message}`);
    failed++;
  }

  // Test 2: TTL Expiration
  try {
    const cache = new LRUCache({ capacity: 5, ttlMs: 40 }); // 40ms TTL
    cache.set('item1', 'hello');
    assert.strictEqual(cache.get('item1'), 'hello');

    // Wait 50ms for expiration
    await new Promise((r) => setTimeout(r, 55));

    assert.strictEqual(cache.get('item1'), undefined, 'Expected item1 to expire after TTL');
    assert.strictEqual(cache.has('item1'), false, 'has() should return false for expired key');

    console.log('  ✓ Time-To-Live (TTL) expiration verified');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] TTL expiration test: ${err.message}`);
    failed++;
  }

  // Test 3: Peek vs Get
  try {
    const cache = new LRUCache({ capacity: 2 });
    cache.set('x', 10);
    cache.set('y', 20);

    // peek('x') does NOT promote 'x' to MRU
    assert.strictEqual(cache.peek('x'), 10);

    // set 'z' should evict 'x' because 'x' was not promoted by peek
    cache.set('z', 30);
    assert.strictEqual(cache.get('x'), undefined, 'Expected "x" to be evicted after peek');
    assert.strictEqual(cache.get('y'), 20);
    assert.strictEqual(cache.get('z'), 30);

    console.log('  ✓ peek() preserves recency without false promotions');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Peek test: ${err.message}`);
    failed++;
  }

  // Test 4: Memoize Wrapper
  try {
    const cache = new LRUCache({ capacity: 10 });
    let executionCount = 0;

    const slowComputation = async (num) => {
      executionCount++;
      return num * 10;
    };

    const memoized = cache.memoize(slowComputation);

    const r1 = await memoized(5);
    const r2 = await memoized(5);
    const r3 = await memoized(5);

    assert.strictEqual(r1, 50);
    assert.strictEqual(r2, 50);
    assert.strictEqual(r3, 50);
    assert.strictEqual(executionCount, 1, 'Underlying function should only execute once');

    console.log('  ✓ memoize() wrapper executes once and caches subsequent calls');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Memoize test: ${err.message}`);
    failed++;
  }

  // Test 5: Verify Application Singletons
  try {
    assert.ok(ttsLRUCache instanceof LRUCache);
    assert.strictEqual(ttsLRUCache.capacity, 60);

    assert.ok(llmLRUCache instanceof LRUCache);
    assert.strictEqual(llmLRUCache.capacity, 100);

    assert.ok(emergencySnapshotLRUCache instanceof LRUCache);
    assert.strictEqual(emergencySnapshotLRUCache.capacity, 30);

    assert.ok(documentAnalysisLRUCache instanceof LRUCache);
    assert.strictEqual(documentAnalysisLRUCache.capacity, 50);

    console.log('  ✓ Subsystem singletons initialized (TTS, LLM, Emergency, Vault)');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Singletons test: ${err.message}`);
    failed++;
  }

  // Test 6: Verify Clinical Safety Guard (Never Cache Emergency Signals)
  try {
    const { tiva } = await import('../src/api/tivaClient.js');

    // 1. Regular LLM query gets cached
    llmLRUCache.clear();
    const prompt1 = 'What is normal blood pressure?';
    await tiva.integrations.Core.InvokeLLM({ prompt: prompt1 });
    assert.ok(llmLRUCache.size > 0, 'Standard health advice should be cached in llmLRUCache');

    // 2. Emergency query must NOT be cached in LRU cache
    const initialLlmSize = llmLRUCache.size;
    const emergencyPrompt = 'Help I have severe chest pain and cannot breathe!';
    const emgResult = await tiva.integrations.Core.InvokeLLM({
      prompt: emergencyPrompt,
      response_json_schema: {
        type: 'object',
        properties: { response: { type: 'string' }, is_emergency: { type: 'boolean' } },
      },
    });
    assert.strictEqual(emgResult.is_emergency, true, 'Emergency signal should be detected');
    assert.strictEqual(llmLRUCache.size, initialLlmSize, 'Emergency alerts must NEVER be cached in LRU cache');

    // 3. Document Analysis routes to documentAnalysisLRUCache
    documentAnalysisLRUCache.clear();
    await tiva.integrations.Core.InvokeLLM({
      prompt: 'Summarize blood test report',
      file_urls: ['https://example.com/blood_test.pdf'],
      response_json_schema: {
        type: 'object',
        properties: { summary: { type: 'string' }, explanation: { type: 'string' }, warnings: { type: 'array' } },
      },
    });
    assert.ok(documentAnalysisLRUCache.size > 0, 'Medical documents must be cached in documentAnalysisLRUCache');

    console.log('  ✓ Clinical Safety Guard verified (Zero caching for emergencies; doc intelligence routes to vault cache)');
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] Clinical Safety Guard test: ${err.message}`);
    failed++;
  }

  console.log(`LRU Cache Summary: ${passed} Passed, ${failed} Failed`);
  return { passed, failed, total: passed + failed };
}

if (process.argv[1]?.endsWith('lru-cache.test.mjs')) {
  runLruCacheTests().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
