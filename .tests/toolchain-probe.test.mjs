/**
 * Contract tests for Toolchain Probe.
 *
 * Two halves, because this plugin has two processes:
 *   1. main.js in the sandbox — mocked `cindy.node.request`, asserting that a
 *      missing tool is a *result* and a dead worker is an *error*.
 *   2. node/worker.cjs — spawned for real, spoken to over stdio, so the
 *      JSON-RPC framing, the allowlist and the stdout purity are tested against
 *      the same file the Host will run, not a re-implementation.
 *
 * Run: node --test test/contract.test.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN = join(HERE, '..', 'toolchain-probe');
const SOURCE = readFileSync(join(PLUGIN, 'main.js'), 'utf8');
const WORKER_SOURCE = readFileSync(join(PLUGIN, 'node', 'worker.cjs'), 'utf8');
const MANIFEST = JSON.parse(readFileSync(join(PLUGIN, 'ghost.json'), 'utf8'));

/* ------------------------------------------------------------------ */
/* 1. manifest declares a real worker file                             */
/* ------------------------------------------------------------------ */

test('the manifest points at a worker file that exists', () => {
  assert.equal(MANIFEST.node.protocol, 'json-rpc-stdio');
  assert.equal(MANIFEST.node.lifecycle, 'on-demand');
  assert.ok(existsSync(join(PLUGIN, MANIFEST.node.entry)), 'node.entry must be a committed file');
  assert.notEqual(MANIFEST.node.entry, MANIFEST.entry, 'node.entry must differ from the sandbox entry');
  assert.equal(MANIFEST.tools[0].name, 'check_toolchain');
});

/* ------------------------------------------------------------------ */
/* 2. sandbox half, with the worker mocked                              */
/* ------------------------------------------------------------------ */

/** Boot main.js with a mocked cindy.node.request; returns the captured surface. */
function boot(requestImpl = async () => ({ ok: true, result: { runtime: {}, tools: [] } })) {
  const host = { handler: null, sent: [], requests: [] };

  const cindy = {
    onHostMessage(fn) {
      host.handler = fn;
    },
    async send(message) {
      host.sent.push(message);
    },
    node: {
      async request(options) {
        host.requests.push(options);
        return requestImpl(options);
      }
    }
  };

  vm.runInNewContext(SOURCE, { cindy, console, Date }, { filename: 'main.js' });
  assert.equal(typeof host.handler, 'function');
  return host;
}

async function call(host, args = {}, tool = 'check_toolchain') {
  await host.handler({ type: 'tool-call', callId: 'call-1', tool, args });
  return JSON.parse(JSON.stringify(host.sent));
}

function workerReply(tools) {
  return async () => ({ ok: true, result: { runtime: { node: '22.0.0', platform: 'darwin', arch: 'arm64' }, tools } });
}

test('a present tool is reported with its version and no hint', async () => {
  const host = boot(workerReply([{ name: 'git', found: true, version: 'git version 2.39.5' }]));
  const [sent] = await call(host, { tools: ['git'] });

  assert.equal(sent.ok, true);
  assert.equal(sent.result.tools[0].found, true);
  assert.equal(sent.result.tools[0].version, 'git version 2.39.5');
  assert.equal(sent.result.tools[0].hint, null);
  assert.deepEqual(sent.result.missing, []);
  assert.equal(sent.result.note, null);
  assert.equal(sent.result.runtime.node, '22.0.0');
});

test('a missing tool is a successful result with an actionable hint', async () => {
  const host = boot(workerReply([{ name: 'python3', found: false, version: null }]));
  const [sent] = await call(host, { tools: ['python3'] });

  assert.equal(sent.ok, true, 'absence must not be an error');
  assert.equal(sent.result.tools[0].found, false);
  assert.deepEqual(sent.result.missing, ['python3']);
  assert.match(sent.result.tools[0].hint, /python3/i);
  assert.match(sent.result.tools[0].hint, /PATH|install/i);
  assert.match(sent.result.note, /python3/);
});

test('a dead worker is NODE_REQUEST_FAILED and says nothing changed', async () => {
  const host = boot(async () => ({ ok: false, message: 'worker exited' }));
  const [sent] = await call(host);

  assert.equal(sent.ok, false);
  assert.equal(sent.errorCode, 'NODE_REQUEST_FAILED');
  assert.match(sent.message, /worker exited/);
  assert.doesNotMatch(sent.message, /\n\s+at /, 'no stack traces reach the Agent');
});

