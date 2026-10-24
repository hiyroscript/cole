import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const walk = async (dir, prefix = "") =>
  (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map(async (f) =>
        f.isDirectory()
          ? walk(dir + "/" + f.name, prefix + f.name + "/")
          : [prefix + f.name],
      ),
    )
  ).flat();
const files = (await walk("dist")).filter((f) => f !== "sw.js");
const hash = createHash("sha256");
for (const f of files) hash.update(await readFile("dist/" + f));
const version = "varek-" + hash.digest("hex").slice(0, 12);
await writeFile(
  "dist/sw.js",
  `const CACHE=${JSON.stringify(version)};const BASE=new URL('./',self.location.href);const ASSETS=${JSON.stringify(files)}.map(f=>new URL(f,BASE).href);self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('varek-')&&k!==CACHE).map(k=>caches.delete(k))))));self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!e.request.url.startsWith(BASE.href))return;e.respondWith(caches.open(CACHE).then(async c=>{if(e.request.mode==='navigate'){const shell=await c.match(new URL('index.html',BASE).href);if(shell)return new Response(await shell.arrayBuffer(),{status:200,headers:shell.headers});}const cached=await c.match(e.request,{ignoreVary:true});if(cached)return cached;try{return await fetch(e.request);}catch(error){if(e.request.mode==='navigate'){const shell=await c.match(new URL('index.html',BASE).href);if(shell)return shell;}throw error;}}));});`,
);
console.log("Offline cache:", version, files.length, "assets");
