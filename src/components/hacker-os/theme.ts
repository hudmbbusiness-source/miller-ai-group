// Miller AI Group - Hacker OS Theme System
// Watch_Dogs + TRON + Retro Terminal Aesthetic

export const hackerTheme = {
  colors: {
    // Core backgrounds
    background: {
      primary: '#000000',
      secondary: '#0a0a0a',
      tertiary: '#111111',
      panel: 'rgba(10, 10, 10, 0.85)',
      overlay: 'rgba(0, 0, 0, 0.9)',
    },

    // Neon accent colors
    neon: {
      cyan: '#00ffff',
      cyanDim: '#00cccc',
      cyanGlow: 'rgba(0, 255, 255, 0.3)',
      green: '#00ff41',
      greenDim: '#00cc33',
      greenGlow: 'rgba(0, 255, 65, 0.3)',
      blue: '#0080ff',
      blueDim: '#0066cc',
      blueGlow: 'rgba(0, 128, 255, 0.3)',
      purple: '#bf00ff',
      purpleDim: '#9900cc',
      purpleGlow: 'rgba(191, 0, 255, 0.3)',
      magenta: '#ff00ff',
      magentaDim: '#cc00cc',
      magentaGlow: 'rgba(255, 0, 255, 0.3)',
      amber: '#ffbf00',
      amberDim: '#cc9900',
      amberGlow: 'rgba(255, 191, 0, 0.3)',
    },

    // Text colors
    text: {
      primary: '#ffffff',
      secondary: '#a0a0a0',
      muted: '#606060',
      terminal: '#00ff41',
      warning: '#ffbf00',
      error: '#ff3333',
      success: '#00ff41',
    },

    // UI elements
    border: {
      default: 'rgba(255, 255, 255, 0.1)',
      neon: 'rgba(0, 255, 255, 0.5)',
      glow: 'rgba(0, 255, 255, 0.8)',
    },
  },

  // Glow effects
  glows: {
    cyan: '0 0 20px rgba(0, 255, 255, 0.5), 0 0 40px rgba(0, 255, 255, 0.3), 0 0 60px rgba(0, 255, 255, 0.1)',
    green: '0 0 20px rgba(0, 255, 65, 0.5), 0 0 40px rgba(0, 255, 65, 0.3), 0 0 60px rgba(0, 255, 65, 0.1)',
    blue: '0 0 20px rgba(0, 128, 255, 0.5), 0 0 40px rgba(0, 128, 255, 0.3), 0 0 60px rgba(0, 128, 255, 0.1)',
    purple: '0 0 20px rgba(191, 0, 255, 0.5), 0 0 40px rgba(191, 0, 255, 0.3), 0 0 60px rgba(191, 0, 255, 0.1)',
    text: '0 0 10px rgba(0, 255, 255, 0.8)',
  },

  // Animation durations
  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    verySlow: '1000ms',
    glitch: '50ms',
  },

  // Easing functions
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    glitch: 'steps(3)',
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
