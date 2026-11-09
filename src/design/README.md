# Redesign design tokens

These apply only to the redesign (`html[data-redesign]`). The as-tested prototype never reads them.

| File | What it holds |
| --- | --- |
| `colors.json` | Colour tokens by group. `value` is what renders. `replaces` lists the old hard-coded hexes the token takes over (`"text:#0c0c0e"` limits it to one utility). `scope: "all"` also recolours Discord pieces; the default is Xbox surfaces only. `reference` lists data colours that are deliberately not themed. |
| `typography.json` | Font `families` (stack plus `@font-face` files) and named text `styles`. |
| `components.json` | `radius`, `motion` and per-component specs. Values can reference `{color.x}`, `{style.x}`, `{font.x}`, `{motion.x}` or `{radius.x}`. |

## Editing

- **Change a colour:** edit its `value`. Every remapped class, CSS rule and JS consumer follows.
- **Add a colour:** give the new token a `replaces` list. The generator (run by Vite on start and save, or with `npm run tokens`) writes `generated/redesign-colors.css`. Any hex in the source without a token is reported in the console and on the design page.
- **In code:** use `var(--rd-<token>)` in CSS. In JS, `import { color, components, style } from './design/tokens.js'`.

See everything at **`/design.html`**.
