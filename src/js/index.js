import { applyLowPerfHeuristicsSync } from "./modules/lowPerf.js";
import { mountNavHeightVar } from "./modules/navHeight.js";
import { mountMobileMenu } from "./modules/mobileMenu.js";
import { setupHeroVideo, mountHeroVisibility, mountSmartVideoDegrade } from "./modules/heroVideo.js";
import { mountGamesFlip } from "./modules/gamesFlip.js";
import { mountEnhancedAnimations } from "./modules/enhancedAnimations.js";
import { mountNewsletter } from "./modules/newsletter.js";
import { mountSmoothNavigation } from "./modules/smoothNavigation.js";
import { mountRevealOnScroll } from "./modules/reveal.js";
import { initCarousel } from "./modules/carousel.js";
import { printConsoleArt } from "./modules/consoleArt.js";
import { mountHeroPaddingMobile } from "./modules/heroPaddingMobile.js";
import { mountGamesScrollGuard } from "./modules/gamesScrollGuard.js";
import { mountAboutAndContactDecor } from "./modules/aboutAndContact.js";

applyLowPerfHeuristicsSync();
mountNavHeightVar();
mountMobileMenu();
setupHeroVideo();
mountHeroVisibility();
mountSmartVideoDegrade();
mountGamesFlip();
mountEnhancedAnimations();
mountNewsletter();
mountSmoothNavigation();
mountRevealOnScroll();
initCarousel();
printConsoleArt();
mountHeroPaddingMobile();
mountGamesScrollGuard();
mountAboutAndContactDecor();

// global scroll flag (optional)
let __scrolling__ = false, __scrollTimer = null;
window.addEventListener('scroll', ()=>{
  __scrolling__ = true;
  clearTimeout(__scrollTimer);
  __scrollTimer = setTimeout(()=>{ __scrolling__ = false; }, 120);
}, {passive:true});
