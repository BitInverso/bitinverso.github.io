const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
function setNavHeightVar(){
const h = $('.navbar')?.offsetHeight || 80;
document.documentElement.style.setProperty('--nav-h', h + 'px');
const observer = new IntersectionObserver((entries) => {
entries.forEach(entry => {
if (entry.isIntersecting) {
if (entry.target.id === 'about-text') entry.target.classList.remove('opacity-0', '-translate-x-20');
}
});
});
const aboutText = document.getElementById('about-text');
if (aboutText) observer.observe(aboutText);
const contactPixelPattern = document.getElementById('contact-pixel-pattern');
if (contactPixelPattern) {
for (let i = 0; i < 64; i++) {
const pixel = document.createElement('div');
const colors = ['bg-yellow-400', 'bg-pink-500', 'bg-cyan-400'];
pixel.className = colors[i % 3];
contactPixelPattern.appendChild(pixel);
}
}
}
window.addEventListener('resize', setNavHeightVar);
document.addEventListener('DOMContentLoaded', setNavHeightVar);
(function mobileMenu(){
const ham = $('#hamburger');
const menu = $('#mobile-menu');
if(!ham || !menu) return;
const open = () => { menu.classList.remove('hidden'); menu.classList.add('flex'); };
const close = () => { menu.classList.add('hidden'); menu.classList.remove('flex'); };
ham.addEventListener('click', open);
menu.addEventListener('click', (e)=>{ if(e.target.closest('[data-close]')) close(); });
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') close(); });
window.closeMobileMenu = close;
})();
(function setupHeroVideo(){
const video = $('#heroVideo');
if(!video) return;
let sourcesAttached = false;
function attachSourcesOnce(){
if (sourcesAttached) return;
const webm = video.dataset.srcWebm, mp4 = video.dataset.srcMp4;
if (webm) { const s = document.createElement('source'); s.src = webm; s.type='video/webm'; video.appendChild(s); }
if (mp4) { const s2= document.createElement('source'); s2.src= mp4; s2.type='video/mp4'; video.appendChild(s2); }
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
io.observe($('.hero-viewport'));
document.addEventListener('visibilitychange', ()=>{ if (document.hidden) try{video.pause()}catch{}; });
video.addEventListener('canplay', ()=>{ if(!document.hidden) video.play().catch(()=>{}); }, {once:true});
})();
(function gamesFlip(){
  const cards = Array.from(document.querySelectorAll('.game-card'));
  if (!cards.length) return;

  // Capability & performance heuristics
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reducedData = (window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches) || false;
  const dm = (navigator.deviceMemory || 0);
  const cores = (navigator.hardwareConcurrency || 0);
  let batterySaver = false;
  if (navigator.getBattery) {
    try {
      navigator.getBattery().then(b => {
        if (b.savingMode !== undefined) batterySaver = !!b.savingMode;
        if (b.charging === false && b.level <= 0.2) batterySaver = true;
        if (batterySaver) document.documentElement.classList.add('bi-battery-saver');
        if (prefersReducedMotion || reducedData || batterySaver || (dm && dm <= 4) || (cores && cores <= 4)) {
          document.documentElement.classList.add('bi-low-perf');
        } else {
          document.documentElement.classList.remove('bi-low-perf');
        }
      });
    } catch(e){}
  }
  if (!(navigator.getBattery)) {
    if (prefersReducedMotion || reducedData || (dm && dm <= 4) || (cores && cores <= 4)) {
      document.documentElement.classList.add('bi-low-perf');
    } else {
      document.documentElement.classList.remove('bi-low-perf');
    }
  }

  let activeCard = null;
  let isAnimating = false;
  const lowPerf = document.documentElement.classList.contains('bi-low-perf');
  const ANIM_MS = lowPerf ? 220 : 520;

  function flipTo(targetCard){
    if (isAnimating) return;
    isAnimating = true;

    if (activeCard && activeCard !== targetCard) {
      activeCard.classList.remove('is-flipped');
    }

    if (activeCard === targetCard) {
      if (activeCard) activeCard.classList.remove('is-flipped');
      activeCard = null;
    } else {
      if (targetCard) targetCard.classList.add('is-flipped');
      activeCard = targetCard || null;
    }

    setTimeout(()=>{ isAnimating = false; }, ANIM_MS + 60);
  }

  // Click-only + touch tap
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a,button,input,textarea,select,label')) return;
      // nada de preventDefault aqui
      flipTo(card);
    });

    let t0 = 0;
    card.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 1) return;
      t0 = performance.now();
    }, { passive: true });
    card.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches.length > 1) return;
      const dt = performance.now() - t0;
      if (dt < 350) flipTo(card);
    }, { passive: true });
  });

  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    const inside = e.target.closest('.game-card');
    if (!inside && activeCard) flipTo(null);
  }, { passive: true });

})();;
(function enhancedAnimations(){
const observer = new IntersectionObserver((entries) => {
entries.forEach(entry => {
if (entry.isIntersecting) {
const el = entry.target;
if (el.classList.contains('slide-in-left')) {
el.style.animationPlayState = 'running';
}
if (el.classList.contains('fade-in-scale')) {
el.style.animationPlayState = 'running';
}
observer.unobserve(el);
}
});
}, {
threshold: 0.2,
rootMargin: '0px 0px -50px 0px'
});
document.querySelectorAll('.slide-in-left, .fade-in-scale').forEach(el => {
el.style.animationPlayState = 'paused';
observer.observe(el);
});
})();
(function newsletter(){
const form = document.querySelector('footer input[type="email"]');
const button = form?.nextElementSibling;
if (!form || !button) return;
button.addEventListener('click', (e) => {
e.preventDefault();
const email = form.value.trim();
if (!email || !email.includes('@')) {
button.textContent = '❌';
button.classList.add('bg-red-400');
setTimeout(() => {
button.textContent = 'OK';
button.classList.remove('bg-red-400');
}, 2000);
return;
}
button.textContent = '✓';
button.classList.remove('bg-green-400');
button.classList.add('bg-cyan-400');
form.value = '';
setTimeout(() => {
button.textContent = 'OK';
button.classList.remove('bg-cyan-400');
button.classList.add('bg-green-400');
}, 3000);
});
form.addEventListener('keypress', (e) => {
if (e.key === 'Enter') {
button.click();
}
});
})();
(function smoothNavigation(){
  function getNavH(){
    const v = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
    return v;
  }
  function scrollWithOffset(el){
    const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - getNavH() - 4);
    window.scrollTo({ top, behavior: 'smooth' });
  }
  function forceRevealIn(el){
    el.querySelectorAll('[data-reveal]').forEach(n=>{
      n.classList.add('is-visible');
      n.style.animationPlayState = 'running';
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor=>{
    anchor.addEventListener('click', (e)=>{
      const id = anchor.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();

      // fecha menu mobile se aberto
      const mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu && !mobileMenu.classList.contains('hidden')){
        mobileMenu.classList.add('hidden'); mobileMenu.classList.remove('flex');
      }

      forceRevealIn(target);
      scrollWithOffset(target);
    }, {passive:false});
  });

  // se abrir a página já com hash
  window.addEventListener('load', ()=>{
    if (!location.hash) return;
    const t = document.getElementById(location.hash.slice(1));
    if (t){ scrollWithOffset(t); t && t.querySelectorAll('[data-reveal]').forEach(n=>n.classList.add('is-visible')); }
  });
})();
(function revealOnScroll(){
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
                || matchMedia('(max-width: 820px)').matches
                || matchMedia('(hover: none) and (pointer: coarse)').matches;

  const nodes = document.querySelectorAll('[data-reveal]');
  if (!nodes.length) return;

  // Fallback total se o browser não suporta IO
  if (!('IntersectionObserver' in window)){
    nodes.forEach(n=>{ n.classList.add('is-visible'); n.style.animationPlayState='running'; });
    return;
  }

  // Em mobile: revela imediatamente #about e #games (sempre visíveis)
  if (isMobile){
    document.querySelectorAll('#about [data-reveal], #games [data-reveal]').forEach(n=>{
      n.classList.add('is-visible'); n.style.animationPlayState='running';
    });
  }

  // rootMargin com topo compensado pela navbar
  const nav = document.querySelector('.navbar');
  const navH = nav ? Math.ceil(nav.getBoundingClientRect().height) : 0;

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if (e.isIntersecting){
        e.target.classList.add('is-visible');
        e.target.style.animationPlayState='running';
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: `-${navH + 8}px 0px -15% 0px`, threshold: 0.08 });

  nodes.forEach(n=>{
    if (!n.classList.contains('is-visible')){
      // Pause qualquer animation CSS até ficar visível
      n.style.animationPlayState = 'paused';
      io.observe(n);
    }
  });

  // Se a altura da navbar mudar depois (ex.: abrir/fechar menu),
  // revelamos preventivamente os itens visíveis na viewport.
  window.addEventListener('resize', ()=>{
    document.querySelectorAll('[data-reveal]').forEach(n=>{
      const r = n.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0){
        n.classList.add('is-visible'); n.style.animationPlayState='running';
      }
    });
  });
})();

