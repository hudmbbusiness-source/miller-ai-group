/**
 * PROGRESSION SYSTEM
 * Handles XP, Levels, Achievements, Quests, Daily Rewards
 */

class ProgressionSystem {
    constructor() {
        this.loadData();
        this.generateDailyQuests();
        this.checkDailyReward();
    }

    // ========================================================================
    // DATA MANAGEMENT
    // ========================================================================

    getDefaultData() {
        return {
            // Currency
            coins: 100,
            gems: 5,

            // Level
            level: 1,
            xp: 0,

            // Stats
            totalGamesPlayed: 0,
            totalScore: 0,
            totalCoinsCollected: 0,
            totalDistanceRun: 0,
            totalObstaclesDodged: 0,
            highScore: 0,
            maxCombo: 0,
            itemsBought: 0,

            // Unlocks
            unlockedCharacters: ['robot'],
            unlockedThemes: ['forest'],
            unlockedColors: ['green'],
            ownedPowerups: {},

            // Equipped
            equippedCharacter: 'robot',
            equippedTheme: 'forest',
            equippedColor: 'green',

            // Achievements
            unlockedAchievements: [],

            // Quests
            dailyQuests: [],
            lastQuestReset: null,

            // Daily Reward
            lastDailyReward: null,
            dailyStreak: 0,

            // Session stats (reset each game)
            sessionStats: {}
        };
    }

    loadData() {
        const saved = localStorage.getItem('superRunnerProgress');
        if (saved) {
            this.data = { ...this.getDefaultData(), ...JSON.parse(saved) };
        } else {
            this.data = this.getDefaultData();
        }
    }

    saveData() {
        localStorage.setItem('superRunnerProgress', JSON.stringify(this.data));
    }

    // ========================================================================
    // CURRENCY
    // ========================================================================

    getCoins() {
        return this.data.coins;
    }

    getGems() {
        return this.data.gems;
    }

    addCoins(amount) {
        this.data.coins += amount;
        this.saveData();
        this.updateUI();
        return this.data.coins;
    }

    addGems(amount) {
        this.data.gems += amount;
        this.saveData();
        this.updateUI();
        return this.data.gems;
    }

    spendCoins(amount) {
        if (this.data.coins >= amount) {
            this.data.coins -= amount;
            this.saveData();
            this.updateUI();
            return true;
        }
        return false;
    }

    spendGems(amount) {
        if (this.data.gems >= amount) {
            this.data.gems -= amount;
            this.saveData();
            this.updateUI();
            return true;
        }
        return false;
    }

    // ========================================================================
    // XP & LEVELS
    // ========================================================================

    getLevel() {
        return this.data.level;
    }

    getXP() {
        return this.data.xp;
    }

    getXPForLevel(level) {
        const base = GAME_DATA.levelSystem.baseXP;
        const mult = GAME_DATA.levelSystem.xpMultiplier;
        return Math.floor(base * Math.pow(mult, level - 1));
    }

    getXPProgress() {
        const currentLevelXP = this.getXPForLevel(this.data.level);
        return {
            current: this.data.xp,
            required: currentLevelXP,
            percentage: Math.min(100, (this.data.xp / currentLevelXP) * 100)
        };
    }

    addXP(amount) {
        this.data.xp += amount;

        // Check for level up
        while (this.data.xp >= this.getXPForLevel(this.data.level)) {
            this.data.xp -= this.getXPForLevel(this.data.level);
            this.data.level++;
            this.onLevelUp(this.data.level);
        }

        this.saveData();
        this.updateUI();
    }

    onLevelUp(newLevel) {
        // Get rewards for this level
        const rewards = GAME_DATA.levelSystem.levelRewards[newLevel];

        if (rewards) {
            if (rewards.coins) this.data.coins += rewards.coins;
            if (rewards.gems) this.data.gems += rewards.gems;

            // Unlock content
            if (rewards.unlock) {
                const [type, id] = rewards.unlock.split(':');
                if (type === 'theme' && !this.data.unlockedThemes.includes(id)) {
                    this.data.unlockedThemes.push(id);
                }
                if (type === 'game') {
                    // Games unlock automatically by level
                }
            }
        }

        // Show level up notification
        this.showLevelUpNotification(newLevel, rewards);

        // Check level-based achievements
        this.checkAchievements();
    }

