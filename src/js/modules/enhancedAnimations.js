export function mountEnhancedAnimations(){
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        if (el.classList.contains('slide-in-left')) el.style.animationPlayState = 'running';
        if (el.classList.contains('fade-in-scale')) el.style.animationPlayState = 'running';
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.slide-in-left, .fade-in-scale').forEach(el => {
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });
}