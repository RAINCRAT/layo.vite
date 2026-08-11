<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const visible = ref(false);
let onScroll = () => {};

onMounted(() => {
  // 滚动超过 300px 后显示回到顶部按钮
  onScroll = () => {
    visible.value = window.scrollY > 300;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
});

function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<template>
  <!-- 回到顶部按钮：沿用导航图标按钮规范的 40px 方形描边样式（基础样式见 style.css） -->
  <button
    v-show="visible"
    type="button"
    class="VPBackToTop"
    aria-label="回到顶部"
    title="回到顶部"
    @click="toTop"
  >
    <svg class="ak-icon VPBackToTop__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 19V5M6 11l6-6 6 6"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>
