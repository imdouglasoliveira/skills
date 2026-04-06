# Vue / WeWeb Patterns Library

Pattern reference for Vue 3 (Composition API) and WeWeb custom components.

---

## Part 1: Vue 3 Composition API

### Feature Module Structure

```
src/
  features/
    orders/
      components/
        OrderList.vue
        OrderForm.vue
        OrderCard.vue
      composables/
        useOrders.ts
        useOrderActions.ts
      services/
        orderService.ts
      stores/
        orderStore.ts       # Pinia store
      types.ts
      index.ts              # Public API
```

### Composable Pattern (Vue equivalent of React hooks)

```ts
// features/orders/composables/useOrders.ts
import { ref, computed, watchEffect, type Ref } from 'vue';
import { orderService } from '../services/orderService';
import type { Order, OrderFilters } from '../types';

export function useOrders(filters?: Ref<OrderFilters>) {
  const orders = ref<Order[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchOrders() {
    loading.value = true;
    error.value = null;
    try {
      orders.value = await orderService.list(filters?.value);
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  // Auto-refetch when filters change
  if (filters) {
    watchEffect(() => {
      if (filters.value) fetchOrders();
    });
  } else {
    fetchOrders();
  }

  const isEmpty = computed(() => !loading.value && orders.value.length === 0);

  return {
    orders: computed(() => orders.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    isEmpty,
    refetch: fetchOrders,
  };
}
```

### Service Layer

```ts
// services/httpClient.ts
import axios from 'axios';

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

httpClient.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const message = error.response?.data?.message || 'Unexpected error';
    return Promise.reject(new Error(message));
  }
);
```

```ts
// features/orders/services/orderService.ts
import { httpClient } from '@/services/httpClient';
import type { Order, CreateOrderDTO, OrderFilters } from '../types';

export const orderService = {
  list: (filters?: OrderFilters) =>
    httpClient.get<Order[]>('/orders', { params: filters }),

  getById: (id: string) =>
    httpClient.get<Order>(`/orders/${id}`),

  create: (data: CreateOrderDTO) =>
    httpClient.post<Order>('/orders', data),

  updateStatus: (id: string, status: string) =>
    httpClient.patch<Order>(`/orders/${id}/status`, { status }),
};
```

### Pinia Store (Global State)

```ts
// features/auth/stores/authStore.ts
import { defineStore } from 'pinia';
import { authService } from '../services/authService';
import type { User } from '../types';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
  },

  actions: {
    async login(credentials: { email: string; password: string }) {
      this.loading = true;
      try {
        const { user, token } = await authService.login(credentials);
        this.user = user;
        localStorage.setItem('token', token);
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.user = null;
      localStorage.removeItem('token');
    },
  },
});
```

### Component Pattern (script setup)

```vue
<!-- features/orders/components/OrderList.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useOrders } from '../composables/useOrders';
import OrderCard from './OrderCard.vue';
import type { OrderFilters } from '../types';

const filters = ref<OrderFilters>({ status: 'active' });
const { orders, loading, isEmpty, refetch } = useOrders(filters);
</script>

<template>
  <div class="space-y-4">
    <div class="flex gap-2">
      <select v-model="filters.status">
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <div v-if="loading" class="animate-pulse">Loading...</div>

    <div v-else-if="isEmpty" class="text-center py-8 text-gray-500">
      No orders found
    </div>

    <div v-else class="grid gap-4">
      <OrderCard
        v-for="order in orders"
        :key="order.id"
        :order="order"
        @updated="refetch"
      />
    </div>
  </div>
</template>
```

### Presentation vs Container (Vue style)

```vue
<!-- Presentation: OrderCard.vue — pure props + emits -->
<script setup lang="ts">
import type { Order } from '../types';

defineProps<{ order: Order }>();
defineEmits<{ updated: [] }>();
</script>

<template>
  <div class="rounded-lg border p-4">
    <h3>{{ order.title }}</h3>
    <p>{{ order.status }}</p>
    <button @click="$emit('updated')">Refresh</button>
  </div>
</template>
```

