  /* === Low perf heuristics: aplique classe sincronamente e refine depois === */
(function(){
  const html = document.documentElement;

  // heurística síncrona imediata (antes de Battery API)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reducedData = (window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches) || false;
  const dm = navigator.deviceMemory || 0;
  const cores = navigator.hardwareConcurrency || 0;

  if (prefersReducedMotion || reducedData || (dm && dm <= 4) || (cores && cores <= 4)) {
    html.classList.add('bi-low-perf');
  }

  // refino assíncrono (Battery API quando disponível)
  if (navigator.getBattery) {
    navigator.getBattery().then(b => {
      let saver = false;
      if (b.savingMode !== undefined) saver = !!b.savingMode;
      if (!b.charging && b.level <= 0.20) saver = true;
      if (saver) {
        html.classList.add('bi-battery-saver');
        html.classList.add('bi-low-perf');
      }
    }).catch(()=>{});
  }
})();
(function(){
  // mobile heuristics: UA OU largura OU coarse pointer (alguns Android reportam pointer:fine)
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
                || matchMedia('(max-width: 820px)').matches
                || matchMedia('(hover: none) and (pointer: coarse)').matches;

  if (!isMobile) return;

  const hv = document.querySelector('.hero-viewport');
  const nav = document.querySelector('.navbar');
  if (!hv || !nav) return;

  function updateHeroPadding(){
    const navH = Math.ceil(nav.getBoundingClientRect().height || 64);
    const vvTop = (window.visualViewport && window.visualViewport.offsetTop) || 0; // barra de URL/safe-area
    hv.style.paddingTop = (navH + vvTop) + 'px';   // <<< AQUI está o "truque" que você viu no teste
  }

  // roda já e quando a UI móvel muda
  document.addEventListener('DOMContentLoaded', updateHeroPadding);
  window.addEventListener('load', updateHeroPadding);
  window.addEventListener('resize', updateHeroPadding);
  window.addEventListener('orientationchange', updateHeroPadding);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateHeroPadding);
    window.visualViewport.addEventListener('scroll', updateHeroPadding);
  }
})();
(function gamesScrollGuard(){
  const games = document.getElementById('games');
  if (!games) return;

  // 1) Detecta "estou rolando" SÓ na seção, sem classe global
  let scrolling = false, tid = null;
  const markScrolling = () => {
    scrolling = true;
    clearTimeout(tid);
    tid = setTimeout(() => { scrolling = false; }, 140); // histerese pequena
  };
  games.addEventListener('wheel',      markScrolling, {passive:true});
  games.addEventListener('touchmove',  markScrolling, {passive:true});
  window.addEventListener('scroll',    markScrolling, {passive:true}); // fallback quando a página inteira rola

  // 2) Se acabou de rolar, ignore clique (previne flip acidental)
  games.addEventListener('click', (e) => {
    const card = e.target.closest('.game-card');
    if (!card) return;
    if (scrolling) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // 3) 'will-change' só no stage 3D (NÃO nas faces)
  const cards = Array.from(games.querySelectorAll('.game-card'));
  cards.forEach(card=>{
    const stage = card.querySelector('.card-3d');
    let wcTimer = null;
    const arm = () => {
      if (stage) stage.style.willChange = 'transform';
      clearTimeout(wcTimer);
      wcTimer = setTimeout(()=>{ if(stage) stage.style.willChange = ''; }, 800);
    };
    ['mouseenter','focusin','touchstart','click'].forEach(ev=>{
      card.addEventListener(ev, arm, {passive:true});
    });
  });
})();