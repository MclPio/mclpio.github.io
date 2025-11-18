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

  // FM Synthesis Bell
  // Algorithm: Modulator -> Carrier -> Output
  playTone(frequency, type = 'hour') {
    const t = this.ctx.currentTime;

    // 1. Carrier Oscillator (The fundamental tone)
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = frequency;

    // 2. Modulator Oscillator (Creates the timbre)
    const modulator = this.ctx.createOscillator();
    modulator.type = 'sine';
    // Non-integer ratio creates inharmonic metallic sounds (e.g., 1:1.414 or 1:3.5)
    // 3.5 is a classic "bell" ratio
    const ratio = 3.5;
    modulator.frequency.value = frequency * ratio;

    // 3. Modulation Gain (Controls "brightness" over time)
    const modulationGain = this.ctx.createGain();
    // Modulation Index: Higher = Brighter/Noisier.
    // We want a sharp metallic attack that fades to a pure tone.
    const modIndex = 300;
    modulationGain.gain.setValueAtTime(modIndex, t);
    modulationGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5); // Fast decay of harmonics

    // 4. Master Amplitude Envelope (Volume)
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(0.5, t + 0.005); // Instant attack
    // Exponential decay for the ringing sound
    const decay = type === 'hour' ? 2.5 : 1.5;
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + decay);

    // Connections: Modulator -> ModGain -> Carrier.frequency
    modulator.connect(modulationGain);
    modulationGain.connect(carrier.frequency);

    // Carrier -> MasterGain -> Output
    carrier.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    // Start/Stop
    carrier.start(t);
    modulator.start(t);
    carrier.stop(t + decay + 0.1);
    modulator.stop(t + decay + 0.1);

    // Optional: Add a second pair for a "hum" or lower partial to add body
    this.addHum(frequency, t, decay);
  }

  addHum(frequency, t, decay) {
    const humOsc = this.ctx.createOscillator();
    humOsc.type = 'sine';
    humOsc.frequency.value = frequency * 0.5; // Sub-octave hum

    const humGain = this.ctx.createGain();
    humGain.gain.setValueAtTime(0, t);
    humGain.gain.linearRampToValueAtTime(0.1, t + 0.05);
    humGain.gain.exponentialRampToValueAtTime(0.001, t + decay * 1.5); // Hum lasts longer

    humOsc.connect(humGain);
    humGain.connect(this.ctx.destination);

    humOsc.start(t);
    humOsc.stop(t + decay * 1.5);
  }
}

class MinuteRepeaterApp {
  constructor() {
    this.audioCtx = null;
    this.synth = null;
    this.isPlaying = false;

    // Elements
    this.hourHand = document.getElementById('hour-hand');
    this.minuteHand = document.getElementById('minute-hand');
    this.secondHand = document.getElementById('second-hand');

    this.slide = document.getElementById('repeater-slide');
    this.triggerBtn = document.getElementById('check-time-btn');
    this.modal = document.getElementById('minute-repeater-modal');
    this.closeBtn = document.querySelector('.mr-close-btn');
    this.watchCase = document.querySelector('.watch-case');
    this.dialMarkers = document.getElementById('dial-markers');

    this.initClock();
    this.initDial();
    this.initEvents();
    this.initDrag();
  }

  initDial() {
    if (!this.dialMarkers) return;
    this.dialMarkers.innerHTML = '';

    const radius = 115; // Distance from center (Dial is ~246px wide)

    for (let i = 0; i < 60; i++) {
      const isHour = i % 5 === 0;
      const marker = document.createElement('div');

      marker.className = isHour ? 'hour-marker' : 'minute-marker';
      if (i === 0) marker.classList.add('twelve-marker');

      // Calculate position
      const angle = (i * 6) * (Math.PI / 180); // 6 degrees per minute
      // We want 12 at top (-90 deg or just rotate container)
      // Let's use transform rotate on the element itself, assuming centered origin
      // Actually, easier to translate from center

      // Reset to center
      // marker.style.top = '50%';
      // marker.style.left = '50%';

      // Rotate to angle, then translate OUT to radius
      // -90 to start at top
      const rotation = i * 6;
      marker.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) translateY(-${radius}px)`;

      this.dialMarkers.appendChild(marker);
    }
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

      if (this.secondHand) this.secondHand.style.transform = `translateX(-50%) rotate(${secondDeg}deg)`;
      if (this.minuteHand) this.minuteHand.style.transform = `translateX(-50%) rotate(${minuteDeg}deg)`;
      if (this.hourHand) this.hourHand.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
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
    // Toggle Visibility
    if (this.triggerBtn) {
      this.triggerBtn.addEventListener('click', () => {
        if (this.modal.style.display === 'none' || !this.modal.style.display) {
          this.modal.style.display = 'block';
        } else {
          this.modal.style.display = 'none';
        }
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.modal.style.display = 'none';
      });
    }

    // Slide Trigger
    if (this.slide) {
      this.slide.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent drag start
        if (this.isPlaying) return;

        await this.initAudio();
        this.playSequence();
      });
    }
  }

  initDrag() {
    if (!this.watchCase || !this.modal) return;

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    this.watchCase.addEventListener('mousedown', (e) => {
      if (e.target.closest('.repeater-slide-container')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.modal.getBoundingClientRect();

      // Convert to absolute positioning on first drag
      this.modal.style.left = rect.left + 'px';
      this.modal.style.top = rect.top + 'px';
      this.modal.style.bottom = 'auto';
      this.modal.style.right = 'auto';

      initialLeft = rect.left;
      initialTop = rect.top;

      this.watchCase.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      this.modal.style.left = `${initialLeft + dx}px`;
      this.modal.style.top = `${initialTop + dy}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      if (this.watchCase) this.watchCase.style.cursor = 'grab';
    });
  }

  async playSequence() {
    this.isPlaying = true;
    this.slide.classList.add('active');

    await this.wait(400);

    setTimeout(() => {
      this.slide.classList.remove('active');
    }, 400);

    const now = new Date();
    const sequence = MinuteRepeaterLogic.calculateChimes(now);

    // Frequencies (High pitch, clear)
    const lowPitch = 783.99; // G5
    const highPitch = 987.77; // B5

    for (const chime of sequence) {
      if (chime === 'hour') {
        this.synth.playTone(lowPitch, 'hour');
        await this.wait(500);
      } else if (chime === 'quarter') {
        this.synth.playTone(highPitch, 'quarter');
        await this.wait(100);
        this.synth.playTone(lowPitch, 'quarter');
        await this.wait(500);
      } else if (chime === 'minute') {
        this.synth.playTone(highPitch, 'minute');
        await this.wait(500);
      }
    }

    this.isPlaying = false;
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MinuteRepeaterApp();
});
