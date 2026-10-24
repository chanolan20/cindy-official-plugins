/**
 * Toolchain Probe — Cindy plugin (Manifest v3) exercising the bundled Node
 * worker path (authoring reference §4.12).
 *
 * Why a worker at all: the sandbox has no `child_process` and no filesystem.
 * Anything that must *run a real local CLI* goes to `node.entry`, a separate
 * committed file whose stdout is newline-delimited JSON-RPC. This file is the
 * sandbox entry and does no process work itself.
 *
 * Contract:
 *   Host   → { type: 'tool-call', tool, args, callId }
 *   Plugin → { type: 'tool-result', callId, ok: true, result }
 *          | { type: 'tool-result', callId, ok: false, errorCode, message }
 *   main.js → cindy.node.request({ method, params, timeoutMs })
 *              ⇒ { ok: true, result } | { ok: false, message }
 *
 * The worker has the OS user's permissions, not the sandbox's, so its surface
 * is deliberately tiny: two allowlisted names, fixed arguments, no shell.
 */

/* global cindy */

var METHODS = ['git', 'python3'];
var DEFAULT_METHODS = ['git', 'python3'];
var MAX_TOOLS = 2;
var REQUEST_TIMEOUT_MS = 15000;

var HINTS = {
  git: 'Install git: run `xcode-select --install` on macOS (Command Line Tools provide git without a full Xcode install), or use your platform package manager.',
  python3:
    'Install Python 3 and make sure `python3` is on PATH: python.org, Homebrew (`brew install python`), or the macOS Command Line Tools.'
};

function succeed(callId, result) {
  return cindy.send({ type: 'tool-result', callId: callId, ok: true, result: result });
}

function fail(callId, errorCode, message) {
  return cindy.send({
    type: 'tool-result',
    callId: callId,
    ok: false,
    errorCode: errorCode,
    message: message
  });
}

/** Validate arguments; returns { error } or { params }. */
function readArgs(args) {
  if (args.tools === undefined || args.tools === null) {
    return { params: { tools: DEFAULT_METHODS.slice() } };
  }
  if (!Array.isArray(args.tools)) {
    return {
      error: ['INVALID_ARGUMENT', '`tools` must be an array containing "git" and/or "python3" — or omit it to check both.']
    };
  }
  if (args.tools.length === 0) {
    return { error: ['INVALID_ARGUMENT', '`tools` was empty. Omit it to check both, or pass "git" and/or "python3".'] };
  }
  if (args.tools.length > MAX_TOOLS) {
    return { error: ['INVALID_ARGUMENT', '`tools` accepts at most ' + MAX_TOOLS + ' entries: "git" and "python3".'] };
  }

  var picked = [];
  for (var i = 0; i < args.tools.length; i += 1) {
    var name = args.tools[i];
    if (typeof name !== 'string' || METHODS.indexOf(name) === -1) {
      return {
        error: [
          'INVALID_ARGUMENT',
          'This plugin only knows where to look up ' + METHODS.join(' and ') + '. Remove any other value from `tools` — those commands are not part of its allowlist.'
        ]
      };
    }
    if (picked.indexOf(name) === -1) picked.push(name);
  }
  return { params: { tools: picked } };
}

/** Turn the worker's per-tool record into the shape the Agent reads. */
function describe(entry) {
  var name = entry && typeof entry.name === 'string' ? entry.name : '';
  var found = !!(entry && entry.found === true);
  return {
    name: name,
    found: found,
    version: found && typeof entry.version === 'string' ? entry.version : null,
    hint: found ? null : HINTS[name] || 'This command is not on PATH.'
  };
}

async function handleCheckToolchain(callId, args) {
  var parsed = readArgs(args);
  if (parsed.error) return fail(callId, parsed.error[0], parsed.error[1]);

  var response;
  try {
    response = await cindy.node.request({
      method: 'probe/versions',
      params: { tools: parsed.params.tools },
      timeoutMs: REQUEST_TIMEOUT_MS
    });
  } catch (error) {
    response = null;
  }

  if (!response || response.ok !== true) {
    return fail(
      callId,
      'NODE_REQUEST_FAILED',
      'The plugin\'s local worker did not answer, so nothing could be checked. This is a setup problem, not a missing tool: check that Toolchain Probe is enabled and its Node worker is running in Cindy, then retry.' +
        (response && response.message ? ' Worker said: ' + String(response.message).slice(0, 200) : '')
    );
  }

  var payload = response.result;
  if (!payload || !Array.isArray(payload.tools)) {
    return fail(
      callId,
      'NODE_REQUEST_FAILED',
      'The local worker replied with a shape this plugin cannot read. Retry once; if it repeats, reinstall Toolchain Probe.'
    );
  }

  var tools = payload.tools.map(describe);
  var missing = [];
  for (var i = 0; i < tools.length; i += 1) {
    if (!tools[i].found) missing.push(tools[i].name);
  }

  var runtime = payload.runtime && typeof payload.runtime === 'object' ? payload.runtime : {};

  return succeed(callId, {
    runtime: {
      node: typeof runtime.node === 'string' ? runtime.node : null,
      platform: typeof runtime.platform === 'string' ? runtime.platform : null,
      arch: typeof runtime.arch === 'string' ? runtime.arch : null
    },
    tools: tools,
    missing: missing,
    note: missing.length
      ? missing.join(', ') + ' not found on PATH. Follow the hint for that entry before starting work that needs it.'
      : null
  });
}

cindy.onHostMessage(async function (message) {
  if (!message || message.type !== 'tool-call') return;

  var callId = message.callId;
  if (typeof callId !== 'string' || callId === '') return;

  try {
    if (message.tool === 'check_toolchain') {
      return await handleCheckToolchain(callId, message.args || {});
    }
    return fail(
      callId,
      'UNKNOWN_TOOL',
      'This plugin version exposes only check_toolchain. Update the plugin, or call check_toolchain.'
    );
  } catch (error) {
    return fail(
      callId,
      'INTERNAL_ERROR',
      'Toolchain Probe stopped before finishing. Nothing was changed. Retry once; if it fails again, report the plugin version (1.0.0).'
    );
  }
});
