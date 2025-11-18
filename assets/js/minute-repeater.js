class MinuteRepeaterLogic {
  static calculateChimes(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();

    // Convert to 12-hour format
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;

    const quarters = Math.floor(minutes / 15);
    const minutesPastQuarter = minutes % 15;

    const sequence = [];

    // Hours
    for (let i = 0; i < hours; i++) {
      sequence.push('hour');
    }

    // Quarters
    for (let i = 0; i < quarters; i++) {
      sequence.push('quarter');
    }

    // Minutes
    for (let i = 0; i < minutesPastQuarter; i++) {
      sequence.push('minute');
    }

    return sequence;
  }
}

class BellSynth {
  constructor(audioCtx) {
    this.ctx = audioCtx;
  }

  // Create a metallic bell sound using additive synthesis
  playTone(frequency, type = 'hour') {
    const t = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.connect(this.ctx.destination);

    // Master volume envelope
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(type === 'hour' ? 0.8 : 0.6, t + 0.02);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + (type === 'hour' ? 2.5 : 1.5));

    // Partials for metallic timbre
    // Ratios approximate a wire gong
    const partials = [
      { ratio: 1.0, amp: 1.0 },
      { ratio: 2.0, amp: 0.6 },
      { ratio: 3.0, amp: 0.4 },
      { ratio: 4.2, amp: 0.2 }, // Inharmonic
      { ratio: 5.4, amp: 0.1 }  // Inharmonic
    ];

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency * p.ratio;

      const gain = this.ctx.createGain();
      gain.gain.value = p.amp;

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc.stop(t + 3.0);
    });
  }
}

class MinuteRepeaterApp {
  constructor() {
    this.audioCtx = null;
    this.synth = null;
    this.isPlaying = false;

    this.hourHand = document.getElementById('hour-hand');
    this.minuteHand = document.getElementById('minute-hand');
    this.secondHand = document.getElementById('second-hand');
    this.chimeBtn = document.getElementById('chime-btn');

    this.initClock();
    this.initEvents();
  }

  initClock() {
    const update = () => {
      const now = new Date();
      const seconds = now.getSeconds();
      const minutes = now.getMinutes();
      const hours = now.getHours();

      const secondDeg = (seconds / 60) * 360;
      const minuteDeg = ((minutes + seconds / 60) / 60) * 360;
      const hourDeg = ((hours + minutes / 60) / 12) * 360;

      this.secondHand.style.transform = `translateX(-50%) rotate(${secondDeg}deg)`;
      this.minuteHand.style.transform = `translateX(-50%) rotate(${minuteDeg}deg)`;
      this.hourHand.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
    };

    setInterval(update, 1000);
    update();
  }

  async initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.synth = new BellSynth(this.audioCtx);
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  initEvents() {
    this.chimeBtn.addEventListener('click', async () => {
      if (this.isPlaying) return;

      await this.initAudio();
      this.playSequence();
    });
  }

  async playSequence() {
    this.isPlaying = true;
    this.chimeBtn.classList.add('active');

    const now = new Date();
    const sequence = MinuteRepeaterLogic.calculateChimes(now);

    // Frequencies (approximate for wire gongs)
    // Low gong (Hours) ~ B3
    // High gong (Minutes) ~ D#4
    const lowPitch = 246.94;
    const highPitch = 311.13;

    const gap = 400; // ms

    for (const chime of sequence) {
      if (chime === 'hour') {
        this.synth.playTone(lowPitch, 'hour');
        await this.wait(700);
      } else if (chime === 'quarter') {
        // Ding-Dong
        this.synth.playTone(highPitch, 'quarter');
        await this.wait(150);
        this.synth.playTone(lowPitch, 'quarter');
        await this.wait(700);
      } else if (chime === 'minute') {
        this.synth.playTone(highPitch, 'minute');
        await this.wait(700);
      }
    }

    this.isPlaying = false;
    this.chimeBtn.classList.remove('active');
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MinuteRepeaterApp();
});
