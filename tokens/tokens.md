# Design Tokens

Quelle: Figma Foundations (`ZLauURKqRW3FouiBZ6XDmC`)

- Colour: `18:2632`
- Typography: `25:1459`
- Spacing: `18:798`
- Object styles: `739:10478`

Die Rohdaten liegen in `tokens/design-tokens.json`.

## Nutzung in Tailwind

Tailwind lädt die Tokens in `tailwind.config.js` und stellt sie als Utilities bereit.

### Color (Beispiele)

- `bg-brand-vodafone`
- `text-brand-red`
- `bg-secondary-aquaBlue`
- `text-semantic-textNeutral`
- `border-semantic-borderSubtle`
- `bg-neutral-5`, `text-neutral-95`

### Typography

- `font-vodafone`
- `font-regular`, `font-light` (aus Token-Weights)
- `text-heading-md`, `text-heading-sm`, `text-body-md`

### Spacing

Token-Spacings sind als `spacing-*` verfügbar:

- `p-spacing-24`
- `gap-spacing-12`
- `mt-spacing-16`
- `h-spacing-8`

### Object Style

- `shadow-tokenShadow28`
- `shadow-focusOutline`
- `border-focus`, `border-navigation`, `border-divider`
- `rounded-sm`, `rounded-md`, `rounded-tokenFull`
- `opacity-38`, `opacity-60`

## Hinweise

- In den Figma-Spacings gibt es ein Token `--spacing-56` (mit zusätzlichem Bindestrich).
  Das ist im Tailwind-Key bewusst als `spacing-56` verfügbar.
- Alias-Tokens (z. B. `--borderWidthFocus`) sind in `design-tokens.json` dokumentiert und in Tailwind auf die Base-Werte gemappt.

## Dark Mode Kontrast

Für hohe Lesbarkeit werden im Dark Mode ausschließlich Token-nahe Monochrome-Werte verwendet:

- Text primär: `dark:text-neutral-5`
- Text sekundär: `dark:text-neutral-25`
- Flächen: `dark:bg-neutral-85` / `dark:bg-neutral-95`
- Borders: `dark:border-neutral-50/70`

So bleiben Kontraste konsistent, ohne von den Token-Familien abzuweichen.

## Chart/Progress Palette (AA-orientiert)

Bereichsfarben werden im Dark Mode auf hellere Tints gemappt:

- Design
  Light: `bg-brand-vodafone`
  Dark: `dark:bg-brand-redTint`
- Code
  Light: `bg-secondary-springGreen`
  Dark: `dark:bg-secondary-springGreenTint`
- Content (gesamt)
  Light: `bg-secondary-blue`
  Dark: `dark:bg-secondary-blueTint`
- Content (Rate/Distribution)
  Light: `bg-secondary-aquaBlue` / `bg-secondary-turquoise`
  Dark: `dark:bg-secondary-aquaBlueTint` / `dark:bg-secondary-turquoiseTint`

Progress-Track:

- Light: `bg-neutral-25`
- Dark: `dark:bg-neutral-85`
