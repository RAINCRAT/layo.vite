<script setup>
import * as CookieConsent from 'vanilla-cookieconsent';

// 手动打开 Cookie 偏好设置窗口（独立于首次同意横幅，可随时调整授权）
function openPreferences() {
  CookieConsent.showPreferences();
}
</script>

<template>
  <button
    type="button"
    class="vp-cookie-btn"
    aria-label="Cookie 偏好设置"
    title="Cookie 偏好设置"
    @click="openPreferences"
  >
    <!-- 饼干轮廓 + 巧克力豆（明日方舟线性描边风格） -->
    <svg class="ak-icon vp-cookie-btn__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
      <circle cx="9" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="15" cy="10" r="1.5" fill="currentColor" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" />
      <circle cx="7.5" cy="13.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="15.5" r="1" fill="currentColor" />
    </svg>
  </button>
</template>
