const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const root = path.resolve(option('--root') || path.join(process.env.LOCALAPPDATA, 'CodexDreamSkin'));
const renderer = path.join(root, 'engine/assets/renderer-inject.js');
const patch = require('./runtime/patch.json');
const id = 'custom-wisteria-alchemy-shop';
const source = path.join(__dirname, id);

function once(text, anchor, replacement) {
  if (text.split(anchor).length !== 2) throw new Error(`Unsupported renderer anchor: ${anchor}`);
  return text.replace(anchor, replacement);
}

function buildRenderer(text) {
  // Replace our previously installed blocks without duplicating them.
  const start = text.indexOf('  // Local wisteria sidebar:');
  if (start >= 0) {
    const end = text.indexOf('  // Cache structural', start);
    if (end < 0) throw new Error('Incomplete previous patch');
    text = text.slice(0, start) + text.slice(end);
  }
  const binding = text.indexOf('  // Bind the actual menu row');
  if (binding >= 0) {
    const end = text.indexOf('  const ensure =', binding);
    if (end < 0) throw new Error('Incomplete previous binding');
    text = text.slice(0, binding) + text.slice(end);
    text = once(text, '    bindWisteriaTopbar();\n', '');
  }
  const cleanup = text.indexOf('    for (const row of document.querySelectorAll("[data-ds-wisteria-topbar]"))');
  if (cleanup >= 0) {
    const end = text.indexOf('    removeParts();', cleanup);
    if (end < 0) throw new Error('Incomplete previous cleanup');
    text = text.slice(0, cleanup) + text.slice(end);
  }
  text = once(text, '  // Cache structural', patch.css + '  // Cache structural');
  text = once(text, '  const ensure =', patch.binding + '  const ensure =');
  text = once(text, '    metrics.ensureCalls += 1;', '    metrics.ensureCalls += 1;\n    bindWisteriaTopbar();');
  text = once(text, '    removeParts();', patch.cleanup + '    removeParts();');
  new vm.Script(text, {filename: 'renderer-inject.js'});
  return text;
}

function main() {
  if (option('--restore')) {
    const backup = path.resolve(option('--restore'));
    const manifest = JSON.parse(fs.readFileSync(path.join(backup, 'manifest.json'), 'utf8'));
    if (path.resolve(manifest.root) !== root) throw new Error('Backup belongs to another installation');
    for (const [i, entry] of manifest.files.entries()) {
      const target = path.resolve(root, entry.relative);
      if (!target.startsWith(root + path.sep)) throw new Error('Invalid backup path');
      if (entry.existed) fs.copyFileSync(path.join(backup, `${i}.bak`), target);
      else if (fs.existsSync(target)) fs.unlinkSync(target);
    }
    // A source change makes the running injector reload the restored renderer.
    const css = path.join(root, 'active-theme/theme.css');
    if (fs.existsSync(css)) fs.appendFileSync(css, '\n');
    console.log('Restored backup:', backup);
    return;
  }
  const version = fs.readFileSync(path.join(root, 'engine/VERSION'), 'utf8').trim();
  if (version !== patch.engineVersion) throw new Error(`Requires Dream Skin ${patch.engineVersion}; found ${version}`);
  const updated = buildRenderer(fs.readFileSync(renderer, 'utf8').replace(/\r\n/g, '\n'));
  const theme = JSON.parse(fs.readFileSync(path.join(source, 'theme.json'), 'utf8'));
  if (theme.id !== id || path.basename(theme.image) !== theme.image) throw new Error('Invalid theme package');
  const validation = cp.spawnSync(process.execPath, [path.join(root, 'engine/scripts/validate-safe-css-file.mjs'), path.join(source, 'theme.css')], {encoding: 'utf8'});
  if (validation.status !== 0) throw new Error(validation.stderr || validation.stdout || 'Safe CSS validation failed');
  const preferencesPath = path.join(root, 'theme-preferences.json');
  const preferences = fs.existsSync(preferencesPath) ? JSON.parse(fs.readFileSync(preferencesPath, 'utf8')) : {schemaVersion: 1, themes: {}};
  preferences.themes ||= {};
  preferences.themes[id] = {...preferences.themes[id], transparency: 84};
  const files = [{target: renderer, bytes: Buffer.from(updated)}];
  for (const folder of ['active-theme', `themes/${id}`]) {
    for (const name of ['theme.json', theme.image, 'theme.css']) {
      files.push({target: path.join(root, folder, name), bytes: fs.readFileSync(path.join(source, name))});
    }
  }
  files.push({target: preferencesPath, bytes: Buffer.from(JSON.stringify(preferences) + '\n')});
  // Ensure reapplying also changes the active source fingerprint.
  const activeCss = files.find(f => f.target === path.join(root, 'active-theme/theme.css'));
  if (fs.existsSync(activeCss.target) && fs.readFileSync(activeCss.target).equals(activeCss.bytes)) {
    activeCss.bytes = Buffer.concat([activeCss.bytes, Buffer.from('\n')]);
  }
  if (args.includes('--check')) {
    console.log(`Validated ${files.length} files; no changes written.`);
    return;
  }
  const backup = path.join(root, 'skin-backups', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backup, {recursive: true});
  const manifest = {root, files: []};
  for (const [i, file] of files.entries()) {
    const existed = fs.existsSync(file.target);
    manifest.files.push({relative: path.relative(root, file.target), existed});
    if (existed) fs.copyFileSync(file.target, path.join(backup, `${i}.bak`));
  }
  fs.writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify(manifest, null, 2));
  // Write the active CSS last so the reload sees all updated files.
  for (const file of [...files.filter(f => f !== activeCss), activeCss]) {
    fs.mkdirSync(path.dirname(file.target), {recursive: true});
    fs.writeFileSync(file.target, file.bytes);
  }
  console.log('Installed theme and renderer patch. Backup:', backup);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {buildRenderer};
