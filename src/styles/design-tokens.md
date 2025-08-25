# oPINion Design System

## Design Principles

- **Clean and Minimal**: Simple, understandable design focused on functionality
- **Professional**: Clean interface without emojis or gradients
- **Consistent**: Uniform spacing and typography using Tailwind utilities
- **Accessible**: Built on Shadcn/ui components with accessibility in mind

## Color Palette

### Primary Colors

- `slate-900` - Primary text and headers
- `slate-800` - Secondary text
- `slate-600` - Muted text
- `slate-500` - Placeholder text

### Background Colors

- `white` - Primary background
- `slate-50` - Secondary background
- `slate-100` - Card backgrounds

### Border Colors

- `slate-200` - Default borders
- `slate-300` - Hover borders

### Interactive Colors

- `blue-600` - Primary buttons and links
- `blue-500` - Hover states
- `green-600` - Success states
- `yellow-600` - Warning states
- `red-600` - Error states

## Typography

### Font Stack

- **Primary**: Geist Sans (via Next.js font optimization)
- **Monospace**: Geist Mono (for code elements)

### Font Sizes

- `text-xs` - 12px - Small labels
- `text-sm` - 14px - Body text, buttons
- `text-base` - 16px - Default body text
- `text-lg` - 18px - Large body text
- `text-xl` - 20px - Small headings
- `text-2xl` - 24px - Main headings

## Spacing

### Padding/Margin Scale

- `1` - 4px
- `2` - 8px
- `3` - 12px
- `4` - 16px
- `6` - 24px
- `8` - 32px
- `12` - 48px
- `16` - 64px

## Components

### Buttons

- **Primary**: `Button` component with default variant
- **Secondary**: `Button` with `variant="outline"`
- **Ghost**: `Button` with `variant="ghost"`

### Forms

- **Input**: `Input` component for text fields
- **Select**: `Select` component for dropdowns

### Layout

- **Card**: `Card` component for content containers
- **Dialog**: `Dialog` component for modals
- **Badge**: `Badge` component for status indicators

### Icons

- **Library**: Lucide React
- **Size**: Consistent 16px (h-4 w-4) for inline icons
- **Color**: Inherits from parent or uses muted-foreground

## Layout Guidelines

### Header

- Height: 64px (h-16)
- Background: Clean white with subtle border
- Branding: "oPINion" in serif font
- Search: Centered with max-width constraint
- User actions: Right-aligned with consistent spacing

### Main Content

- Full viewport height minus header: `h-[calc(100vh-64px)]`
- No background patterns or decorative elements
- Focus on map functionality

### Modals and Dialogs

- Use Shadcn/ui Dialog component
- Clean white background
- Subtle shadows for depth
- Consistent padding and spacing

## Responsive Design

### Breakpoints

- `sm`: 640px and up
- `md`: 768px and up
- `lg`: 1024px and up
- `xl`: 1280px and up

### Mobile Considerations

- Hide search on mobile (md:flex)
- Stack user info vertically on small screens
- Ensure touch targets are at least 44px

## Accessibility

### Color Contrast

- All text meets WCAG AA standards
- Interactive elements have sufficient contrast
- Focus states are clearly visible

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Focus indicators are visible
- Logical tab order maintained

### Screen Readers

- Semantic HTML structure
- Proper ARIA labels where needed
- Descriptive alt text for images
