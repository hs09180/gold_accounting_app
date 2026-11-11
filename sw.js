const CACHE='zarnigar-v21';
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
  const requestUrl=new URL(event.request.url);
  const isAppDocument=event.request.mode==='navigate'||requestUrl.pathname.endsWith('/index.html');
  event.respondWith((async()=>{
    if(isAppDocument){
      try{
        const fresh=await fetch(event.request,{cache:'no-store'});
        if(fresh.ok){const copy=fresh.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy))}
        return fresh;
      }catch(error){return (await caches.match(event.request))||(await caches.match('./index.html'))}
    }
    const cached=await caches.match(event.request);
    if(cached)return cached;
    try{
      const response=await fetch(event.request);
      if(response.ok&&requestUrl.origin===self.location.origin){
        const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }catch(error){return caches.match('./index.html')}
  })());
});