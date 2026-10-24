/**
 * Toolchain Probe — bundled Node worker (`node.entry`).
 *
 * Rules this file follows (authoring reference §4.12):
 *   - stdout carries newline-delimited JSON-RPC and nothing else. Diagnostics go
 *     to stderr, because a stray stdout line is a protocol violation, not a log.
 *   - there is no `cindy` object and no Electron IPC here: data goes back to
 *     main.js, and the Host performs anything privileged.
 *   - commands are fixed. No shell, no interpolation, no user-controlled argv,
 *     and an allowlist of exactly two names. This process runs with the real
 *     OS user's permissions, so the surface stays as small as the job.
 */

'use strict';

const readline = require('node:readline');
const { execFile } = require('node:child_process');

/** name → { file, args }. Anything not in here is refused, never executed. */
const ALLOWLIST = {
  git: { file: 'git', args: ['--version'] },
  python3: { file: 'python3', args: ['--version'] }
};

const EXEC_TIMEOUT_MS = 5000;

function reply(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function log(text) {
  process.stderr.write('[toolchain-probe] ' + text + '\n');
}

function rpcError(id, code, message) {
  reply({ jsonrpc: '2.0', id: id === undefined ? null : id, error: { code: code, message: message } });
}

/** One fixed command, first non-empty line only. */
function runVersion(name) {
  return new Promise((resolve, reject) => {
    const spec = ALLOWLIST[name];
    if (!spec) {
      resolve({ name: name, found: false, version: null });
      return;
    }
    execFile(
      spec.file,
      spec.args,
      { timeout: EXEC_TIMEOUT_MS, shell: false, windowsHide: true, maxBuffer: 64 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          if (error.code === 'ENOENT') {
            // Missing is an answer, not a failure: found:false reaches the Agent
            // with an install hint instead of a stack-shaped error.
            resolve({ name: name, found: false, version: null });
            return;
          }
          log(name + ' failed: ' + (error.code || error.message));
          reject(new Error(String(name) + ' could not be run (' + (error.code || 'exec error') + ')'));
          return;
        }
        const text = String(stdout || stderr || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)[0];
        resolve({ name: name, found: true, version: text ? text.slice(0, 120) : null });
      }
    );
  });
}

async function handleProbeVersions(id, params) {
  const requested = params && Array.isArray(params.tools) ? params.tools : [];
  if (requested.length === 0) {
    rpcError(id, -32602, 'Invalid params: `tools` must name at least one allowlisted command');
    return;
  }

  const tools = [];
  for (const name of requested) {
    if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(ALLOWLIST, name)) {
      rpcError(id, -32602, 'Invalid params: only git and python3 are allowlisted');
      return;
    }
    tools.push(await runVersion(name));
  }

  reply({
    jsonrpc: '2.0',
    id: id,
    result: {
      runtime: { node: process.versions.node, platform: process.platform, arch: process.arch },
      tools: tools
    }
  });
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;

  let request;
  try {
    request = JSON.parse(line);
  } catch (error) {
    reply({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }

  if (!request || typeof request !== 'object') {
    reply({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }
  // Notifications get no reply, per JSON-RPC.
  if (request.id === undefined) return;

  if (request.method !== 'probe/versions') {
    rpcError(request.id, -32601, 'Method not found');
    return;
  }

  handleProbeVersions(request.id, request.params).catch((error) => {
    rpcError(request.id, -32000, error && error.message ? error.message : 'Worker command failed');
  });
});

log('ready');
