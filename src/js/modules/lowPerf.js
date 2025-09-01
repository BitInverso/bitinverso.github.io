export function applyLowPerfHeuristicsSync(){
  const html = document.documentElement;
  try{
    const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reducedData = (matchMedia && matchMedia('(prefers-reduced-data: reduce)').matches) || false;
    const dm = navigator.deviceMemory || 0;
    const cores = navigator.hardwareConcurrency || 0;
    if (prefersReducedMotion || reducedData || (dm && dm <= 4) || (cores && cores <= 4)) {
      html.classList.add('bi-low-perf');
    }
  }catch{}
  try{
    if (navigator.getBattery) {
      navigator.getBattery().then(b => {
        let saver = false;
        if (b.savingMode !== undefined) saver = !!b.savingMode;
        if (!b.charging && b.level <= 0.20) saver = true;
        if (saver) { html.classList.add('bi-battery-saver','bi-low-perf'); }
      }).catch(()=>{});
    }
  }catch{}
}