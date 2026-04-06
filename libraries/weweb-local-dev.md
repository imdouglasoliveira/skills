# WeWeb Local Dev (Vue Standalone) — Quick Guide

**Purpose:** develop and test WeWeb custom component UI/logic locally with Vite, without uploading/importing in WeWeb during early cycles.

## When to use
- You are building `wwElement.vue`/`wwSection.vue` and want fast local iteration.
- You need a local playground (`./dev`) for behavior/state checks.
- You want to separate local development from WeWeb editor integration.

## Dev modes
- `weweb serve`: integration mode (component exposed to WeWeb editor).
- `vite dev`: standalone mode (local app from `./dev`).

Keep both modes in the same project.

## 1) Install local standalone toolchain

```bash
npm install --save-dev vite @vitejs/plugin-vue vue
```

## 2) Create `vite.config.js`

```js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  root: './dev',
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
});
```

## 3) Update `package.json` scripts

```json
{
  "scripts": {
    "serve": "weweb serve",
    "build": "weweb build",
    "dev": "vite --config vite.config.js",
    "dev:build": "vite build --config vite.config.js",
    "dev:preview": "vite preview --config vite.config.js"
  }
}
```

## 4) Recommended local folder

```text
project/
  src/                  # WeWeb component runtime files
    wwElement.vue
  dev/                  # Standalone local sandbox
    index.html
    main.ts
    App.vue
  ww-config.js
  vite.config.js
```

## 5) Validation flow
1. Implement locally with `npm run dev`.
2. Run `npm run dev:build` to catch build issues early.
3. Validate WeWeb integration with `npm run serve`.
4. Publish only after editor-level validation.

## Common mistakes
- Replacing `weweb serve` instead of adding standalone scripts.
- Running Vite from repo root instead of `./dev`.
- Shipping without final validation in WeWeb editor.
