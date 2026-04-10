# CSS Border Gradient Skill

This skill provides a technique for creating premium, semi-transparent gradient borders using CSS masks. This is ideal for glassmorphism and high-end UI designs where a simple border isn't enough to convey depth and luxury.

## Core Technique

The technique uses two gradients as masks:
1. One for the `content-box`.
2. One for the full element area.
By using `mask-composite: exclude` (or `xor` in some browsers), we only keep the area where the two masks *don't* overlap—which is exactly the border (the padding area).

## CSS Implementation

```css
.border-gradient-premium {
  position: relative;
  z-index: 0;
}

.border-gradient-premium::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit; /* Automatically matches the parent's radius */
  padding: 1px; /* The border thickness */
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  background: linear-gradient(
    to bottom right,
    rgba(255, 255, 255, 0.3) 0%,
    rgba(255, 255, 255, 0.05) 40%,
    rgba(255, 255, 255, 0.05) 60%,
    rgba(255, 255, 255, 0.3) 100%
  );
  pointer-events: none;
  z-index: -1;
}
```

## How to use

1.  Apply the class `.border-gradient-premium` to any element.
2.  Ensure the element has a `border-radius` defined (the pseudo-element will inherit it).
3.  Remove any standard `border` to avoid conflicts.

## Benefits
- **Pure CSS**: No images or extra DOM elements.
- **Glassmorphism**: Works perfectly with `backdrop-blur`.
- **Dynamic**: The gradient can be easily animated or changed via CSS variables.
