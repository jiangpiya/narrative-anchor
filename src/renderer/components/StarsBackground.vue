<template>
  <canvas ref="canvasRef" class="stars-canvas"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const canvasRef = ref(null);
let ctx = null;
let animationId = null;
let stars = [];
let width = 0, height = 0;

// 可配置参数
const STAR_COUNT = 300;        // 星星数量
const MAX_RADIUS = 2.5;        // 最大半径
const MIN_RADIUS = 0.8;        // 最小半径
const MAX_SPEED = 0.3;         // 最大移动速度
const TWINKLE_SPEED = 0.02;    // 闪烁速度

onMounted(() => {
  const canvas = canvasRef.value;
  ctx = canvas.getContext('2d');
  
  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    initStars();
  };
  window.addEventListener('resize', resize);
  resize();
  animate();
  
  onUnmounted(() => {
    window.removeEventListener('resize', resize);
    cancelAnimationFrame(animationId);
  });
});

function initStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * (MAX_RADIUS - MIN_RADIUS) + MIN_RADIUS,
      alpha: Math.random() * 0.6 + 0.2,
      alphaSpeed: (Math.random() - 0.5) * TWINKLE_SPEED,
      speedX: (Math.random() - 0.5) * MAX_SPEED,
      speedY: (Math.random() - 0.5) * MAX_SPEED,
    });
  }
}

function animate() {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  
  for (let star of stars) {
    // 更新位置（产生缓慢漂移）
    star.x += star.speedX;
    star.y += star.speedY;
    if (star.x < 0) star.x = width;
    if (star.x > width) star.x = 0;
    if (star.y < 0) star.y = height;
    if (star.y > height) star.y = 0;
    
    // 更新透明度（产生闪烁）
    star.alpha += star.alphaSpeed;
    if (star.alpha > 0.9) star.alpha = 0.9, star.alphaSpeed = -star.alphaSpeed;
    if (star.alpha < 0.2) star.alpha = 0.2, star.alphaSpeed = -star.alphaSpeed;
    
    // 绘制星星
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fill();
    
    // 偶尔绘制光晕（大的星星）
    if (star.radius > 1.8) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139, 92, 246, ${star.alpha * 0.3})`;
      ctx.fill();
    }
  }
  
  animationId = requestAnimationFrame(animate);
}
</script>

<style scoped>
.stars-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(ellipse at 30% 40%, #0f1222, #03050a);
}
</style>