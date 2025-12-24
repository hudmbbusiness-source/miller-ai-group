/**
 * Design System Theme Tokens
 * Centralized configuration for consistent styling across the application
 */

export const theme = {
  // Spacing scale (using Tailwind's default scale)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },

  // Border radius tokens
  radii: {
    none: '0',
    sm: 'calc(var(--radius) - 4px)',
    md: 'calc(var(--radius) - 2px)',
    lg: 'var(--radius)',
    xl: 'calc(var(--radius) + 4px)',
    '2xl': 'calc(var(--radius) + 8px)',
    full: '9999px',
  },

  // Shadow tokens for elevation
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Depth/elevation system
  elevation: {
    background: 0,  // bg-background
    surface: 1,     // bg-card
    elevated: 2,    // Modals, dialogs, dropdowns
    overlay: 3,     // Toast, notifications
  },

  // Transition durations
  transitions: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },

  // Breakpoints (matching Tailwind defaults)
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Touch target sizes (WCAG 2.1 Level AAA)
  touch: {
    minimum: '44px',  // Minimum touch target
    comfortable: '48px',
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
  },
} as const

// Type-safe theme access
export type Theme = typeof theme
export type ThemeSpacing = keyof typeof theme.spacing
export type ThemeRadius = keyof typeof theme.radii
export type ThemeShadow = keyof typeof theme.shadows
export type ThemeElevation = keyof typeof theme.elevation
export type ThemeTransition = keyof typeof theme.transitions
export type ThemeBreakpoint = keyof typeof theme.breakpoints
