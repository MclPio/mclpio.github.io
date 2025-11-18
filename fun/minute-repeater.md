---
layout: page
title: Minute Repeater Watch
permalink: /fun/minute-repeater/
---

<div class="watch-container">
  <div class="watch-case">
    <div class="watch-bezel"></div>
    <div class="watch-crystal"></div>
    <div class="watch-dial">
      <div class="brand-text">Pious & Co.</div>
      <div class="complication-text">Répétition Minutes</div>

      <!-- Hour Markers -->
      <div class="marker twelve">12</div>
      <div class="marker three">3</div>
      <div class="marker six">6</div>
      <div class="marker nine">9</div>

      <!-- Hands -->
      <div class="hand hour-hand" id="hour-hand"></div>
      <div class="hand minute-hand" id="minute-hand"></div>
      <div class="hand second-hand" id="second-hand"></div>
      <div class="center-cap"></div>
    </div>
  </div>

  <div class="watch-controls">
    <button id="chime-btn" class="slide-btn" aria-label="Activate Minute Repeater">
      <div class="slide-track">
        <div class="slide-thumb"><i class="fas fa-music"></i></div>
      </div>
      <span class="slide-label">Slide to Chime</span>
    </button>
  </div>
</div>

<div class="audio-permission-modal" id="audio-modal" style="display:none;">
    <div class="modal-content">
        <p>Tap to Enable Sound</p>
    </div>
</div>

<link rel="stylesheet" href="/assets/css/minute-repeater.css">
<script src="/assets/js/minute-repeater.js"></script>
