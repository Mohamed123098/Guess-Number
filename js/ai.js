/**
 * Digit Duel - AI Module
 * Implements different difficulty levels for computer opponent
 */

export class AI {
    constructor(digits, allowDuplicates, difficulty) {
        this.digits = digits;
        this.allowDuplicates = allowDuplicates;
        this.difficulty = difficulty;

        // Initialize candidate pool
        this.candidates = this.generateAllCandidates();
        this.guessHistory = [];
    }

    generateAllCandidates() {
        const candidates = [];

        if (this.allowDuplicates) {
            // Generate all possible numbers with duplicates allowed
            const max = Math.pow(10, this.digits);
            for (let i = 0; i < max; i++) {
                candidates.push(i.toString().padStart(this.digits, '0'));
            }
        } else {
            // Generate all permutations without duplicates
            this.generatePermutations('', '0123456789', candidates);
        }

        return candidates;
    }

    generatePermutations(current, available, results) {
        if (current.length === this.digits) {
            results.push(current);
            return;
        }

        for (let i = 0; i < available.length; i++) {
            const newCurrent = current + available[i];
            const newAvailable = available.slice(0, i) + available.slice(i + 1);
            this.generatePermutations(newCurrent, newAvailable, results);
        }
    }

    makeGuess() {
        if (this.candidates.length === 0) {
            // Fallback: random guess
            return this.randomGuess();
        }

        switch (this.difficulty) {
            case 'easy':
                return this.easyGuess();
            case 'medium':
                return this.mediumGuess();
            case 'hard':
                return this.hardGuess();
            default:
                return this.mediumGuess();
        }
    }

    easyGuess() {
        // Random guess from valid pool (occasionally makes a random one)
        if (Math.random() < 0.3) {
            return this.randomGuess();
        }
        const index = Math.floor(Math.random() * this.candidates.length);
        return this.candidates[index];
    }

    mediumGuess() {
        // Always pick from candidates, but randomly
        if (this.candidates.length === 0) return this.randomGuess();

        // Pick a random candidate
        const index = Math.floor(Math.random() * this.candidates.length);
        return this.candidates[index];
    }

    hardGuess() {
        // Strategic: pick the guess that minimizes worst-case remaining candidates
        if (this.candidates.length === 0) return this.randomGuess();
        if (this.candidates.length === 1) return this.candidates[0];

        // For first guess or very large pools, use a good starting guess
        if (this.guessHistory.length === 0 && this.candidates.length > 100) {
            return this.getOptimalFirstGuess();
        }

        // If pool is manageable, use minimax-style selection
        if (this.candidates.length <= 500) {
            return this.minimaxGuess();
        }

        // Otherwise, pick randomly from candidates
        return this.mediumGuess();
    }

    getOptimalFirstGuess() {
        // For games like this, diversified digits work well
        // Try to pick digits that will give the most information
        if (this.digits <= 4) {
            return '1234'.slice(0, this.digits);
        } else if (this.digits <= 6) {
            return '123456'.slice(0, this.digits);
        } else if (this.digits <= 8) {
            return '12345678'.slice(0, this.digits);
        } else {
            return '1234567890'.slice(0, this.digits);
        }
    }

    minimaxGuess() {
        let bestGuess = this.candidates[0];
        let bestWorstCase = Infinity;

        // Sample candidates to evaluate (limit for performance)
        const samplesToEvaluate = this.candidates.length > 50
            ? this.sampleArray(this.candidates, 50)
            : this.candidates;

        for (const guess of samplesToEvaluate) {
            // For each possible feedback, count how many candidates would remain
            const feedbackCounts = {};

            for (const candidate of this.candidates) {
                const feedback = this.simulateFeedback(guess, candidate);
                feedbackCounts[feedback] = (feedbackCounts[feedback] || 0) + 1;
            }

            // Find worst case (maximum remaining candidates)
            const worstCase = Math.max(...Object.values(feedbackCounts));

            if (worstCase < bestWorstCase) {
                bestWorstCase = worstCase;
                bestGuess = guess;
            }
        }

        return bestGuess;
    }

    sampleArray(arr, n) {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
    }

    simulateFeedback(guess, secret) {
        if (guess === secret) return 'WIN';

        const guessDigits = guess.split('');
        const secretDigits = secret.split('');

        const secretFreq = {};
        for (const d of secretDigits) {
            secretFreq[d] = (secretFreq[d] || 0) + 1;
        }

        let correctCount = 0;
        const guessFreq = {};

        for (const d of guessDigits) {
            guessFreq[d] = (guessFreq[d] || 0) + 1;
        }

        for (const d in guessFreq) {
            if (secretFreq[d]) {
                correctCount += Math.min(guessFreq[d], secretFreq[d]);
            }
        }

        return correctCount.toString();
    }

    updateKnowledge(guess, feedback) {
        this.guessHistory.push({ guess, feedback });

        // Parse feedback to get correct count
        let correctCount;

        if (feedback.includes('No correct')) {
            correctCount = 0;
        } else if (feedback.includes('All digits correct')) {
            correctCount = this.digits;
        } else {
            // Extract number from "X digit(s) correct"
            const match = feedback.match(/(\d+)/);
            correctCount = match ? parseInt(match[1]) : 0;
        }

        // Filter candidates that would give the same feedback
        this.candidates = this.candidates.filter(candidate => {
            if (candidate === guess) return false; // Already guessed

            const simulatedFeedback = this.simulateFeedback(guess, candidate);

            // Handle 'WIN' case
            if (simulatedFeedback === 'WIN') {
                return false; // We didn't win, so this can't be the answer
            }

            return parseInt(simulatedFeedback) === correctCount;
        });

        // console.log(`AI: After guess ${guess}, ${this.candidates.length} candidates remain`);
    }

    randomGuess() {
        let result = '';
        const used = new Set();

        for (let i = 0; i < this.digits; i++) {
            let digit;
            do {
                digit = Math.floor(Math.random() * 10).toString();
            } while (!this.allowDuplicates && used.has(digit));

            used.add(digit);
            result += digit;
        }

        return result;
    }
}
