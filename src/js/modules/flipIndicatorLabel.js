export function mountFlipIndicatorLabel(){
  const getLabels = () => Array.from(document.querySelectorAll('.flip-indicator > .flip-label, .flip-indicator > span'));
  let preferTouch = null;
  const mql = window.matchMedia?.('(hover: none) and (pointer: coarse)');

  function looksLikeTouch(){
    if (preferTouch !== null) return preferTouch;
    try {
      if (mql && mql.matches) return true;
      if (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) return true;
    } catch(e){}
    return false;
  }

  function applyLabel(){
    const isTouch = looksLikeTouch();
    const text = isTouch ? 'TOQUE DUAS VEZES PARA VIRAR' : 'CLIQUE PARA VIRAR';
    getLabels().forEach(n => { n.textContent = text; });
  }

  applyLabel();
  mql?.addEventListener?.('change', applyLabel);
  window.addEventListener('resize', applyLabel, { passive:true });
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') { preferTouch = true;  applyLabel(); }
    else if (e.pointerType === 'mouse') { preferTouch = false; applyLabel(); }
  }, { passive:true });
}