test('a thrown request is caught rather than escaping the handler', async () => {
  const host = boot(async () => {
    throw new Error('ipc closed');
  });
  const [sent] = await call(host);

  assert.equal(sent.ok, false);
  assert.equal(sent.errorCode, 'NODE_REQUEST_FAILED');
});

test('the request is bounded: 15s timeout, fixed method, allowlisted params', async () => {
  const host = boot(workerReply([{ name: 'git', found: true, version: 'git version 2.39.5' }]));
  await call(host);

  const [request] = host.requests;
  assert.equal(request.method, 'probe/versions');
  assert.ok(request.timeoutMs >= 1000 && request.timeoutMs <= 120000);
  // Spread into this realm: arrays built inside vm.runInNewContext have a
  // different Array prototype, which deepStrictEqual rejects.
  assert.deepEqual([...request.params.tools], ['git', 'python3']);
});

test('arguments outside the allowlist are refused before the worker runs', async () => {
  const cases = [
    [{ tools: 'git' }, /must be an array/],
    [{ tools: [] }, /was empty/],
    [{ tools: ['git', 'python3', 'git'] }, /at most 2/],
    [{ tools: ['rm'] }, /only knows where to look up/],
    [{ tools: ['git; rm -rf /'] }, /only knows where to look up/]
  ];

  for (const [args, pattern] of cases) {
    const host = boot();
    const [sent] = await call(host, args);
    assert.equal(sent.ok, false, JSON.stringify(args));
    assert.equal(sent.errorCode, 'INVALID_ARGUMENT');
    assert.match(sent.message, pattern);
    assert.equal(host.requests.length, 0, 'nothing is executed for an invalid argument');
  }
});

test('duplicate names are collapsed, not passed through twice', async () => {
  const host = boot(workerReply([{ name: 'git', found: true, version: 'git version 2.39.5' }]));
  await call(host, { tools: ['git', 'git'] });
  assert.deepEqual([...host.requests[0].params.tools], ['git']);
});

test('an unknown tool gets an actionable UNKNOWN_TOOL, not silence', async () => {
  const host = boot();
  const [sent] = await call(host, {}, 'run_shell');
  assert.equal(sent.ok, false);
  assert.equal(sent.errorCode, 'UNKNOWN_TOOL');
  assert.match(sent.message, /check_toolchain/);
});

test('a malformed worker payload is an error, not a silent empty success', async () => {
  const host = boot(async () => ({ ok: true, result: { runtime: {} } }));
  const [sent] = await call(host);
  assert.equal(sent.ok, false);
  assert.equal(sent.errorCode, 'NODE_REQUEST_FAILED');
});

/* ------------------------------------------------------------------ */
/* 3. the worker itself, spawned for real                              */
/* ------------------------------------------------------------------ */

function openWorker(env = process.env) {
  const child = spawn(process.execPath, [join(PLUGIN, 'node', 'worker.cjs')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env
  });
  const state = { lines: [], stderr: '', waiters: new Map(), badLine: null };

  let buffer = '';
  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let index;
    while ((index = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (!line.trim()) continue;
      state.lines.push(line);
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        state.badLine = line;
        continue;
      }
      const waiter = state.waiters.get(parsed.id);
      if (waiter) {
        state.waiters.delete(parsed.id);
        waiter(parsed);
      }
    }
  });
  child.stderr.on('data', (chunk) => {
    state.stderr += chunk.toString('utf8');
  });

  state.send = (payload, id) =>
    new Promise((resolve, reject) => {
      const line = (typeof payload === 'string' ? payload : JSON.stringify(payload)) + '\n';
      if (id === undefined) {
        // A notification: write it and expect silence.
        child.stdin.write(line);
        resolve(undefined);
        return;
      }
      const timer = setTimeout(() => reject(new Error(`no reply for id ${id}`)), 8000);
      state.waiters.set(id, (message) => {
        clearTimeout(timer);
        resolve(message);
      });
      child.stdin.write(line);
    });

  state.close = () =>
    new Promise((resolve) => {
      child.on('exit', resolve);
      child.stdin.end();
    });

  return state;
}