```vue
<!-- Container: OrderCardContainer.vue — wires data -->
<script setup lang="ts">
import { useOrder, useUpdateOrder } from '../composables/useOrders';
import OrderCard from './OrderCard.vue';

const props = defineProps<{ orderId: string }>();
const { order, loading } = useOrder(props.orderId);
const { update } = useUpdateOrder();

async function handleUpdate() {
  await update(props.orderId, { status: 'completed' });
}
</script>

<template>
  <div v-if="loading">Loading...</div>
  <OrderCard v-else-if="order" :order="order" @updated="handleUpdate" />
</template>
```

---

## Part 2: WeWeb Custom Components

### Platform Architecture

WeWeb compiles Vue.js 3 applications with automatic prerendering for SEO and CDN hosting. Custom components are standard Vue components enhanced with special props for WeWeb Editor communication.

**Component types:**
- **Elements**: Reusable blocks that can nest within sections or other elements. Support repetition and nesting.
- **Sections**: Standalone large blocks that cannot nest within other components. Greater layout control as direct page children.

**Dual context model:** Components run in Editor mode (content editable, DB persistence on change) and Front mode (content changes only via dynamic binding).

### Project Setup

```bash
# Create new component
npm init @weweb/component my-component -- --type element

# Or section
npm init @weweb/component my-section -- --type section

cd my-component
npm install
npm run serve    # Dev on port 8080
```

For standalone local development (without WeWeb editor upload), see `weweb-local-dev.md`.

**Requirements:**
- Node.js >= 18
- Vue 3 provided by WeWeb — DO NOT add as dependency
- Accept SSL cert at `https://localhost:8080` before loading in editor

### File Structure

```
my-component/
  src/
    wwElement.vue          # Main component (required name for elements)
    wwSection.vue          # Main component (required name for sections)
    components/            # Sub-components
      InnerPart.vue
    composables/           # Local composables
      useComponentLogic.ts
  ww-config.js             # Properties, actions, events
  package.json
```

### package.json — Rules

```json
{
  "name": "my-component",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "serve": "weweb serve",
    "build": "weweb build"
  },
  "devDependencies": {
    "@weweb/cli": "latest",
    "sass": "^1.77.0"
  },
  "dependencies": {
    "lucide-vue-next": "^0.575.0"
  }
}
```

**CRITICAL package.json rules:**

| Rule | Why |
|------|-----|
| `@weweb/cli: "latest"` | Ensures compatibility. A pinned version may break |
| `sass` in devDependencies | WeWeb uses sass-loader to process ALL CSS (even plain CSS) |
| Only public npm deps | WeWeb has no access to private registries — `npm install` fails silently |
| NO `"type": "module"` | No working component uses it; may break the build |
| NO `name=` or `type=` args in build | Breaks drag & drop |
| NO `vue` in dependencies | Vue is already provided by WeWeb |
| Name without "weweb" or "ww" | Forbidden by the platform |
| Specific versions for production deps | Do not use "latest" in dependencies (only in devDependencies for the CLI) |
| NO build config files | webpack.config.js, vite.config.js, .babelrc, tsconfig.json are FORBIDDEN |

---

### NON-NEGOTIABLE RULES (from official docs)

These rules are non-negotiable. Violating any of them causes catastrophic component failure.

#### Rule 1: Optional Chaining for ALL content access

All references to `props.content` MUST use optional chaining to prevent crashes:

```javascript
// CORRECT
const value = props.content?.propertyName || 'default'
const items = computed(() => props.content?.data || [])

// WRONG — crashes if content is undefined during initialization
const value = props.content.propertyName
```

#### Rule 2: Editor Code Blocks must be paired

Every `/* wwEditor:start */` MUST have a matching `/* wwEditor:end */`. Mismatched tags cause **catastrophic failure**. These blocks are removed in the production build.