    showLevelUpNotification(level, rewards) {
        const notification = document.getElementById('levelUpNotification');
        const levelNumber = document.getElementById('newLevelNumber');
        const rewardText = document.getElementById('levelUpReward');

        levelNumber.textContent = level;

        let rewardStr = '';
        if (rewards) {
            if (rewards.coins) rewardStr += `+${rewards.coins} 💰 `;
            if (rewards.gems) rewardStr += `+${rewards.gems} 💎 `;
            if (rewards.unlock) rewardStr += `New unlock! 🎁`;
        }
        rewardText.textContent = rewardStr;

        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // ========================================================================
    // GAME END PROCESSING
    // ========================================================================

    processGameEnd(gameStats) {
        const xpRewards = GAME_DATA.levelSystem.xpRewards;

        // Calculate XP earned
        let xpEarned = 0;
        xpEarned += Math.floor(gameStats.score * xpRewards.perPoint);
        xpEarned += gameStats.coinsCollected * xpRewards.perCoin;
        xpEarned += gameStats.obstaclesDodged * xpRewards.perObstacle;
        xpEarned += gameStats.maxCombo * xpRewards.perCombo;
        xpEarned += xpRewards.perGame;

        // Update lifetime stats
        this.data.totalGamesPlayed++;
        this.data.totalScore += gameStats.score;
        this.data.totalCoinsCollected += gameStats.coinsCollected;
        this.data.totalDistanceRun += gameStats.distance;
        this.data.totalObstaclesDodged += gameStats.obstaclesDodged;

        if (gameStats.score > this.data.highScore) {
            this.data.highScore = gameStats.score;
        }
        if (gameStats.maxCombo > this.data.maxCombo) {
            this.data.maxCombo = gameStats.maxCombo;
        }

        // Add coins (already collected during game)
        this.data.coins += gameStats.coinsCollected;

        // Add XP
        this.addXP(xpEarned);

        // Update quest progress
        this.updateQuestProgress(gameStats);

        // Check achievements
        this.checkAchievements();

        this.saveData();
        this.updateUI();

        return {
            coinsEarned: gameStats.coinsCollected,
            xpEarned: xpEarned,
            newHighScore: gameStats.score > this.data.highScore
        };
    }

    // ========================================================================
    // ACHIEVEMENTS
    // ========================================================================

    checkAchievements() {
        const achievements = GAME_DATA.achievements;

        for (const [id, achievement] of Object.entries(achievements)) {
            if (this.data.unlockedAchievements.includes(id)) continue;

            let unlocked = false;
            const condition = achievement.condition;

            switch (condition.type) {
                case 'gamesPlayed':
                    unlocked = this.data.totalGamesPlayed >= condition.value;
                    break;
                case 'singleScore':
                    unlocked = this.data.highScore >= condition.value;
                    break;
                case 'totalCoins':
                    unlocked = this.data.totalCoinsCollected >= condition.value;
                    break;
                case 'maxCombo':
                    unlocked = this.data.maxCombo >= condition.value;
                    break;
                case 'level':
                    unlocked = this.data.level >= condition.value;
                    break;
                case 'singleDistance':
                    unlocked = this.data.sessionStats.distance >= condition.value;
                    break;
                case 'itemsBought':
                    unlocked = this.data.itemsBought >= condition.value;
                    break;
                case 'loginStreak':
                    unlocked = this.data.dailyStreak >= condition.value;
                    break;
            }

            if (unlocked) {
                this.unlockAchievement(id, achievement);
            }
        }
    }

    unlockAchievement(id, achievement) {
        this.data.unlockedAchievements.push(id);

        // Give rewards
        if (achievement.reward.coins) {
            this.data.coins += achievement.reward.coins;
        }
        if (achievement.reward.gems) {
            this.data.gems += achievement.reward.gems;
        }

        this.saveData();

        // Show notification
        this.showAchievementPopup(achievement);
    }

    showAchievementPopup(achievement) {
        const popup = document.getElementById('achievementPopup');
        const icon = document.getElementById('achievementIcon');
        const name = document.getElementById('achievementName');

        icon.textContent = achievement.icon;
        name.textContent = achievement.name;

        popup.classList.add('show');

        setTimeout(() => {
            popup.classList.remove('show');
        }, 4000);
    }

    // ========================================================================
    // DAILY QUESTS
    // ========================================================================

    generateDailyQuests() {
        const today = new Date().toDateString();

        if (this.data.lastQuestReset !== today) {
            // Generate 3 new random quests
            const templates = [...GAME_DATA.questTemplates];
            const quests = [];

            for (let i = 0; i < 3; i++) {
                const templateIndex = Math.floor(Math.random() * templates.length);
                const template = templates.splice(templateIndex, 1)[0];

                const variation = template.variations[Math.floor(Math.random() * template.variations.length)];

                quests.push({
                    id: `${template.id}_${Date.now()}_${i}`,
                    title: template.title.replace('{count}', variation.count),
                    icon: template.icon,
                    type: template.type,
                    target: variation.count,
                    progress: 0,
                    reward: variation.reward,
                    claimed: false
                });
            }

            this.data.dailyQuests = quests;
            this.data.lastQuestReset = today;
            this.saveData();
        }
    }

    updateQuestProgress(gameStats) {
        this.data.dailyQuests.forEach(quest => {
            if (quest.claimed) return;

            switch (quest.type) {
                case 'gamesPlayed':
                    quest.progress++;
                    break;
                case 'coinsCollected':
                    quest.progress += gameStats.coinsCollected;
                    break;
                case 'totalScore':
                    quest.progress += gameStats.score;
                    break;
                case 'distanceRun':
                    quest.progress += Math.floor(gameStats.distance);
                    break;
                case 'comboReached':
                    quest.progress = Math.max(quest.progress, gameStats.maxCombo);
                    break;
                case 'obstaclesDodged':
                    quest.progress += gameStats.obstaclesDodged;
                    break;
            }
        });

        this.saveData();
    }

    claimQuestReward(questId) {
        const quest = this.data.dailyQuests.find(q => q.id === questId);
        if (!quest || quest.claimed || quest.progress < quest.target) return false;

        quest.claimed = true;

        if (quest.reward.coins) this.addCoins(quest.reward.coins);
        if (quest.reward.gems) this.addGems(quest.reward.gems);

        this.addXP(GAME_DATA.levelSystem.xpRewards.perQuest);

        this.saveData();
        return true;
    }

    getQuests() {
        return this.data.dailyQuests;
    }

    // ========================================================================
    // DAILY REWARDS
    // ========================================================================

    checkDailyReward() {
        const today = new Date().toDateString();
        const lastReward = this.data.lastDailyReward;

        if (!lastReward) {
            // First time player
            this.data.dailyStreak = 1;
            return true; // Should show daily reward
        }

        const lastDate = new Date(lastReward);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            // Already claimed today
            return false;
        } else if (daysDiff === 1) {
            // Consecutive day
            this.data.dailyStreak = Math.min(7, this.data.dailyStreak + 1);
            return true;
        } else {
            // Streak broken
            this.data.dailyStreak = 1;
            return true;
        }
    }

