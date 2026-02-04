/**
 * Digit Duel - Audio Module
 * Manages game sounds using Web Audio API
 */

export class AudioManager {
    constructor() {
        this.enabled = true;
        this.context = null;
        this.sounds = {};

        this.init();
    }

    init() {
        // Initialize audio context on first user interaction
        const initContext = () => {
            if (!this.context) {
                try {
                    this.context = new (window.AudioContext || window.webkitAudioContext)();
                    this.createSounds();
                } catch (e) {
                    console.log('Web Audio API not supported');
                }
            }
            document.removeEventListener('click', initContext);
            document.removeEventListener('touchstart', initContext);
        };

        document.addEventListener('click', initContext);
        document.addEventListener('touchstart', initContext);
    }

    createSounds() {
        // Define sound parameters for synthesized audio
        this.sounds = {
            click: { freq: 800, duration: 0.05, type: 'sine' },
            guess: { freq: 500, duration: 0.1, type: 'square' },
            success: { freq: 880, duration: 0.15, type: 'sine' },
            close: { freq: 660, duration: 0.2, type: 'triangle' },
            turn: { freq: 440, duration: 0.1, type: 'sine' },
            win: { freq: [523, 659, 784], duration: 0.3, type: 'sine', chord: true },
            lose: { freq: [392, 330, 262], duration: 0.4, type: 'sawtooth', chord: true }
        };
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    play(soundName) {
        if (!this.enabled || !this.context || !this.sounds[soundName]) return;

        const sound = this.sounds[soundName];
        const now = this.context.currentTime;

        try {
            if (sound.chord && Array.isArray(sound.freq)) {
                // Play chord (multiple frequencies)
                sound.freq.forEach((freq, i) => {
                    this.playTone(freq, sound.duration + i * 0.05, sound.type, now + i * 0.1);
                });
            } else {
                this.playTone(sound.freq, sound.duration, sound.type, now);
            }
        } catch (e) {
            console.log('Error playing sound:', e);
        }
    }

    playTone(frequency, duration, type, startTime) {
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startTime);

        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }
}
