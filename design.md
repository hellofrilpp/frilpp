# BuyNow / Investoriq – Design System

This document captures the visual language of the app so you can reuse it across other products. It is written in a tech‑agnostic way, but maps directly to the existing Tailwind + shadcn-style setup in this repo.

---

## 1. Foundations

### 1.1 Color System (HSL tokens)

All colors are defined as CSS custom properties in `src/index.css` and surfaced through Tailwind in `tailwind.config.ts`. They are expressed as HSL triplets and used via `hsl(var(--token))`.

**Light mode (`:root`):**

- Primary: `--primary: 220 80% 25%` (deep navy)
- Primary foreground: `--primary-foreground: 210 20% 98%`
- Success: `--success: 150 65% 45%`
- Warning: `--warning: 40 90% 55%`
- Danger: `--danger: 0 75% 50%`
- Accent: `--accent: 210 90% 55%`
- Background: `--background: 210 20% 98%` (off‑white)
- Foreground: `--foreground: 220 20% 15%` (dark grey)
- Card: `--card: 0 0% 100%`
- Popover: `--popover: 0 0% 100%`
- Secondary: `--secondary: 220 15% 96%`
- Muted: `--muted: 220 15% 96%`
- Destructive: `--destructive: 0 75% 50%`
- Border / Input: `--border`, `--input: 220 15% 90%`
- Ring: `--ring: 220 80% 25%`

**Dark mode (`.dark`):**

- Background shifts to `--background: 220 20% 8%`
- Foreground shifts to `--foreground: 210 20% 98%`
- Card / Popover use slightly elevated, darker surfaces
- Primary / accent / semantic colors become slightly brighter for contrast

**Usage guidelines:**

- Use `background`/`foreground` for default page surfaces and text.
- Use `primary` for main actions, key highlights, and hero gradients.
- Use `success`, `warning`, and `danger` for semantic messaging, risk indicators, and KPIs.
- Use `secondary` and `muted` for subtle surfaces (filters, chips, side panels).
- Use `card` for any data container, panel, or summary block.

### 1.2 Border Radius

- Base token: `--radius: 0.5rem`
- Tailwind mapping:
  - `rounded-lg` → `var(--radius)` (default card / panel radius)
  - `rounded-md` → `calc(var(--radius) - 2px)`
  - `rounded-sm` → `calc(var(--radius) - 4px)`
- Buttons and inputs generally use `rounded-md`, cards use `rounded-lg`, badges use `rounded-full`.

### 1.3 Typography

Fonts are configured in `tailwind.config.ts` and `src/index.css`.

- Display: `font-display` → `Outfit, sans-serif`
  - Used for hero headings, section titles, and key metric titles.
- Body: `font-body` → `Inter, sans-serif`
  - Used for general content, labels, and descriptions.
- Mono: `font-mono` → `JetBrains Mono, monospace`
  - Used for code, technical labels, or numerical readouts where alignment matters.

Headings (`h1`–`h6`) apply `font-display`. Body text uses `font-body`. Use:

- `text-5xl font-bold` for hero titles.
- `text-3xl font-bold` for major section headings.
- `text-2xl font-semibold` for card titles.
- `text-sm text-muted-foreground` for descriptions and helper text.

### 1.4 Layout

- Global container: `container mx-auto px-4 md:px-8` with `max-w` capped at `2xl: 1400px`.
- Page height: top-level wrapper often uses `min-h-screen bg-background`.
- Spacing:
  - Vertical spacing between sections: `py-8`–`py-12`, `space-y-8`–`space-y-12`.
  - Grid gaps: `gap-4` for dense dashboards, `gap-6` for cards and content.