    claimDailyReward() {
        const day = this.data.dailyStreak;
        const reward = GAME_DATA.dailyRewards[day - 1];

        if (reward.reward.coins) this.addCoins(reward.reward.coins);
        if (reward.reward.gems) this.addGems(reward.reward.gems);

        this.data.lastDailyReward = new Date().toDateString();
        this.saveData();

        return reward;
    }

    getDailyStreak() {
        return this.data.dailyStreak;
    }

    shouldShowDailyReward() {
        const today = new Date().toDateString();
        return this.data.lastDailyReward !== today;
    }

    // ========================================================================
    // UNLOCKS & EQUIPMENT
    // ========================================================================

    isCharacterUnlocked(id) {
        return this.data.unlockedCharacters.includes(id);
    }

    isThemeUnlocked(id) {
        return this.data.unlockedThemes.includes(id);
    }

    isColorUnlocked(id) {
        return this.data.unlockedColors.includes(id);
    }

    unlockCharacter(id) {
        if (!this.data.unlockedCharacters.includes(id)) {
            this.data.unlockedCharacters.push(id);
            this.data.itemsBought++;
            this.saveData();
        }
    }

    unlockTheme(id) {
        if (!this.data.unlockedThemes.includes(id)) {
            this.data.unlockedThemes.push(id);
            this.data.itemsBought++;
            this.saveData();
        }
    }

