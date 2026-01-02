/**
 * APP CONTROLLER
 * Main application logic, navigation, and UI management
 */

class App {
    constructor() {
        this.currentScreen = 'play';
        this.currentGame = 'runner'; // Track which game is active
        this.init();
    }

    init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Initialize systems
        store.init();

        // Setup navigation
        this.setupNavigation();

        // Setup game buttons
        this.setupGameButtons();

        // Setup daily reward
        this.setupDailyReward();

        // Update UI
        progression.updateUI();
        this.updateLoadout();

        // Check for daily reward
        if (progression.shouldShowDailyReward()) {
            setTimeout(() => this.showDailyReward(), 500);
        }
    }

    // ========================================================================
    // NAVIGATION
    // ========================================================================

    setupNavigation() {
        // Nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const screen = btn.dataset.screen;
                if (screen) this.showScreen(screen);
            });
        });

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showScreen('play');
            });
        });
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show requested screen
        const screen = document.getElementById(`${screenId}Screen`);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenId;

            // Update nav buttons
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.screen === screenId);
            });

            // Refresh screen content
            this.refreshScreen(screenId);
        }
    }

    refreshScreen(screenId) {
        switch (screenId) {
            case 'store':
                store.renderStore();
                document.getElementById('storeCoins').textContent = progression.getCoins().toLocaleString();
                document.getElementById('storeGems').textContent = progression.getGems().toLocaleString();
                break;
            case 'games':
                this.renderGames();
                break;
            case 'quests':
                this.renderQuests();
                this.renderAchievements();
                break;
            case 'profile':
                this.renderProfile();
                break;
            case 'play':
                this.updateLoadout();
                break;
        }
    }

    // ========================================================================
    // GAME BUTTONS
    // ========================================================================

    setupGameButtons() {
        // Start button
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });

        // Restart button
        document.getElementById('restartBtn').addEventListener('click', () => {
            document.getElementById('gameoverScreen').classList.remove('show');
            this.startGame(this.currentGame);
        });

        // Home button
        document.getElementById('homeBtn').addEventListener('click', () => {
            document.getElementById('gameoverScreen').classList.remove('show');
            this.showScreen('play');
            // Redraw the appropriate game in idle state
            if (this.currentGame === 'flappy' && window.flappyGame) {
                window.flappyGame.draw();
            } else if (window.game) {
                game.draw();
            }
        });

        // Share button
        document.getElementById('shareBtn').addEventListener('click', () => {
            this.shareScore();
        });

        // Leaderboard button
        document.getElementById('leaderboardBtn').addEventListener('click', () => {
            this.showLeaderboard();
        });

        // Close leaderboard
        document.getElementById('closeLeaderboard').addEventListener('click', () => {
            document.getElementById('leaderboardModal').classList.remove('show');
        });

        // Leaderboard tabs
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.loadLeaderboard(tab.dataset.game);
            });
        });

        // Loadout clicks
        document.getElementById('selectedCharacter').addEventListener('click', () => {
            this.showScreen('store');
        });

        document.getElementById('selectedTheme').addEventListener('click', () => {
            this.showScreen('store');
            // Switch to themes tab
            document.querySelectorAll('.store-tab').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-tab="themes"]').classList.add('active');
            store.currentTab = 'themes';
            store.renderStore();
        });
    }

    // ========================================================================
    // SHARE & LEADERBOARD
    // ========================================================================

    async shareScore() {
        const gameName = this.currentGame === 'flappy' ? 'Heading South' : 'Super Runner';
        const score = document.getElementById('finalScore').textContent;
        const distance = document.getElementById('finalDistance').textContent;

        const shareText = `I just scored ${score} points in ${gameName}! Can you beat my score? Play now at kachow.app/gaimertag`;
        const shareUrl = 'https://kachow.app/gaimertag';

        // Try native share first (mobile)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${gameName} - High Score!`,
                    text: shareText,
                    url: shareUrl
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    this.fallbackShare(shareText, shareUrl);
                }
            }
        } else {
            this.fallbackShare(shareText, shareUrl);
        }
    }

    fallbackShare(text, url) {
        // Copy to clipboard as fallback
        const fullText = `${text}\n${url}`;
        navigator.clipboard.writeText(fullText).then(() => {
            store.showMessage('Score copied to clipboard!');
        }).catch(() => {
            // Final fallback - prompt user
            prompt('Copy your score:', fullText);
        });
    }

    showLeaderboard() {
        const modal = document.getElementById('leaderboardModal');
        modal.classList.add('show');

        // Set active tab to current game
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.game === this.currentGame);
        });

        this.loadLeaderboard(this.currentGame);
    }

    async loadLeaderboard(gameId) {
        const content = document.getElementById('leaderboardContent');
        const yourRank = document.getElementById('yourRank');

        content.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
        yourRank.textContent = '--';

        try {
            const response = await fetch(`/api/gaimertag/leaderboard?game=${gameId}`);
            const data = await response.json();

            if (!data.scores || data.scores.length === 0) {
                content.innerHTML = `
                    <div class="leaderboard-empty">
                        <div class="leaderboard-empty-icon">🏆</div>
                        <div class="leaderboard-empty-text">No scores yet! Be the first!</div>
                    </div>
                `;
                return;
            }

            content.innerHTML = '';

            // Get player's ID from localStorage
            const playerId = this.getPlayerId();
            let playerRank = null;

            data.scores.forEach((entry, index) => {
                const rank = index + 1;
                const isCurrentPlayer = entry.player_id === playerId;

                if (isCurrentPlayer) {
                    playerRank = rank;
                }

                const entryEl = document.createElement('div');
                entryEl.className = `leaderboard-entry ${rank <= 3 ? `top-${rank}` : ''} ${isCurrentPlayer ? 'current-player' : ''}`;

                entryEl.innerHTML = `
                    <div class="leaderboard-rank">${rank <= 3 ? ['🥇', '🥈', '🥉'][rank-1] : rank}</div>
                    <div class="leaderboard-name">${entry.player_name || 'Player'}</div>
                    <div class="leaderboard-score">${entry.score.toLocaleString()}</div>
                `;

                content.appendChild(entryEl);
            });

            yourRank.textContent = playerRank || '--';
        } catch (error) {
            console.error('[gAImertag] Failed to load leaderboard:', error);
            content.innerHTML = `
                <div class="leaderboard-empty">
                    <div class="leaderboard-empty-icon">😢</div>
                    <div class="leaderboard-empty-text">Failed to load leaderboard</div>
                </div>
            `;
        }
    }

    getPlayerId() {
        let playerId = localStorage.getItem('gaimertag_player_id');
        if (!playerId) {
            playerId = 'player_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('gaimertag_player_id', playerId);
        }
        return playerId;
    }

    async submitScore(gameId, score) {
        try {
            const playerId = this.getPlayerId();
            const playerName = localStorage.getItem('gaimertag_player_name') || 'Player';

            await fetch('/api/gaimertag/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game_id: gameId,
                    player_id: playerId,
                    player_name: playerName,
                    score: score
                })
            });
        } catch (error) {
            console.error('[gAImertag] Failed to submit score:', error);
        }
    }

    startGame(gameId = 'runner') {
        this.currentGame = gameId;

        document.getElementById('playScreen').classList.remove('active');
        document.getElementById('topBar').style.display = 'none';
        document.getElementById('navButtons').style.display = 'none';
        document.getElementById('hud').style.display = 'flex';

        if (gameId === 'flappy' && window.FlappyGame) {
            // Start Flappy Bird
            if (!window.flappyGame) {
                window.flappyGame = new FlappyGame();
            }
            window.flappyGame.start();
        } else {
            // Start Runner (default)
            game.start();
        }
    }

    updateLoadout() {
        const equipped = progression.getEquipped();
        const char = GAME_DATA.characters[equipped.character];
        const theme = GAME_DATA.themes[equipped.theme];

        if (char) document.getElementById('selectedCharacter').textContent = char.icon;
        if (theme) document.getElementById('selectedTheme').textContent = theme.icon;
    }

    // ========================================================================
    // DAILY REWARD
    // ========================================================================

    setupDailyReward() {
        document.getElementById('claimDailyBtn').addEventListener('click', () => {
            const reward = progression.claimDailyReward();
            document.getElementById('dailyRewardModal').classList.remove('show');

            // Show reward animation
            let msg = 'Claimed: ';
            if (reward.reward.coins) msg += `+${reward.reward.coins} coins `;
            if (reward.reward.gems) msg += `+${reward.reward.gems} gems`;
            store.showMessage(msg);

            progression.updateUI();
        });
    }

    showDailyReward() {
        const modal = document.getElementById('dailyRewardModal');
        const grid = document.getElementById('dailyRewardsGrid');
        const streakDay = document.getElementById('streakDay');

        const currentStreak = progression.getDailyStreak();
        streakDay.textContent = currentStreak;

        // Build reward grid
        grid.innerHTML = '';
        GAME_DATA.dailyRewards.forEach((reward, index) => {
            const day = index + 1;
            const dayEl = document.createElement('div');
            dayEl.className = 'daily-reward-day';

            if (day < currentStreak) {
                dayEl.classList.add('claimed');
            } else if (day === currentStreak) {
                dayEl.classList.add('current');
            } else {
                dayEl.classList.add('future');
            }

            let amountText = '';
            if (reward.reward.coins) amountText += `${reward.reward.coins}`;
            if (reward.reward.gems) amountText += ` +${reward.reward.gems}💎`;

            dayEl.innerHTML = `
                <div class="daily-day-number">Day ${day}</div>
                <div class="daily-day-reward">${reward.icon}</div>
                <div class="daily-day-amount">${amountText}</div>
            `;

            grid.appendChild(dayEl);
        });

        modal.classList.add('show');
    }

    // ========================================================================
    // GAMES SCREEN - Enhanced with organization and retention features
    // ========================================================================

    renderGames() {
        const grid = document.getElementById('gamesGrid');
        grid.innerHTML = '';

        let lockedCount = 0;
        const games = Object.values(GAME_DATA.games);
        const unlockedGames = games.filter(g => progression.isGameUnlocked(g.id));
        const lockedGames = games.filter(g => !progression.isGameUnlocked(g.id));

        // Last played game for "Continue Playing" section
        const lastPlayed = this.currentGame || 'runner';
        const lastPlayedGame = GAME_DATA.games[lastPlayed];

        // Featured / Continue Playing Section
        if (lastPlayedGame && progression.isGameUnlocked(lastPlayed)) {
            const featuredSection = document.createElement('div');
            featuredSection.className = 'games-section featured-section';
            featuredSection.innerHTML = `
                <div class="section-header">
                    <span class="section-icon">🔥</span>
                    <span class="section-title">Continue Playing</span>
                </div>
            `;

            const featuredCard = this.createGameCard(lastPlayedGame, true, true);
            featuredSection.appendChild(featuredCard);
            grid.appendChild(featuredSection);
        }

        // Unlocked Games Section
        if (unlockedGames.length > 0) {
            const unlockedSection = document.createElement('div');
            unlockedSection.className = 'games-section';
            unlockedSection.innerHTML = `
                <div class="section-header">
                    <span class="section-icon">🎮</span>
                    <span class="section-title">Your Games</span>
                    <span class="section-count">${unlockedGames.length}</span>
                </div>
                <div class="games-row" id="unlockedGamesRow"></div>
            `;
            grid.appendChild(unlockedSection);

            const row = unlockedSection.querySelector('#unlockedGamesRow');
            unlockedGames.forEach(gameData => {
                if (gameData.id !== lastPlayed) {
                    row.appendChild(this.createGameCard(gameData, true, false));
                }
            });

            // If only one unlocked game and it's the featured one, show message
            if (unlockedGames.length === 1) {
                row.innerHTML = `<div class="games-empty">Play more to unlock new games!</div>`;
            }
        }

        // Locked Games Section with unlock progress
        if (lockedGames.length > 0) {
            lockedCount = lockedGames.length;

            const lockedSection = document.createElement('div');
            lockedSection.className = 'games-section locked-section';
            lockedSection.innerHTML = `
                <div class="section-header">
                    <span class="section-icon">🔒</span>
                    <span class="section-title">Unlock More</span>
                    <span class="section-count">${lockedGames.length} locked</span>
                </div>
                <div class="games-row" id="lockedGamesRow"></div>
            `;
            grid.appendChild(lockedSection);

            const row = lockedSection.querySelector('#lockedGamesRow');
            lockedGames.forEach(gameData => {
                row.appendChild(this.createGameCard(gameData, false, false));
            });
        }

        // Update locked count badge
        document.getElementById('gamesLocked').textContent = lockedCount;
        document.getElementById('gamesLocked').style.display = lockedCount > 0 ? 'block' : 'none';
    }

    createGameCard(gameData, isUnlocked, isFeatured) {
        const card = document.createElement('div');
        card.className = `game-card ${isUnlocked ? 'unlocked' : 'locked'} ${isFeatured ? 'featured' : ''}`;

        // Get game-specific stats (only runner has stats currently)
        const isRunner = gameData.id === 'runner';
        const highScore = isRunner ? (progression.data.highScore || 0) : 0;

        // Calculate unlock progress
        let unlockProgress = 100;
        let unlockText = '';
        let progressBar = '';

        if (!isUnlocked && gameData.unlockRequirement) {
            if (gameData.unlockRequirement.type === 'level') {
                const currentLevel = progression.getLevel();
                const requiredLevel = gameData.unlockRequirement.value;
                unlockProgress = Math.min(100, (currentLevel / requiredLevel) * 100);
                unlockText = `Level ${currentLevel}/${requiredLevel}`;
            } else if (gameData.unlockRequirement.type === 'coins') {
                const currentCoins = progression.data.totalCoinsCollected || 0;
                const requiredCoins = gameData.unlockRequirement.value;
                unlockProgress = Math.min(100, (currentCoins / requiredCoins) * 100);
                unlockText = `${currentCoins.toLocaleString()}/${requiredCoins.toLocaleString()} coins`;
            }
            progressBar = `
                <div class="unlock-progress">
                    <div class="unlock-progress-bar">
                        <div class="unlock-progress-fill" style="width: ${unlockProgress}%"></div>
                    </div>
                    <span class="unlock-progress-text">${unlockText}</span>
                </div>
            `;
        }

        // Only show high score badge if game has actual stats
        const badgeContent = isUnlocked
            ? (highScore > 0 ? `<div class="game-card-badge">🏆 ${highScore.toLocaleString()}</div>` : '')
            : '<div class="game-card-lock">🔒</div>';

        card.innerHTML = `
            <div class="game-card-banner" style="background: linear-gradient(135deg, ${gameData.gradient[0]} 0%, ${gameData.gradient[1]} 100%)">
                <div class="game-card-icon">${gameData.icon}</div>
                ${badgeContent}
            </div>
            <div class="game-card-body">
                <div class="game-card-title">${gameData.name}</div>
                <div class="game-card-desc">${gameData.description}</div>
                ${isUnlocked ? `
                    <button class="game-card-play-btn">
                        <span class="play-icon">▶</span>
                        <span>PLAY NOW</span>
                    </button>
                ` : progressBar}
            </div>
        `;

        if (isUnlocked) {
            card.addEventListener('click', () => {
                if (gameData.id === 'runner') {
                    this.currentGame = 'runner';
                    this.showScreen('play');
                } else if (gameData.id === 'flappy') {
                    this.startGame('flappy');
                } else {
                    store.showMessage('Coming soon!');
                }
            });
        }

        return card;
    }

    // ========================================================================
    // QUESTS SCREEN
    // ========================================================================

    renderQuests() {
        const list = document.getElementById('questsList');
        list.innerHTML = '';

        const quests = progression.getQuests();
        let activeCount = 0;

        quests.forEach(quest => {
            const isComplete = quest.progress >= quest.target;
            if (!quest.claimed) activeCount++;

            const item = document.createElement('div');
            item.className = `quest-item ${quest.claimed ? 'completed' : ''} ${isComplete && !quest.claimed ? 'claimable' : ''}`;

            const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);

            let rewardText = '';
            if (quest.reward.coins) rewardText += `${quest.reward.coins} 💰`;
            if (quest.reward.gems) rewardText += ` ${quest.reward.gems} 💎`;

            item.innerHTML = `
                <div class="quest-icon">${quest.icon}</div>
                <div class="quest-info">
                    <div class="quest-title">${quest.title}</div>
                    <div class="quest-progress">${Math.min(quest.progress, quest.target)} / ${quest.target}</div>
                    <div class="quest-progress-bar">
                        <div class="quest-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
                <div class="quest-reward">
                    ${quest.claimed ?
                        '<div style="color: #4CAF50;">✓</div>' :
                        isComplete ?
                            `<button class="quest-claim-btn" data-quest="${quest.id}">Claim</button>` :
                            `<div class="quest-reward-value">${rewardText}</div>`
                    }
                </div>
            `;

            list.appendChild(item);
        });

        // Setup claim buttons
        document.querySelectorAll('.quest-claim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const questId = btn.dataset.quest;
                if (progression.claimQuestReward(questId)) {
                    store.showMessage('Quest reward claimed!');
                    this.renderQuests();
                    progression.updateUI();
                }
            });
        });

        // Update badge
        document.getElementById('questsActive').textContent = activeCount;
    }

    renderAchievements() {
        const grid = document.getElementById('achievementsGrid');
        grid.innerHTML = '';

        const unlockedAchievements = progression.data.unlockedAchievements;

        Object.values(GAME_DATA.achievements).forEach(achievement => {
            const isUnlocked = unlockedAchievements.includes(achievement.id);

            const item = document.createElement('div');
            item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
            item.title = achievement.description;

            item.innerHTML = `
                <div class="achievement-item-icon">${isUnlocked ? achievement.icon : '🔒'}</div>
                <div class="achievement-item-name">${isUnlocked ? achievement.name : '???'}</div>
            `;

            grid.appendChild(item);
        });
    }

    // ========================================================================
    // PROFILE SCREEN
    // ========================================================================

    renderProfile() {
        const stats = progression.getStats();
        const equipped = progression.getEquipped();

        // Avatar
        const char = GAME_DATA.characters[equipped.character];
        document.getElementById('profileAvatar').textContent = char ? char.icon : '🤖';

        // Level
        document.getElementById('profileLevelBadge').textContent = progression.getLevel();
        const xpProgress = progression.getXPProgress();
        document.getElementById('profileXpFill').style.width = `${xpProgress.percentage}%`;
        document.getElementById('profileXpText').textContent = `${Math.floor(xpProgress.current)} / ${xpProgress.required} XP`;

        // Stats
        const statsContainer = document.getElementById('profileStats');
        statsContainer.innerHTML = `
            <div class="profile-stat">
                <div class="profile-stat-value">${stats.gamesPlayed}</div>
                <div class="profile-stat-label">Games Played</div>
            </div>
            <div class="profile-stat">
                <div class="profile-stat-value">${stats.highScore.toLocaleString()}</div>
                <div class="profile-stat-label">High Score</div>
            </div>
            <div class="profile-stat">
                <div class="profile-stat-value">${stats.totalCoins.toLocaleString()}</div>
                <div class="profile-stat-label">Coins Collected</div>
            </div>
            <div class="profile-stat">
                <div class="profile-stat-value">${stats.totalDistance}m</div>
                <div class="profile-stat-label">Total Distance</div>
            </div>
            <div class="profile-stat">
                <div class="profile-stat-value">${stats.maxCombo}x</div>
                <div class="profile-stat-label">Best Combo</div>
            </div>
            <div class="profile-stat">
                <div class="profile-stat-value">${stats.achievementsUnlocked}/${stats.totalAchievements}</div>
                <div class="profile-stat-label">Achievements</div>
            </div>
        `;

        // Equipped items
        const equippedGrid = document.getElementById('equippedGrid');
        const theme = GAME_DATA.themes[equipped.theme];
        const color = GAME_DATA.colors[equipped.color];

        equippedGrid.innerHTML = `
            <div class="equipped-item">${char ? char.icon : '🤖'}</div>
            <div class="equipped-item">${theme ? theme.icon : '🌲'}</div>
            <div class="equipped-item" style="background: ${color ? color.hex : '#4CAF50'};"></div>
        `;
    }
}

// Initialize app
window.app = new App();

// Show screens after game over
window.addEventListener('gameOver', () => {
    document.getElementById('topBar').style.display = 'flex';
    document.getElementById('navButtons').style.display = 'flex';
});

// Update UI when progression changes
window.addEventListener('progressionUpdate', () => {
    progression.updateUI();
});
