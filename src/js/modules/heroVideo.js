import { $, onReady } from "../utils/dom.js";
export function setupHeroVideo(){
  onReady(() => {
    const video = $('#heroVideo');
    if(!video) return;
    let sourcesAttached = false;
    function attachSourcesOnce(){
      if (sourcesAttached) return;
      const webm = video.dataset.srcWebm, mp4 = video.dataset.srcMp4;
      if (webm) { const s = document.createElement('source'); s.src = webm; s.type='video/webm'; video.appendChild(s); }
      if (mp4)  { const s2= document.createElement('source'); s2.src= mp4;  s2.type='video/mp4';  video.appendChild(s2); }
      sourcesAttached = true; video.load();
    }
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if (e.isIntersecting && e.intersectionRatio >= .4) {
          attachSourcesOnce();
          video.muted = true; video.setAttribute('playsinline','');
          video.play().catch(()=>{});
        } else { try{ video.pause(); }catch{} }
      });
    }, { threshold:[0,.4,.6,1]});
    const hv = $('.hero-viewport');
    if (hv) io.observe(hv);
    document.addEventListener('visibilitychange', ()=>{ if (document.hidden) try{video.pause()}catch{}; });
    video.addEventListener('canplay', ()=>{ if(!document.hidden) video.play().catch(()=>{}); }, {once:true});
  });
}
export function mountHeroVisibility(){
  const v = document.getElementById('heroVideo');
  if(!('IntersectionObserver' in window) || !v) return;
  const io = new IntersectionObserver((entries)=>{
    const e = entries[0];
    if(!e) return;
    if(e.isIntersecting){
      if(v.paused && v.autoplay!==false){ v.play().catch(()=>{}); }
    }else{
      if(!v.paused){ v.pause(); }
    }
  }, {threshold: 0.15});
  io.observe(v);
}
export function mountSmartVideoDegrade(){
  const v = document.getElementById('heroVideo');
  const posterImg = document.getElementById('heroPoster');
  if (!v) return;
  const poster = v.getAttribute('poster') || '';
  if (poster && posterImg) posterImg.src = poster;
  function disableVideo(){
    if (v.dataset.disabled === '1') return;
    v.dataset.disabled = '1';
    v.pause(); v.removeAttribute('autoplay'); v.setAttribute('preload','none');
    v.querySelectorAll('source').forEach(s=>s.remove());
    v.classList.add('video-disabled'); if (posterImg) posterImg.classList.add('visible');
  }
  function shouldDisable(){
    try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true; } catch(e){}
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c && (c.saveData || /(2g|slow-2g)/i.test(String(c.effectiveType||'')))) return true;
    return false;
  }
  try { if (navigator.getBattery) { navigator.getBattery().then(b => { if (b && !b.charging && b.level <= 0.2) disableVideo(); }); } } catch(e){}
  if (shouldDisable()) disableVideo();
}