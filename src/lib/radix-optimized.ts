// Optimized Radix UI imports to improve tree shaking
// Import only specific components needed instead of entire packages

// Button components
export { Slot } from "@radix-ui/react-slot";

// Label components
export { Root as LabelRoot } from "@radix-ui/react-label";

// Select components (import only used parts)
export {
  Content as SelectContent,
  Group as SelectGroup,
  Item as SelectItem,
  Label as SelectLabel,
  Root as SelectRoot,
  Trigger as SelectTrigger,
  Value as SelectValue,
} from "@radix-ui/react-select";

// Dialog components (import only used parts)
export {
  Close as DialogClose,
  Content as DialogContent,
  Description as DialogDescription,
  Overlay as DialogOverlay,
  Portal as DialogPortal,
  Root as DialogRoot,
  Title as DialogTitle,
  Trigger as DialogTrigger,
} from "@radix-ui/react-dialog";

// Alert Dialog components (import only used parts)
export {
  Action as AlertDialogAction,
  Cancel as AlertDialogCancel,
  Content as AlertDialogContent,
  Description as AlertDialogDescription,
  Overlay as AlertDialogOverlay,
  Portal as AlertDialogPortal,
  Root as AlertDialogRoot,
  Title as AlertDialogTitle,
  Trigger as AlertDialogTrigger,
} from "@radix-ui/react-alert-dialog";

// Scroll Area components
export {
  Corner as ScrollAreaCorner,
  Root as ScrollAreaRoot,
  Scrollbar as ScrollAreaScrollbar,
  Thumb as ScrollAreaThumb,
  Viewport as ScrollAreaViewport,
} from "@radix-ui/react-scroll-area";

// Common re-exports for easier usage
export type { ComponentProps as RadixComponentProps } from "react";
