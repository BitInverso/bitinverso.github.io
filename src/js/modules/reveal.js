// src/js/modules/reveal.js
import { $$ } from "../utils/dom.js";

export function mountRevealOnScroll(){
  // evita inicializar 2x
  if (window.__revealInit) return;
  window.__revealInit = true;

  const nodes = Array.from(document.querySelectorAll('[data-reveal]'));
  if (!nodes.length) return;

  // prepara: só aqui marcamos como "escondido"
  nodes.forEach(n => n.classList.add('reveal-init'));

  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches
               || /Android|iP(hone|ad|od)/i.test(navigator.userAgent);
  const prefersReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // em mobile/coarse ou reduced-motion: mostra direto
  if (!('IntersectionObserver' in window) || isTouch || prefersReduce){
    nodes.forEach(n => { n.classList.add('is-visible'); n.classList.remove('reveal-init'); });
    return;
  }

  // IO enxuto e estável (sem cálculos de navbar)
  const io = new IntersectionObserver((entries) => {
    for (const e of entries){
      if (e.isIntersecting){
        const el = e.target;
        el.classList.add('is-visible');
        el.classList.remove('reveal-init');
        io.unobserve(el);
      }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

  nodes.forEach(n => io.observe(n));

  // fail-safe: se algo bugar, revela tudo depois de 2.5s
  setTimeout(() => {
    nodes.forEach(n => {
      if (!n.classList.contains('is-visible')){
        n.classList.add('is-visible');
        n.classList.remove('reveal-init');
      }
    });
  }, 2500);
}