```javascript
props: {
  uid: { type: String, required: true },
  content: { type: Object, required: true },
  /* wwEditor:start */
  wwEditorState: { type: Object, required: true },
  /* wwEditor:end */
}
```

#### Rule 3: Global Access via wwLib

**NEVER** access `document` or `window` directly. Use:

```javascript
// CORRECT
const doc = wwLib.getFrontDocument()
const win = wwLib.getFrontWindow()

// WRONG — breaks component isolation
document.querySelector('.my-class')
window.addEventListener('resize', handler)
```

#### Rule 4: Root Element without fixed dimensions

The root element MUST NOT have hardcoded width/height. It must adapt fluidly to the size defined by the user. Inner elements can have fixed dimensions.

#### Rule 5: props.content Reactivity (CRITICAL)

All `props.content` properties must be fully reactive. Use `computed()` for derived data, **NEVER** `ref()` or `reactive()`:

```javascript
// WRONG — loses reactivity when content changes in editor
const internalData = ref([])
watch(() => props.content?.data, (newVal) => {
  internalData.value = newVal
})

// CORRECT — always reactive
const internalData = computed(() => props.content?.data || [])
```

#### Rule 6: Complete Watch for reinitialization

When the component needs reinitialization, watch ALL properties that affect rendering:

```javascript
watch(() => [
  props.content?.theme,
  props.content?.size,
  props.content?.layout,
  props.content?.perLine,
  props.content?.customData,
  // EVERY prop that changes the visual output
], () => {
  setTimeout(() => {
    if (containerRef.value) reinitializeComponent()
  }, 50)
}, { deep: true })
```

Properties missing from the watch = broken editor experience.

---

### wwElement.vue — Complete Template (Dual Script Pattern)

This is the recommended pattern: two `<script>` blocks. The first for WeWeb metadata (Options API), the second for logic (Composition API).

```vue
<template>
  <div class="my-element" :style="dynamicStyles">
    <!-- Editor placeholder -->
    <!-- wwEditor:start -->
    <div v-if="!hasContent" class="editor-placeholder">
      <span>My Component</span>
      <small>Configure via settings panel</small>
    </div>
    <!-- wwEditor:end -->

    <!-- Actual content -->
    <div v-if="hasContent">
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
      <InnerPart
        v-for="item in items"
        :key="item.id"
        :item="item"
        @click="handleItemClick(item)"
      />
    </div>
  </div>
</template>

<!-- Block 1: WeWeb Metadata (Options API) -->
<script>
export default {
  name: 'MyElement',

  // REQUIRED: Must contain ALL properties from ww-config.js
  wwDefaultContent: {
    title: 'My Title',
    description: 'Description text',
    textColor: '#000000',
    backgroundColor: '#ffffff',
    data: [],
  },
}
</script>

<!-- Block 2: Logic (Composition API) -->
<script setup>
import { computed, watch, ref, onMounted } from 'vue';
import InnerPart from './components/InnerPart.vue'; // auto-registered

const props = defineProps({
  content: { type: Object, default: () => ({}) },
  uid: { type: String, default: '' },
  /* wwEditor:start */
  wwEditorState: { type: Object, default: () => ({}) },
  /* wwEditor:end */
});

const emit = defineEmits(['trigger-event']);

// --- Reactive computed from content (NEVER use ref for content data) ---
const title = computed(() => props.content?.title || 'My Title');
const description = computed(() => props.content?.description || '');
const items = computed(() => props.content?.data || []);
const hasContent = computed(() => items.value.length > 0);

// --- CSS variables via computed ---
const dynamicStyles = computed(() => ({
  '--text-color': props.content?.textColor || '#000000',
  '--bg-color': props.content?.backgroundColor || '#ffffff',
}));

// --- Internal state (OK to use ref for component-only state) ---
const selectedItem = ref(null);

// --- Event handlers ---
function handleItemClick(item) {
  selectedItem.value = item;
  emit('trigger-event', {
    name: 'item:click',
    event: { item, index: items.value.indexOf(item) },
  });
}
</script>

<style scoped>
.my-element {
  display: inline-block;
  min-width: 100px;
  min-height: 50px;
  color: var(--text-color);
  background: var(--bg-color);
  /* NO padding, margin on root — Editor manages these */
  /* NO hardcoded width/height on root */
}

/* wwEditor:start */
.editor-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  background: #f3f4f6;
  border: 2px dashed #9ca3af;
  border-radius: 8px;
}

.editor-placeholder span { font-size: 14px; font-weight: 600; color: #374151; }
.editor-placeholder small { font-size: 12px; color: #9ca3af; }
/* wwEditor:end */
</style>
```

