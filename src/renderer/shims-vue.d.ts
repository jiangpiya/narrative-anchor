// src/renderer/shims-vue.d.ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
declare module '*.mp3' {
  const url: string;
  export default url;
}

declare module '*.wav' {
  const url: string;
  export default url;
}

declare module '*.ogg' {
  const url: string;
  export default url;
}