- Responsive grid:
  - `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for metrics and cards.
  - Use `lg:grid-cols-2` for side‑by‑side charts.

### 1.5 Motion & Effects

Defined in `tailwind.config.ts` and `src/index.css`:

- Keyframe-based animation utilities:
  - `animate-pulse` / `animate-pulse-analysis` for loading / live data.
  - `animate-number-counter` for metric transitions.
  - `animate-blob` with staggered delays for landing background blobs.
  - `animate-slide-in`, `animate-fade-in` for smooth entrances.
- Shadows:
  - `shadow-sm` for base elevation.
  - `shadow-card-hover` for elevated hover on interactive cards.
  - `shadow-elevation-*` for more pronounced depth on modals / key panels.

Use motion sparingly and purposefully—primarily to indicate interactivity or change, not for decoration.

---

## 2. Components and Patterns

This app uses a shadcn-style component set under `src/components/ui` plus domain-specific components under `src/components`. This section documents both visual style and behavior so you can recreate the same overall feel in other products.

### 2.1 Buttons

Implementation: `src/components/ui/button.tsx`.

**Base style:**

- Inline flex, center aligned.
- `text-sm font-medium`.
- Rounded (`rounded-md`).
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
- Disabled: `disabled:pointer-events-none disabled:opacity-50`.

**Variants (`variant` prop):**

- `default` — primary action
  - `bg-primary text-primary-foreground hover:bg-primary/90`
  - Use for main CTAs (e.g., “Dashboard”, “AI Assistant” primary).
- `secondary` — secondary surface action
  - `bg-secondary text-secondary-foreground hover:bg-secondary/80`
  - Use for supporting actions and secondary nav options.
- `outline` — low-emphasis, high-contrast action
  - `border border-input bg-background hover:bg-accent hover:text-accent-foreground`
  - In hero sections: sometimes customized to use light borders and text.
- `ghost` — text-like button
  - `hover:bg-accent hover:text-accent-foreground`
  - Use for subtle actions like filters or icon-only actions.
- `link` — inline link-style action
  - `text-primary underline-offset-4 hover:underline`
  - For inline text CTAs.
- `destructive` — destructive actions
  - `bg-destructive text-destructive-foreground hover:bg-destructive/90`
  - Use for deletes or irreversible changes.
- `success`, `warning`, `danger`
  - Semantic buttons aligned with status colors.
  - Use for confirm, cautious, or risk-heavy actions respectively.

**Sizes (`size` prop):**

- `default`: `h-10 px-4 py-2` for standard forms and actions.
- `sm`: `h-9 rounded-md px-3` for secondary or dense UIs.
- `lg`: `h-11 rounded-md px-8` for hero CTAs.
- `icon`: `h-10 w-10` for icon-only buttons.

**Usage guidelines:**

- One primary `default` button per context; others should be `secondary` or `outline`.
- Use `lg` size only for key flows (landing hero, onboarding).
- Keep icons left-aligned with consistent spacing (e.g., `mr-2`).
- For toggle groups (e.g., message type, template selection), use `default` for the currently active option and `outline` for inactive options.

### 2.2 Cards

Implementation: `src/components/ui/card.tsx`.

- Base `Card`:
  - `rounded-lg border bg-card text-card-foreground shadow-sm`
  - Intended for dashboard panels, property summaries, and data groupings.
- Subcomponents:
  - `CardHeader`: `flex flex-col space-y-1.5 p-6`
  - `CardTitle`: `text-2xl font-display font-semibold leading-none tracking-tight`
  - `CardDescription`: `text-sm text-muted-foreground`
  - `CardContent`: `p-6 pt-0`
  - `CardFooter`: `flex items-center p-6 pt-0`

**Usage guidelines:**

- Use cards for any self-contained content block: metrics, charts, lists, or summaries.
- Keep actions in `CardFooter` when possible for consistent placement.
- For hoverable / clickable cards, add `card-hover` (shadow + lift) or `hover:shadow-lg transition-shadow` as shown in the design system patterns.

### 2.3 Form Inputs

**Text input:** `src/components/ui/input.tsx`

- Base style:
  - `flex h-10 w-full rounded-md`
  - Light border (`border-gray-300`) and white background.
  - `px-3 py-2 text-sm`
  - `placeholder:text-gray-500`
  - Focus ring: `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`
  - Disabled states use a consistent opacity and cursor.

**Textarea:** `src/components/ui/textarea.tsx`

- Base style:
  - `flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm`
  - Uses semantic `border-input`, `bg-background`, and `ring-ring` tokens.
  - Placeholder: `text-muted-foreground`.

**Other inputs:**

- `select`, `slider`, `tabs`, `label`, `progress`, `toast` follow the same radius, focus, and color tokens.
- Sliders use a custom thumb styled with `--primary` and `--background`.

**Usage guidelines:**

- Use semantic tokens (`border-input`, `bg-background`) whenever possible to support theming.
- Reserve the non-semantic gray-based input style for compatibility cases; prefer updating to use the semantic tokens if you generalize this design system.

### 2.4 Labels

Implementation: `src/components/ui/label.tsx`.

- `text-sm font-medium leading-none`.
- Uses `peer-disabled` utilities to fade and disable pointer events when the associated input is disabled.
- Frequently combined with inline hints in `text-xs text-muted-foreground` for contextual information (e.g., “(not required)” labels).

### 2.5 Tabs

Implementation: `src/components/ui/tabs.tsx`.

- `TabsList`:
  - `inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground gap-1 w-full`.
  - Gives a soft, muted pill background for the whole tab group.
- `TabsTrigger`:
  - Base: `inline-flex items-center justify-center whitespace-nowrap rounded-sm py-1.5 text-sm font-medium transition-all`.
  - Focus: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
  - Active: `data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-sm`.
- `TabsContent`:
  - `mt-2` spacing and standard focus ring behavior.

Tabs look like segmented controls: inactive tabs are muted; active tab is a dark pill with white text and a light shadow.

### 2.6 Badges and Status

Implementation: `src/components/ui/badge.tsx` and risk helpers in `src/index.css`.

- Base badge:
  - `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold`
  - Focus ring consistent with buttons.
- Variants:
  - `default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `danger`
