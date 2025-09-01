import { $, $$ } from "../utils/dom.js";
export function initCarousel(){
  const track = $('#carouselTrack');
  const slides = $$('.carousel-item', track);
  const dots = $$('#carouselIndicators .carousel-indicator');
  if (!track || !slides.length) return;
  let index = 0;
  const AUTO_MS = 6000;
  let auto = null;
  function updateCarousel(){
    const offset = -index * 100;
    track.style.transform = `translate3d(${offset}%, 0, 0)`;
    dots.forEach((d,i)=> d.classList.toggle('active', i===index));
  }
  function goToSlide(i){ index = (i + slides.length) % slides.length; updateCarousel(); }
  function nextSlide(userInitiated = true){ goToSlide(index + 1); if (userInitiated) resetAuto(); }
  function prevSlide(userInitiated = true){ goToSlide(index - 1); if (userInitiated) resetAuto(); }
  function startAuto(){ stopAuto(); auto = setInterval(() => nextSlide(false), AUTO_MS); }
  function stopAuto(){ if (auto !== null){ clearInterval(auto); auto = null; } }
  function resetAuto(){ startAuto(); }
  startAuto();
  document.addEventListener('visibilitychange', ()=>{ if (document.hidden) stopAuto(); else startAuto(); });
  $('.carousel-prev')?.addEventListener('click', () => resetAuto());
  $('.carousel-next')?.addEventListener('click', () => resetAuto());
  $('#carouselIndicators')?.addEventListener('click', (e) => {
    if (e.target?.classList?.contains('carousel-indicator')) resetAuto();
  });
  window.goToSlide = goToSlide;
  window.nextSlide = nextSlide;
  window.prevSlide = prevSlide;
}