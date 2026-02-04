/**
 * Digit Duel - Storage Module
 * Handles localStorage for stats and settings
 */

export class Storage {
    constructor() {
        this.STATS_KEY = 'digitDuel_stats';
        this.SETTINGS_KEY = 'digitDuel_settings';
    }

    getStats() {
        try {
            const data = localStorage.getItem(this.STATS_KEY);
            return data ? JSON.parse(data) : {
                wins: 0,
                losses: 0,
                draws: 0,
                gamesPlayed: 0,
                history: []
            };
        } catch (e) {
            console.error('Error reading stats:', e);
            return { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, history: [] };
        }
    }

    saveStats(stats) {
        try {
            localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
        } catch (e) {
            console.error('Error saving stats:', e);
        }
    }

    addGameResult(isWin, isDraw = false) {
        const stats = this.getStats();

        stats.gamesPlayed++;

        if (isDraw) {
            stats.draws++;
        } else if (isWin) {
            stats.wins++;
        } else {
            stats.losses++;
        }

        // Add to history (keep last 50 games)
        stats.history.unshift({
            date: new Date().toISOString(),
            result: isDraw ? 'draw' : (isWin ? 'win' : 'loss')
        });

        if (stats.history.length > 50) {
            stats.history = stats.history.slice(0, 50);
        }

        this.saveStats(stats);
        return stats;
    }

    resetStats() {
        this.saveStats({
            wins: 0,
            losses: 0,
            draws: 0,
            gamesPlayed: 0,
            history: []
        });
    }

    getSettings() {
        try {
            const data = localStorage.getItem(this.SETTINGS_KEY);
            return data ? JSON.parse(data) : {
                sound: true,
                vibration: true,
                darkMode: true,
                installDismissed: false
            };
        } catch (e) {
            return { sound: true, vibration: true, darkMode: true, installDismissed: false };
        }
    }

    saveSettings(settings) {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    }

    updateSettings(updates) {
        const settings = this.getSettings();
        Object.assign(settings, updates);
        this.saveSettings(settings);
        return settings;
    }
}
