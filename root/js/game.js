/**
 * Digit Duel - Game Logic Module
 * Core game mechanics, turn handling, and feedback system
 */

import { AI } from './ai.js';

export class Game {
    constructor(options) {
        this.mode = options.mode; // 'ai' | 'friend'
        this.digits = options.digits;
        this.difficulty = options.difficulty;
        this.allowDuplicates = options.allowDuplicates;

        // Secrets
        this.playerSecret = options.playerSecret;
        this.opponentSecret = options.opponentSecret;

        // If AI mode, generate AI's secret
        if (this.mode === 'ai') {
            this.opponentSecret = this.generateAISecret();
        }

        // Callbacks
        this.onGuessResult = options.onGuessResult;
        this.onGameOver = options.onGameOver;
        this.onTurnChange = options.onTurnChange;
        this.onTimerUpdate = options.onTimerUpdate;
        this.onChatMessage = options.onChatMessage;
        this.onOpponentGuess = options.onOpponentGuess;

        // Game state
        this.isPlayerTurn = true;
        this.playerGuesses = 0;
        this.opponentGuesses = 0;
        this.maxGuesses = 10;
        this.isGameOver = false;

        // For friend mode
        this.currentPlayer = 1; // 1 or 2
        this.player1Guesses = 0;
        this.player2Guesses = 0;

        // Timer
        this.totalTime = this.calculateGameTime();
        this.timeRemaining = this.totalTime;
        this.timerInterval = null;

        // AI
        if (this.mode === 'ai') {
            this.ai = new AI(this.digits, this.allowDuplicates, this.difficulty);
        }
    }

    calculateGameTime() {
        const baseTime = this.digits * 2; // minutes
        let multiplier = 1;

        if (this.difficulty === 'easy') multiplier = 1.2;
        else if (this.difficulty === 'hard') multiplier = 0.8;

        return Math.round(baseTime * multiplier) * 60; // Convert to seconds
    }

    generateAISecret() {
        let secret = '';
        const usedDigits = new Set();

        for (let i = 0; i < this.digits; i++) {
            let digit;
            do {
                digit = Math.floor(Math.random() * 10).toString();
            } while (!this.allowDuplicates && usedDigits.has(digit));

            usedDigits.add(digit);
            secret += digit;
        }

        return secret;
    }

    start() {
        // Start timer
        this.startTimer();

        // Notify turn
        this.onTurnChange(true);

        // Add system message
        this.onChatMessage('Game started! You go first.', 'system');
    }

