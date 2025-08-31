
# Cache headers em plataformas estáticas

Para resolver "Use ciclos de vida eficientes de cache" no Lighthouse:
- Em GitHub Pages: use **Cloudflare** com Cache Rules (ex.: 1 ano e `immutable` para `/assets/*`).
- Em Netlify/Vercel/Cloudflare Pages: adicione `_headers` ou config equivalente, por exemplo:
```
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```
O `sw.js` ajuda no uso real, mas o Lighthouse olha os cabeçalhos HTTP.
