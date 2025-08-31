/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./**/*.html",
    "./assets/**/*.js",     // só seus JS
    "!./node_modules/**",   // belt & suspenders
  ],
  theme: {
    extend: {},
  },
  safelist: [
    // classes que podem aparecer só via JS/HTML dinâmico
    "glitch-text",
    "navbar",
    "hero-viewport",
    "hero-video",
    "hero-overlay",
    // se você alterna via JS, considere safelistar também:
    // "hidden", "flex", "opacity-0", "-translate-x-20"
  ],
  corePlugins: {
    preflight: true,
  },
};
