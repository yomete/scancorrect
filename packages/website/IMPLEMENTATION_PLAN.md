# ScanCorrect Website Implementation Plan

## Project Overview

Complete rebuild of the ScanCorrect landing page with all sections, plus one SEO guide page.

**Stack:** Next.js (existing), Tailwind CSS, TypeScript
**Design System:** Black/white minimal, Fjalla One headlines, mobile-first
**Motion:** Subtle polish (fade-ins on scroll, smooth transitions)

---

## Design Decisions Summary

| Decision | Choice |
|----------|--------|
| Brand tone | Existing black/white theme |
| Pricing model | Both monthly (€5) and lifetime (€25) live simultaneously |
| Content strategy | One-off SEO guide, no blog infrastructure |
| Demo media | Real video coming (16:9 placeholder for now) |
| License enforcement | Real limits enforced in app (36 images/month free) |
| Scanner detection | Already implemented in desktop app |
| LR/C1 guides | Informational only, no dedicated guide pages |
| Download links | GitHub releases (placeholder URLs for now) |
| Payment processor | TBD - Pro CTA is no-op button for now |
| Data storage | Local only, fully static website |
| Mobile priority | Mobile-first design |
| Competitor positioning | Subtle, no direct naming |
| Creator links | Name only, no social links |
| Before/after slider | Keep prominent, near top |
| Feature hierarchy | Equal grid for all 6 features |
| Primary CTA behavior | Scroll to download section |
| Secondary CTA (See How It Works) | Scroll to How It Works section |
| Feature icons | Abstract geometric shapes |
| Visual motifs | Subtle film references (grain texture, maybe border) |
| Blog layout | Same header/footer as main site |

---

## File Structure

```
packages/website/
├── app/
│   ├── page.tsx                    # Main landing page (rebuild)
│   ├── layout.tsx                  # Root layout (update metadata)
│   ├── globals.css                 # Global styles (extend)
│   └── guides/
│       └── fix-scanner-metadata/
│           └── page.tsx            # SEO guide page
├── components/
│   ├── Header.tsx                  # Shared navigation
│   ├── Footer.tsx                  # Shared footer
│   ├── BeforeAfterSlider.tsx       # Existing (keep)
│   ├── FeatureCard.tsx             # Feature grid item
│   ├── PricingCard.tsx             # Pricing tier card
│   ├── StepCard.tsx                # How it works step
│   ├── WorkflowCard.tsx            # Lightroom/Capture One card
│   ├── VideoPlaceholder.tsx        # 16:9 video embed placeholder
│   └── ScrollLink.tsx              # Smooth scroll anchor links
├── public/
│   ├── before-new.png              # Existing
│   ├── after-new.png               # Existing
│   └── (video placeholder asset)   # TBD
└── tailwind.config.js              # Extend with animation utilities
```

---

## Section-by-Section Implementation

### 1. Header Navigation

**Content:**
- Logo: "📷 ScanCorrect" (existing style)
- Nav links: Features, Pricing (scroll anchors)
- CTA: Download button (scrolls to download section)

**Technical:**
- Sticky on scroll with subtle backdrop blur
- Mobile: hamburger menu with slide-out drawer
- All nav items use smooth scroll to section IDs

**Component:** `Header.tsx`

---

### 2. Hero Section

**Content:**
- Headline: "ScanCorrect" (Fjalla One, large)
- Subhead: The full description text from spec
- Primary CTA: "Download Free" → scrolls to #download
- Secondary CTA: "See How It Works" → scrolls to #how-it-works

**Design:**
- Left-aligned text (matching existing)
- CTAs side by side on desktop, stacked on mobile
- Subtle grain texture overlay on background

**Animation:**
- Staggered fade-in on load (headline → subhead → CTAs)

---

### 3. Before/After Slider

**Content:**
- Keep existing `BeforeAfterSlider` component
- Position directly after hero

**Design:**
- Full-width on mobile
- Contained width with shadow on desktop
- Keep existing styling

---

### 4. The Problem Section

**Content:**
- Headline: "Your scanner doesn't know your camera"
- Body: Full paragraph from spec
- Tagline: "ScanCorrect fixes that." (emphasized)

**Design:**
- Centered text
- Large pull-quote style for the tagline
- Subtle left border accent on the problem paragraph

**Animation:**
- Fade-in on scroll into view

---

### 5. Features Section

**ID:** `#features`

**Content:**
- Headline: "Everything you need to fix your scans"
- 6 features in equal grid:
  1. Camera Profiles
  2. Batch Processing
  3. Scanner Detection
  4. Location Tagging
  5. Film Stock & Exposure
  6. Safe & Undoable

**Design:**
- 3-column grid on desktop, 2 on tablet, 1 on mobile
- Each feature: abstract geometric icon + title + description
- Icons: circles, squares, lines in black/white
- Consistent card style with hover state

**Component:** `FeatureCard.tsx`

**Animation:**
- Staggered fade-in as grid comes into view

---

### 6. Lightroom / Capture One Section

**Content:**
- Headline: "Works with your workflow"
- Subhead: "Fix your metadata before import..."
- Two cards:
  - **Lightroom Classic:** explanation + "No more LensTagger workarounds..."
  - **Capture One:** explanation + "Works with Sessions and Catalogs."

**Design:**
- Two-column layout on desktop, stacked on mobile
- Cards have subtle distinction (maybe different icon shapes)
- Small text in muted color

**Component:** `WorkflowCard.tsx`

---

### 7. How It Works Section

**ID:** `#how-it-works`

