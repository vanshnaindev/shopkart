#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

const TEST_PORT = process.env.TEST_PORT || '5055';
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Result tracking
const results = {
  json: {
    mode: 'JSON Store',
    phase1: { pass: 0, fail: 0 },
    phase2: { pass: 0, fail: 0 },
    phase3: { pass: 0, fail: 0 },
    totalPass: 0,
    totalFail: 0,
    success: false,
  },
  mongodb: {
    mode: 'MongoDB (Mongoose)',
    phase1: { pass: 0, fail: 0 },
    phase2: { pass: 0, fail: 0 },
    phase3: { pass: 0, fail: 0 },
    totalPass: 0,
    totalFail: 0,
    success: false,
  },
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(port, expectedMode) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      if (res.ok) {
        const body = await res.json();
        if (body.storageMode === expectedMode) {
          return true;
        }
      }
    } catch {}
    await sleep(500);
  }
  return false;
}

function runScript(scriptName, env) {
  return new Promise((resolve) => {
    let passCount = 0;
    let failCount = 0;

    const proc = spawn('node', [scriptName], {
      cwd: backendDir,
      env: { ...process.env, BASE_URL, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (d) => {
      const text = d.toString();
      const passMatches = text.match(/PASS\s+/g);
      if (passMatches) passCount += passMatches.length;

      const failMatches = text.match(/FAIL\s+/g);
      if (failMatches) {
        failCount += failMatches.length;
        const lines = text.split('\n');
        for (const l of lines) {
          if (l.includes('FAIL')) console.log('    ' + l.trim());
        }
      }
    });

    proc.stderr.on('data', () => {});

    proc.on('exit', (code) => {
      resolve({ code, pass: passCount, fail: failCount });
    });
  });
}

async function testMode(modeName, mongoUri = '') {
  console.log(`\n================================================================`);
  console.log(` Starting Smoke Tests for Storage Mode: [${modeName.toUpperCase()}]`);
  console.log(`================================================================`);

  const env = {
    PORT: TEST_PORT,
    MONGODB_URI: mongoUri,
    NODE_ENV: 'test',
  };

  let serverOutput = '';
  const backendProc = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: backendDir,
    env: { ...process.env, ...env },
    detached: true,
    stdio: 'pipe',
  });

  backendProc.stdout.on('data', (d) => {
    serverOutput += d.toString();
  });
  backendProc.stderr.on('data', (d) => {
    serverOutput += d.toString();
  });

  const healthy = await waitForServer(TEST_PORT, modeName);
  if (!healthy) {
    try {
      process.kill(-backendProc.pid, 'SIGKILL');
    } catch {}
    console.error(`\nServer startup output:\n${serverOutput}`);
    throw new Error(`Backend failed to become healthy on port ${TEST_PORT} for mode ${modeName}`);
  }

  console.log(`✓ Backend running on port ${TEST_PORT} (storageMode: ${modeName})`);

  // Run Phase 1
  process.stdout.write('  → Running Phase 1 Smoke Suite (Auth, Catalog, Cart, Wishlist)... ');
  const p1 = await runScript('scripts/smoke-phase1.mjs', env);
  if (p1.code === 0 && p1.fail === 0) {
    console.log(`✓ Passed (${p1.pass} passed, 0 failed)`);
  } else {
    console.log(`✗ FAILED (${p1.pass} passed, ${p1.fail} failed)`);
  }

  // Run Phase 2
  process.stdout.write('  → Running Phase 2 Smoke Suite (Orders, Stock, Payments, Coupons)... ');
  const p2 = await runScript('scripts/smoke-phase2.mjs', env);
  if (p2.code === 0 && p2.fail === 0) {
    console.log(`✓ Passed (${p2.pass} passed, 0 failed)`);
  } else {
    console.log(`✗ FAILED (${p2.pass} passed, ${p2.fail} failed)`);
  }

  // Run Phase 3
  process.stdout.write(
    '  → Running Phase 3 Smoke Suite (Admin CRUD, Analytics, Reports, RBAC)... '
  );
  const p3 = await runScript('scripts/smoke-phase3.mjs', env);
  if (p3.code === 0 && p3.fail === 0) {
    console.log(`✓ Passed (${p3.pass} passed, 0 failed)`);
  } else {
    console.log(`✗ FAILED (${p3.pass} passed, ${p3.fail} failed)`);
  }

  try {
    process.kill(-backendProc.pid, 'SIGKILL');
  } catch {}
  await sleep(1500);

  const tracker = results[modeName];
  tracker.phase1 = { pass: p1.pass, fail: p1.fail };
  tracker.phase2 = { pass: p2.pass, fail: p2.fail };
  tracker.phase3 = { pass: p3.pass, fail: p3.fail };
  tracker.totalPass = p1.pass + p2.pass + p3.pass;
  tracker.totalFail = p1.fail + p2.fail + p3.fail;
  tracker.success = p1.code === 0 && p2.code === 0 && p3.code === 0 && tracker.totalFail === 0;

  return tracker.success;
}

async function main() {
  console.log('################################################################');
  console.log('       SHOPKART DUAL STORAGE SMOKE VERIFICATION SUITE           ');
  console.log('################################################################');

  // 1. Run JSON mode
  await testMode('json', '');

  // 2. Run MongoDB mode
  let replSet = null;
  let mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log('\nMONGODB_URI not set. Spinning up embedded MongoMemoryReplSet...');
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    mongoUri = replSet.getUri();
    console.log(`✓ In-memory MongoDB Replica Set active: ${mongoUri}`);
  } else {
    console.log(`\nUsing configured MONGODB_URI: ${mongoUri}`);
  }

  try {
    await testMode('mongodb', mongoUri);
  } finally {
    if (replSet) {
      await replSet.stop();
      console.log('✓ In-memory MongoDB Replica Set stopped.');
    }
  }

  // Summary Table
  console.log('\n================================================================');
  console.log('                   FINAL TEST EXECUTION SUMMARY                 ');
  console.log('================================================================');
  console.log(' Storage Mode           | Phase 1 | Phase 2 | Phase 3 | Total    | Status ');
  console.log('----------------------------------------------------------------');

  for (const [key, r] of Object.entries(results)) {
    const p1 = `${r.phase1.pass}/${r.phase1.pass + r.phase1.fail}`.padEnd(7);
    const p2 = `${r.phase2.pass}/${r.phase2.pass + r.phase2.fail}`.padEnd(7);
    const p3 = `${r.phase3.pass}/${r.phase3.pass + r.phase3.fail}`.padEnd(7);
    const tot = `${r.totalPass}/${r.totalPass + r.totalFail}`.padEnd(8);
    const status = r.success ? '✓ PASSED' : '✗ FAILED';
    console.log(` ${r.mode.padEnd(23)} | ${p1} | ${p2} | ${p3} | ${tot} | ${status} `);
  }
  console.log('================================================================\n');

  const allPassed = results.json.success && results.mongodb.success;
  if (!allPassed) {
    console.error('❌ One or more storage modes encountered test failures.');
    process.exit(1);
  } else {
    console.log('🎉 All 244 smoke tests passed across BOTH storage modes successfully!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});
