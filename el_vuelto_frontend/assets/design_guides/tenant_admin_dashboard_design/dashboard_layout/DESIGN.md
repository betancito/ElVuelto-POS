# Design System: The Artisan’s Ledger

## 1. Overview & Creative North Star
This design system is built to transform a standard point-of-sale interaction into a warm, tactile, and editorial experience. We are moving away from the cold, clinical "SaaS blue" aesthetic of modern fintech and embracing a Creative North Star we call **"The Hearth & The Ledger."**

The system balances the organic, rustic warmth of a traditional Colombian bakery (The Hearth) with the unwavering precision of a professional financial tool (The Ledger). We achieve this through a "High-End Editorial" lens: utilizing dramatic typographic scales, intentional asymmetry, and a refusal to use standard container borders. The interface should feel less like a software grid and more like a beautifully typeset cookbook or a premium physical menu.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the earth, the oven, and the grain. We use rich, baked tones to evoke trust and local familiarity.

### The "No-Line" Rule
To maintain a premium, seamless feel, **1px solid borders are prohibited for sectioning.** Boundaries must be defined solely through:
- **Background Color Shifts:** Use `surface_container_low` for the main canvas and `surface_container_highest` for interactive areas.
- **Tonal Transitions:** Defining an area by its weight, not its outline.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine parchment.
- **Base Layer:** `surface` (#fff8f0).
- **Secondary Areas:** `surface_container_low` (#faf3e8) for sidebars or secondary navigation.
- **Interactive Containers:** `surface_container_lowest` (#ffffff) for cards and modals to create a "lift" through brightness rather than shadow.

### The "Glass & Baked Gradient" Rule
For primary actions (e.g., *Cobrar*), do not use flat colors. Use a subtle linear gradient from `primary` (#6a2600) to `primary_container` (#8b3a0f) at a 135-degree angle. This mimics the natural color variation of a well-baked loaf of bread. For floating elements or top bars, use **Glassmorphism**: a semi-transparent `surface` color with a 20px backdrop-blur to allow the rich terracotta and amber tones to bleed through.

---

## 3. Typography
Our typography is the primary driver of the "Editorial" feel. It balances artisanal beauty with technical utility.

- **Display & Headlines (Playfair Display / Noto Serif):** Used for titles, bakery names, and large totals. It provides an authoritative, "neighborhood classic" feel. 
- **Interface & Titles (DM Sans / Plus Jakarta Sans):** Used for navigation and product names. It is clean, modern, and highly legible.
- **The "Vuelto" Mono (JetBrains Mono):** All currency, weights, and quantities must use the Monospace scale. This signals precision and prevents layout "jumping" as numbers change during a transaction.

| Level | Token | Font | Size | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Playfair Display | 3.5rem | High-impact hero totals |
| **Headline** | `headline-md` | Playfair Display | 1.75rem | Section headers (e.g., "Panadería") |
| **Title** | `title-lg` | DM Sans | 1.375rem | Product names in the cart |
| **Body** | `body-md` | DM Sans | 0.875rem | Standard interface text |
| **Label** | `label-md` | DM Sans | 0.75rem | Helper text, Nequi/Bancolombia tags |

---

## 4. Elevation & Depth
In this system, depth is felt, not seen. We avoid heavy shadows in favor of **Tonal Layering.**

- **Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` background. This creates a soft, natural lift that feels like physical paper.
- **Ambient Shadows:** For elevated modals or floating "Vuelto" summaries, use a shadow with a 32px blur, 0px offset, and 6% opacity. The shadow color must be a tinted version of `on_surface` (a warm brown-black) rather than a neutral gray.
- **The "Ghost Border" Fallback:** If accessibility requires a container edge, use the `outline_variant` token at 15% opacity. It should be a suggestion of a line, not a hard stop.

---

## 5. Components

### Buttons (Acciones)
- **Primary (*Cobrar*):** Large radius (`radius-lg`), using the "Baked Gradient" (`primary` to `primary_container`). Text is `on_primary`.
- **Secondary (*Agregar*):** `surface_container_high` background with `primary` text. No border.
- **Tertiary (*Cancelar*):** Ghost style. No background, `on_surface_variant` text, underlined on hover.

### Cards & Lists (Productos y Pedidos)
- **Rule:** **Strictly no divider lines.** Separate list items using 12px of vertical white space or a subtle shift to `surface_container_low` on hover.
- **Layout:** Use asymmetrical padding (e.g., 24px left, 16px right) to create a custom, high-end editorial rhythm.

### Input Fields (Entradas)
- Background: `surface_container_highest` (#e8e2d7).
- Shape: `radius-md` (1.5rem).
- Active State: Instead of a blue border, use a 2px `primary` (Terracotta) bottom-only border to mimic a signature line on a receipt.

### Chips (Categorías)
- Use `secondary_container` for the background and `on_secondary_container` for text. These should be pills (`radius-full`) to contrast against the more architectural squareness of the POS grid.

---

## 6. Do’s and Don’ts

### Do
- **Use Colombian Spanish:** Use "Vuelto" instead of "Cambio," and "Cobrar" instead of "Checkout."
- **Embrace White Space:** High-end design breathes. Give the product names room to exist.
- **Use Tonal Monospace:** Display currency in `tertiary` (Verde) when it represents profit or successful payment.

### Don’t
- **No Corporate Grays:** Never use #333333 or #F5F5F5. Use our warm neutrals (`surface_dim` or `on_surface_variant`).
- **No Sharp Corners:** Avoid 0px or 4px radii. We are "warm and local"; our shapes should be soft and approachable (`radius-lg` is the standard).
- **No Floating "Ghost" Buttons:** Every interaction must feel grounded in the surface hierarchy. If a button is secondary, give it a subtle tonal background, not just a border.