const track = $('#carouselTrack');
const slides = $$('.carousel-item', track);
const dots = $$('#carouselIndicators .carousel-indicator');
let index = 0;
const AUTO_MS = 6000;
let auto = null;
function startAuto(){ stopAuto(); auto = setInterval(() => nextSlide(false), AUTO_MS); }
function stopAuto(){ if (auto !== null){ clearInterval(auto); auto = null; } }
function resetAuto(){ startAuto(); }
function updateCarousel(){
const offset = -index * 100;
track.style.transform = `translate3d(${offset}%, 0, 0)`;
dots.forEach((d,i)=> d.classList.toggle('active', i===index));
}
function goToSlide(i){ index = (i + slides.length) % slides.length; updateCarousel(); }
function nextSlide(userInitiated = true){ goToSlide(index + 1); if (userInitiated) resetAuto(); }
function prevSlide(userInitiated = true){ goToSlide(index - 1); if (userInitiated) resetAuto(); }
startAuto();
document.addEventListener('visibilitychange', ()=>{ if (document.hidden) stopAuto(); else startAuto(); });
$('.carousel-prev')?.addEventListener('click', () => resetAuto());
$('.carousel-next')?.addEventListener('click', () => resetAuto());
$('#carouselIndicators')?.addEventListener('click', (e) => {
if (e.target?.classList?.contains('carousel-indicator')) resetAuto();
});
window.goToSlide = goToSlide;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
(function consoleArt(){
const art = `
╔══════════════════════════════════════════════════════════╗
║ ║
║ ██████╗ ██╗████████╗ ██╗███╗ ██╗██╗ ██╗███████╗ ║
║ ██╔══██╗██║╚══██╔══╝ ██║████╗ ██║██║ ██║██╔════╝ ║
║ ██████╔╝██║ ██║ ██║██╔██╗ ██║██║ ██║█████╗ ║
║ ██╔══██╗██║ ██║ ██║██║╚██╗██║╚██╗ ██╔╝██╔══╝ ║
║ ██████╔╝██║ ██║ ██║██║ ╚████║ ╚████╔╝ ███████╗ ║
║ ╚═════╝ ╚═╝ ╚═╝ ╚═╝╚═╝ ╚═══╝ ╚═══╝ ╚══════╝ ║
║ ║
║ 🎮 GAMING STUDIO | PIXEL ART | ANIME 🎨 ║
║ ║
║ Desenvolvedor curioso? 👀 ║
║ Mande um email: wesley@bitinverso.com ║
║ ║
╚══════════════════════════════════════════════════════════╝
`;
console.log(art);
console.log('%cBit Inverso - Gaming Studio', 'font-size: 24px; font-weight: bold; color: #06b6d4;');
console.log('%cCriando jogos indie com pixel art, anime e humor ácido!', 'font-size: 14px; color: #ec4899;');
console.log('%cSe você chegou até aqui, você definitivamente tem o perfil que procuramos! 🚀', 'font-size: 12px; color: #10b981;');
})();
// Pause/play hero video when offscreen to reduce decoder cost on mobile
(function heroVisibility(){
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
})();

