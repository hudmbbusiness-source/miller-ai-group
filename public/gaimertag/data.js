/**
 * GAME DATA - All content definitions
 * Characters, Themes, Power-ups, Achievements, Quests, Games
 */

const GAME_DATA = {
    // ========================================================================
    // CHARACTERS
    // ========================================================================
    characters: {
        robot: {
            id: 'robot',
            name: 'Robot',
            icon: '🤖',
            price: 0,
            currency: 'coins',
            unlocked: true,
            levelRequired: 1,
            description: 'A friendly robot ready to run!'
        },
        cat: {
            id: 'cat',
            name: 'Cat',
            icon: '🐱',
            price: 500,
            currency: 'coins',
            unlocked: false,
            levelRequired: 1,
            description: 'Quick and agile feline'
        },
        ninja: {
            id: 'ninja',
            name: 'Ninja',
            icon: '🥷',
            price: 1000,
            currency: 'coins',
            unlocked: false,
            levelRequired: 3,
            description: 'Silent and swift warrior'
        },
        alien: {
            id: 'alien',
            name: 'Alien',
            icon: '👽',
            price: 1500,
            currency: 'coins',
            unlocked: false,
            levelRequired: 5,
            description: 'Visitor from another world'
        },
        dino: {
            id: 'dino',
            name: 'Dino',
            icon: '🦖',
            price: 2000,
            currency: 'coins',
            unlocked: false,
            levelRequired: 7,
            description: 'Prehistoric powerhouse'
        },
        bunny: {
            id: 'bunny',
            name: 'Bunny',
            icon: '🐰',
            price: 2500,
            currency: 'coins',
            unlocked: false,
            levelRequired: 10,
            description: 'Bouncy and adorable'
        },
        dragon: {
            id: 'dragon',
            name: 'Dragon',
            icon: '🐲',
            price: 50,
            currency: 'gems',
            unlocked: false,
            levelRequired: 12,
            description: 'Legendary fire breather'
        },
        unicorn: {
            id: 'unicorn',
            name: 'Unicorn',
            icon: '🦄',
            price: 75,
            currency: 'gems',
            unlocked: false,
            levelRequired: 15,
            description: 'Magical rainbow runner'
        },
        astronaut: {
            id: 'astronaut',
            name: 'Astronaut',
            icon: '👨‍🚀',
            price: 100,
            currency: 'gems',
            unlocked: false,
            levelRequired: 20,
            description: 'Space explorer supreme'
        },
        ghost: {
            id: 'ghost',
            name: 'Ghost',
            icon: '👻',
            price: 3000,
            currency: 'coins',
            unlocked: false,
            levelRequired: 8,
            description: 'Spooky but friendly'
        },
        penguin: {
            id: 'penguin',
            name: 'Penguin',
            icon: '🐧',
            price: 1200,
            currency: 'coins',
            unlocked: false,
            levelRequired: 4,
            description: 'Cool and collected'
        },
        fox: {
            id: 'fox',
            name: 'Fox',
            icon: '🦊',
            price: 800,
            currency: 'coins',
            unlocked: false,
            levelRequired: 2,
            description: 'Clever and fast'
        }
    },

    // ========================================================================
    // THEMES - FIXED: High contrast obstacles that pop against backgrounds
    // ========================================================================
    themes: {
        forest: {
            id: 'forest',
            name: 'Forest',
            icon: '🌲',
            price: 0,
            currency: 'coins',
            unlocked: true,
            levelRequired: 1,
            colors: {
                skyGradient: ['#87CEEB', '#c8e6c9', '#98FB98'],
                groundColor: '#5d4037',
                groundGradient: ['#6d4c41', '#4e342e'],
                groundLineColor: '#388E3C',
                grassColor: '#4CAF50',
                // FIXED: Red/orange obstacles pop against green
                obstacleGradient: ['#dc2626', '#991b1b'],
                obstacleAccent: '#fca5a5',
                obstacleStroke: '#000000',
                cloudColor: 'rgba(255, 255, 255, 0.9)',
                parallaxColors: ['#a5d6a7', '#81c784', '#66bb6a'],
                particleColor: '#8BC34A'
            }
        },
        space: {
            id: 'space',
            name: 'Space',
            icon: '🚀',
            price: 1000,
            currency: 'coins',
            unlocked: false,
            levelRequired: 3,
            colors: {
                skyGradient: ['#0a0a1a', '#1a1a3e', '#2d1b4e'],
                groundColor: '#1a1a3e',
                groundGradient: ['#2d2d5a', '#1a1a3e'],
                groundLineColor: '#7c4dff',
                grassColor: '#651fff',
                // Hot pink/magenta obstacles pop in dark space
                obstacleGradient: ['#f472b6', '#db2777'],
                obstacleAccent: '#fbcfe8',
                obstacleStroke: '#ffffff',
                cloudColor: 'rgba(255, 255, 255, 0.15)',
                parallaxColors: ['#4a148c', '#6a1b9a', '#7b1fa2'],
                particleColor: '#e040fb',
                stars: true
            }
        },
        desert: {
            id: 'desert',
            name: 'Desert',
            icon: '🏜️',
            price: 800,
            currency: 'coins',
            unlocked: false,
            levelRequired: 2,
            colors: {
                skyGradient: ['#ff7043', '#ffab91', '#ffe0b2'],
                groundColor: '#d7a86e',
                groundGradient: ['#e6be8a', '#c9a66b'],
                groundLineColor: '#8d6e63',
                grassColor: '#a1887f',
                // Dark purple/blue obstacles pop against warm desert
                obstacleGradient: ['#7c3aed', '#4c1d95'],
                obstacleAccent: '#c4b5fd',
                obstacleStroke: '#1e1b4b',
                cloudColor: 'rgba(255, 255, 255, 0.5)',
                parallaxColors: ['#ffcc80', '#ffb74d', '#ffa726'],
                particleColor: '#ffb300'
            }
        },
        ocean: {
            id: 'ocean',
            name: 'Ocean',
            icon: '🌊',
            price: 1500,
            currency: 'coins',
            unlocked: false,
            levelRequired: 5,
            colors: {
                skyGradient: ['#0077b6', '#00b4d8', '#90e0ef'],
                groundColor: '#023e8a',
                groundGradient: ['#0077b6', '#023e8a'],
                groundLineColor: '#00b4d8',
                grassColor: '#48cae4',
                // Coral red obstacles pop against blue ocean
                obstacleGradient: ['#f43f5e', '#be123c'],
                obstacleAccent: '#fda4af',
                obstacleStroke: '#881337',
                cloudColor: 'rgba(255, 255, 255, 0.7)',
                parallaxColors: ['#48cae4', '#00b4d8', '#0096c7'],
                particleColor: '#00b4d8',
                bubbles: true
            }
        },
        neon: {
            id: 'neon',
            name: 'Neon',
            icon: '💜',
            price: 2500,
            currency: 'coins',
            unlocked: false,
            levelRequired: 8,
            colors: {
                skyGradient: ['#0a0a0f', '#1a0a20', '#0f0a1a'],
                groundColor: '#0a0a15',
                groundGradient: ['#15152a', '#0a0a15'],
                groundLineColor: '#00ffff',
                grassColor: '#ff00ff',
                // Lime green obstacles glow in neon theme
                obstacleGradient: ['#84cc16', '#4d7c0f'],
                obstacleAccent: '#d9f99d',
                obstacleStroke: '#ffffff',
                cloudColor: 'rgba(255, 0, 255, 0.2)',
                parallaxColors: ['#7b00ff', '#00ff88', '#ff0088'],
                particleColor: '#00ffff',
                glow: true
            }
        },
        candy: {
            id: 'candy',
            name: 'Candy',
            icon: '🍭',
            price: 2000,
            currency: 'coins',
            unlocked: false,
            levelRequired: 6,
            colors: {
                skyGradient: ['#ffecd2', '#fcb69f', '#ff9a9e'],
                groundColor: '#ff6b9d',
                groundGradient: ['#c44569', '#ff6b9d'],
                groundLineColor: '#ffeaa7',
                grassColor: '#fd79a8',
                // Teal/dark cyan obstacles pop against pink candy
                obstacleGradient: ['#14b8a6', '#0f766e'],
                obstacleAccent: '#99f6e4',
                obstacleStroke: '#134e4a',
                cloudColor: 'rgba(255, 255, 255, 0.8)',
                parallaxColors: ['#fab1a0', '#e17055', '#fdcb6e'],
                particleColor: '#fd79a8'
            }
        },
        volcano: {
            id: 'volcano',
            name: 'Volcano',
            icon: '🌋',
            price: 50,
            currency: 'gems',
            unlocked: false,
            levelRequired: 10,
            colors: {
                skyGradient: ['#1a0a0a', '#3d1a1a', '#5c2a2a'],
                groundColor: '#2d1f1f',
                groundGradient: ['#3d2a2a', '#1a0f0f'],
                groundLineColor: '#ff4500',
                grassColor: '#ff6347',
                // Ice blue obstacles contrast hot volcano
                obstacleGradient: ['#38bdf8', '#0284c7'],
                obstacleAccent: '#bae6fd',
                obstacleStroke: '#075985',
                cloudColor: 'rgba(100, 100, 100, 0.5)',
                parallaxColors: ['#8b0000', '#b22222', '#cd5c5c'],
                particleColor: '#ff4500',
                glow: true
            }
        },
        arctic: {
            id: 'arctic',
            name: 'Arctic',
            icon: '❄️',
            price: 1800,
            currency: 'coins',
            unlocked: false,
            levelRequired: 7,
            colors: {
                skyGradient: ['#e0f7fa', '#b2ebf2', '#80deea'],
                groundColor: '#eceff1',
                groundGradient: ['#ffffff', '#cfd8dc'],
                groundLineColor: '#4dd0e1',
                grassColor: '#b3e5fc',
                // Deep orange obstacles pop against icy blue/white
                obstacleGradient: ['#ea580c', '#9a3412'],
                obstacleAccent: '#fed7aa',
                obstacleStroke: '#7c2d12',
                cloudColor: 'rgba(255, 255, 255, 0.9)',
                parallaxColors: ['#b3e5fc', '#81d4fa', '#4fc3f7'],
                particleColor: '#e1f5fe'
            }
        }
    },

    // ========================================================================
    // COLORS
    // ========================================================================
    colors: {
        green: { id: 'green', name: 'Green', hex: '#4CAF50', price: 0, unlocked: true },
        blue: { id: 'blue', name: 'Blue', hex: '#2196F3', price: 200, unlocked: false },
        red: { id: 'red', name: 'Red', hex: '#FF5722', price: 200, unlocked: false },
        purple: { id: 'purple', name: 'Purple', hex: '#9C27B0', price: 300, unlocked: false },
        yellow: { id: 'yellow', name: 'Yellow', hex: '#FFEB3B', price: 300, unlocked: false },
        pink: { id: 'pink', name: 'Pink', hex: '#E91E63', price: 400, unlocked: false },
        cyan: { id: 'cyan', name: 'Cyan', hex: '#00BCD4', price: 400, unlocked: false },
        orange: { id: 'orange', name: 'Orange', hex: '#FF9800', price: 500, unlocked: false },
        gold: { id: 'gold', name: 'Gold', hex: '#FFD700', price: 15, currency: 'gems', unlocked: false },
        rainbow: { id: 'rainbow', name: 'Rainbow', hex: 'rainbow', price: 50, currency: 'gems', unlocked: false, special: true }
    },

    // ========================================================================
    // POWER-UPS
    // ========================================================================
    powerups: {
        magnet: {
            id: 'magnet',
            name: 'Coin Magnet',
            icon: '🧲',
            description: 'Attracts coins from further away',
            duration: 30,
            price: 100,
            currency: 'coins',
            effect: 'magnetRange',
            value: 150
        },
        shield: {
            id: 'shield',
            name: 'Shield',
            icon: '🛡️',
            description: 'Survive one hit from an obstacle',
            duration: 0,
            price: 200,
            currency: 'coins',
            effect: 'extraLife',
            value: 1
        },
        doubleCoins: {
            id: 'doubleCoins',
            name: 'Double Coins',
            icon: '💰',
            description: 'Earn 2x coins during the run',
            duration: 45,
            price: 150,
            currency: 'coins',
            effect: 'coinMultiplier',
            value: 2
        },
        slowMo: {
            id: 'slowMo',
            name: 'Slow Motion',
            icon: '⏱️',
            description: 'Slows down time briefly',
            duration: 10,
            price: 250,
            currency: 'coins',
            effect: 'slowMotion',
            value: 0.5
        },
        superJump: {
            id: 'superJump',
            name: 'Super Jump',
            icon: '🦘',
            description: 'Jump 50% higher',
            duration: 30,
            price: 180,
            currency: 'coins',
            effect: 'jumpBoost',
            value: 1.5
        },
        scoreBoost: {
            id: 'scoreBoost',
            name: 'Score Boost',
            icon: '⭐',
            description: 'Earn 2x points',
            duration: 30,
            price: 200,
            currency: 'coins',
            effect: 'scoreMultiplier',
            value: 2
        }
    },

    // ========================================================================
    // ACHIEVEMENTS
    // ========================================================================
    achievements: {
        firstRun: {
            id: 'firstRun',
            name: 'First Steps',
            description: 'Complete your first run',
            icon: '👶',
            reward: { coins: 50 },
            condition: { type: 'gamesPlayed', value: 1 }
        },
        score1000: {
            id: 'score1000',
            name: 'Getting Good',
            description: 'Score 1,000 points in a single run',
            icon: '🎯',
            reward: { coins: 100 },
            condition: { type: 'singleScore', value: 1000 }
        },
        score5000: {
            id: 'score5000',
            name: 'Pro Runner',
            description: 'Score 5,000 points in a single run',
            icon: '🏃',
            reward: { coins: 300, gems: 5 },
            condition: { type: 'singleScore', value: 5000 }
        },
        score10000: {
            id: 'score10000',
            name: 'Legend',
            description: 'Score 10,000 points in a single run',
            icon: '👑',
            reward: { coins: 500, gems: 10 },
            condition: { type: 'singleScore', value: 10000 }
        },
        collect100: {
            id: 'collect100',
            name: 'Coin Collector',
            description: 'Collect 100 coins total',
            icon: '💰',
            reward: { coins: 50 },
            condition: { type: 'totalCoins', value: 100 }
        },
        collect1000: {
            id: 'collect1000',
            name: 'Treasure Hunter',
            description: 'Collect 1,000 coins total',
            icon: '💎',
            reward: { coins: 200, gems: 5 },
            condition: { type: 'totalCoins', value: 1000 }
        },
        combo5: {
            id: 'combo5',
            name: 'Combo Master',
            description: 'Reach a 5x combo',
            icon: '🔥',
            reward: { coins: 150 },
            condition: { type: 'maxCombo', value: 5 }
        },
        combo10: {
            id: 'combo10',
            name: 'Unstoppable',
            description: 'Reach a 10x combo',
            icon: '⚡',
            reward: { coins: 300, gems: 5 },
            condition: { type: 'maxCombo', value: 10 }
        },
        level5: {
            id: 'level5',
            name: 'Rising Star',
            description: 'Reach level 5',
            icon: '⭐',
            reward: { gems: 10 },
            condition: { type: 'level', value: 5 }
        },
        level10: {
            id: 'level10',
            name: 'Veteran',
            description: 'Reach level 10',
            icon: '🌟',
            reward: { gems: 25 },
            condition: { type: 'level', value: 10 }
        },
        level25: {
            id: 'level25',
            name: 'Elite',
            description: 'Reach level 25',
            icon: '💫',
            reward: { gems: 50 },
            condition: { type: 'level', value: 25 }
        },
        games10: {
            id: 'games10',
            name: 'Dedicated',
            description: 'Play 10 games',
            icon: '🎮',
            reward: { coins: 100 },
            condition: { type: 'gamesPlayed', value: 10 }
        },
        games50: {
            id: 'games50',
            name: 'Addicted',
            description: 'Play 50 games',
            icon: '🕹️',
            reward: { coins: 300, gems: 10 },
            condition: { type: 'gamesPlayed', value: 50 }
        },
        streak7: {
            id: 'streak7',
            name: 'Week Warrior',
            description: 'Play 7 days in a row',
            icon: '📅',
            reward: { gems: 20 },
            condition: { type: 'loginStreak', value: 7 }
        },
        distance1000: {
            id: 'distance1000',
            name: 'Marathon Runner',
            description: 'Run 1,000 meters in a single run',
            icon: '🏃‍♂️',
            reward: { coins: 200 },
            condition: { type: 'singleDistance', value: 1000 }
        },
        buyItem: {
            id: 'buyItem',
            name: 'Shopper',
            description: 'Buy your first item from the store',
            icon: '🛒',
            reward: { coins: 100 },
            condition: { type: 'itemsBought', value: 1 }
        }
    },

    // ========================================================================
    // DAILY QUESTS
    // ========================================================================
    questTemplates: [
        {
            id: 'playGames',
            title: 'Play {count} Games',
            icon: '🎮',
            type: 'gamesPlayed',
            variations: [
                { count: 3, reward: { coins: 50 } },
                { count: 5, reward: { coins: 100 } },
                { count: 10, reward: { coins: 200, gems: 2 } }
            ]
        },
        {
            id: 'collectCoins',
            title: 'Collect {count} Coins',
            icon: '💰',
            type: 'coinsCollected',
            variations: [
                { count: 50, reward: { coins: 30 } },
                { count: 100, reward: { coins: 75 } },
                { count: 200, reward: { coins: 150, gems: 1 } }
            ]
        },
        {
            id: 'reachScore',
            title: 'Score {count} Points',
            icon: '🎯',
            type: 'totalScore',
            variations: [
                { count: 1000, reward: { coins: 50 } },
                { count: 2500, reward: { coins: 100 } },
                { count: 5000, reward: { coins: 200, gems: 2 } }
            ]
        },
        {
            id: 'runDistance',
            title: 'Run {count} Meters',
            icon: '🏃',
            type: 'distanceRun',
            variations: [
                { count: 500, reward: { coins: 40 } },
                { count: 1000, reward: { coins: 80 } },
                { count: 2000, reward: { coins: 150, gems: 1 } }
            ]
        },
        {
            id: 'getCombo',
            title: 'Reach {count}x Combo',
            icon: '🔥',
            type: 'comboReached',
            variations: [
                { count: 3, reward: { coins: 60 } },
                { count: 5, reward: { coins: 120 } },
                { count: 8, reward: { coins: 200, gems: 3 } }
            ]
        },
        {
            id: 'dodgeObstacles',
            title: 'Dodge {count} Obstacles',
            icon: '🚧',
            type: 'obstaclesDodged',
            variations: [
                { count: 20, reward: { coins: 40 } },
                { count: 50, reward: { coins: 100 } },
                { count: 100, reward: { coins: 180, gems: 2 } }
            ]
        }
    ],

    // ========================================================================
    // DAILY REWARDS
    // ========================================================================
    dailyRewards: [
        { day: 1, reward: { coins: 50 }, icon: '💰' },
        { day: 2, reward: { coins: 75 }, icon: '💰' },
        { day: 3, reward: { coins: 100, gems: 1 }, icon: '💎' },
        { day: 4, reward: { coins: 125 }, icon: '💰' },
        { day: 5, reward: { coins: 150, gems: 2 }, icon: '💎' },
        { day: 6, reward: { coins: 200 }, icon: '💰' },
        { day: 7, reward: { coins: 300, gems: 5 }, icon: '🎁' }
    ],

    // ========================================================================
    // GAMES (UNLOCKABLE)
    // ========================================================================
    games: {
        runner: {
            id: 'runner',
            name: 'Super Runner',
            icon: '🏃',
            description: 'Classic endless runner! Jump over obstacles and collect coins.',
            unlocked: true,
            unlockRequirement: null,
            gradient: ['#4CAF50', '#2E7D32']
        },
        flappy: {
            id: 'flappy',
            name: 'Heading South',
            icon: '🦅',
            description: 'Escape the snowstorm! Fly south through the gaps to safety.',
            unlocked: true,
            unlockRequirement: null,
            gradient: ['#64B5F6', '#1976D2']
        },
        tower: {
            id: 'tower',
            name: 'Tower Stack',
            icon: '🏗️',
            description: 'Stack blocks as high as you can. Precision is key!',
            unlocked: false,
            unlockRequirement: { type: 'level', value: 10 },
            gradient: ['#FF9800', '#E65100']
        },
        maze: {
            id: 'maze',
            name: 'Maze Runner',
            icon: '🧩',
            description: 'Navigate through challenging mazes against the clock.',
            unlocked: false,
            unlockRequirement: { type: 'coins', value: 5000 },
            gradient: ['#9C27B0', '#6A1B9A']
        },
        catch: {
            id: 'catch',
            name: 'Coin Catcher',
            icon: '🪣',
            description: 'Catch falling coins while avoiding the bombs!',
            unlocked: false,
            unlockRequirement: { type: 'level', value: 15 },
            gradient: ['#F44336', '#C62828']
        }
    },

    // ========================================================================
    // LEVEL SYSTEM
    // ========================================================================
    levelSystem: {
        baseXP: 100,
        xpMultiplier: 1.5,
        maxLevel: 100,

        xpRewards: {
            perPoint: 0.1,
            perCoin: 1,
            perObstacle: 5,
            perCombo: 10,
            perGame: 25,
            perQuest: 50
        },

        levelRewards: {
            1: { coins: 100 },
            2: { coins: 150 },
            3: { coins: 200, unlock: 'theme:space' },
            4: { coins: 250 },
            5: { coins: 300, gems: 5, unlock: 'game:flappy' },
            6: { coins: 350 },
            7: { coins: 400, unlock: 'theme:arctic' },
            8: { coins: 500, gems: 10 },
            9: { coins: 550 },
            10: { coins: 600, gems: 15, unlock: 'game:tower' },
            15: { coins: 1000, gems: 25, unlock: 'game:catch' },
            20: { coins: 1500, gems: 50 },
            25: { coins: 2000, gems: 75 },
            50: { coins: 5000, gems: 200 }
        }
    }
};

window.GAME_DATA = GAME_DATA;
