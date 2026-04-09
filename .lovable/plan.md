

# Touchstone PWA — Implementation Plan

## What We're Building

A mobile-first Progressive Web App for capturing personal memories across six categories (Moment, Place, Person, Object, Sound, Food). Session goal: user sees a prompt, types a response, saves it, gets confirmation. No auth, no navigation complexity.

## Design System

Applying the full color palette, art deco aesthetic, and typography as specified. Fonts: **Playfair Display** (serif headings/prompts) + **Source Sans 3** (body/UI) from Google Fonts — warm, sophisticated, art deco-complementary without being cold or trendy.

## Files to Create/Modify

### 1. Design System Setup
- **src/index.css** — Replace CSS variables with Touchstone palette (all HSL conversions of provided hex values). Import Google Fonts (Playfair Display, Source Sans 3). Set base font size 16px minimum.
- **tailwind.config.ts** — Add custom colors: `ivory`, `card`, `ink`, `espresso`, `gold`, `plum`, `terracotta`, `malachite`, `blueprint`. Add font families.

### 2. Core Components
- **src/components/EntryCard.tsx** — Card with 6px top accent stripe in category color, `#E8E4D8` body, sentiment pill at bottom
- **src/components/CategoryGrid.tsx** — 2×3 grid of six categories with icons, subtexts, and info buttons revealing example entries + starter question
- **src/components/PromptCard.tsx** — Displays a gentle prompt question with textarea for response
- **src/components/SentimentPill.tsx** — Optional pill selector with gentle example words (safe, complicated, like home, like loss, like freedom)
- **src/components/SaveButton.tsx** — Gold (#B8860B) CTA button, large tap target
- **src/components/Confirmation.tsx** — Warm confirmation view after saving
- **src/components/Wordmark.tsx** — "TOUCHSTONE" in small caps, letter-spaced, ink color

### 3. Pages
- **src/pages/Index.tsx** — Home screen: wordmark, one hardcoded prompt, textarea, category selector, optional sentiment, save button. The complete capture loop.

### 4. PWA Setup
- **public/manifest.json** — PWA manifest for "Add to Home Screen" with Touchstone branding
- **index.html** — Add manifest link, theme-color meta tag, viewport meta for mobile

### 5. Cleanup
- Remove **src/App.css** (unused boilerplate)

## Design Rules Enforced
- No shadows, no gradients — flat clean surfaces only
- Generous whitespace, large tap targets
- Nothing smaller than 16px body text
- Art deco influence: geometric, considered, quiet
- Sentiment field always optional, never prominent

## What "Done" Looks Like
User opens the app → sees the Touchstone wordmark → reads a gentle prompt → types a memory → optionally picks a category and sentiment → taps Save → sees warm confirmation. One screen, one loop, working end to end.