**Advantages of the dual-script pattern `<script>` + `<script setup>`:**
- Component imports are **auto-registered** (no need for `components: {}`)
- Refs/computed/functions are **auto-exposed** to the template (no need for `return {}`)
- Props are **automatically reactive** (no need for `toRef`)
- Cleaner code (~90 fewer lines vs pure Options API)

**Script patterns supported by WeWeb (all work):**
1. `<script>` + `<script setup>` (RECOMMENDED — dual-script)
2. Pure Options API with `data()`/`methods`
3. `defineComponent()` with `setup()`

**NEVER convert `<script setup>` to Options API unnecessarily.** WeWeb supports both. If you do convert, common problems include:
- `content: props.content` in `return` creates a non-reactive reference that shadows the prop
- Manual `return {}` with 80+ variables is error-prone
- Explicit `components: {}` required (in `<script setup>`, auto-registration)

### Critical Rules

| Rule | Why |
|------|-----|
| `wwDefaultContent` with ALL props | Props won't show in Editor without it |
| Optional chaining on `props.content?.` | Prevents crash during initialization |
| `/* wwEditor:start/end */` paired | Mismatched tags = catastrophic failure |
| `wwLib.getFrontDocument/Window()` | Direct access to document/window breaks isolation |
| `computed()` for content data | `ref()` loses reactivity when content changes |
| NO `position: fixed` on root | Breaks drag & drop |
| NO hardcoded width/height on root | Must adapt to user-defined size |
| Define `min-width`/`min-height` | Allows selection in Editor |
| Single root element | No fragments |
| Avoid `padding`, `margin` on root | Managed by Editor |
| Keep `content` flat | Better WeWeb compatibility |
| NO `name` in ww-config.js root | Breaks drag & drop |

---

### ww-config.js — Complete Reference

