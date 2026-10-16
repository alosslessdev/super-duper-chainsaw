// Metro shim: @smithy/node-http-handler targets Node.js (require("node:https"),
// node:http2, node:stream), which do not exist in React Native, so importing
// @aws-sdk/client-s3 fails at bundle time. Route it to the fetch-based handler
// instead — RN provides a global fetch.
const { FetchHttpHandler } = require('@smithy/fetch-http-handler');

class NodeHttpHandler extends FetchHttpHandler {}

// Collects a web ReadableStream (or an already-buffered body) into bytes.
// Only used by the SDK to drain response bodies; PutObject responses are
// empty, so this is a safety net, not a hot path.
async function streamCollector(stream) {
  if (!stream) return new Uint8Array(0);
  if (stream instanceof Uint8Array) return stream;
  if (typeof stream.getReader !== 'function') return stream;
  const reader = stream.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

module.exports = { NodeHttpHandler, streamCollector };