    unlockColor(id) {
        if (!this.data.unlockedColors.includes(id)) {
            this.data.unlockedColors.push(id);
            this.data.itemsBought++;
            this.saveData();
        }
    }

    equipCharacter(id) {
        if (this.isCharacterUnlocked(id)) {
            this.data.equippedCharacter = id;
            this.saveData();
        }
    }

    equipTheme(id) {
        if (this.isThemeUnlocked(id)) {
            this.data.equippedTheme = id;
            this.saveData();
        }
    }

    equipColor(id) {
        if (this.isColorUnlocked(id)) {
            this.data.equippedColor = id;
            this.saveData();
        }
    }

    getEquipped() {
        return {
            character: this.data.equippedCharacter,
            theme: this.data.equippedTheme,
            color: this.data.equippedColor
        };
    }

    // Power-ups
    getPowerupCount(id) {
        return this.data.ownedPowerups[id] || 0;
    }

    addPowerup(id, count = 1) {
        this.data.ownedPowerups[id] = (this.data.ownedPowerups[id] || 0) + count;
        this.saveData();
    }

    usePowerup(id) {
        if (this.data.ownedPowerups[id] > 0) {
            this.data.ownedPowerups[id]--;
            this.saveData();
            return true;
        }
        return false;
    }

    // ========================================================================
    // GAMES UNLOCKS
    // ========================================================================

    isGameUnlocked(gameId) {
        const game = GAME_DATA.games[gameId];
        if (!game) return false;
        if (game.unlocked) return true;

        const req = game.unlockRequirement;
        if (!req) return true;

        switch (req.type) {
            case 'level':
                return this.data.level >= req.value;
            case 'coins':
                return this.data.totalCoinsCollected >= req.value;
            default:
                return false;
        }
    }

    // ========================================================================
    // STATS
    // ========================================================================

    getStats() {
        return {
            gamesPlayed: this.data.totalGamesPlayed,
            highScore: this.data.highScore,
            totalCoins: this.data.totalCoinsCollected,
            totalDistance: Math.floor(this.data.totalDistanceRun),
            maxCombo: this.data.maxCombo,
            achievementsUnlocked: this.data.unlockedAchievements.length,
            totalAchievements: Object.keys(GAME_DATA.achievements).length
        };
    }

    // ========================================================================
    // UI UPDATE
    // ========================================================================

    updateUI() {
        // Update currency displays
        const coinDisplays = ['totalCoins', 'storeCoins'];
        const gemDisplays = ['totalGems', 'storeGems'];

        coinDisplays.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.data.coins.toLocaleString();
        });

        gemDisplays.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.data.gems.toLocaleString();
        });

        // Update level display
        const levelEl = document.getElementById('playerLevel');
        if (levelEl) levelEl.textContent = this.data.level;

        const xpProgress = this.getXPProgress();
        const xpBar = document.getElementById('xpBar');
        if (xpBar) xpBar.style.width = `${xpProgress.percentage}%`;

        const xpText = document.getElementById('xpText');
        if (xpText) xpText.textContent = `${Math.floor(xpProgress.current)} / ${xpProgress.required} XP`;

        // Update profile if visible
        const profileLevelBadge = document.getElementById('profileLevelBadge');
        if (profileLevelBadge) profileLevelBadge.textContent = this.data.level;

        const profileXpFill = document.getElementById('profileXpFill');
        if (profileXpFill) profileXpFill.style.width = `${xpProgress.percentage}%`;

        const profileXpText = document.getElementById('profileXpText');
        if (profileXpText) profileXpText.textContent = `${Math.floor(xpProgress.current)} / ${xpProgress.required} XP`;
    }
}

// Create global instance
window.progression = new ProgressionSystem();
