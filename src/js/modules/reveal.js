import { $, $$ } from "../utils/dom.js";
export function mountRevealOnScroll(){
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
                || matchMedia('(max-width: 820px)').matches
                || matchMedia('(hover: none) and (pointer: coarse)').matches;
  const nodes = document.querySelectorAll('[data-reveal]');
  if (!nodes.length) return;
  if (!('IntersectionObserver' in window)){
    nodes.forEach(n=>{ n.classList.add('is-visible'); n.style.animationPlayState='running'; });
    return;
  }
  if (isMobile){
    document.querySelectorAll('#about [data-reveal], #games [data-reveal]').forEach(n=>{
      n.classList.add('is-visible'); n.style.animationPlayState='running';
    });
  }
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
      n.style.animationPlayState = 'paused';
      io.observe(n);
    }
  });
  window.addEventListener('resize', ()=>{
    $$('#about [data-reveal], #games [data-reveal], [data-reveal]').forEach(n=>{
      const r = n.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0){
        n.classList.add('is-visible'); n.style.animationPlayState='running';
      }
    });
  }, {passive:true});
}