- Risk utilities (for labels / chips):
  - `.risk-low`: `bg-success/10 text-success border-success/20`
  - `.risk-medium`: `bg-warning/10 text-warning border-warning/20`
  - `.risk-high`: `bg-danger/10 text-danger border-danger/20`

**Usage guidelines:**

- Use badges for compact labels (status, type, tags).
- Use risk classes for scoring, alerts, and risk segmentation visuals.

### 2.7 Data Visualization Styles

- Gradient helpers:
  - `gradient-hero`: primary–accent hero gradient (used on landing / hero sections).
  - `gradient-success`: green success gradient for positive KPIs.
  - `gradient-mesh`: soft radial mesh for modern backgrounds.
- Heatmap backgrounds:
  - `.gradient-heatmap-low`: green-tinted background.
  - `.gradient-heatmap-medium`: amber-tinted background.
  - `.gradient-heatmap-high`: red-tinted background.

Charts (Recharts) in `DesignSystemDemo` use:

- Primary blue (`hsl(220, 80%, 45%)`) for bars / key series.
- Palette array mixing primary, success, warning, danger, accent for pie segments.

**Usage guidelines:**

- Use `primary` / `accent` for neutral metrics; success/warning/danger for performance / risk metrics.
- Keep chart backgrounds white or `bg-card` with soft gridlines for clarity.

### 2.8 Dialogs (Modals)

Implementation: `src/components/ui/dialog.tsx` and domain dialogs (e.g., role switch confirm).

- Overlay:
  - `fixed inset-0 bg-black/50 backdrop-blur-sm`.
  - Semi-opaque black scrim with subtle blur for depth without harshness.
- Positioning:
  - `fixed inset-0 z-50 flex items-center justify-center`.
- Content:
  - `bg-background rounded-lg shadow-lg border p-6 w-full max-w-md mx-4`.
  - Card-like surface, consistent radius and border.
