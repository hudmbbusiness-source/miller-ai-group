// Miller AI Group - Hacker OS Component Library
// Export all components from this index

export { hackerTheme, type HackerTheme, type NeonColor } from './theme'
export { AudioEngineProvider, useAudioEngine, AudioControlButton } from './audio-engine'
export { HolographicPanel, HolographicStat } from './holographic-panel'
export { GlitchButton, GlitchIconButton } from './glitch-button'
export { DataStreamBackground } from './data-stream-background'
export { TerminalFeed, generateSystemLog, TAKEOVER_LOGS, type LogEntry } from './terminal-feed'
export { SystemTakeoverSequence } from './system-takeover'

// New Cinematic Takeover System
export { CinematicTakeover, CHARACTERS, type CinematicStage } from './cinematic-takeover'
export {
  NeonDataStreams,
  HolographicGrid,
  GlitchOverlay,
  EncryptedGlyphs,
  SystemLogTerminal,
  WireframeLogo,
  BreachTunnel,
  NeonVortex,
} from './cinematic-takeover/effects'
export {
  HolographicSilhouette,
  CharacterCard,
  CharacterIndicator,
  CharacterRevealSequence,
} from './cinematic-takeover/character-silhouettes'

// Legacy - kept for backwards compatibility
export { CinematicIntro } from './cinematic-intro'