test('the worker answers probe/versions over real stdio', async () => {
  const worker = openWorker();
  try {
    const reply = await worker.send({ jsonrpc: '2.0', id: 1, method: 'probe/versions', params: { tools: ['git'] } }, 1);

    assert.equal(reply.jsonrpc, '2.0');
    assert.equal(reply.id, 1);
    assert.equal(reply.error, undefined);
    assert.match(reply.result.runtime.node, /^\d+\./);
    assert.equal(reply.result.tools.length, 1);
    assert.equal(reply.result.tools[0].name, 'git');
    assert.equal(typeof reply.result.tools[0].found, 'boolean');
    if (reply.result.tools[0].found) {
      assert.match(reply.result.tools[0].version, /^git version \d/);
    }
  } finally {
    await worker.close();
  }
}, 15000);

test('a missing binary is found:false, not a JSON-RPC error', async () => {
  // Empty PATH: ENOENT is guaranteed for an allowlisted name, which is the
  // branch that must answer rather than throw.
  const worker = openWorker({ PATH: '/nonexistent', HOME: process.env.HOME || '' });
  try {
    const reply = await worker.send({ jsonrpc: '2.0', id: 2, method: 'probe/versions', params: { tools: ['git'] } }, 2);
    assert.equal(reply.error, undefined, 'absence is a result, not an RPC error');
    assert.deepEqual(reply.result.tools, [{ name: 'git', found: false, version: null }]);
  } finally {
    await worker.close();
  }
}, 15000);

test('the worker keeps JSON-RPC error codes honest', async () => {
  const worker = openWorker();
  try {
    const unknown = await worker.send({ jsonrpc: '2.0', id: 3, method: 'shell/exec' }, 3);
    assert.equal(unknown.error.code, -32601);

    const badParams = await worker.send({ jsonrpc: '2.0', id: 4, method: 'probe/versions', params: { tools: ['rm'] } }, 4);
    assert.equal(badParams.error.code, -32602);

    const empty = await worker.send({ jsonrpc: '2.0', id: 5, method: 'probe/versions', params: {} }, 5);
    assert.equal(empty.error.code, -32602);

    const parseError = await worker.send('{not json', null);
    assert.equal(parseError.error.code, -32700);
    assert.equal(parseError.id, null);
  } finally {
    await worker.close();
  }
}, 15000);

test('notifications get no reply, and stdout carries only JSON-RPC', async () => {
  const worker = openWorker();
  try {
    const before = worker.lines.length;
    worker.send({ jsonrpc: '2.0', method: 'probe/versions', params: { tools: ['git'] } });
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal(worker.lines.length, before, 'a notification must not produce a reply');

    await worker.send({ jsonrpc: '2.0', id: 9, method: 'probe/versions', params: { tools: ['git'] } }, 9);
    assert.equal(worker.badLine, null, 'every stdout line must parse as JSON');
    for (const line of worker.lines) {
      const parsed = JSON.parse(line);
      assert.equal(parsed.jsonrpc, '2.0');
    }
    assert.match(worker.stderr, /ready/, 'diagnostics belong on stderr');
  } finally {
    await worker.close();
  }
}, 15000);

test('the worker cannot be talked into a shell or an arbitrary binary', () => {
  assert.match(WORKER_SOURCE, /shell:\s*false/);
  assert.doesNotMatch(WORKER_SOURCE, /\bexec(Sync)?\s*\(/, 'no shell-string exec');
  assert.doesNotMatch(WORKER_SOURCE, /execFile\([^)]*\+/, 'no argv built from string concatenation');
  assert.doesNotMatch(WORKER_SOURCE, /process\.execPath/, 'the Host bridge owns bundled Node');
  // Match *use*, not the word in a comment: naming the rule is how the next
  // reader learns it, so a header comment saying "no `cindy` object" stays legal.
  assert.doesNotMatch(WORKER_SOURCE, /\bcindy\.\w+/, 'workers have no cindy object');

  const allowlisted = [...WORKER_SOURCE.matchAll(/^\s{2}(\w+):\s*\{\s*file:\s*'([^']+)'/gm)].map((m) => m[2]);
  assert.deepEqual(allowlisted.sort(), ['git', 'python3']);
});
