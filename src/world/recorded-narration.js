// Sources start only on sync(), never from a late download/decode callback.
export function createRecordedNarration({context, destination, fetcher = globalThis.fetch,
 timeoutMs = 1800, maxDownloadBytes = 768 * 1024, maxCacheBytes = 8 * 1024 * 1024}) {
 const cache = new Map();
 let bytes = 0, generation = 0, pending = null, buffer = null, source = null;
 let startedAt = 0, startedOffset = 0, closed = false;
 function silence() {
  if (!source) return;
  const previous = source; source = null; previous.onended = null;
  try { previous.stop(); } catch {}
  previous.disconnect();
 }
 function stop() {
  generation++; pending?.cancel(); pending = null; buffer = null; silence();
 }
 async function prepare(clip) {
  stop();
  if (closed || !clip?.src || !context.decodeAudioData) return false;
  const token = generation;
  if (cache.has(clip.src)) {
   const cached = cache.get(clip.src); cache.delete(clip.src); cache.set(clip.src, cached);
   buffer = cached; return true;
  }
  const controller = new AbortController();
  let timer, cancel;
  const deadline = new Promise(resolve => { cancel = () => { controller.abort(); resolve(null); }; timer = setTimeout(cancel, timeoutMs); });
  pending = {cancel};
  const work = (async () => {
   const response = await fetcher(clip.src, {signal: controller.signal});
   if (!response.ok || Number(response.headers?.get('content-length')) > maxDownloadBytes) throw Error('narration unavailable');
   // Stream with a hard byte cap, including responses without Content-Length.
   const reader = response.body.getReader(), chunks = []; let size = 0;
   try {
    while (true) {
     const {done, value} = await reader.read(); if (done) break;
     size += value.byteLength;
     if (size > maxDownloadBytes || controller.signal.aborted) throw Error('narration cancelled');
     chunks.push(value);
    }
   } finally { if (controller.signal.aborted || size > maxDownloadBytes) await reader.cancel().catch(() => {}); reader.releaseLock(); }
   const data = new Uint8Array(size); let offset = 0;
   for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
   if (controller.signal.aborted || token !== generation) return null;
   return context.decodeAudioData(data.buffer);
  })().catch(() => null);
  const decoded = await Promise.race([work, deadline]); clearTimeout(timer);
  if (token !== generation || closed) return false;
  pending = null;
  if (!decoded || controller.signal.aborted) { controller.abort(); return false; }
  const size = decoded.length * decoded.numberOfChannels * 4;
  if (!Number.isFinite(size) || size > maxCacheBytes) return false;
  while (bytes + size > maxCacheBytes && cache.size) {
   const [key, old] = cache.entries().next().value; bytes -= old.length * old.numberOfChannels * 4; cache.delete(key);
  }
  cache.set(clip.src, decoded); bytes += size; buffer = decoded; return true;
 }
 function sync(elapsedMs, paused) {
  const offset = Math.max(0, elapsedMs / 1000);
  if (closed || paused || !buffer || offset >= buffer.duration || context.state !== 'running') { silence(); return false; }
  if (source && Math.abs(startedOffset + context.currentTime - startedAt - offset) <= .25) return true;
  silence();
  const node = context.createBufferSource(); node.buffer = buffer; node.connect(destination);
  startedAt = context.currentTime; startedOffset = offset; source = node;
  node.onended = () => { if (source === node) { source = null; node.disconnect(); } };
  try { node.start(0, offset); return true; } catch { silence(); return false; }
 }
 return {prepare, sync, stop, clear() { stop(); cache.clear(); bytes = 0; },
  close() { stop(); closed = true; cache.clear(); bytes = 0; },
  diagnostics: () => ({cacheBytes: bytes, cached: cache.size, playing: !!source, pending: !!pending}),
 };
}
