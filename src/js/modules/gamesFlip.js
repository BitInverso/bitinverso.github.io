import { $$ } from "../utils/dom.js";
export function mountGamesFlip(){
  const cards = $$('.game-card');
  if (!cards.length) return;
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
    if (activeCard && activeCard !== targetCard) activeCard.classList.remove('is-flipped');
    if (activeCard === targetCard) { activeCard.classList.remove('is-flipped'); activeCard = null; }
    else { targetCard.classList.add('is-flipped'); activeCard = targetCard; }
    setTimeout(()=>{ isAnimating = false; }, ANIM_MS + 60);
  }
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a,button,input,textarea,select,label')) return;
      flipTo(card);
    });
    let t0 = 0;
    card.addEventListener('touchstart', (e) => { if (e.touches?.length>1) return; t0 = performance.now(); }, { passive: true });
    card.addEventListener('touchend', (e) => { if (e.changedTouches?.length>1) return;
      if (performance.now()-t0 < 350) flipTo(card);
    }, { passive: true });
  });
  document.addEventListener('click', (e) => {
    const inside = e.target.closest('.game-card');
    if (!inside && activeCard) { const keep = activeCard; activeCard = null; keep.classList.remove('is-flipped'); }
  }, true);
}