import { $, onReady } from "../utils/dom.js";
export function mountMobileMenu(){
  onReady(() => {
    const ham = $('#hamburger');
    const menu = $('#mobile-menu');
    if(!ham || !menu) return;
    const open  = () => { menu.classList.remove('hidden'); menu.classList.add('flex'); };
    const close = () => { menu.classList.add('hidden');    menu.classList.remove('flex'); };
    ham.addEventListener('click', open);
    menu.addEventListener('click', (e)=>{ if(e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') close(); });
    window.closeMobileMenu = close;
  });
}