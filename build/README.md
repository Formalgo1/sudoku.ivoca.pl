# Kompilacja stylów

Po zmianie klas Tailwinda w HTML:

```bash
npx tailwindcss@3 -c build/tailwind.config.js -i build/input.css -o vendor/tailwind.css --minify
```

Katalog `build/` nie jest publikowany (`.assetsignore`).