```javascript
export default {
  // NO "name" property here!

  editor: {
    label: { en: 'My Component', pt: 'Meu Componente' },
    icon: 'table',  // Lucide icon name
  },

  properties: {
    // --- Text ---
    title: {
      label: { en: 'Title', pt: 'Titulo' },
      type: 'Text',
      defaultValue: 'My Title',
      bindable: true,
      section: 'settings',
    },

    // --- Color ---
    textColor: {
      label: { en: 'Text Color' },
      type: 'Color',
      defaultValue: '#000000',
      section: 'style',
      bindable: true,
    },

    // --- Number ---
    maxItems: {
      label: { en: 'Max Items' },
      type: 'Number',
      defaultValue: 10,
      options: { min: 1, max: 100, step: 1 },
    },

    // --- Length (with units) ---
    fontSize: {
      label: { en: 'Font Size' },
      type: 'Length',
      defaultValue: '16px',
      responsive: true,  // Different per breakpoint
      options: {
        unitChoices: [
          { value: 'px', label: 'px', min: 1, max: 100 },
          { value: 'em', label: 'em', min: 0.1, max: 10 },
        ],
      },
    },

    // --- Dropdown (NOTE: nested structure is mandatory) ---
    variant: {
      label: { en: 'Variant' },
      type: 'TextSelect',
      defaultValue: 'default',
      section: 'settings',
      bindable: true,
      options: {
        options: [
          { value: 'default', label: 'Default' },
          { value: 'compact', label: 'Compact' },
          { value: 'expanded', label: 'Expanded' },
        ],
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Valid values: default | compact | expanded',
      },
      /* wwEditor:end */
    },

    // --- Toggle ---
    showHeader: {
      label: { en: 'Show Header' },
      type: 'OnOff',
      defaultValue: true,
    },

    // --- Bindable Array (data source) ---
    data: {
      label: { en: 'Data Source' },
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [],
      options: {
        expandable: true,
        getItemLabel(item) {
          return item.name || item.label || `Item ${item.id}`
        },
        item: {
          type: 'Object',
          defaultValue: { id: 'item1', name: 'New Item' },
          options: {
            item: {
              id: { label: { en: 'ID' }, type: 'Text' },
              name: { label: { en: 'Name' }, type: 'Text' },
            },
          },
        },
      },
      /* wwEditor:start */
      bindingValidation: { type: 'array', tooltip: 'Array of objects with id and name' },
      /* wwEditor:end */
    },

    // --- Formula (field mapping for bound arrays) ---
    dataNameFormula: {
      label: { en: 'Name Field' },
      type: 'Formula',
      section: 'settings',
      options: content => ({
        template: Array.isArray(content.data) && content.data.length > 0
          ? content.data[0]
          : null,
      }),
      defaultValue: { type: 'f', code: "context.mapping?.['name']" },
      hidden: (content, sidepanelContent, boundProps) =>
        !Array.isArray(content.data) ||
        !content.data?.length ||
        !boundProps.data,
    },

    // --- Hidden (internal) ---
    internalConfig: {
      hidden: true,
      defaultValue: {},
    },

    // --- Dropzone ---
    headerSlot: {
      hidden: true,
      defaultValue: [],
      /* wwEditor:start */
      bindingValidation: { type: 'array' },
      /* wwEditor:end */
    },

    // --- Multi-language ---
    emptyMessage: {
      label: { en: 'Empty Message' },
      type: 'Text',
      defaultValue: 'No data',
      multiLang: true,
      bindable: true,
    },

    // --- Conditional visibility ---
    advancedOption: {
      label: { en: 'Advanced Option' },
      type: 'Text',
      defaultValue: '',
      hidden: content => !content?.showAdvanced,
    },
  },

  // Actions callable from WeWeb Workflows
  actions: [
    {
      label: 'Refresh Data',
      action: 'refreshData',
      args: [],
    },
    {
      label: 'Set Filter',
      action: 'setFilter',
      args: [
        { name: 'column', type: 'text', bindable: true },
        { name: 'value', type: 'text', bindable: true },
      ],
    },
  ],

  // Trigger Events emitted to WeWeb Workflows
  triggerEvents: [
    {
      name: 'row:click',
      label: { en: 'On Row Click' },
      event: { row: {}, index: 0 },
    },
    {
      name: 'data:loaded',
      label: { en: 'On Data Loaded' },
      event: { count: 0 },
    },
    {
      name: 'error',
      label: { en: 'On Error' },
      event: { message: '', code: '' },
    },
  ],
};
```

**TextSelect — MANDATORY format (nested options):**

```javascript
// WRONG — dropdown does not display options
mySelect: {
  type: 'TextSelect',
  options: { value1: 'Label 1', value2: 'Label 2' }
}

// CORRECT — nested structure is mandatory
mySelect: {
  label: { en: 'Select Option' },
  type: 'TextSelect',
  section: 'settings',
  options: {
    options: [
      { value: 'value1', label: 'Label 1' },
      { value: 'value2', label: 'Label 2' },
    ]
  },
  defaultValue: 'value1',
  bindable: true,
  /* wwEditor:start */
  bindingValidation: {
    type: 'string',
    tooltip: 'Valid values: value1 | value2',
  },
  /* wwEditor:end */
}
```

---

### Internal Variables (wwLib.wwVariable)

