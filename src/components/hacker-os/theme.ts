// Miller AI Group - DedSec Hacker OS Theme System
// Watch_Dogs DedSec + Street Art + Modern Hacker Aesthetic

export const hackerTheme = {
  colors: {
    // Core backgrounds
    background: {
      primary: '#000000',
      secondary: '#0a0a0a',
      tertiary: '#111111',
      panel: 'rgba(10, 10, 10, 0.9)',
      overlay: 'rgba(0, 0, 0, 0.95)',
    },

    // DedSec neon accent colors (purple/magenta/pink focus)
    neon: {
      // Primary - Magenta/Pink
      magenta: '#ff00ff',
      magentaDim: '#cc00cc',
      magentaGlow: 'rgba(255, 0, 255, 0.4)',
      // Secondary - Purple
      purple: '#9d00ff',
      purpleDim: '#7700cc',
      purpleGlow: 'rgba(157, 0, 255, 0.4)',
      // Accent - Hot Pink
      pink: '#ff1493',
      pinkDim: '#cc1076',
      pinkGlow: 'rgba(255, 20, 147, 0.4)',
      // Money - Gold/Green
      gold: '#ffd700',
      goldDim: '#ccac00',
      goldGlow: 'rgba(255, 215, 0, 0.4)',
      money: '#00ff41',
      moneyDim: '#00cc33',
      moneyGlow: 'rgba(0, 255, 65, 0.4)',
      // Utility colors
      cyan: '#00ffff',
      cyanDim: '#00cccc',
      cyanGlow: 'rgba(0, 255, 255, 0.3)',
      amber: '#ff6b00',
      amberDim: '#cc5500',
      amberGlow: 'rgba(255, 107, 0, 0.4)',
      red: '#ff0040',
      redDim: '#cc0033',
      redGlow: 'rgba(255, 0, 64, 0.4)',
    },

    // Text colors
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
      muted: '#606060',
      terminal: '#ff00ff',
      warning: '#ffd700',
      error: '#ff0040',
      success: '#00ff41',
      money: '#00ff41',
    },

    // UI elements
    border: {
      default: 'rgba(255, 255, 255, 0.1)',
      neon: 'rgba(255, 0, 255, 0.5)',
      glow: 'rgba(255, 0, 255, 0.8)',
    },
  },

  // Glow effects (DedSec style - more intense)
  glows: {
    magenta: '0 0 20px rgba(255, 0, 255, 0.6), 0 0 40px rgba(255, 0, 255, 0.4), 0 0 80px rgba(255, 0, 255, 0.2)',
    purple: '0 0 20px rgba(157, 0, 255, 0.6), 0 0 40px rgba(157, 0, 255, 0.4), 0 0 80px rgba(157, 0, 255, 0.2)',
    pink: '0 0 20px rgba(255, 20, 147, 0.6), 0 0 40px rgba(255, 20, 147, 0.4), 0 0 80px rgba(255, 20, 147, 0.2)',
    gold: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 0 0 80px rgba(255, 215, 0, 0.2)',
    money: '0 0 20px rgba(0, 255, 65, 0.6), 0 0 40px rgba(0, 255, 65, 0.4), 0 0 80px rgba(0, 255, 65, 0.2)',
    text: '0 0 10px rgba(255, 0, 255, 0.8)',
    glitch: '2px 0 rgba(255, 0, 255, 0.8), -2px 0 rgba(0, 255, 255, 0.8)',
  },

  // Animation durations
  animation: {
    fast: '100ms',
    normal: '250ms',
    slow: '500ms',
    verySlow: '1000ms',
    glitch: '50ms',
    cinematic: '3000ms',
  },

  // Easing functions
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    glitch: 'steps(3)',
    cinematic: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  // Border radius
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },

  // Typography
  fonts: {
    mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
    display: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  // Z-index layers
  zIndex: {
    background: 0,
    content: 10,
    overlay: 100,
    modal: 200,
    takeover: 1000,
    audio: 9999,
  },
} as const

export type HackerTheme = typeof hackerTheme
export type NeonColor = keyof typeof hackerTheme.colors.neon
