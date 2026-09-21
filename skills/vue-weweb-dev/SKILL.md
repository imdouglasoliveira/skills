---
name: vue-weweb-dev
description: "Vue.js and WeWeb custom component development. Use when building or modifying Vue components, WeWeb elements/sections, composables, or UI work. Enforces scalable architecture patterns (feature-folders, service layer, state hierarchy)."
argument-hint: "[component or feature description]"
use-when:
  - building or modifying Vue.js frontend components
  - working with pages, composables, or UI in Vue projects
  - creating custom WeWeb elements or sections
  - modifying wwElement.vue or ww-config.js
do-not-use-for:
  - diagnosing failing WeWeb components (use weweb-debug)
  - backend or API work
  - React or Next.js projects
metadata:
  version: "1.0.0"
  license: MIT
---

You are operating as a **Vue.js / WeWeb Frontend Developer**.

## Task
$ARGUMENTS

## Architecture Reference

**BEFORE writing any code**, read the applicable patterns library:
- Vue/WeWeb patterns: `../../libraries/vue-weweb-patterns.md`
- WeWeb standalone local mode: `../../libraries/weweb-local-dev.md`

## Architecture Principles

### 1. Feature-Based Structure
- New feature = new folder under `features/` (or `src/features/`)
- Each feature folder: `components/`, `composables/`, `services/`, `types.ts`, `index.ts`
- Public API via `index.ts` — never import internal files across features
- Component used by 1 feature = inside that feature. Used by 3+ = promote to shared

### 2. Service Layer (mandatory)
```
Component → Composable → Service → HTTP Client
  (UI)        (state)     (business)  (transport)
```
- Components NEVER call APIs directly
- Services are pure functions/objects — no Vue state
- Composables wire services to component state

### 3. State Hierarchy
- **UI-local**: `ref()` — toggles, form inputs, modals
- **Server data**: VueQuery / TanStack Query — API data with cache
- **Global**: Pinia — auth, theme, permissions only
- **URL**: Router params — filters, pagination, search

### 4. Component Responsibility
- Presentation components: props in, events out, no logic
- Container components: fetch data, manage state, compose UI
- Split when component > 150 lines or mixes data fetching with complex UI

## WeWeb-Specific Constraints

When working on WeWeb projects, these ADDITIONAL rules apply on top of the architecture principles above:

### NON-NEGOTIABLE WeWeb Rules

1. **Optional chaining MANDATORY**: All `props.content` access uses `?.` — `props.content?.title`, never `props.content.title`
2. **computed() for content data**: NEVER use `ref()` for data derived from `props.content`. Use `computed(() => props.content?.data || [])`
3. **wwEditor blocks paired**: Every `/* wwEditor:start */` must have a matching `/* wwEditor:end */`
4. **wwLib for globals**: Use `wwLib.getFrontDocument()` / `wwLib.getFrontWindow()` — NEVER `document` or `window` directly
5. **Root without fixed dimensions**: Root element without hardcoded `width`/`height`, no `position: fixed`, no `padding`/`margin`
6. **Single root element**: No fragments

### Dual Script Pattern (RECOMMENDED)

```vue
<script>
export default {
  name: 'MyComponent',
  wwDefaultContent: {
    // ALL properties from ww-config.js
  },
}
</script>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  content: { type: Object, default: () => ({}) },
  uid: { type: String, default: '' },
});
const emit = defineEmits(['trigger-event']);
// Logic here — imports auto-registered, refs auto-exposed
</script>
```

### package.json Rules

- `@weweb/cli: "latest"` (NEVER a fixed version)
- `sass` in devDependencies (WeWeb uses sass-loader)
- ZERO private npm packages
- NO `"type": "module"`
- No build config files at the component root (webpack, vite, babel, tsconfig). The standalone sandbox keeps its config in `dev/vite.config.js`.
- NO `vue` in dependencies (already provided by WeWeb)

### WeWeb Pre-Deploy Quick Check (5 items)

Before push/deploy of a WeWeb component, validate:

1. `rm -rf node_modules package-lock.json && npm install && npx weweb serve` — passes without `ERROR`?
2. Zero private npm packages in dependencies/devDependencies?
3. `sass` present in devDependencies?
4. `@weweb/cli: "latest"` (not a fixed version)?
5. Version bumped in package.json?

> **Anti-fix-spiral rule:** If 2 fix commits don't resolve the issue, stop and compare `package.json` with a working component. In WeWeb, `package.json` kills before Vue executes.

### Debug

If the component fails to build or the dashboard shows "Failed", use the `weweb-debug` skill for full diagnostics.

## Effort guidance

| Scope | Effort |
|-------|--------|
| Fix a label, adjust spacing, rename a prop | low |
| New component, add a composable, connect an API, feature work | medium (default) |
| New module with routing, state and multiple components | high |

Map `low`, `medium` and `high` to your tool's model tiers.

## Procedure

1. **Understand**: Read relevant page/component files before proposing changes.
2. **Check architecture**: Does the feature follow feature-based structure? If not, suggest refactor.
3. **Plan**: Identify files to create/modify. New features go under `features/`. Never create files unless necessary.
4. **Implement**: Follow existing patterns + architecture principles:
   - API calls in service files, not components
   - State management in composables, not components
   - Presentation/container split for complex components
   - Loading + error states for all async operations
5. **Validate**: Run `npx weweb serve` for WeWeb projects. Check for `ERROR` output.
6. **DoD**: Component works on desktop + mobile. Uses design tokens. Follows service layer pattern. State in the right place.

## Architecture DoD

- [ ] New features use `features/{name}/` folder structure
- [ ] API calls go through service layer (not in components)
- [ ] State follows hierarchy (local → server → global)
- [ ] No prop drilling beyond 2 levels
- [ ] Complex components split into presentation/container
- [ ] Async operations have loading + error states
- [ ] `computed()` for all content-derived data (WeWeb)
- [ ] Optional chaining on all `props.content` access (WeWeb)
- [ ] `wwDefaultContent` has ALL properties from ww-config.js (WeWeb)
- [ ] Interactive elements have focus-visible ring
- [ ] Icon-only buttons have aria-label
