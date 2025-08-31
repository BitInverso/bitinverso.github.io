
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./**/*.html",
    "./**/*.js"
  ],
  theme: {
    extend: {},
  safelist: [
    'glitch-text',
    'navbar',
    'hero-viewport',
    'hero-video',
    'hero-overlay'
  ]
  },
  corePlugins: {
    preflight: true
  }
}
