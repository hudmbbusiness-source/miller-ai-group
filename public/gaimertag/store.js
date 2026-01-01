/**
 * STORE SYSTEM
 * Handles purchasing, displaying items, and managing the store UI
 */

class StoreSystem {
    constructor() {
        this.currentTab = 'characters';
    }

    init() {
        this.setupTabs();
        this.renderStore();
    }

    setupTabs() {
        document.querySelectorAll('.store-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.store-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                this.renderStore();
            });
        });
    }

    renderStore() {
        const content = document.getElementById('storeContent');
        content.innerHTML = '';

        switch (this.currentTab) {
            case 'characters':
                this.renderCharacters(content);
                break;
            case 'themes':
                this.renderThemes(content);
                break;
            case 'powerups':
                this.renderPowerups(content);
                break;
            case 'colors':
                this.renderColors(content);
                break;
        }
    }

    renderCharacters(container) {
        const characters = GAME_DATA.characters;
        const equipped = progression.getEquipped();

        Object.values(characters).forEach(char => {
            const isUnlocked = progression.isCharacterUnlocked(char.id);
            const isEquipped = equipped.character === char.id;
            const canAfford = this.canAfford(char.price, char.currency || 'coins');
            const meetsLevel = progression.getLevel() >= char.levelRequired;

            const item = document.createElement('div');
            item.className = `store-item ${isUnlocked ? 'owned' : ''} ${isEquipped ? 'equipped' : ''} ${!meetsLevel ? 'locked' : ''}`;

            item.innerHTML = `
                <div class="store-item-preview">${char.icon}</div>
                <div class="store-item-name">${char.name}</div>
                ${isEquipped ? '<div class="store-item-equipped">EQUIPPED</div>' :
                    isUnlocked ? '<div class="store-item-owned">OWNED</div>' :
                    !meetsLevel ? `<div class="store-item-locked">Level ${char.levelRequired} Required</div>` :
                    `<div class="store-item-price ${char.currency === 'gems' ? 'gems' : ''}">
                        ${char.currency === 'gems' ? '💎' : '💰'} ${char.price}
                    </div>`
                }
                ${!meetsLevel ? `<div class="store-item-level-req">Lvl ${char.levelRequired}</div>` : ''}
            `;

            item.addEventListener('click', () => this.handleCharacterClick(char, isUnlocked, isEquipped, meetsLevel, canAfford));
            container.appendChild(item);
        });
    }

    renderThemes(container) {
        const themes = GAME_DATA.themes;
        const equipped = progression.getEquipped();

        Object.values(themes).forEach(theme => {
            const isUnlocked = progression.isThemeUnlocked(theme.id);
            const isEquipped = equipped.theme === theme.id;
            const canAfford = this.canAfford(theme.price, theme.currency || 'coins');
            const meetsLevel = progression.getLevel() >= theme.levelRequired;

            const item = document.createElement('div');
            item.className = `store-item ${isUnlocked ? 'owned' : ''} ${isEquipped ? 'equipped' : ''} ${!meetsLevel ? 'locked' : ''}`;

            item.innerHTML = `
                <div class="store-item-preview">${theme.icon}</div>
                <div class="store-item-name">${theme.name}</div>
                ${isEquipped ? '<div class="store-item-equipped">EQUIPPED</div>' :
                    isUnlocked ? '<div class="store-item-owned">OWNED</div>' :
                    !meetsLevel ? `<div class="store-item-locked">Level ${theme.levelRequired} Required</div>` :
                    `<div class="store-item-price ${theme.currency === 'gems' ? 'gems' : ''}">
                        ${theme.currency === 'gems' ? '💎' : '💰'} ${theme.price}
                    </div>`
                }
                ${!meetsLevel ? `<div class="store-item-level-req">Lvl ${theme.levelRequired}</div>` : ''}
            `;

            item.addEventListener('click', () => this.handleThemeClick(theme, isUnlocked, isEquipped, meetsLevel, canAfford));
            container.appendChild(item);
        });
    }

    renderPowerups(container) {
        const powerups = GAME_DATA.powerups;

        Object.values(powerups).forEach(powerup => {
            const owned = progression.getPowerupCount(powerup.id);
            const canAfford = this.canAfford(powerup.price, powerup.currency || 'coins');

            const item = document.createElement('div');
            item.className = `store-item ${canAfford ? '' : 'locked'}`;

            item.innerHTML = `
                <div class="store-item-preview">${powerup.icon}</div>
                <div class="store-item-name">${powerup.name}</div>
                <div class="store-item-description" style="font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 8px;">
                    ${powerup.description}
                </div>
                <div class="store-item-price">
                    ${powerup.currency === 'gems' ? '💎' : '💰'} ${powerup.price}
                </div>
                ${owned > 0 ? `<div style="font-size: 12px; color: #4CAF50; margin-top: 5px;">Owned: ${owned}</div>` : ''}
            `;

            item.addEventListener('click', () => this.handlePowerupClick(powerup, canAfford));
            container.appendChild(item);
        });
    }

    renderColors(container) {
        const colors = GAME_DATA.colors;
        const equipped = progression.getEquipped();

        Object.values(colors).forEach(color => {
            const isUnlocked = progression.isColorUnlocked(color.id);
            const isEquipped = equipped.color === color.id;
            const canAfford = this.canAfford(color.price, color.currency || 'coins');

            const item = document.createElement('div');
            item.className = `store-item ${isUnlocked ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}`;

            const colorPreview = color.special ?
                'background: linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff);' :
                `background: ${color.hex};`;

            item.innerHTML = `
                <div class="store-item-preview" style="border-radius: 50%; ${colorPreview}"></div>
                <div class="store-item-name">${color.name}</div>
                ${isEquipped ? '<div class="store-item-equipped">EQUIPPED</div>' :
                    isUnlocked ? '<div class="store-item-owned">OWNED</div>' :
                    `<div class="store-item-price ${color.currency === 'gems' ? 'gems' : ''}">
                        ${color.currency === 'gems' ? '💎' : '💰'} ${color.price}
                    </div>`
                }
            `;

            item.addEventListener('click', () => this.handleColorClick(color, isUnlocked, isEquipped, canAfford));
            container.appendChild(item);
        });
    }

    // ========================================================================
    // PURCHASE HANDLERS
    // ========================================================================

    handleCharacterClick(char, isUnlocked, isEquipped, meetsLevel, canAfford) {
        if (isEquipped) return;

        if (isUnlocked) {
            progression.equipCharacter(char.id);
            this.renderStore();
            this.updateLoadout();
            return;
        }

        if (!meetsLevel) {
            this.showMessage(`Reach level ${char.levelRequired} to unlock!`);
            return;
        }

        if (!canAfford) {
            this.showMessage(`Not enough ${char.currency === 'gems' ? 'gems' : 'coins'}!`);
            return;
        }

        // Purchase
        if (char.currency === 'gems') {
            progression.spendGems(char.price);
        } else {
            progression.spendCoins(char.price);
        }

        progression.unlockCharacter(char.id);
        progression.equipCharacter(char.id);
        progression.checkAchievements();

        this.showMessage(`${char.name} unlocked!`);
        this.renderStore();
        this.updateLoadout();
    }

    handleThemeClick(theme, isUnlocked, isEquipped, meetsLevel, canAfford) {
        if (isEquipped) return;

        if (isUnlocked) {
            progression.equipTheme(theme.id);
            this.renderStore();
            this.updateLoadout();
            return;
        }

        if (!meetsLevel) {
            this.showMessage(`Reach level ${theme.levelRequired} to unlock!`);
            return;
        }

        if (!canAfford) {
            this.showMessage(`Not enough ${theme.currency === 'gems' ? 'gems' : 'coins'}!`);
            return;
        }

        if (theme.currency === 'gems') {
            progression.spendGems(theme.price);
        } else {
            progression.spendCoins(theme.price);
        }

        progression.unlockTheme(theme.id);
        progression.equipTheme(theme.id);
        progression.checkAchievements();

        this.showMessage(`${theme.name} theme unlocked!`);
        this.renderStore();
        this.updateLoadout();
    }

    handleColorClick(color, isUnlocked, isEquipped, canAfford) {
        if (isEquipped) return;

        if (isUnlocked) {
            progression.equipColor(color.id);
            this.renderStore();
            return;
        }

        if (!canAfford) {
            this.showMessage(`Not enough ${color.currency === 'gems' ? 'gems' : 'coins'}!`);
            return;
        }

        if (color.currency === 'gems') {
            progression.spendGems(color.price);
        } else {
            progression.spendCoins(color.price);
        }

        progression.unlockColor(color.id);
        progression.equipColor(color.id);

        this.showMessage(`${color.name} color unlocked!`);
        this.renderStore();
    }

    handlePowerupClick(powerup, canAfford) {
        if (!canAfford) {
            this.showMessage(`Not enough ${powerup.currency === 'gems' ? 'gems' : 'coins'}!`);
            return;
        }

        if (powerup.currency === 'gems') {
            progression.spendGems(powerup.price);
        } else {
            progression.spendCoins(powerup.price);
        }

        progression.addPowerup(powerup.id);

        this.showMessage(`${powerup.name} purchased!`);
        this.renderStore();
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    canAfford(price, currency = 'coins') {
        if (currency === 'gems') {
            return progression.getGems() >= price;
        }
        return progression.getCoins() >= price;
    }

    showMessage(text) {
        // Simple toast message
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 15px 30px;
            border-radius: 30px;
            font-weight: 800;
            z-index: 1000;
            animation: fadeInOut 2s ease forwards;
        `;
        toast.textContent = text;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 2000);
    }

    updateLoadout() {
        const equipped = progression.getEquipped();
        const char = GAME_DATA.characters[equipped.character];
        const theme = GAME_DATA.themes[equipped.theme];

        document.getElementById('selectedCharacter').textContent = char.icon;
        document.getElementById('selectedTheme').textContent = theme.icon;
    }
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        20% { opacity: 1; transform: translateX(-50%) translateY(0); }
        80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);

// Create global instance
window.store = new StoreSystem();
