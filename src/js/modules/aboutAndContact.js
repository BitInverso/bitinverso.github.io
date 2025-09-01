export function mountAboutAndContactDecor(){
  const aboutText = document.getElementById('about-text');
  if (aboutText && 'IntersectionObserver' in window){
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target.id === 'about-text') entry.target.classList.remove('opacity-0', '-translate-x-20');
          observer.unobserve(entry.target);
        }
      });
    });
    observer.observe(aboutText);
  }
  const contactPixelPattern = document.getElementById('contact-pixel-pattern');
  if (contactPixelPattern) {
    for (let i = 0; i < 64; i++) {
      const pixel = document.createElement('div');
      const colors = ['bg-yellow-400', 'bg-pink-500', 'bg-cyan-400'];
      pixel.className = colors[i % 3];
      contactPixelPattern.appendChild(pixel);
    }
  }
}