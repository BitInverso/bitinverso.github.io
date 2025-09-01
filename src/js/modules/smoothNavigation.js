import { $, $$, getNavH } from "../utils/dom.js";
function forceRevealIn(el){
  el.querySelectorAll('[data-reveal]').forEach(n=>{
    n.classList.add('is-visible');
    n.style.animationPlayState = 'running';
  });
}
export function mountSmoothNavigation(){
  $$('a[href^="#"]').forEach(anchor=>{
    anchor.addEventListener('click', (e)=>{
      const id = anchor.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const mobileMenu = $('#mobile-menu');
      if (mobileMenu && !mobileMenu.classList.contains('hidden')){
        mobileMenu.classList.add('hidden'); mobileMenu.classList.remove('flex');
      }
      forceRevealIn(target);
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - getNavH() - 4);
      window.scrollTo({ top, behavior: 'smooth' });
    }, {passive:false});
  });
  window.addEventListener('load', ()=>{
    if (!location.hash) return;
    const t = document.getElementById(location.hash.slice(1));
    if (t){ 
      const top = Math.max(0, t.getBoundingClientRect().top + window.scrollY - getNavH() - 4);
      window.scrollTo({ top, behavior: 'smooth' });
      t.querySelectorAll('[data-reveal]').forEach(n=>n.classList.add('is-visible'));
    }
  });
}