import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const revision = 'b8ec280';

function source(path) {
  return execFileSync('git', ['show', revision + ':' + path], {
    cwd: root,
    encoding: 'utf8'
  });
}

function capture(path, name) {
  const context = vm.createContext({window: {}});
  vm.runInContext(source(path), context, {filename: path});
  if (context.window[name] == null) {
    throw new Error('baseline global missing: ' + name);
  }
  return JSON.parse(JSON.stringify(context.window[name]));
}

const fixture = {
  revision,
  CutsceneV2Data: capture('src/cutscene-v2.data.js', 'CutsceneV2Data'),
  LiberPrompts: capture('data/prompts.data.js', 'LiberPrompts'),
  warningHtml: source('index.html').match(
    /<div class="boot-letter" id="boot-letter">([\s\S]*?)<\/div>/
  )?.[1]
};
if (!fixture.warningHtml) throw new Error('baseline warning not found');

await fs.mkdir(new URL('./fixtures/', import.meta.url), {recursive: true});
await fs.writeFile(
  new URL('./fixtures/baseline.json', import.meta.url),
  JSON.stringify(fixture, null, 2) + '\n'
);
