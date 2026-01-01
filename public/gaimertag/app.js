/**
 * APP CONTROLLER
 * Main application logic, navigation, and UI management
 */

class App {
    constructor() {
        this.currentScreen = 'play';
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
            this.startGame();
        });

        // Home button
        document.getElementById('homeBtn').addEventListener('click', () => {
            document.getElementById('gameoverScreen').classList.remove('show');
            this.showScreen('play');
            game.draw();
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

    startGame() {
        document.getElementById('playScreen').classList.remove('active');
        document.getElementById('topBar').style.display = 'none';
        document.getElementById('navButtons').style.display = 'none';
        document.getElementById('hud').style.display = 'flex';

        game.start();
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
    // GAMES SCREEN
    // ========================================================================

    renderGames() {
        const grid = document.getElementById('gamesGrid');
        grid.innerHTML = '';

        let lockedCount = 0;

        Object.values(GAME_DATA.games).forEach(gameData => {
            const isUnlocked = progression.isGameUnlocked(gameData.id);
            if (!isUnlocked) lockedCount++;

            const card = document.createElement('div');
            card.className = `game-card ${isUnlocked ? '' : 'locked'}`;
            card.style.background = `linear-gradient(135deg, ${gameData.gradient[0]} 0%, ${gameData.gradient[1]} 100%)`;

            let unlockText = '';
            if (!isUnlocked && gameData.unlockRequirement) {
                if (gameData.unlockRequirement.type === 'level') {
                    unlockText = `<div class="game-card-unlock">🔒 Reach Level ${gameData.unlockRequirement.value}</div>`;
                } else if (gameData.unlockRequirement.type === 'coins') {
                    unlockText = `<div class="game-card-unlock">🔒 Collect ${gameData.unlockRequirement.value} total coins</div>`;
                }
            }

            card.innerHTML = `
                <div class="game-card-image">${gameData.icon}</div>
                <div class="game-card-info">
                    <div class="game-card-title">${gameData.name}</div>
                    <div class="game-card-desc">${gameData.description}</div>
                    ${isUnlocked ?
                        `<div class="game-card-play">PLAY</div>` :
                        unlockText
                    }
                </div>
            `;

            if (isUnlocked && gameData.id === 'runner') {
                card.addEventListener('click', () => {
                    this.showScreen('play');
                });
            } else if (isUnlocked) {
                card.addEventListener('click', () => {
                    store.showMessage('Coming soon!');
                });
            }

            grid.appendChild(card);
        });

        // Update locked count badge
        document.getElementById('gamesLocked').textContent = lockedCount;
        document.getElementById('gamesLocked').style.display = lockedCount > 0 ? 'block' : 'none';
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