    stop() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    startTimer() {
        this.onTimerUpdate(this.timeRemaining);

        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.onTimerUpdate(this.timeRemaining);

            if (this.timeRemaining <= 0) {
                this.handleTimeout();
            }
        }, 1000);
    }

    handleTimeout() {
        this.stop();
        this.isGameOver = true;

        // Whoever was supposed to guess loses
        const winner = this.isPlayerTurn ? 'opponent' : 'player';

        this.onGameOver({
            winner: winner,
            reason: 'timeout',
            playerSecret: this.playerSecret,
            opponentSecret: this.opponentSecret,
            totalGuesses: this.playerGuesses + this.opponentGuesses
        });
    }

    submitGuess(guess) {
        if (this.isGameOver) return;
        if (this.mode === 'ai' && !this.isPlayerTurn) return;

        // Validate guess
        if (guess.length !== this.digits) {
            return { valid: false, error: 'Invalid length' };
        }

        if (this.mode === 'friend') {
            return this.handleFriendGuess(guess);
        } else {
            return this.handleAIGameGuess(guess);
        }
    }

    handleAIGameGuess(guess) {
        this.playerGuesses++;

        // Calculate feedback against opponent's secret
        const feedback = this.calculateFeedback(guess, this.opponentSecret);
        const isWin = guess === this.opponentSecret;

        // Notify result
        this.onGuessResult({
            guess,
            feedback,
            isWin,
            guessNumber: this.playerGuesses
        });

        if (isWin) {
            this.endGame('player');
            return;
        }

        if (this.playerGuesses >= this.maxGuesses) {
            // Check if AI also ran out of guesses
            if (this.opponentGuesses >= this.maxGuesses) {
                this.endGame('draw');
                return;
            }
        }

        // Switch to AI turn
        this.isPlayerTurn = false;
        this.onTurnChange(false);

        // AI makes a move after a delay
        setTimeout(() => {
            this.aiTurn(guess, feedback);
        }, 1000 + Math.random() * 1500);
    }

    aiTurn(playerGuess, playerFeedback) {
        if (this.isGameOver) return;

        this.opponentGuesses++;

        // AI makes a guess
        const aiGuess = this.ai.makeGuess();
        const feedback = this.calculateFeedback(aiGuess, this.playerSecret);
        const isWin = aiGuess === this.playerSecret;

        // Update AI's knowledge
        this.ai.updateKnowledge(aiGuess, feedback);

        // Notify opponent guess
        this.onOpponentGuess(aiGuess, isWin ? 'Correct! 🎯' : feedback);

        if (isWin) {
            this.endGame('opponent');
            return;
        }

        if (this.opponentGuesses >= this.maxGuesses && this.playerGuesses >= this.maxGuesses) {
            this.endGame('draw');
            return;
        }

        // Switch back to player turn
        this.isPlayerTurn = true;
        this.onTurnChange(true);
    }

    handleFriendGuess(guess) {
        // In friend mode, players alternate on same device
        const secretToGuess = this.currentPlayer === 1
            ? this.opponentSecret  // Player 1 guesses Player 2's secret
            : this.playerSecret;   // Player 2 guesses Player 1's secret

        if (this.currentPlayer === 1) {
            this.player1Guesses++;
        } else {
            this.player2Guesses++;
        }

        const feedback = this.calculateFeedback(guess, secretToGuess);
        const isWin = guess === secretToGuess;
        const guessNum = this.currentPlayer === 1 ? this.player1Guesses : this.player2Guesses;

        // Notify result (showing as self for current player)
        this.onGuessResult({
            guess,
            feedback,
            isWin,
            guessNumber: guessNum
        });

        if (isWin) {
            this.endGame(this.currentPlayer === 1 ? 'player' : 'opponent');
            return;
        }

        // Check for draw
        if (this.player1Guesses >= this.maxGuesses && this.player2Guesses >= this.maxGuesses) {
            this.endGame('draw');
            return;
        }

        // Switch player
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.onTurnChange(true); // Always true for friend mode (someone is always playing)
        this.onChatMessage(`Player ${this.currentPlayer}'s turn`, 'system');
    }

    calculateFeedback(guess, secret) {
        if (guess === secret) {
            return 'Correct! 🎯';
        }

        // Count matching digits (regardless of position)
        const guessDigits = guess.split('');
        const secretDigits = secret.split('');

        // Create frequency maps
        const secretFreq = {};
        for (const d of secretDigits) {
            secretFreq[d] = (secretFreq[d] || 0) + 1;
        }

        let correctCount = 0;
        const guessFreq = {};

        for (const d of guessDigits) {
            guessFreq[d] = (guessFreq[d] || 0) + 1;
        }

        // Count intersection
        for (const d in guessFreq) {
            if (secretFreq[d]) {
                correctCount += Math.min(guessFreq[d], secretFreq[d]);
            }
        }

        if (correctCount === 0) {
            return 'No correct digits.';
        }

        if (correctCount === this.digits) {
            return 'All digits correct but wrong arrangement.';
        }

        return `${correctCount} digit${correctCount > 1 ? 's' : ''} correct.`;
    }

    endGame(winner) {
        this.isGameOver = true;
        this.stop();

        this.onGameOver({
            winner,
            playerSecret: this.playerSecret,
            opponentSecret: this.opponentSecret,
            totalGuesses: this.playerGuesses + this.opponentGuesses
        });
    }

    sendChatMessage(text, sender) {
        if (this.onChatMessage) {
            this.onChatMessage(text, sender);

            // AI might respond
            if (this.mode === 'ai' && sender === 'self') {
                setTimeout(() => {
                    const responses = [
                        'Good luck! 🍀',
                        'Interesting strategy...',
                        'Let me think about that...',
                        'Nice try!',
                        '🤔',
                        'The game is on!',
                        'May the best player win!',
                        '💪'
                    ];
                    const response = responses[Math.floor(Math.random() * responses.length)];
                    this.onChatMessage(response, 'opponent');
                }, 500 + Math.random() * 1500);
            }
        }
    }
}