For interactive components that need to maintain state shareable with WeWeb workflows:

```javascript
// In <script setup>
const { value: internalValue, setValue: setInternalValue } =
  wwLib.wwVariable.useComponentVariable({
    uid: props.uid,
    name: 'value',
    type: 'string',
    defaultValue: 'default value',
  })

// Watch initialValue and reset internal variable
watch(() => props.content?.initialValue, (newValue) => {
  if (newValue !== undefined) {
    setInternalValue(newValue)
  }
}, { immediate: true })

// Emit trigger event on value change
const handleValueChange = (newValue) => {
  if (internalValue.value !== newValue) {
    setInternalValue(newValue)
    emit('trigger-event', {
      name: 'value-change',
      event: { value: newValue },
    })
  }
}
```

### Formula Processing (resolveMappingFormula)

For processing arrays with dynamic field mapping:

```javascript
const processedItems = computed(() => {
  const items = props.content?.data || []
  const { resolveMappingFormula } = wwLib.wwFormula.useFormula()

  return items.map(item => {
    const name = resolveMappingFormula(
      props.content?.dataNameFormula,
      item
    ) ?? item.name

    return {
      id: item.id || `item-${Date.now()}-${Math.random()}`,
      name: name || 'Untitled',
      originalItem: item,
      ...item,
    }
  })
})
```

---

### Dropzones (wwLayout)

**Configuration in ww-config.js:**

```javascript
dropzoneContent: {
  hidden: true,
  defaultValue: [],
  /* wwEditor:start */
  bindingValidation: { type: 'array' },
  /* wwEditor:end */
},

showDropzone: {
  label: { en: 'Show Dropzone' },
  type: 'OnOff',
  section: 'settings',
  defaultValue: true,
},

dropzoneHeight: {
  label: { en: 'Dropzone Height' },
  type: 'Length',
  section: 'style',
  defaultValue: '80px',
  hidden: content => !content?.showDropzone,
},
```

**Template:**

```vue
<!-- Simple dropzone -->
<wwLayout path="headerSlot" direction="column" class="header-zone" />

<!-- Conditional dropzone -->
<div v-if="content?.showDropzone" class="dropzone-area">
  <wwLayout
    path="dropzoneContent"
    direction="row"
    class="dropzone-container"
  />
</div>

<!-- Repeatable dropzone (binds to collection) -->
<wwLayout path="cards" direction="row" class="cards-zone">
  <template v-slot="{ item }">
    <wwLayoutItem class="card-item">
      <wwObject v-bind="item" />
    </wwLayoutItem>
  </template>
</wwLayout>
```

```scss
// REQUIRED: min-height for dropzones to allow dropping
.header-zone {
  min-height: 20px;
  display: flex;
  flex-direction: column;
}

.dropzone-area {
  border: 2px dashed #d0d0d0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  transition: all 0.2s ease;
}

/* wwEditor:start */
.dropzone-area:hover {
  border-color: #007aff;
  background: rgba(0, 122, 255, 0.05);
}
/* wwEditor:end */

.dropzone-container:empty::after {
  content: 'Drop content here';
  color: #999;
  font-style: italic;
}
```

For repeatable dropzones, use `bindable: 'repeatable'` in ww-config:

```javascript
cards: {
  hidden: true,
  bindable: 'repeatable',
  defaultValue: [],
},
```

---

### Nested Elements (wwElement)

```javascript
// ww-config.js — element created on instantiation
titleElement: {
  hidden: true,
  defaultValue: { isWwObject: true, type: 'ww-text' },
},
```

```vue
<!-- Render nested element, force text via computed -->
<wwElement v-bind="content.titleElement" :ww-props="{ text: computedTitle }" />
```

---

### Trigger Events — Correct Pattern

