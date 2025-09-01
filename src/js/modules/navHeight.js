import { $, onReady } from "../utils/dom.js";
export function mountNavHeightVar(){
  const apply = () => {
    const h = $('.navbar')?.offsetHeight || 80;
    document.documentElement.style.setProperty('--nav-h', `${Math.ceil(h)}px`);
  };
  onReady(apply);
  window.addEventListener('load', apply);
  window.addEventListener('resize', apply, {passive:true});
  window.addEventListener('orientationchange', apply, {passive:true});
}