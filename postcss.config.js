import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
export default (ctx) => ({
  plugins: [tailwindcss, autoprefixer, ...(ctx.env==='production' ? [cssnano({preset:'default'})] : [])]
});