```javascript
// CORRECT — <script setup> pattern
emit('trigger-event', {
  name: 'row:click',               // Must match triggerEvents name
  event: { row: data, index: i },  // Must match event schema
});

// CORRECT — Options API pattern
this.$emit('trigger-event', {
  name: 'row:click',
  event: { row: data, index: i },
});

// WRONG — this won't trigger WeWeb workflows
this.$emit('row:click', data);  // Regular Vue emit, not WeWeb trigger
emit('row:click', data);        // Same problem in script setup
```

Ensure event data matches schema exactly. Missing fields = empty values in workflow.

---

### CSS Variables for Reactivity

```vue
<script setup>
const dynamicStyles = computed(() => ({
  '--primary-color': props.content?.primaryColor || '#fff',
  '--animation-speed': props.content?.speed || 1,
  '--gap-size': props.content?.gap || '8px',
}))
</script>

<template>
  <div :style="dynamicStyles" class="component">
    <slot />
  </div>
</template>

<style scoped>
.component {
  color: var(--primary-color);
  gap: var(--gap-size);
}

/* Animations with CSS variables */
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animated {
  animation: rotate calc(10s / var(--animation-speed)) linear infinite;
  will-change: transform;
}
</style>
```

**Animation performance:** Use `transform` and `opacity` for animations. Add `will-change` for animated elements.

---

### Multi-Page Sections (Reuse Pattern)

To reuse a configured component across pages:

1. Configure component inside a Section on page A
2. Rename the Section clearly (e.g., "CookieConsent - Main")
3. On page B: Add > Multi-page sections > find the Section
4. Choose **"Create an instance"** (NOT copy)
5. Changes to any instance reflect in all instances

---

### CSS Best Practices for WeWeb

```vue
<template>
  <div :style="cssVars" class="component">
    <!-- NEVER position: fixed on root -->
    <div class="fixed-container">
      <!-- Fixed content goes here -->
    </div>
  </div>
</template>

<style scoped>
.component {
  display: inline-block;
  min-width: 100px;
  min-height: 50px;
  /* NO padding, margin on root (Editor manages these) */
  /* NO hardcoded width/height on root */

  /* Use CSS variables from content */
  background: var(--bg-color);
  color: var(--text-color);
}

.fixed-container {
  position: fixed;
  z-index: 9999;
}

/* Responsive */
@media (max-width: 768px) {
  .component {
    min-width: 100%;
  }
}
</style>
```

**Avoid `lang="scss"` if not needed** — if you do use it, ensure `sass` is in devDependencies. The WeWeb webpack uses sass-loader to process ALL `<style>` tags (even plain CSS when sass-loader is present).

---

### Build & Deploy

```bash
# Local development
npm run serve              # Default port 8080
npm run serve -- port=4040 # Custom port

# Build (no args!)
npm run build
```

**HTTPS:** The dev server uses HTTPS. Authorize the certificate:
1. Navigate to `https://localhost:8080`
2. "Advanced" > "Continue to localhost"
3. Chrome: enable `chrome://flags` > "Allow invalid certificates for resources loaded from localhost"

**Load in Editor:**
1. Dev > Open Dev Editor
2. Dev > Add local Element (port 8080)
3. Accept SSL cert
4. Drag from "Local Elements" to page

**NOTE:** During dev, autosave is disabled (component may be inconsistent). Save manually before refreshing.

**Publish:**
1. Push to GitHub
2. Dashboard > Coded components > Import element
3. Select repo + branch > wait for build
4. Set active version
5. In Editor: Add > Coded components > drag

**Update:** Bump version in package.json > push > change active version in Dashboard.

---

### Common Property Types Reference

