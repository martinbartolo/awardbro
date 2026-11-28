import type * as React from "react";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "border-2 border-primary bg-background text-primary shadow-xs hover:bg-primary hover:text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        // Quiet: icon actions and the way out beside a main button, never the action colour
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        // The quiet way out as a bordered button, beside a main one
        quiet:
          "border-2 border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        iconSm: "size-8",
        // Pills: the host views' actions, the main one larger
        pill: "h-12 rounded-full px-6 text-base font-semibold has-[>svg]:px-5",
        pillLg: "h-14 rounded-full px-8 text-lg font-bold has-[>svg]:px-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    tooltip?: string | React.ReactNode;
    tooltipOptions?: {
      side?: React.ComponentProps<typeof TooltipContent>["side"];
      align?: React.ComponentProps<typeof TooltipContent>["align"];
      sideOffset?: React.ComponentProps<typeof TooltipContent>["sideOffset"];
      style?: React.CSSProperties;
      className?: string;
      delayDuration?: number;
    };
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  tooltip,
  tooltipOptions,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  const buttonElement = (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );

  const wrappedButton = tooltip ? (
    <TooltipProvider>
      <Tooltip delayDuration={tooltipOptions?.delayDuration}>
        <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
        <TooltipContent
          side={tooltipOptions?.side}
          align={tooltipOptions?.align}
          sideOffset={tooltipOptions?.sideOffset}
          style={tooltipOptions?.style}
          className={tooltipOptions?.className}
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    buttonElement
  );

  return wrappedButton;
}

export { Button, buttonVariants };
