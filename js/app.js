/**
 * Digit Duel - Main Application Module
 * Entry point and screen navigation
 */

import { Game } from './game.js';
import { Storage } from './storage.js';
import { AudioManager } from './audio.js';

class App {
    constructor() {
        this.currentScreen = 'home-screen';
        this.gameMode = null; // 'ai' | 'friend'
        this.gameSettings = {
            digits: 5,
            difficulty: 'medium',
            allowDuplicates: true
        };
        this.game = null;
        this.storage = new Storage();
        this.audio = new AudioManager();

        this.init();
    }

    async init() {
        // Register Service Worker
        await this.registerSW();

        // Load saved settings
        this.loadSettings();

        // Update stats display
        this.updateStatsDisplay();

        // Setup event listeners
        this.setupEventListeners();

        // Check for PWA install prompt
        this.setupInstallPrompt();

        // Handle offline status
        this.setupOfflineHandler();

        // Hide splash screen after a delay
        setTimeout(() => {
            document.getElementById('splash-screen').classList.add('hidden');
        }, 1500);

        // Check URL params for direct mode launch
        this.checkUrlParams();
    }

    async registerSW() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('SW registered:', registration.scope);
            } catch (error) {
                console.log('SW registration failed:', error);
            }
        }
    }

    loadSettings() {
        const settings = this.storage.getSettings();
        if (settings) {
            document.getElementById('sound-toggle').checked = settings.sound !== false;
            document.getElementById('vibration-toggle').checked = settings.vibration !== false;
            document.getElementById('dark-mode-toggle').checked = settings.darkMode !== false;
        }
    }

    updateStatsDisplay() {
        const stats = this.storage.getStats();
        document.getElementById('total-wins').textContent = stats.wins || 0;
        document.getElementById('total-games').textContent = stats.gamesPlayed || 0;
        const winRate = stats.gamesPlayed > 0
            ? Math.round((stats.wins / stats.gamesPlayed) * 100)
            : 0;
        document.getElementById('win-rate').textContent = winRate + '%';
    }

    setupEventListeners() {
        // Main menu buttons
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = btn.dataset.mode;
                if (mode === 'online') return; // Disabled for now
                this.gameMode = mode;

                // Show/hide AI difficulty based on mode
                const diffGroup = document.getElementById('difficulty-group');
                diffGroup.style.display = mode === 'ai' ? 'flex' : 'none';

                this.navigateTo('setup-screen');
                this.audio.play('click');
            });
        });

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.navigateTo(btn.dataset.target);
                this.audio.play('click');
            });
        });

        // Digit selector
        document.querySelectorAll('.digit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.digit-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.gameSettings.digits = parseInt(btn.dataset.digits);
                this.updateTimeDisplay();
                this.audio.play('click');
            });
        });

        // Difficulty selector
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.gameSettings.difficulty = btn.dataset.difficulty;
                this.updateTimeDisplay();
                this.audio.play('click');
            });
        });

        // Duplicates toggle
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.gameSettings.allowDuplicates = btn.dataset.duplicates === 'true';
                this.audio.play('click');
            });
        });

        // Start game button
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startSecretEntry();
            this.audio.play('click');
        });

        // How to play button
        document.getElementById('how-to-play-btn').addEventListener('click', () => {
            document.getElementById('how-to-play-modal').classList.remove('hidden');
            this.audio.play('click');
        });

        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            document.getElementById('settings-modal').classList.remove('hidden');
            this.audio.play('click');
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById(btn.dataset.modal).classList.add('hidden');
                this.audio.play('click');
            });
        });

        // Modal backdrop close
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', () => {
                backdrop.closest('.modal').classList.add('hidden');
            });
        });

        // Settings toggles
        document.getElementById('sound-toggle').addEventListener('change', (e) => {
            this.storage.updateSettings({ sound: e.target.checked });
            this.audio.setEnabled(e.target.checked);
        });

        document.getElementById('vibration-toggle').addEventListener('change', (e) => {
            this.storage.updateSettings({ vibration: e.target.checked });
        });

        document.getElementById('dark-mode-toggle').addEventListener('change', (e) => {
            this.storage.updateSettings({ darkMode: e.target.checked });
            // Could toggle a light theme here
        });

        document.getElementById('reset-stats-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all statistics?')) {
                this.storage.resetStats();
                this.updateStatsDisplay();
                this.audio.play('click');
            }
        });

        // Secret number entry
        this.setupSecretEntry();

        // Game guess input
        this.setupGuessInput();

        // Chat
        this.setupChat();

        // Game over buttons
        document.getElementById('play-again-btn').addEventListener('click', () => {
            document.getElementById('game-over-modal').classList.add('hidden');
            this.startSecretEntry();
            this.audio.play('click');
        });

        document.getElementById('go-home-btn').addEventListener('click', () => {
            document.getElementById('game-over-modal').classList.add('hidden');
            this.navigateTo('home-screen');
            this.updateStatsDisplay();
            this.audio.play('click');
        });

        // Install buttons
        document.getElementById('install-btn')?.addEventListener('click', () => {
            this.installApp();
        });

        document.getElementById('install-dismiss')?.addEventListener('click', () => {
            document.getElementById('install-prompt').classList.add('hidden');
            this.storage.updateSettings({ installDismissed: true });
        });
    }

    setupSecretEntry() {
        const display = document.getElementById('secret-display');
        const confirmBtn = document.querySelector('#secret-screen .numpad-confirm');
        let secretValue = '';

        document.querySelectorAll('#secret-screen .numpad-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = btn.dataset.num;

                if (num === 'clear') {
                    secretValue = secretValue.slice(0, -1);
                    this.audio.play('click');
                } else if (num === 'confirm') {
                    this.onSecretEntered(secretValue);
                    secretValue = '';
                    this.audio.play('success');
                    return;
                } else if (secretValue.length < this.gameSettings.digits) {
                    // Check for duplicates if not allowed
                    if (!this.gameSettings.allowDuplicates && secretValue.includes(num)) {
                        this.vibrate();
                        return;
                    }
                    secretValue += num;
                    this.audio.play('click');
                    this.vibrate(10);
                }

                this.updateSecretDisplay(secretValue, display, confirmBtn);
            });
        });
    }

    updateSecretDisplay(value, display, confirmBtn) {
        const digits = display.querySelectorAll('.secret-digit');
        digits.forEach((digit, i) => {
            if (i < value.length) {
                digit.textContent = value[i];
                digit.classList.add('filled');
            } else {
                digit.textContent = '_';
                digit.classList.remove('filled');
            }
        });

        confirmBtn.disabled = value.length !== this.gameSettings.digits;
    }

    setupGuessInput() {
        const display = document.getElementById('guess-display');
        const container = document.getElementById('guess-input-container');
        let guessValue = '';

        document.querySelectorAll('#game-screen .numpad-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (container.classList.contains('disabled')) return;

                const num = btn.dataset.num;

                if (num === 'clear') {
                    guessValue = guessValue.slice(0, -1);
                    this.audio.play('click');
                } else if (num === 'submit') {
                    if (guessValue.length === this.gameSettings.digits && this.game) {
                        this.game.submitGuess(guessValue);
                        guessValue = '';
                        this.audio.play('guess');
                    }
                    return;
                } else if (guessValue.length < this.gameSettings.digits) {
                    guessValue += num;
                    this.audio.play('click');
                    this.vibrate(10);
                }

                this.updateGuessDisplay(guessValue, display);
            });
        });
    }

    updateGuessDisplay(value, display) {
        display.innerHTML = '';
        for (let i = 0; i < this.gameSettings.digits; i++) {
            const digit = document.createElement('span');
            digit.className = 'guess-digit' + (i < value.length ? ' filled' : '');
            digit.textContent = i < value.length ? value[i] : '_';
            display.appendChild(digit);
        }

        const submitBtn = document.querySelector('#game-screen .numpad-confirm');
        submitBtn.disabled = value.length !== this.gameSettings.digits;
    }

    setupChat() {
        const chatToggle = document.getElementById('chat-toggle');
        const chatPanel = document.getElementById('chat-panel');
        const chatClose = document.getElementById('chat-close');
        const chatInput = document.getElementById('chat-input');
        const chatSend = document.getElementById('chat-send');

        chatToggle.addEventListener('click', () => {
            chatPanel.classList.add('open');
            document.querySelector('.chat-badge').classList.add('hidden');
        });

        chatClose.addEventListener('click', () => {
            chatPanel.classList.remove('open');
        });

        const sendMessage = () => {
            const text = chatInput.value.trim();
            if (text && this.game) {
                this.game.sendChatMessage(text, 'self');
                chatInput.value = '';
            }
        };

        chatSend.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    setupInstallPrompt() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;

            const settings = this.storage.getSettings();
            if (!settings.installDismissed) {
                document.getElementById('install-prompt').classList.remove('hidden');
            }
        });

        this.installApp = () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    document.getElementById('install-prompt').classList.add('hidden');
                    deferredPrompt = null;
                });
            }
        };
    }

    setupOfflineHandler() {
        const indicator = document.getElementById('offline-indicator');

        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                indicator.classList.add('hidden');
            } else {
                indicator.classList.remove('hidden');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    }

    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        if (mode === 'ai' || mode === 'friend') {
            this.gameMode = mode;
            const diffGroup = document.getElementById('difficulty-group');
            diffGroup.style.display = mode === 'ai' ? 'flex' : 'none';
            this.navigateTo('setup-screen');
        }
    }

    navigateTo(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }

    updateTimeDisplay() {
        const baseTime = this.gameSettings.digits * 2;
        let multiplier = 1;

        if (this.gameSettings.difficulty === 'easy') multiplier = 1.2;
        else if (this.gameSettings.difficulty === 'hard') multiplier = 0.8;

        const totalMinutes = Math.round(baseTime * multiplier);
        document.getElementById('calculated-time').textContent = `${totalMinutes} minutes`;
    }

    startSecretEntry() {
        // Reset secret display
        const display = document.getElementById('secret-display');
        display.innerHTML = '';
        for (let i = 0; i < this.gameSettings.digits; i++) {
            const digit = document.createElement('span');
            digit.className = 'secret-digit';
            digit.textContent = '_';
            display.appendChild(digit);
        }

        // Update instruction text
        document.getElementById('secret-digit-count').textContent = this.gameSettings.digits;

        // Reset confirm button
        document.querySelector('#secret-screen .numpad-confirm').disabled = true;

        // Navigate to secret screen
        if (this.gameMode === 'friend') {
            document.getElementById('secret-title').textContent = 'Player 1: Enter Secret';
            this.currentPlayer = 1;
            this.player1Secret = null;
            this.player2Secret = null;
        } else {
            document.getElementById('secret-title').textContent = 'Enter Your Secret';
        }

        this.navigateTo('secret-screen');
    }

    onSecretEntered(secret) {
        if (this.gameMode === 'friend') {
            if (this.currentPlayer === 1) {
                this.player1Secret = secret;
                this.currentPlayer = 2;
                document.getElementById('secret-title').textContent = 'Player 2: Enter Secret';

                // Reset display for player 2
                const display = document.getElementById('secret-display');
                display.querySelectorAll('.secret-digit').forEach(d => {
                    d.textContent = '_';
                    d.classList.remove('filled');
                });
                document.querySelector('#secret-screen .numpad-confirm').disabled = true;
            } else {
                this.player2Secret = secret;
                this.startGame(this.player1Secret, this.player2Secret);
            }
        } else {
            // AI mode - start game with player secret
            this.startGame(secret, null);
        }
    }

    startGame(playerSecret, opponentSecret) {
        // Initialize game
        this.game = new Game({
            mode: this.gameMode,
            digits: this.gameSettings.digits,
            difficulty: this.gameSettings.difficulty,
            allowDuplicates: this.gameSettings.allowDuplicates,
            playerSecret: playerSecret,
            opponentSecret: opponentSecret,
            onGuessResult: (result) => this.onGuessResult(result),
            onGameOver: (result) => this.onGameOver(result),
            onTurnChange: (isPlayerTurn) => this.onTurnChange(isPlayerTurn),
            onTimerUpdate: (time) => this.onTimerUpdate(time),
            onChatMessage: (msg, sender) => this.addChatMessage(msg, sender),
            onOpponentGuess: (guess, feedback) => this.onOpponentGuess(guess, feedback)
        });

        // Setup game UI
        this.setupGameUI();

        // Navigate to game screen
        this.navigateTo('game-screen');

        // Start the game
        this.game.start();
    }

    setupGameUI() {
        // Reset guess history
        document.getElementById('guess-history').innerHTML = `
      <div class="history-empty">
        <span>🎯</span>
        <p>Make your first guess!</p>
      </div>
    `;

        // Reset guess counts
        document.getElementById('self-guesses').textContent = '0';
        document.getElementById('opponent-guesses').textContent = '0';

        // Reset guess display
        this.updateGuessDisplay('', document.getElementById('guess-display'));

        // Set opponent info
        if (this.gameMode === 'ai') {
            document.getElementById('opponent-name').textContent = 'AI';
            document.getElementById('opponent-avatar').textContent = '🤖';
        } else {
            document.getElementById('opponent-name').textContent = 'Player 2';
            document.getElementById('opponent-avatar').textContent = '👤';
        }

        // Reset chat
        document.getElementById('chat-messages').innerHTML = `
      <div class="chat-message system">
        <p>Game started! Good luck! 🍀</p>
      </div>
    `;

        // Close chat panel
        document.getElementById('chat-panel').classList.remove('open');
    }

    onGuessResult(result) {
        // Remove empty state if present
        const emptyState = document.querySelector('.history-empty');
        if (emptyState) emptyState.remove();

        // Add to history
        const history = document.getElementById('guess-history');
        const item = document.createElement('div');
        item.className = 'guess-item self';
        item.innerHTML = `
      <span class="guess-number">${result.guess}</span>
      <span class="guess-feedback ${result.isWin ? 'correct' : ''}">${result.feedback}</span>
      <span class="guess-count">#${result.guessNumber}</span>
    `;
        history.appendChild(item);
        history.scrollTop = history.scrollHeight;

        // Update guess count
        document.getElementById('self-guesses').textContent = result.guessNumber;

        // Clear input
        this.updateGuessDisplay('', document.getElementById('guess-display'));

        // Sound
        if (result.isWin) {
            this.audio.play('win');
        } else if (result.feedback.includes('All digits')) {
            this.audio.play('close');
        }
    }

    onOpponentGuess(guess, feedback) {
        // Add to history
        const history = document.getElementById('guess-history');
        const emptyState = document.querySelector('.history-empty');
        if (emptyState) emptyState.remove();

        const count = parseInt(document.getElementById('opponent-guesses').textContent) + 1;

        const item = document.createElement('div');
        item.className = 'guess-item opponent';
        item.innerHTML = `
      <span class="guess-number">${guess}</span>
      <span class="guess-feedback ${feedback === 'WIN' ? 'correct' : ''}">${feedback}</span>
      <span class="guess-count">#${count}</span>
    `;
        history.appendChild(item);
        history.scrollTop = history.scrollHeight;

        // Update guess count
        document.getElementById('opponent-guesses').textContent = count;
    }

    onTurnChange(isPlayerTurn) {
        const indicator = document.getElementById('turn-indicator');
        const inputContainer = document.getElementById('guess-input-container');

        if (isPlayerTurn) {
            indicator.classList.remove('opponent');
            indicator.querySelector('.turn-text').textContent = this.gameMode === 'friend'
                ? `Player ${this.game.currentPlayer}'s Turn`
                : 'Your Turn';
            inputContainer.classList.remove('disabled');
        } else {
            indicator.classList.add('opponent');
            indicator.querySelector('.turn-text').textContent = this.gameMode === 'friend'
                ? `Player ${this.game.currentPlayer}'s Turn`
                : "Opponent's Turn";
            inputContainer.classList.add('disabled');
        }

        this.audio.play('turn');
    }

    onTimerUpdate(timeLeft) {
        const timer = document.getElementById('game-timer');
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timer.querySelector('.timer-value').textContent =
            `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Warning states
        timer.classList.remove('warning', 'danger');
        if (timeLeft <= 30) {
            timer.classList.add('danger');
        } else if (timeLeft <= 60) {
            timer.classList.add('warning');
        }
    }

    onGameOver(result) {
        // Stop the game
        if (this.game) {
            this.game.stop();
        }

        // Update stats
        this.storage.addGameResult(result.winner === 'player');

        // Show modal
        const modal = document.getElementById('game-over-modal');
        const icon = document.getElementById('game-over-icon');
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');

        if (result.winner === 'player') {
            icon.textContent = '🏆';
            title.textContent = 'You Win!';
            title.className = 'game-over-title win';
            message.textContent = 'Congratulations! You cracked the code!';
            this.audio.play('win');
        } else if (result.winner === 'opponent') {
            icon.textContent = '😔';
            title.textContent = this.gameMode === 'friend' ? 'Player 2 Wins!' : 'AI Wins!';
            title.className = 'game-over-title lose';
            message.textContent = 'Better luck next time!';
            this.audio.play('lose');
        } else {
            icon.textContent = '🤝';
            title.textContent = 'Draw!';
            title.className = 'game-over-title draw';
            message.textContent = 'Neither player cracked the code!';
        }

        document.getElementById('reveal-your-secret').textContent = result.playerSecret;
        document.getElementById('reveal-opponent-secret').textContent = result.opponentSecret;
        document.getElementById('reveal-guesses').textContent = result.totalGuesses;

        modal.classList.remove('hidden');
    }

    addChatMessage(text, sender) {
        const messages = document.getElementById('chat-messages');
        const msg = document.createElement('div');
        msg.className = `chat-message ${sender}`;
        msg.innerHTML = `<p>${this.escapeHtml(text)}</p>`;
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;

        // Show badge if chat is closed
        if (!document.getElementById('chat-panel').classList.contains('open') && sender !== 'self') {
            document.querySelector('.chat-badge').classList.remove('hidden');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    vibrate(duration = 20) {
        const settings = this.storage.getSettings();
        if (settings.vibration !== false && 'vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
