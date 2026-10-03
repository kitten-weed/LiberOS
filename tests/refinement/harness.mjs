import fs from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);

export const plain = value => JSON.parse(JSON.stringify(value));

export function makeRealm(initial = {}) {
  const values = new Map(Object.entries(initial));
  const handlers = new Map();
  const storage = {
    deny: () => false,
    attempts: [],
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      this.attempts.push(key);
      if (this.deny(key)) throw new Error('synthetic storage rejection');
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
  const document = {
    readyState: 'loading',
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement(tag) {
      if (tag !== 'canvas') throw new Error('provide a DOM fixture for ' + tag);
      return {
        width: 0,
        height: 0,
        getContext: () => ({drawImage() {}}),
        toDataURL: () => 'data:image/png;base64,c3ludGhldGlj'
      };
    },
    addEventListener() {},
    removeEventListener() {}
  };
  const window = {
    document,
    localStorage: storage,
    location: {pathname: '/desktop.html', reload() {}},
    addEventListener(name, fn) {
      handlers.set(name, fn);
    }
  };
  window.parent = window;
  const context = vm.createContext({
    window,
    document,
    localStorage: storage,
    console,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    URL,
    performance
  });
  return {context, window, storage, handlers, modules: new Map()};
}

export async function runClassic(file, realm, options = {}) {
  const url = new URL(file, root);
  const source = await fs.readFile(url, 'utf8');
  vm.runInContext(source, realm.context, {filename: file, ...options});
}

export async function loadModule(file, realm) {
  function moduleAt(url) {
    if (url.protocol !== 'file:' || !url.href.startsWith(root.href)) {
      throw new Error('test import outside project');
    }
    if (realm.modules.has(url.href)) return realm.modules.get(url.href);
    const pending = fs.readFile(fileURLToPath(url), 'utf8').then(source =>
      new vm.SourceTextModule(source, {
        context: realm.context,
        identifier: url.href
      })
    );
    realm.modules.set(url.href, pending);
    return pending;
  }

  const mod = await moduleAt(new URL(file, root));
  if (mod.status === 'unlinked') {
    await mod.link((specifier, ref) => moduleAt(new URL(specifier, ref.identifier)));
  }
  if (mod.status === 'linked') await mod.evaluate();
  return mod.namespace;
}
