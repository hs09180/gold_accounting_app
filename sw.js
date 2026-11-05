const CACHE='zarnigar-v5';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.all(ASSETS.map(async asset=>{
    try{const response=await fetch(asset,{cache:'reload'});if(response.ok)await cache.put(asset,response)}catch(error){/* keep installation resilient when an optional asset is unavailable */}
  }));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('zarnigar-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    try{
      const response=await fetch(event.request);
      if(response.ok&&new URL(event.request.url).origin===self.location.origin){
        const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }catch(error){return caches.match('./index.html')}
  })());
});