- Behavior:
  - Body scroll is locked when open to keep focus in the dialog.
  - Clicking the scrim closes the dialog; clicks inside the content do not propagate.

Use dialogs for confirmations and focused flows that require a decision without navigating away.

### 2.9 Dropdown Menus

Implementation: `src/components/ui/dropdown-menu.tsx`.

- Triggers and items:
  - `flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm`.
  - Focus / open states use `bg-accent` to indicate selection without heavy borders.
- Content:
  - `rounded-md border bg-background p-1 text-foreground shadow-lg`.
  - Animated in/out with subtle fade, zoom, and directional slide classes.
- Icons:
  - Chevron for submenu items.
  - Check or dot indicators for selected items.

Menus are light and airy, with small radii and minimal chrome.

### 2.10 Toasts (Notifications)

Implementation: `src/components/ui/toast.tsx`.

- Container:
  - `fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none`.
  - Each toast is individually clickable while the stack itself does not block the page.
- Toast card:
  - `flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[300px] max-w-[500px] animate-in slide-in-from-top-5`.
- Variants:
  - `default`: `bg-background border-border`.
  - `success`: `bg-green-50 border-green-200 text-green-900`.
  - `error`: `bg-red-50 border-red-200 text-red-900`.
  - `warning`: `bg-yellow-50 border-yellow-200 text-yellow-900`.
  - `info`: `bg-blue-50 border-blue-200 text-blue-900`.
- Icons:
  - Colored lucide icons (e.g., `text-red-600` on error) to reinforce meaning.
- Behavior:
  - Auto-dismiss after ~5 seconds.
  - Close button uses soft gray text (`text-gray-400 hover:text-gray-600`).

Error toasts are noticeable but not loud: pale red background, thin red border, and moderate red text instead of solid red blocks.

### 2.11 Progress & Gauges

**Linear progress:** `src/components/ui/progress.tsx`

- Track: `relative h-4 w-full overflow-hidden rounded-full bg-secondary`.
- Fill: `bg-primary` with `transition-all duration-300 ease-in-out`, width determined by `value/max`.
- Frequently recolored via variant classes (e.g., success/warning/danger) using `[&>div]:bg-*`.

**Risk score gauge:** `src/components/RiskScoreGauge.tsx`.

- Semi-circular gauge with:
  - Muted background arc.
  - Foreground arc colored by risk level (`success`, `warning`, `danger`).
  - Center value text in `font-mono` with a small label.

Gauges feel analytical and data-oriented, avoiding overly “gamified” visuals.

### 2.12 Risk Indicators

Implementation: `src/components/RiskIndicator.tsx`.

- Icon:
  - `CheckCircle`, `AlertTriangle`, or `XCircle` with matching semantic color (`text-success`, `text-warning`, `text-danger`).
- Label:
  - `Badge` with variant matching risk (`success`, `warning`, `danger`) and size classes (`text-xs`–`text-base`).
- Score:
  - `font-mono font-semibold` score text (`{score}/100`).
- Progress:
  - `Progress` bar colored according to risk level.
- Thresholds:
  - Score ≥ 70 → “Low Risk”.
  - Score ≥ 40 → “Medium Risk”.
  - Below 40 → “High Risk”.

Risk visuals are clear but not alarming: color communicates risk, but layout and density stay calm and structured.

### 2.13 Metric Cards

Implementation: `src/components/MetricCard.tsx`.

- Card:
  - Uses `Card` with `card-hover` and variant-specific backgrounds:
    - `success`: `border-success/20 bg-success/5`.
    - `warning`: `border-warning/20 bg-warning/5`.
    - `danger`: `border-danger/20 bg-danger/5`.
- Header:
  - Title: `text-sm font-medium text-muted-foreground`.
  - Optional icon in `text-muted-foreground`.
