// Metro shim for Node.js builtin modules (node:crypto, node:stream, ...) that
// the AWS SDK v3 CJS builds require. These code paths (IMDS/SSO/file-profile
// credential providers, streaming checksums, event streams) are lazy and never
// execute in React Native: the app passes explicit credentials and plain
// request/response bodies, and @smithy/node-http-handler is replaced with a
// fetch-based handler in metro.config.js. The shim only needs to survive
// import-time destructuring; anything actually invoked throws loudly instead
// of failing obscurely at bundle time.
const unavailable = name => () => {
  throw new Error(`[metro-shim] ${name} is not available in React Native`);
};

module.exports = {
  // Used lazily by @smithy/core/serde; falls back to the global (polyfilled by
  // react-native-get-random-values) when the Node API is absent.
  getRandomValues: array => {
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      return globalThis.crypto.getRandomValues(array);
    }
    return unavailable('crypto.getRandomValues')(array);
  },
  createHash: unavailable('crypto.createHash'),
  createHmac: unavailable('crypto.createHmac'),

  Readable: class Readable {},
  Writable: class Writable {},
  PassThrough: class PassThrough {},
  ReadStream: class ReadStream {},
  Transform: class Transform {},
  pipeline: unavailable('stream.pipeline'),

  createReadStream: unavailable('fs.createReadStream'),
  lstatSync: unavailable('fs.lstatSync'),
  fstatSync: unavailable('fs.fstatSync'),
  readFile: unavailable('fs.readFile'),
  writeFile: unavailable('fs.writeFile'),

  homedir: () => '',
  tmpdir: () => '/tmp',

  // Node-style posix paths; enough for the profile/config lookups that use it.
  sep: '/',
  join: (...parts) => parts.filter(Boolean).join('/').replace(/\/+/g, '/'),
  dirname: p => (p || '').split('/').slice(0, -1).join('/') || '/',
  basename: p => (p || '').split('/').pop() || '',

  env: {},
  platform: 'browser',
  cwd: () => '/',
  argv: [],
  nextTick: cb => Promise.resolve().then(cb),

  inspect: String,
  promisify: fn => fn,
  inherits: () => {},

  request: unavailable('http.request'),
  get: unavailable('http.get'),
  createServer: unavailable('http.createServer'),

  execSync: unavailable('child_process.execSync'),
  spawn: unavailable('child_process.spawn'),

  gzipSync: unavailable('zlib.gzipSync'),
  gunzipSync: unavailable('zlib.gunzipSync'),
  crc32: unavailable('zlib.crc32'),
};
