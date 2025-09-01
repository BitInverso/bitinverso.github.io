export default {content: [
    "./*.html",
    "./**/*.html",
    "!./node_modules/**",   // belt & suspenders,
    "./src/**/*.js",           // <— importante: aponta pro seu JS fonte
    "./src/**/*.ts",
    "./src/**/*.jsx",
    "./src/**/*.tsx"
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
  }
};