- Value:
  - `font-mono text-2xl font-bold text-foreground animate-number-counter`.
  - Large but not oversized; designed for dashboards.
- Trend:
  - Tiny `%` delta with semantic color (`text-success` / `text-danger`).
- Optional description:
  - `mt-1 text-xs text-muted-foreground`.

Overall, metrics emphasize concise numbers with subtle semantic color washes.

### 2.14 Property Cards

Implementation: `src/components/PropertyCard.tsx`.

- Structured card summarizing:
  - Address (prominent).
  - Price, yield, and key property stats (beds, baths, etc.).
  - Risk score / status where applicable.
- Visual treatment:
  - Uses `Card` surface with consistent padding.
  - `card-hover` for lift and shadow on hover.

This pattern can be reused for other entity tiles (e.g., tenants, investors, listings).

### 2.15 Messaging Interface

Implementation: `src/components/MessageInterface.tsx`.

- Card layout:
  - `Card` with a header (`MessageSquare` icon + title) and `CardContent` with `space-y-4`.
- Message type toggle:
  - Two small buttons (`size="sm"`), using `default` for active and `outline` for inactive.
- Template buttons:
  - Small outline buttons used as chips, with selected state using `default`.
- Thread:
  - `border rounded-lg p-4 max-h-64 overflow-y-auto space-y-3`.
  - Each message:
    - Top row: outline badge for type (SMS/Email) + timestamp in `text-xs text-muted-foreground`.
    - Body: `text-sm whitespace-pre-wrap`.
- States:
  - Loading: centered `_Loading messages..._` text in muted colors.
  - Empty: centered `_No messages yet_`.
- Composer:
  - `Textarea` plus buttons: subtle secondary action (schedule interview) and primary send action.

Tone is communication-oriented but still within the core design language: cards, muted metadata, semantic buttons.

### 2.16 User Status Pill

Implementation: `src/components/UserStatus.tsx`.

- Avatar:
  - `flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary` with `User` icon.
- Text:
  - Display name as small link-style button (`text-xs font-medium hover:underline`).
- Role:
  - Tiny outline `Badge` (`text-[10px] px-2 py-0 h-4`) aligned to the right.
- Logout:
  - `Button variant="ghost" size="icon"` with `LogOut` icon, small and unobtrusive.

The user pill is compact and subtle, suitable for persistent placement in the top-right corner.

### 2.17 Global Error Boundary

Implementation: `src/components/ErrorBoundary.tsx`.

- Layout:
  - `min-h-screen bg-background flex items-center justify-center p-4`.
  - Central `Card` with max width (`max-w-md w-full`).
- Visual tone:
  - Title row: `AlertCircle` icon in `text-destructive`, title text “Something went wrong”.
  - Description: short, calm copy (“An unexpected error occurred. Please try again.”).
  - Optional error details: `text-sm text-muted-foreground bg-muted p-3 rounded`.
- Actions:
  - Primary retry button (default variant) and secondary “Go Home” outline button with `Home` icon.

Even for global errors, the style is controlled and friendly: small red accents, neutral surfaces, and clear recovery actions.

### 2.18 Form-Level Errors (Login Example)

Implementation: `src/pages/Login.tsx`.

- Error banner:
  - `flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md`.
  - Includes `AlertCircle` icon and error text.
- Placement:
  - Appears directly above form fields inside the card, without obscuring the rest of the UI.

**Error styling principles across the app:**

- Errors are highlighted with pale backgrounds and thin borders, not solid red blocks.
- Icon + text pairing is used instead of color alone.
- Error messaging is brief and action-oriented (“Please try again.”, “Login failed. Please try again.”).

---

## 3. Page-Level Patterns

### 3.1 Landing / Hero

Pattern (see `src/pages/DesignSystemDemo.tsx` and `Landing` page):