**Content:**
- Headline: "How it works"
- 3 steps:
  1. Drop your scans
  2. Pick your camera profile
  3. Save — metadata is written to your files
- Video placeholder below steps

**Design:**
- Numbered steps with abstract connectors
- Each step: number + title + description
- Video: 16:9 container with play button overlay

**Components:** `StepCard.tsx`, `VideoPlaceholder.tsx`

**Animation:**
- Steps animate in sequence
- Video placeholder has subtle pulse on play button

---

### 8. Pricing Section

**ID:** `#pricing`

**Content:**
- Headline: "Simple pricing"
- Subhead: "Start free. Upgrade when you need more."
- Two tiers:

**Free Tier:**
- Price: €0 / forever
- Features: 36 images/month, 3 profiles, basic metadata
- CTA: "Download Free" → scrolls to #download

**Pro Tier:**
- Price: €5/month or €25 once — yours forever
- Features: Unlimited everything + advanced features
- CTA: "Get Pro" (no-op for now)
- Badge: "Most Popular" (optional)

**Design:**
- Two cards side by side
- Pro card slightly emphasized (border or subtle background)
- Price prominently displayed
- Feature list with checkmarks

**Component:** `PricingCard.tsx`

**Technical:**
- Pro CTA is currently a no-op button (onClick does nothing)
- Free CTA scrolls to download section

---

### 9. Download Section

**ID:** `#download`

**Content:**
- Headline: "Ready to fix your film photos?"
- Subhead: "Download ScanCorrect for free..."
- 3 download buttons: macOS, Windows, Linux
- Trust badges: No account required, Works offline, Free tier available

**Design:**
- Centered layout
- Large download buttons (black fill)
- Trust badges as small pills/badges below

**Technical:**
- Download URLs are placeholders for now: `#download-macos`, `#download-windows`, `#download-linux`
- When GitHub releases are ready, update to actual release asset URLs

---

### 10. Footer

**Content:**
- "Built by a film photographer"
- "Made by Yomi Eluwande — shooting film, scanning at home, and tired of metadata that says 'Epson.'"
- No social links

**Design:**
- Minimal, centered
- Subtle top border separator
- Same typography as body text

**Component:** `Footer.tsx`

---

## SEO Guide Page

**Route:** `/guides/fix-scanner-metadata`

**Metadata:**
- Title: "How to Fix Scanner Metadata on Your Film Scans (2025)"
- Description: "Your film scans say 'Epson' instead of 'Nikon FM2.' Here's how to fix camera metadata..."

**Content Structure:**
1. The problem: scanner metadata replaces camera info
2. Why Lightroom and Capture One can't fix this natively
3. Your options (subtle competitor positioning):
   - ExifTool (command line, technical)
   - AnalogExif (abandoned/unmaintained)
   - LensTagger (Lightroom only)
   - ScanCorrect (modern, cross-platform)
4. Step-by-step: fixing metadata with ScanCorrect
5. Importing your corrected scans

**Design:**
- Same Header/Footer as main site
- Article layout: max-width prose container
- Typography optimized for reading
- Heading hierarchy for SEO (H1 → H2 → H3)
- Internal links back to main site features/download

**Length:** ~800-1000 words

---

## Technical Implementation Notes

### Smooth Scrolling

Create a `ScrollLink` component:
```tsx
// Scrolls to element by ID with offset for sticky header
const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  const headerOffset = 80; // sticky header height
  const elementPosition = element?.getBoundingClientRect().top ?? 0;
  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
};
```

### Scroll Animations

Use Intersection Observer for fade-in animations:
- Add `opacity-0 translate-y-4` initially
- Add `opacity-100 translate-y-0 transition-all duration-700` when in view
- Stagger delays using `animation-delay` or sequential observation

### Mobile-First Approach

All Tailwind classes should be mobile-first:
- Default styles for mobile
- `md:` prefix for tablet breakpoints
- `lg:` prefix for desktop

### Abstract Icons

Create simple SVG geometric shapes:
- Camera Profiles: overlapping circles
- Batch Processing: stacked squares
- Scanner Detection: target/crosshair
- Location: pin shape
- Film Stock: rectangle grid
- Undo: curved arrow

---

## Implementation Order

1. **Shared Components First**
   - Header.tsx (with mobile menu)
   - Footer.tsx
   - ScrollLink.tsx

2. **Landing Page Sections** (top to bottom)
   - Hero section
   - Before/After slider (existing)
   - Problem section
   - Features section + FeatureCard
   - Workflow section + WorkflowCard
   - How It Works + StepCard + VideoPlaceholder
   - Pricing section + PricingCard
   - Download section

3. **Polish**
   - Scroll animations
   - Mobile responsive testing
   - Subtle grain texture

4. **SEO Guide Page**
   - Route setup
   - Content writing
   - Internal linking

---

## Assets Needed

- [ ] Abstract geometric icons for 6 features (can create with SVG)
- [ ] Video placeholder image or animated preview
- [ ] Grain texture overlay (subtle, optional)
- [ ] App screenshots for guide page (optional)

---

## Open Questions / Future Considerations

1. **Payment integration:** When payment processor is decided, update Pro CTA
2. **GitHub releases:** When public, update download URLs to actual release assets
3. **Analytics:** Consider adding Plausible or similar for conversion tracking
4. **Video:** Replace placeholder when demo video is ready

---

## Summary

This plan covers a complete rebuild of the ScanCorrect website with:
- Full landing page with all specified sections
- Mobile-first responsive design
- Black/white minimal aesthetic matching existing theme
- Subtle scroll animations
- One SEO guide page
- Placeholder infrastructure for payments and downloads

Ready to implement when approved.
