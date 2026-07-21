// ==UserScript==
// @name         Mobile Video Gesture
// @namespace    http://tampermonkey.net/
// @version      10.5.1
// @description  Center seek with native player touch pass-through & non-center speed-up
// @license      MIT
// @exclude      *://*.youtube*
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  if (window.__mobileVideoGesture__) return;
  window.__mobileVideoGesture__ = true;

  const userPlaybackRates = new Map();

  // 범용 비디오 제어 래퍼
  function createVideoController(video) {
    return {
      el: video,
      get currentTime() {
        try {
          return (
            video.currentTime ??
            video?.player?.currentTime?.() ??
            video?.plyr?.currentTime ??
            video?.shakaPlayer?.getMediaElement?.()?.currentTime ??
            video?.hls?.media?.currentTime ??
            0
          );
        } catch {
          return 0;
        }
      },
      set currentTime(t) {
        try {
          video.currentTime = t;
        } catch {}
        try {
          if (typeof video?.player?.currentTime === 'function') video.player.currentTime(t);
          if (video?.plyr) video.plyr.currentTime = t;
          if (video?.shakaPlayer) video.setPlaybackRate(t);
          if (video?.hls) video.hls.media.currentTime = t;
        } catch {}
      },
      get duration() {
        return (
          video.duration ??
          video?.player?.duration?.() ??
          video?.plyr?.duration ??
          video?.shakaPlayer?.getDuration?.() ??
          video?.hls?.media?.duration ??
          0
        );
      },
      get playbackRate() {
        return (
          video.playbackRate ??
          video?.player?.playbackRate?.() ??
          video?.plyr?.speed ??
          video?.shakaPlayer?.getPlaybackRate?.() ??
          1
        );
      },
      set playbackRate(r) {
        try {
          video.playbackRate = r;
        } catch {}
        try {
          if (video?.player?.playbackRate) video.player.playbackRate(r);
          if (video?.plyr) video.plyr.speed = r;
          if (video?.shakaPlayer) video.shakaPlayer.setPlaybackRate(r);
        } catch {}
      },
    };
  }

  // 동적 오버레이 생성
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    background: 'rgba(0, 0, 0, 0)',
    color: '#fff',
    borderRadius: '6px',
    textAlign: 'center',
    zIndex: 2147483647,
    display: 'none',
    lineHeight: '1.2',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  });
  document.body.appendChild(overlay);

  // 전체화면 요소를 찾아 오버레이 부모를 안전하게 변경하는 함수
  function mountOverlayToActiveContainer(video) {
    const fsElement = document.fullscreenElement ||
                      document.webkitFullscreenElement ||
                      document.mozFullScreenElement ||
                      document.msFullscreenElement;

    const targetContainer = fsElement || video.parentElement || document.body;

    if (overlay.parentElement !== targetContainer) {
      targetContainer.appendChild(overlay);
    }
  }

  // 탐색 전용 오버레이 (영상의 정중앙)
  function showCenterOverlay(video, text) {
    mountOverlayToActiveContainer(video);
    const rect = video.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 10;

    Object.assign(overlay.style, {
      left: `${centerX}px`,
      top: `${centerY}px`,
      transform: 'translate(-50%, -50%)',
      fontSize: '16px',
      fontWeight: 'bold',
      padding: '8px 16px',
    });
    overlay.innerHTML = text;
    overlay.style.display = 'block';
  }

  // 2배속 전용 오버레이 (영상의 좌측 상단)
  function showSpeedOverlay(video, text = 'x2') {
    mountOverlayToActiveContainer(video);
    const rect = video.getBoundingClientRect();
    const topLeftX = rect.left + 12;
    const topLeftY = rect.top + 12;

    Object.assign(overlay.style, {
      left: `${topLeftX}px`,
      top: `${topLeftY}px`,
      transform: 'none',
      fontSize: '13px',
      fontWeight: '600',
      padding: '4px 8px',
    });
    overlay.innerHTML = text;
    overlay.style.display = 'block';
  }

  function hideOverlay() {
    overlay.style.display = 'none';
    overlay.innerHTML = '';
    if (overlay.parentElement !== document.body) {
      document.body.appendChild(overlay);
    }
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    let absSeconds = Math.floor(seconds);
    let hours = Math.floor(absSeconds / 3600);
    let minutes = Math.floor((absSeconds % 3600) / 60);
    let secs = absSeconds % 60;

    if (hours > 0) {
      return `${hours < 10 ? '0' : ''}${hours}:` +
             `${minutes < 10 ? '0' : ''}${minutes}:` +
             `${secs < 10 ? '0' : ''}${secs}`;
    } else {
      return `${minutes < 10 ? '0' : ''}${minutes}:` +
             `${secs < 10 ? '0' : ''}${secs}`;
    }
  }

  function formatDelta(seconds) {
    const sign = seconds < 0 ? '-' : '+';
    let absSeconds = Math.floor(Math.abs(seconds));
    let hours = Math.floor(absSeconds / 3600);
    let minutes = Math.floor((absSeconds % 3600) / 60);
    let secs = absSeconds % 60;

    if (hours > 0) {
      return `${sign}${hours < 10 ? '0' : ''}${hours}:` +
             `${minutes < 10 ? '0' : ''}${minutes}:` +
             `${secs < 10 ? '0' : ''}${secs}`;
    } else {
      return `${sign}${minutes < 10 ? '0' : ''}${minutes}:` +
             `${secs < 10 ? '0' : ''}${secs}`;
    }
  }

  function getVideoZone(clientX, clientY) {
    const allVideos = findAllVideos();
    for (const video of allVideos) {
      const rect = video.getBoundingClientRect();

      if (clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom) {

        const isTopLeft = clientX <= rect.left + rect.width / 3 && clientY <= rect.top + rect.height / 3;
        const isCenter = clientX >= rect.left + rect.width / 3 && clientX <= rect.left + (rect.width * 2) / 3 &&
                         clientY >= rect.top + rect.height / 3 && clientY <= rect.top + (rect.height * 2) / 3;

        return { video, isTopLeft, isCenter };
      }
    }
    return { video: null, isTopLeft: false, isCenter: false };
  }

  // 컨텍스트 메뉴 제어
  window.addEventListener('contextmenu', e => {
    const { video, isTopLeft } = getVideoZone(e.clientX, e.clientY);
    if (video && !isTopLeft) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true });

  // 정중앙 시간 탐색
  window.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const { video, isCenter } = getVideoZone(touch.clientX, touch.clientY);
    if (!video || !isCenter) return;

    const ctrl = createVideoController(video);
    const startX = touch.clientX;
    const initialTime = ctrl.currentTime;
    let seeking = false;

    const MOVE_THRESHOLD = 10;

    const touchMoveHandler = eMove => {
      const deltaX = eMove.touches[0].clientX - startX;
      if (Math.abs(deltaX) > MOVE_THRESHOLD) {
        seeking = true;
      }
      if (seeking) {
        const timeChange = deltaX * 0.2;
        ctrl.currentTime = Math.max(0, Math.min(initialTime + timeChange, ctrl.duration));
        showCenterOverlay(video, `${formatTime(ctrl.currentTime)}<br>(${formatDelta(timeChange)})`);
      }
    };

    const touchEndHandler = () => {
      seeking = false;
      hideOverlay();

      window.removeEventListener('touchmove', touchMoveHandler);
      window.removeEventListener('touchend', touchEndHandler);
      window.removeEventListener('touchcancel', touchEndHandler);
    };

    window.addEventListener('touchmove', touchMoveHandler, { passive: true });
    window.addEventListener('touchend', touchEndHandler);
    window.addEventListener('touchcancel', touchEndHandler);
  }, { passive: true, capture: true });

  // 롱터치 2배속 제어
  let longPressVideo = null;
  let longPressCtrl = null;
  let longPressFired = false;
  let longPressTimer = null;
  const LONG_PRESS_DELAY = 400;

  const releaseSpeed = () => {
    clearTimeout(longPressTimer);

    if (longPressVideo) {
      longPressVideo.removeEventListener('waiting', releaseSpeed);
      longPressVideo.removeEventListener('stalled', releaseSpeed);
      longPressVideo.removeEventListener('pause', releaseSpeed);
      longPressVideo.removeEventListener('ended', releaseSpeed);
    }

    if (longPressFired && longPressVideo && longPressCtrl) {
      longPressCtrl.playbackRate = userPlaybackRates.get(longPressVideo) ?? 1;
      userPlaybackRates.delete(longPressVideo);
      hideOverlay();
    }

    longPressVideo = null;
    longPressCtrl = null;
    longPressFired = false;
  };

  window.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;

    const { video, isTopLeft, isCenter } = getVideoZone(e.clientX, e.clientY);
    if (!video || isTopLeft || isCenter) return;

    video.style.webkitUserSelect = 'none';
    video.style.userSelect = 'none';
    video.style.webkitTouchCallout = 'none';

    longPressVideo = video;
    longPressCtrl = createVideoController(video);
    longPressFired = false;

    video.addEventListener('waiting', releaseSpeed, { once: true });
    video.addEventListener('stalled', releaseSpeed, { once: true });
    video.addEventListener('pause', releaseSpeed, { once: true });
    video.addEventListener('ended', releaseSpeed, { once: true });

    longPressTimer = setTimeout(() => {
      longPressFired = true;
      userPlaybackRates.set(video, longPressCtrl.playbackRate);
      longPressCtrl.playbackRate = 2.0;
      showSpeedOverlay(video, 'x2');
    }, LONG_PRESS_DELAY);
  }, { capture: true });

  window.addEventListener('pointerup', releaseSpeed, { capture: true });
  window.addEventListener('touchend', releaseSpeed, { capture: true });

  window.addEventListener('pointercancel', e => {
   if (!longPressFired) releaseSpeed();
  }, { capture: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseSpeed();
  });
  window.addEventListener('blur', releaseSpeed);
  window.addEventListener('scroll', releaseSpeed, { capture: true, passive: true });

  // 비디오 탐색 함수
  function findAllVideos(root = document, found = new Set()) {
    const vids = [];
    try {
      root.querySelectorAll('video').forEach(v => {
        if (!found.has(v)) { found.add(v); vids.push(v); }
      });
      root.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) vids.push(...findAllVideos(el.shadowRoot, found));
        if (el.tagName === 'IFRAME') {
          try { vids.push(...findAllVideos(el.contentDocument, found)); } catch {}
        }
      });
    } catch {}
    return vids;
  }
})();