// Prevent heavy flips during active scrolling on mobile
let __scrolling__ = false, __scrollTimer = null;
window.addEventListener('scroll', ()=>{
  __scrolling__ = true;
  clearTimeout(__scrollTimer);
  __scrollTimer = setTimeout(()=>{ __scrolling__ = false; }, 120);
}, {passive:true});


// --- Smart Video Degrade: Data Saver, slow network, low battery, prefers-reduced-motion, small screens
(function smartVideoDegrade(){
  const v = document.getElementById('heroVideo');
  const posterImg = document.getElementById('heroPoster');
  if (!v) return;
  const poster = v.getAttribute('poster') || '';
  if (poster && posterImg) posterImg.src = poster;

  function disableVideo(){
    if (v.dataset.disabled === '1') return;
    v.dataset.disabled = '1';
    v.pause();
    v.removeAttribute('autoplay');
    v.setAttribute('preload','none');
    // remove sources to stop network activity
    v.querySelectorAll('source').forEach(s=>s.remove());
    // show poster image, hide video
    v.classList.add('video-disabled');
    if (posterImg) posterImg.classList.add('visible');
  }

  function shouldDisable(){
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    } catch(e){}
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    if (vw <= 768) {
      // optional: keep video on newer phones if not data-saver/slow; return false to keep
    }
    const nav = navigator;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn){
      if (conn.saveData) return true;
      const et = String(conn.effectiveType || '');
      if (/(2g|slow-2g)/i.test(et)) return true;
    }
    return false;
  }

  // Battery check (best effort)
  try {
    if (navigator.getBattery) {
      navigator.getBattery().then(b => {
        if (b && !b.charging && b.level <= 0.2) disableVideo();
      });
    }
  } catch(e){}

  if (shouldDisable()) disableVideo();
})();
