import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-transparent text-foreground hover:bg-secondary hover:border-muted-foreground/30",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-accent text-accent-foreground font-bold shadow-lg shadow-highlight/20 hover:shadow-xl hover:shadow-highlight/30 hover:scale-[1.03] active:scale-[0.98]",
        "hero-outline": "border-2 border-highlight/30 text-highlight bg-highlight/5 hover:bg-highlight/10 hover:border-highlight/50 font-semibold",
        highlight: "bg-highlight text-accent-foreground font-bold hover:bg-highlight/90 shadow-md shadow-highlight/20 hover:shadow-lg hover:shadow-highlight/30 hover:scale-[1.02] active:scale-[0.98]",
        premium: "bg-gradient-gold text-foreground font-bold shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-4",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<"button">>,
    HTMLMotionProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
      // In asChild case, we must extract ALL motion-specific props
      // and ensure children is treated as standard ReactNode for Slot compatibility
      const { 
        whileHover, whileTap, transition, onAnimationStart, 
        onDragStart, onDragEnd, onDrag, onViewportEnter, 
        onViewportLeave, initial, animate, exit, variants,
        ...baseProps 
      } = props;
      
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...baseProps as any}
        >
          {props.children as React.ReactNode}
        </Slot>
      );
    }

    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        whileHover={variant !== "link" ? { scale: 1.015 } : undefined}
        whileTap={variant !== "link" ? { scale: 0.985 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