- Top `Branding` block inside `container mx-auto px-4 pt-6`.
- Hero section:
  - Wrapper: `gradient-hero text-primary-foreground py-16`.
  - Title: `font-display text-5xl font-bold mb-4 text-balance`.
  - Subtitle: `text-xl text-primary-foreground/90 mb-8`.
  - Actions: flex row / wrap of `Button` components with `lg` size.
- Use one strong primary CTA (`variant="default"`) and multiple `secondary` / `outline` CTAs for navigation.

### 3.2 Dashboard / Overview

Pattern (see `DesignSystemDemo` metrics and market sections):

- Page wrapper: `min-h-screen bg-background`.
- Inside container: `py-12 space-y-12`.
- Metrics row:
  - `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4`.
  - Each metric uses a card-like component (`MetricCard`) with icon, label, value, and optional variant (`success`, `warning`, etc.).
- Charts:
  - Place two charts side-by-side on `lg:` using `grid grid-cols-1 lg:grid-cols-2 gap-6`.
  - Wrap each chart in a `Card` with a title, description, and `CardContent` for the chart canvas.

### 3.3 Lists and Detail Views

Pattern (Properties, Tenants, Investors, Market, etc.):

- List pages:
  - Section header with `flex items-center justify-between mb-6`.
  - Title: `font-display text-3xl font-bold`.
  - Right-aligned actions: `Button variant="outline"` or `secondary`.
  - Content as grid or list of `Card`/`PropertyCard` with consistent padding and hover states.
- Detail pages:
  - Use a main `Card` for key info, with subcards for related metrics, risks, and timelines.
  - Keep primary actions in the header or footer of the main card.

### 3.4 Auth Screens (Login)

Pattern (see `src/pages/Login.tsx`):

- Background:
  - Soft gradient: `bg-gradient-to-br from-blue-50 to-indigo-100`.
  - Clean, minimal backdrop that feels welcoming and modern.
- Layout:
  - `min-h-screen flex items-center justify-center p-4`.
  - Central `Card` (`max-w-md`) with branding above in a dedicated header area.
- Card:
  - Title: `text-2xl font-bold`.
  - Description: succinct copy in `text-sm text-muted-foreground`.
  - Form fields spaced using `space-y-4`.
- Error handling:
  - Inline error banner (as described in 2.18) above fields.
- Actions:
  - Primary submit button spans full width.
  - Secondary text row below with inline link styled in blue (`text-blue-600 hover:text-blue-800`).
- Extra info:
  - Default credentials displayed below card in `text-sm text-gray-500` with `font-mono` for the example password.

---

## 4. Utility Conventions

- `text-balance` for multi-line hero headings.
- `smooth-scroll` for smooth in-page navigation.
- `hide-scrollbar` for scrollable containers where visual scrollbar is distracting.
- `[data-state="active"][role="tab"]` gets extra right padding (1mm) for active tab emphasis.

---

## 5. How to Reuse in Other Products

When creating a new product or app:

1. **Copy the tokens and theme:**
   - Bring over the `:root` and `.dark` CSS variables from `src/index.css`.
   - Mirror the `extend.colors`, `fontFamily`, `borderRadius`, `boxShadow`, and `backgroundImage` sections from `tailwind.config.ts`.
2. **Reuse the UI primitives:**
   - Port `src/components/ui/*` components (button, card, badge, input, textarea, etc.).
   - Keep the same props (`variant`, `size`) to maintain consistency.
3. **Follow the page patterns:**
   - Structure landing, dashboard, list, and detail pages following the examples in `src/pages` (especially `DesignSystemDemo`, `Dashboard`, property/tenant pages).
4. **Keep semantics consistent:**
   - Use semantic colors (`success`, `warning`, `danger`, `muted`, etc.) instead of hard-coded hex values.
   - Use the same typography scale and spacing conventions for a familiar look and feel.

Using this document as a reference, you can recreate the same visual language—colors, buttons, cards, typography, and layout—across other apps while staying consistent with the original BuyNow / Investoriq experience.
