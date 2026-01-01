'use client'

import { useEffect } from 'react'
import Script from 'next/script'

export default function GaimertagPage() {
  useEffect(() => {
    // Register Service Worker for offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/gaimertag/sw.js')
        .then((registration) => {
          console.log('[gAImertag] Service Worker registered:', registration.scope)
        })
        .catch((error) => {
          console.log('[gAImertag] Service Worker registration failed:', error)
        })
    }

    // Prevent zoom on double tap
    let lastTouchEnd = 0
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) {
        e.preventDefault()
      }
      lastTouchEnd = now
    }

    document.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Bungee&family=Quicksand:wght@500;700&family=Lilita+One&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/gaimertag/styles.css" />

      <div className="game-wrapper">
        <canvas id="gameCanvas"></canvas>

        <div className="ui-layer">
          {/* Top Bar */}
          <div className="top-bar" id="topBar">
            <div className="currency-display">
              <div className="currency-item coins">
                <span className="currency-icon">💰</span>
                <span className="currency-value" id="totalCoins">0</span>
              </div>
              <div className="currency-item gems">
                <span className="currency-icon">💎</span>
                <span className="currency-value" id="totalGems">0</span>
              </div>
            </div>
            <div className="level-display" id="levelDisplay">
              <div className="level-badge">
                <span className="level-number" id="playerLevel">1</span>
              </div>
              <div className="xp-bar-container">
                <div className="xp-bar" id="xpBar"></div>
                <span className="xp-text" id="xpText">0 / 100 XP</span>
              </div>
            </div>
          </div>

          {/* HUD (during gameplay) */}
          <div className="hud" id="hud" style={{ display: 'none' }}>
            <div className="score-container">
              <div className="score-label">Score</div>
              <div className="score-value" id="scoreDisplay">0</div>
              <div className="stats-row">
                <div className="stat-item">
                  <span className="stat-icon">🏆</span>
                  <span id="highScoreDisplay">0</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">💰</span>
                  <span id="coinsDisplay">0</span>
                </div>
              </div>
            </div>
            <div className="power-ups-active" id="powerUpsActive"></div>
          </div>

          {/* Combo Display */}
          <div className="combo-display" id="comboDisplay"></div>

          {/* Level Up Notification */}
          <div className="level-up-notification" id="levelUpNotification">
            <div className="level-up-content">
              <div className="level-up-stars">⭐</div>
              <div className="level-up-text">LEVEL UP!</div>
              <div className="level-up-number" id="newLevelNumber">2</div>
              <div className="level-up-reward" id="levelUpReward"></div>
            </div>
          </div>

          {/* Achievement Popup */}
          <div className="achievement-popup" id="achievementPopup">
            <div className="achievement-icon" id="achievementIcon">🏆</div>
            <div className="achievement-info">
              <div className="achievement-title" id="achievementTitle">Achievement Unlocked!</div>
              <div className="achievement-name" id="achievementName"></div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="nav-buttons" id="navButtons">
            <button className="nav-btn" data-screen="store">
              <span className="nav-icon">🛒</span>
              <span className="nav-label">Store</span>
              <span className="nav-badge" id="storeBadge" style={{ display: 'none' }}>!</span>
            </button>
            <button className="nav-btn" data-screen="games">
              <span className="nav-icon">🎮</span>
              <span className="nav-label">Games</span>
              <span className="nav-badge locked-count" id="gamesLocked">2</span>
            </button>
            <button className="nav-btn play-btn" data-screen="play">
              <span className="nav-icon">▶️</span>
              <span className="nav-label">Play</span>
            </button>
            <button className="nav-btn" data-screen="quests">
              <span className="nav-icon">📋</span>
              <span className="nav-label">Quests</span>
              <span className="nav-badge quest-count" id="questsActive">3</span>
            </button>
            <button className="nav-btn" data-screen="profile">
              <span className="nav-icon">👤</span>
              <span className="nav-label">Profile</span>
            </button>
          </div>

          {/* Daily Reward Modal */}
          <div className="modal-overlay" id="dailyRewardModal">
            <div className="modal daily-reward-modal">
              <div className="modal-header">
                <h2>🎁 Daily Reward!</h2>
                <p>Day <span id="streakDay">1</span> Streak!</p>
              </div>
              <div className="daily-rewards-grid" id="dailyRewardsGrid"></div>
              <button className="btn-primary btn-claim" id="claimDailyBtn">Claim Reward!</button>
            </div>
          </div>

          {/* Store Screen */}
          <div className="screen store-screen" id="storeScreen">
            <div className="screen-header">
              <button className="back-btn" data-back="true">←</button>
              <h2>🛒 Store</h2>
              <div className="currency-mini">
                <span>💰 <span id="storeCoins">0</span></span>
                <span>💎 <span id="storeGems">0</span></span>
              </div>
            </div>
            <div className="store-tabs">
              <button className="store-tab active" data-tab="characters">Characters</button>
              <button className="store-tab" data-tab="themes">Themes</button>
              <button className="store-tab" data-tab="powerups">Power-Ups</button>
              <button className="store-tab" data-tab="colors">Colors</button>
            </div>
            <div className="store-content" id="storeContent"></div>
          </div>

          {/* Games Screen */}
          <div className="screen games-screen" id="gamesScreen">
            <div className="screen-header">
              <button className="back-btn" data-back="true">←</button>
              <h2>🎮 Games</h2>
            </div>
            <div className="screen-content">
              <div className="games-grid" id="gamesGrid"></div>
            </div>
          </div>

          {/* Quests Screen */}
          <div className="screen quests-screen" id="questsScreen">
            <div className="screen-header">
              <button className="back-btn" data-back="true">←</button>
              <h2>📋 Daily Quests</h2>
            </div>
            <div className="screen-content">
              <div className="quests-list" id="questsList"></div>
              <div className="achievements-section">
                <h3>🏆 Achievements</h3>
                <div className="achievements-grid" id="achievementsGrid"></div>
              </div>
            </div>
          </div>

          {/* Profile Screen */}
          <div className="screen profile-screen" id="profileScreen">
            <div className="screen-header">
              <button className="back-btn" data-back="true">←</button>
              <h2>👤 Profile</h2>
            </div>
            <div className="profile-content">
              <div className="profile-avatar" id="profileAvatar">🤖</div>
              <div className="profile-level">
                <span className="profile-level-badge" id="profileLevelBadge">1</span>
                <div className="profile-xp-info">
                  <div className="profile-xp-bar">
                    <div className="profile-xp-fill" id="profileXpFill"></div>
                  </div>
                  <span id="profileXpText">0 / 100 XP</span>
                </div>
              </div>
              <div className="profile-stats" id="profileStats"></div>
              <div className="profile-equipped">
                <h3>Equipped Items</h3>
                <div className="equipped-grid" id="equippedGrid"></div>
              </div>
            </div>
          </div>

          {/* Play Screen (Start) */}
          <div className="screen play-screen active" id="playScreen">
            <div className="play-content">
              <div className="game-logo">SUPER RUNNER</div>
              <div className="game-tagline">RUN • JUMP • COLLECT</div>

              <div className="selected-loadout">
                <div className="loadout-item">
                  <span className="loadout-label">Character</span>
                  <div className="loadout-preview" id="selectedCharacter">🤖</div>
                </div>
                <div className="loadout-item">
                  <span className="loadout-label">Theme</span>
                  <div className="loadout-preview theme-preview" id="selectedTheme">🌲</div>
                </div>
              </div>

              <button className="start-btn" id="startBtn">
                <span className="start-btn-text">PLAY NOW</span>
                <span className="start-btn-sub">Earn coins & level up!</span>
              </button>

              <div className="power-ups-selection" id="powerUpsSelection"></div>

              <div className="controls-hint">
                <div className="control-item">
                  <span className="control-key">SPACE</span>
                  <span>or</span>
                  <span className="control-key">TAP</span>
                  <span>to Jump</span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Over Screen */}
          <div className="gameover-screen" id="gameoverScreen">
            <div className="gameover-content">
              <div className="gameover-title">GAME OVER</div>

              <div className="gameover-stats">
                <div className="gameover-score">
                  <span className="gameover-score-label">Score</span>
                  <span className="gameover-score-value" id="finalScore">0</span>
                </div>

                <div className="gameover-rewards">
                  <div className="reward-item">
                    <span className="reward-icon">💰</span>
                    <span className="reward-value">+<span id="earnedCoins">0</span></span>
                  </div>
                  <div className="reward-item">
                    <span className="reward-icon">⭐</span>
                    <span className="reward-value">+<span id="earnedXp">0</span> XP</span>
                  </div>
                </div>

                <div className="gameover-record" id="newRecord" style={{ display: 'none' }}>
                  🎉 NEW RECORD! 🎉
                </div>
              </div>

              <div className="gameover-details">
                <div className="detail-item">
                  <span className="detail-value" id="finalDistance">0m</span>
                  <span className="detail-label">Distance</span>
                </div>
                <div className="detail-item">
                  <span className="detail-value" id="finalObstacles">0</span>
                  <span className="detail-label">Obstacles</span>
                </div>
                <div className="detail-item">
                  <span className="detail-value" id="finalMaxCombo">0x</span>
                  <span className="detail-label">Max Combo</span>
                </div>
              </div>

              <div className="gameover-buttons">
                <button className="btn-primary" id="restartBtn">Play Again</button>
                <button className="btn-secondary" id="homeBtn">Home</button>
              </div>

              <div className="watch-ad-bonus" id="watchAdBonus">
                <button className="btn-ad">
                  <span>🎬</span>
                  <span>Watch Ad for 2x Coins!</span>
                </button>
              </div>
            </div>
          </div>

          {/* Customize Overlay */}
          <div className="customize-overlay" id="customizeOverlay">
            <div className="customize-panel">
              <div className="panel-header">
                <div className="panel-title">✨ Customize</div>
                <button className="close-btn" id="closeCustomize">✕</button>
              </div>
              <div className="customize-content" id="customizeContent"></div>
            </div>
          </div>
        </div>
      </div>

      <Script src="/gaimertag/data.js" strategy="beforeInteractive" />
      <Script src="/gaimertag/progression.js" strategy="beforeInteractive" />
      <Script src="/gaimertag/store.js" strategy="beforeInteractive" />
      <Script src="/gaimertag/game.js" strategy="beforeInteractive" />
      <Script src="/gaimertag/flappy.js" strategy="beforeInteractive" />
      <Script src="/gaimertag/app.js" strategy="afterInteractive" />
    </>
  )
}
