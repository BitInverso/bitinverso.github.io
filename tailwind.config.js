
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./**/*.html",
    "./**/*.js"
  ],
  theme: {
    extend: {}
  },
  corePlugins: {
    preflight: true
  }
}
