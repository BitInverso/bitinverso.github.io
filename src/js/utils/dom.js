export const $  = (s, r=document) => r.querySelector(s);
export const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

export function onReady(fn){
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once:true });
  } else { fn(); }
}

export function getNavH() {
  const v = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
  return v;
}
