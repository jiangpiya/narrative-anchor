<template>
  <div class="home-page starry-bg">   <!-- 原有星空背景 -->
    <SpeedLines />                    <!-- 速度线组件，透明背景 -->
    <div class="title-container">...</div>
    ...
  </div>
</template>

<script setup>
import SpeedLines from './SpeedLines.vue';
// ... 其他导入
</script>

<style scoped>
.home-page {
  /* 原有样式，不再设置 background，因为 starry-bg 已提供 */
  background: transparent;
  position: relative;
  z-index: 1;
}
</style>