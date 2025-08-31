
# Build de CSS com Tailwind

```bash
npm ci
NODE_ENV=production npm run build:css
```

O CSS custom que estava inline foi movido para `src/tailwind.css` dentro de `@layer components`.  
`assets/styles.min.css` deixou de existir; todo o estilo é emitido em `assets/tailwind.min.css`.