| Type | Example | Notes |
|------|---------|-------|
| `Text` | `{ type: 'Text', bindable: true, defaultValue: 'Default' }` | Simple text |
| `Color` | `{ type: 'Color', defaultValue: '#ffffff', bindable: true }` | Color picker |
| `Number` | `{ type: 'Number', options: { min: 0, max: 100, step: 1 } }` | With range |
| `OnOff` | `{ type: 'OnOff', defaultValue: true }` | Boolean toggle |
| `Length` | `{ type: 'Length', defaultValue: '16px' }` | With units (px, em, %) |
| `TextSelect` | `{ type: 'TextSelect', options: { options: [...] } }` | **Nested options mandatory** |
| `Array` | `{ type: 'Array', bindable: true, options: { expandable: true } }` | With getItemLabel |
| `Formula` | `{ type: 'Formula', options: content => ({...}) }` | Field mapping |
| `Object` | `{ type: 'Object', defaultValue: {} }` | Nested config |

---

### Troubleshooting Hierarchy (Diagnostic Priority)

> **Rule:** In WeWeb, `package.json` kills before Vue even runs.

When a component fails, investigate IN THIS ORDER:

1. **Build pipeline** — `rm -rf node_modules package-lock.json && npm install && npx weweb serve`
   - If `npm install` fails -> dependency problem (private deps, CLI version)
   - If `weweb serve` shows `ERROR` -> build problem (missing sass, forbidden config files)
2. **package.json** — diff against canonical template or a working component
3. **ww-config.js** — structure, TextSelect nested, bindingValidation
4. **Vue code** — only investigate AFTER confirming the build passes

**Anti-Fix-Spiral (3-Commit Rule):**
If 2 fix commits don't resolve the issue, **STOP and revert** to the last working state. Compare against a working component instead of continuing sequential debugging. Each fix on top of a wrong hypothesis makes the problem worse.

**Real case (data-exploration-rfcl v1.0.1->v1.0.6):** 5 fix commits attacked the script pattern (converting `<script setup>` -> Options API) when the real cause was a private npm package in `dependencies`. The revert + surgical fix in `package.json` resolved everything.

**Working reference components:**

| Component | Pattern | sass | private deps | `type:module` | CLI version |
|-----------|---------|------|--------------|---------------|-------------|
| `cookies_vue` | Pure Options API | no | no | no | latest |
| `float_buttons_vue` | `defineComponent()` + `setup()` | no | no | no | latest |
| `nps_vue` | Pure Options API | no | no | no | latest |
| `toast_notification_vue` | Pure Options API | no | no | no | latest |
| `sliders_vue` | Pure Options API | no | no | no | latest |
| `config_envios_mensagens` | Pure Options API | no | no | no | latest |
| `data_exploration_rfcl_vue` | `<script>` + `<script setup>` | yes | no | no | latest |

### Pre-Publish Checklist

**Dependencies:**
- [ ] `@weweb/cli: "latest"` in devDependencies
- [ ] `sass` in devDependencies (if using any CSS)
- [ ] ZERO private npm packages (@scope/...)
- [ ] NO `"type": "module"` in package.json
- [ ] NO build config files (webpack, vite, babel, tsconfig)

**Component:**
- [ ] `wwDefaultContent` has ALL properties from ww-config.js
- [ ] Optional chaining (`?.`) on ALL `props.content` access
- [ ] `/* wwEditor:start/end */` blocks paired
- [ ] `wwLib.getFrontDocument/Window()` instead of direct document/window
- [ ] `computed()` for content-derived data (never `ref()`)
- [ ] Root element without fixed width/height
- [ ] `min-width`/`min-height` defined on root
- [ ] Single root element (no fragments)
- [ ] NO `position: fixed` on root
- [ ] NO `padding`/`margin` on root

**Config:**
- [ ] No `name` in root of ww-config.js
- [ ] Labels in EN and PT
- [ ] TextSelect with nested structure `options: { options: [...] }`
- [ ] `bindingValidation` inside `/* wwEditor:start/end */`
- [ ] Actions have clear argument placeholders
- [ ] triggerEvents documented with correct schema

**Build:**
- [ ] Local build passes (`npx weweb serve` without ERRORs)
- [ ] No `name=`/`type=` args in build script
- [ ] Version bumped in package.json
- [ ] Responsive tested (desktop + mobile)
- [ ] Tested in WeWeb Editor (Dev Editor)
