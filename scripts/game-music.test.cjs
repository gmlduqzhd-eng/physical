const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('game BGM follows bounded volume and releases the previous track', () => {
  const gains = [], intervals = new Set();
  class AudioContext {
    state = 'running';
    destination = {};
    createGain() {
      const node = { gain: { value: 0 }, connect() {}, disconnect() { this.disconnected = true; } };
      gains.push(node);
      return node;
    }
  }
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/application/soundEffects.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, window: { AudioContext },
    setInterval() { const id = {}; intervals.add(id); return id; },
    clearInterval(id) { intervals.delete(id); },
  });
  for (const [input, expected] of [[0.175, 0.06], [0, 0], [0.5, 0.06 * 0.5 / 0.175], [-1, 0], [2, 0.06 / 0.175], [NaN, 0.06]]) {
    const previous = gains.at(-1);
    exports.startBgm(input);
    assert.equal(gains.at(-1).gain.value, expected);
    assert.equal(intervals.size, 1, 'volume changes never overlap tracks');
    if (previous) assert.equal(previous.disconnected, true);
  }
  exports.stopBgm();
  assert.equal(intervals.size, 0);
  assert.equal(gains.at(-1).disconnected, true);
  assert.equal(exports.isBgmPlaying(), false);
});
