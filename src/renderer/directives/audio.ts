import { audioService } from '../services/audioService';
import type { Directive } from 'vue';

export const vAudio = {
  mounted(el, binding) {
    // 使用 binding.arg 来获取指令参数（例如 v-audio:click 中的 'click'）
    if (binding.arg === 'click') {
      el.addEventListener('click', () => audioService.playClick());
    }
    // 使用 binding.modifiers 来检查修饰符（例如 v-audio.hover 中的 hover）
    if (binding.modifiers?.hover) {
      el.addEventListener('mouseenter', () => audioService.playHover());
    }
  },
};