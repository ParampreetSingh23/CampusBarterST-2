# Campus Barter Web App - Design Guidelines

## Design Approach
**Reference-Based Marketplace Pattern** drawing from Facebook Marketplace's clarity, Airbnb's trust-building elements, and Linear's clean typography. The design prioritizes quick browsing, trust signals, and effortless item discovery for college students.

## Typography System

**Font Families:**
- Primary: Inter (Google Fonts) - clean, modern sans-serif for UI
- Accent: Outfit (Google Fonts) - friendly, rounded for headings

**Hierarchy:**
- Hero/Page Titles: Outfit, 3xl-4xl, bold
- Section Headers: Outfit, 2xl, semibold
- Item Titles: Inter, lg, semibold
- Body Text: Inter, base, regular
- Labels/Meta: Inter, sm, medium
- Captions: Inter, xs, regular

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, and 12 consistently
- Component padding: p-4 or p-6
- Section spacing: py-12 or py-16
- Card gaps: gap-4 or gap-6
- Element margins: m-2, m-4, m-8

**Grid System:**
- Desktop: 3-4 column card grid for item listings
- Tablet: 2 column grid
- Mobile: Single column stack

## Core Pages & Layouts

### Authentication Pages (Login/Signup)
- Centered card layout with max-w-md
- Split design: Form on left, campus-themed imagery on right (desktop only)
- Logo at top center
- Form fields with generous spacing (gap-4)
- Large CTA button at bottom
- "Switch to Login/Signup" link below
- Trust elements: "Trusted by 5,000+ students" badge

### Dashboard (Main Listings)
- Top navigation bar: Logo left, search bar center, user profile/post item right
- Filter tabs below nav: "All Items" | "For Barter" | "For Sale"
- Secondary filters: Category dropdown, sort by (newest, price)
- Masonry-style card grid (3-4 columns desktop, responsive)
- Each item card: Large image (16:9 ratio), title, category badge, price/trade text, user avatar tiny
- "Load More" button at bottom (not infinite scroll)
- Floating action button (bottom right mobile): "Post Item" with plus icon

### Item Details Page
- Two-column layout (desktop): Image gallery left (60%), details right (40%)
- Image gallery: Main large image with thumbnails below
- Details column includes:
  - Item title (2xl, bold)
  - Posted by section: Avatar, name, verified badge, "Message Seller" button
  - Category badge + timestamp
  - Price/Trade information (prominent)
  - Description section with full text
  - "Report Item" link at bottom
- Mobile: Stack vertically with image gallery first

### Add/Edit Item Form
- Centered container max-w-3xl
- Progress indicator if multi-step (Step 1: Details | Step 2: Pricing)
- Large image upload area with drag-drop zone (dashed border)
- Form fields with labels above inputs
- Toggle switch: "Barter" vs "Sell" (prominent)
- Conditional fields appear based on toggle
- Category selection as button grid (not dropdown)
- Large "Post Item" button at bottom

### Messaging Interface
- Split layout: Conversation list left sidebar (30%), chat area right (70%)
- Conversation list: Each row shows item thumbnail, user name, last message preview
- Chat area: Item details card at top (mini version), messages below, input at bottom
- Messages: Sender right-aligned, recipient left-aligned with timestamps
- Input: Text field with send button, no attachments initially

## Component Library

### Navigation Bar
- Fixed top position with backdrop blur
- Height: h-16
- Container max-w-7xl with px-6
- Logo: h-8 clickable
- Search: Centered, max-w-md with icon prefix
- Right section: "Post Item" button + user avatar dropdown

### Item Cards
- Aspect ratio 4:3 image container
- Rounded corners (rounded-xl)
- Hover: subtle lift effect (shadow increase)
- Image: object-cover with loading skeleton
- Content padding: p-4
- Category badge: Absolute top-right on image
- Bottom section: Title (2 lines max), price/trade, user info row

### Buttons
Primary: Large (h-12), rounded-lg, full-width on mobile
Secondary: Outlined variant, same sizing
Icon buttons: Square (h-10 w-10), rounded-full
On images: Blurred background, no hover states needed

### Form Inputs
- Height: h-12 for text inputs
- Rounded: rounded-lg
- Labels: mb-2, font-medium, sm size
- Helper text: mt-1, text-xs
- Error states: Red border with error message below

### Badges & Tags
- Category badges: Inline-flex, px-3 py-1, rounded-full, text-xs font-medium
- Status indicators: Dot + text (e.g., "Available", "Traded")

### User Profile Elements
- Avatar sizes: xs (h-6), sm (h-8), md (h-10), lg (h-12)
- Always rounded-full with border
- Verified badge: Small checkmark icon overlay

## Trust & Safety Elements
- Verified student badge (checkmark icon)
- "Member since" date on profiles
- Item condition indicators ("New", "Like New", "Good", "Fair")
- Report/flag functionality clearly accessible but not prominent

## Empty States
- Dashboard with no items: Large icon, heading, "Post your first item" CTA
- No messages: Friendly illustration, "Start a conversation" text
- Search no results: "No items found" with clear filters button

## Responsive Breakpoints
- Mobile: < 768px (stack everything, single column)
- Tablet: 768px - 1024px (2 column grids)
- Desktop: > 1024px (full multi-column layouts)

## Images
**Hero Image:** No traditional hero. Dashboard leads with filterable grid immediately.

**Item Images:** Users upload item photos - use placeholder when no image (generic item icon)

**Profile Avatars:** User profile pictures or initials in circle

**Empty State Illustrations:** Simple line art illustrations for empty states (search online illustration libraries)

**Category Icons:** Use Heroicons for category representations (book, laptop, bicycle, etc.)

## Animations
**Minimal and Purposeful:**
- Card hover: Subtle scale (1.02) with shadow increase
- Button press: Quick scale down (0.98)
- Page transitions: Simple fade
- No scroll animations, no complex transitions

## Accessibility
- Consistent focus states on all interactive elements (ring-2 offset-2)
- Form inputs with proper labels and ARIA attributes
- Sufficient contrast ratios maintained
- Keyboard navigation fully supported