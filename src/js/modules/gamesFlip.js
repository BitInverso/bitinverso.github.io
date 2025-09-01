// src/js/modules/gamesFlip.js
import { $$ } from "../utils/dom.js";

export function mountGamesFlip(){
  const cards = $$('.game-card');
  if (!cards.length) return;

  // marca low-perf (igual de antes)
  try{
    const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reducedData = (matchMedia && matchMedia('(prefers-reduced-data: reduce)').matches) || false;
    const dm = navigator.deviceMemory || 0;
    const cores = navigator.hardwareConcurrency || 0;
    if (prefersReducedMotion || reducedData || (dm && dm <= 4) || (cores && cores <= 4)) {
      document.documentElement.classList.add('bi-low-perf');
    }
  }catch{}
  try{ if (navigator.getBattery){ navigator.getBattery().then(b=>{
    let saver = false;
    if (b.savingMode !== undefined) saver = !!b.savingMode;
    if (!b.charging && b.level <= 0.2) saver = true;
    if (saver) document.documentElement.classList.add('bi-battery-saver','bi-low-perf');
  }).catch(()=>{});} }catch{}

  let activeCard = null, isAnimating = false;
  const lowPerf = document.documentElement.classList.contains('bi-low-perf');
  const ANIM_MS = lowPerf ? 220 : 520;

  function flipTo(targetCard){
    if (isAnimating) return;
    isAnimating = true;

    // se havia outro aberto, fecha
    if (activeCard && activeCard !== targetCard) {
      activeCard.classList.remove('is-flipped');
    }

    // se pediram pra fechar (targetCard nulo) OU clicou no mesmo card -> só fecha
    if (!targetCard || activeCard === targetCard) {
      if (activeCard) activeCard.classList.remove('is-flipped');
      activeCard = null;
      setTimeout(()=>{ isAnimating = false; }, ANIM_MS + 60);
      return;
    }

    // abrir o novo card (com guard)
    if (targetCard && targetCard.classList) {
      targetCard.classList.add('is-flipped');
      activeCard = targetCard;
    }

    setTimeout(()=>{ isAnimating = false; }, ANIM_MS + 60);
  }

  // --- NEW: double-tap em touch, single-click em desktop
  const IS_TOUCH =
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
    matchMedia('(hover: none), (pointer: coarse)').matches;

  // sinaliza scroll recente local (fallback ao __scrolling__ global)
  let recentScroll = false, scrollTO = null;
  const markScroll = () => { recentScroll = true; clearTimeout(scrollTO); scrollTO = setTimeout(()=>recentScroll=false, 140); };
  window.addEventListener('scroll', markScroll, {passive:true});
  window.addEventListener('touchmove', markScroll, {passive:true});
  window.addEventListener('wheel', markScroll, {passive:true});

  let lastTouchMs = 0; // para evitar ghost click logo após touch

  cards.forEach(card => {
    // Desktop: click único
    if (!IS_TOUCH){
      card.addEventListener('click', (e)=>{
        if (e.target.closest('a,button,input,textarea,select,label')) return;
        flipTo(card);
      });
      return;
    }

    // Mobile: exige double-tap
    const DOUBLE_TAP_MS = 320;
    const MOVE_PX = 18;           // tolerância de movimento entre down e up
    const MOVE2 = MOVE_PX * MOVE_PX;

    let lastTapTime = 0;
    let x0 = 0, y0 = 0;

    card.addEventListener('touchstart', (e)=>{
      if (e.touches?.length > 1) return;
      const t = e.touches[0];
      x0 = t.clientX; y0 = t.clientY;
    }, {passive:true});

    card.addEventListener('touchend', (e)=>{
      if (e.changedTouches?.length > 1) return;
      lastTouchMs = Date.now();

      // ignora se acabou de rolar
      const globScrolling = (window.__scrolling__ === true);
      if (recentScroll || globScrolling) return;

      if (e.target.closest('a,button,input,textarea,select,label')) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      if ((dx*dx + dy*dy) > MOVE2) { lastTapTime = 0; return; } // tratou como scroll

      const now = performance.now();
      if (now - lastTapTime <= DOUBLE_TAP_MS){
        flipTo(card);
        lastTapTime = 0; // reseta janela
      } else {
        lastTapTime = now; // primeiro toque: armar
      }
    }, {passive:true});

    // Se um "click" (ghost) vier logo após o touch, ignore
    card.addEventListener('click', (e)=>{
      if (Date.now() - lastTouchMs < 450) return;
      if (e.target.closest('a,button,input,textarea,select,label')) return;
      // Em touch, só double-tap aciona; clique único não faz nada
    });
  });

  // Fechar ao clicar fora (desktop ou touch)
  document.addEventListener('click', (e) => {
    // evita fechar imediatamente por ghost click logo após double-tap
    if (Date.now() - lastTouchMs < 250) return;
    const inside = e.target.closest('.game-card');
    if (!inside && activeCard) flipTo(null);
  }, true);
}
