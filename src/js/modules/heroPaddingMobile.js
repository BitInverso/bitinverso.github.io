import { $, onReady } from "../utils/dom.js";
export function mountHeroPaddingMobile(){
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
                || matchMedia('(max-width: 820px)').matches
                || matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!isMobile) return;
  onReady(()=>{
    const hv = $('.hero-viewport');
    const nav = $('.navbar');
    if (!hv || !nav) return;
    function updateHeroPadding(){
      const navH = Math.ceil(nav.getBoundingClientRect().height || 64);
      const vvTop = (window.visualViewport && window.visualViewport.offsetTop) || 0;
      hv.style.paddingTop = (navH + vvTop) + 'px';
    }
    updateHeroPadding();
    window.addEventListener('load', updateHeroPadding);
    window.addEventListener('resize', updateHeroPadding);
    window.addEventListener('orientationchange', updateHeroPadding);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeroPadding);
      window.visualViewport.addEventListener('scroll', updateHeroPadding);
    }
  });
}