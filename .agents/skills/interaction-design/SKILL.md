---
name: interaction-design
description: Design and implement microinteractions, motion design, transitions, and user feedback patterns. Use when adding polish to UI interactions, implementing loading states, or creating delightful user experiences.
---

# Interaction Design

Create engaging, intuitive interactions through motion, feedback, and thoughtful state transitions that enhance usability and delight users.

## When to Use This Skill

- Adding microinteractions to enhance user feedback
- Implementing smooth page and component transitions
- Designing loading states and skeleton screens
- Creating gesture-based interactions
- Building notification and toast systems
- Implementing drag-and-drop interfaces
- Adding scroll-triggered animations
- Designing hover and focus states

## Core Principles

### 1. Purposeful Motion
Motion should communicate, not decorate:

- **Feedback**: Confirm user actions occurred
- **Orientation**: Show where elements come from/go to
- **Focus**: Direct attention to important changes
- **Continuity**: Maintain context during transitions

### 2. Timing Guidelines
| Duration  | Use Case                                  |
| --------- | ----------------------------------------- |
| 100-150ms | Micro-feedback (hovers, clicks)           |
| 200-300ms | Small transitions (toggles, dropdowns)    |
| 300-500ms | Medium transitions (modals, page changes) |
| 500ms+    | Complex choreographed animations          |

### 3. Easing Functions
```css
/* Common easings */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1); /* Decelerate - entering */
--ease-in: cubic-bezier(0.55, 0, 1, 0.45); /* Accelerate - exiting */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); /* Both - moving between */
--spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Overshoot - playful */
```

## Quick Start: Button Microinteraction

```tsx
import { motion } from "framer-motion";

export function InteractiveButton({ children, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      {children}
    </motion.button>
  );
}
```

## Interaction Patterns

### 1. Loading States
**Skeleton Screens**: Preserve layout while loading

```tsx
function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-48 bg-gray-200 rounded-lg" />
      <div className="mt-4 h-4 bg-gray-200 rounded w-3/4" />
      <div className="mt-2 h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}
```

**Progress Indicators**: Show determinate progress

```tsx
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-blue-600"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ ease: "easeOut" }}
      />
    </div>
  );
}
```

### 2. State Transitions
**Toggle with smooth transition**:

```tsx
function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative w-12 h-6 rounded-full transition-colors duration-200
        ${checked ? "bg-blue-600" : "bg-gray-300"}
      `}
    >
      <motion.span
        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow"
        animate={{ x: checked ? 24 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
```

### 3. Page Transitions
**Framer Motion layout animations**:

```tsx
import { AnimatePresence, motion } from "framer-motion";

function PageTransition({ children, key }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

### 4. Feedback Patterns
**Ripple effect on click**:

```tsx
function RippleButton({ children, onClick }) {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ripple = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: Date.now(),
    };
    setRipples((prev) => [...prev, ripple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
    }, 600);
    onClick?.(e);
  };

  return (
    <button onClick={handleClick} className="relative overflow-hidden">
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full animate-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}\n    </button>\n  );\n}\n```\n\n### 5. Gesture Interactions\n**Swipe to dismiss**:\n\n```tsx\nfunction SwipeCard({ children, onDismiss }) {\n  return (\n    <motion.div\n      drag=\"x\"\n      dragConstraints={{ left: 0, right: 0 }}\n      onDragEnd={(_, info) => {\n        if (Math.abs(info.offset.x) > 100) {\n          onDismiss();\n        }\n      }}\n      className=\"cursor-grab active:cursor-grabbing\"\n    >\n      {children}\n    </motion.div>\n  );\n}\n```\n\n## CSS Animation Patterns\n\n### Keyframe Animations\n```css\n@keyframes fadeIn {\n  from {\n    opacity: 0;\n    transform: translateY(10px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n\n@keyframes pulse {\n  0%,\n  100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.5;\n  }\n}\n\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n\n.animate-fadeIn {\n  animation: fadeIn 0.3s ease-out;\n}\n.animate-pulse {\n  animation: pulse 2s ease-in-out infinite;\n}\n.animate-spin {\n  animation: spin 1s linear infinite;\n}\n```\n\n### CSS Transitions\n```css\n.card {\n  transition:\n    transform 0.2s ease-out,\n    box-shadow 0.2s ease-out;\n}\n\n.card:hover {\n  transform: translateY(-4px);\n  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);\n}\n```\n\n## Accessibility Considerations\n```css\n/* Respect user motion preferences */\n@media (prefers-reduced-motion: reduce) {\n  *,\n  *::before,\n  *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.01ms !important;\n  }\n}\n```\n\n```tsx\nfunction AnimatedComponent() {\n  const prefersReducedMotion = window.matchMedia(\n    \"(prefers-reduced-motion: reduce)\",\n  ).matches;\n\n  return (\n    <motion.div\n      animate={{ opacity: 1 }}\n      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}\n    />\n  );\n}\n```\n\n## Best Practices\n1. **Performance First**: Use `transform` and `opacity` for smooth 60fps\n2. **Reduce Motion Support**: Always respect `prefers-reduced-motion`\n3. **Consistent Timing**: Use a timing scale across the app\n4. **Natural Physics**: Prefer spring animations over linear\n5. **Interruptible**: Allow users to cancel long animations\n6. **Progressive Enhancement**: Work without JS animations\n7. **Test on Devices**: Performance varies significantly\n\n## Common Issues\n- **Janky Animations**: Avoid animating `width`, `height`, `top`, `left`\n- **Over-animation**: Too much motion causes fatigue\n- **Blocking Interactions**: Never prevent user input during animations\n- **Memory Leaks**: Clean up animation listeners on unmount\n- **Flash of Content**: Use `will-change` sparingly for optimization\n
