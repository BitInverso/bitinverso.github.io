import { $, $$ } from "../utils/dom.js";
export function mountGamesScrollGuard(){
  const games = $('#games');
  if (!games) return;
  let scrolling = false, tid = null;
  const mark = () => { scrolling = true; clearTimeout(tid); tid = setTimeout(()=>{ scrolling=false; }, 140); };
  games.addEventListener('wheel', mark, {passive:true});
  games.addEventListener('touchmove', mark, {passive:true});
  window.addEventListener('scroll', mark, {passive:true});
  games.addEventListener('click', (e)=>{
    const card = e.target.closest('.game-card');
    if (!card) return;
    if (scrolling) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  $$('#games .game-card').forEach(card=>{
    const stage = card.querySelector('.card-3d'); let to = null;
    const arm = () => {
      if (stage) stage.style.willChange = 'transform';
      clearTimeout(to); to = setTimeout(()=>{ if(stage) stage.style.willChange=''; }, 800);
    };
    ['mouseenter','focusin','touchstart','click'].forEach(ev=> card.addEventListener(ev, arm, {passive:true}));
  });
}