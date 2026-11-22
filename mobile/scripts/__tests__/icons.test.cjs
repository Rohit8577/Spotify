/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const { parse } = require('@babel/parser');
const { PNG } = require('pngjs');

const projectRoot = path.resolve(__dirname, '../..');
const sourcesPath = path.join(projectRoot, 'src/theme/iconSources.js');
const glyphMap = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');

function loadModule(file, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, 'Unexpected dependency: ' + name);
      return dependencies[name];
    },
  }, { filename: file });
  return exports;
}

const assetDependencies = Object.fromEntries(
  [...fs.readFileSync(sourcesPath, 'utf8').matchAll(/require\('([^']+)'\)/g)].map(([, relative]) =>
    [relative, { uri: path.resolve(path.dirname(sourcesPath), relative) }])
);
const { iconSources } = loadModule(sourcesPath, assetDependencies);

function collectUsedNames(node, names, insideName = false) {
  if (!node || typeof node !== 'object') return;
  const isName = insideName || (node.type === 'JSXAttribute' && node.name.name === 'name');
  if (isName && node.type === 'StringLiteral' && node.value in glyphMap) names.add(node.value);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'extra'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((item) => collectUsedNames(item, names, isName));
    else if (value && typeof value === 'object') collectUsedNames(value, names, isName);
  }
}

test('all icon states used by app controls have visible, unclipped PNG assets', () => {
  const names = new Set();
  const sourceRoot = path.join(projectRoot, 'src');
  for (const file of fs.readdirSync(sourceRoot, { recursive: true }).filter((file) => file.endsWith('.js'))) {
    collectUsedNames(parse(fs.readFileSync(path.join(sourceRoot, file), 'utf8'), { sourceType: 'module', plugins: ['jsx'] }), names);
  }
  assert.ok(names.size > 0);
  for (const name of names) {
    assert.ok(iconSources[name], 'Missing icon state: ' + name);
    const png = PNG.sync.read(fs.readFileSync(iconSources[name].uri));
    let pixels = 0;
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
      if (!png.data[(y * png.width + x) * 4 + 3]) continue;
      pixels++;
      assert.ok(x > 0 && y > 0 && x < png.width - 1 && y < png.height - 1, name + ' is clipped');
    }
    assert.ok(pixels > 0, name + ' is blank');
  }
});

test('native startup and every icon render while font modules are unavailable', () => {
  function NativeImage({ source, style, testID }) {
    return React.createElement('img', { src: source.uri, width: style[0].width, height: style[0].height, 'data-testid': testID });
  }
  const { Ionicons } = loadModule(path.join(projectRoot, 'src/components/Icon.js'), {
    react: React,
    'react-native': { Image: NativeImage },
    '../theme/iconSources': { iconSources },
  });
  const { AppStartup } = loadModule(path.join(projectRoot, 'src/components/AppStartup.js'), {
    react: React,
    'expo-splash-screen': { hideAsync: () => Promise.resolve() },
  });
  const controls = Object.keys(iconSources).map((name) => React.createElement(Ionicons, { key: name, name, size: 24, color: '#00E5FF' }));
  const html = renderToStaticMarkup(React.createElement(AppStartup, null, controls));
  assert.equal((html.match(/<img /g) || []).length, Object.keys(iconSources).length);
  assert.ok(!html.includes('font-family'));
  const liked = Ionicons({ name: 'heart', size: 22, color: '#00E5FF', style: { marginLeft: 2 } });
  const unliked = Ionicons({ name: 'heart-outline', size: 22, color: '#FFFFFF' });
  assert.notEqual(liked.props.source.uri, unliked.props.source.uri);
  assert.equal(liked.props.tintColor, '#00E5FF');
  assert.equal(unliked.props.tintColor, '#FFFFFF');
  assert.equal(liked.props.style[0].width, 22);
  assert.equal(liked.props.style[1].marginLeft, 2);
});
