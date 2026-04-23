// src/renderer/services/audioService.ts
import { Howl } from 'howler';
import gameBgm from '../assets/audio/bgm/game.mp3';
import menuBgm from '../assets/audio/bgm/menu.mp3';
import bossBgm from '../assets/audio/bgm/boss.mp3';
import villageBgm from '../assets/audio/bgm/village.mp3';
import urbaBgm from '../assets/audio/bgm/urba.mp3';
import cityBgm from '../assets/audio/bgm/city.mp3';
import tenseBgm from '../assets/audio/bgm/tense.mp3';

import forestAmbient from '../assets/audio/ambient/forest.mp3';
import dungeonAmbient from '../assets/audio/ambient/dungeon.mp3';
import villageAmbient from '../assets/audio/ambient/village.mp3';
import caveAmbient from '../assets/audio/ambient/cave.mp3';
import heartbeatAmbient from '../assets/audio/ambient/heartbeat.mp3';
import cityAmbient from '../assets/audio/ambient/city.mp3';
import nightAmbient from '../assets/audio/ambient/night.mp3';
import trainAmbient from '../assets/audio/ambient/train.mp3';

import clickSound from '../assets/audio/ui/button-click.mp3';
import hoverSound from '../assets/audio/ui/button-hover.mp3';

// 使用绝对路径（指向 public 目录）
// 映射表（使用导入的 URL）
const AUDIO_PATHS = {
  bgm: {
    game: gameBgm,
    menu: menuBgm,
    boss: bossBgm,
    village: villageBgm,
    urba:urbaBgm,
    city:cityBgm,
    tense: tenseBgm,
  },
  ambient: {
    forest: forestAmbient,
    dungeon: dungeonAmbient,
    village: villageAmbient,
    cave: caveAmbient,
    heartbeat: heartbeatAmbient,
    city: cityAmbient,
    night: nightAmbient,
    train:trainAmbient,
  },
  ui: {
    click: clickSound,
    hover: hoverSound,
  },
};

class AudioService {
  private currentBgmKey: string | null = null; // 记录当前播放的 BGM 标识
  private currentBgm: Howl | null = null;
  private currentAmbient: Howl | null = null;
  private clickSound: Howl | null = null;
  private hoverSound: Howl | null = null;
  private bgmVolume: number = 0.6;
  private ambientVolume: number = 0.4;
  private isMuted: boolean = false;
  private bgmList: string[] = [];

constructor() {
  this.loadBgmList();
  this.loadUISounds();

}
setMasterVolume(volume: number) {
  Howler.volume(Math.min(1, Math.max(0, volume)));
}
  private loadBgmList() {
    this.bgmList = Object.values(AUDIO_PATHS.bgm);
  }

private loadUISounds() {
  this.clickSound = new Howl({
    src: [AUDIO_PATHS.ui.click],
    volume: 0.5,
    preload: true,
    onloaderror: (id, error) => console.error('click sound load error:', error),
  });
  this.hoverSound = new Howl({
    src: [AUDIO_PATHS.ui.hover],
    volume: 0.3,
    preload: true,
    onloaderror: (id, error) => console.error('hover sound load error:', error),
  });
}

public playClick() {
  console.log('playClick called, clickSound:', this.clickSound);
  this.clickSound?.play();
}

  public playHover() {
    this.hoverSound?.play();
  }

  // 播放指定类型的背景音乐
  public playBGM(type: string, volume?: number): void {
    const normalized = type.trim();
    if (!normalized) return;
    // 如果请求的音乐与当前相同，则跳过
    if (this.currentBgmKey === normalized) {
      console.log(`[Audio] BGM already playing: ${normalized}, skip`);
      return;
    }
    const src = AUDIO_PATHS.bgm[normalized as keyof typeof AUDIO_PATHS.bgm];
    if (!src) {
      console.warn(`未找到类型为 "${normalized}" 的背景音乐，使用随机音乐`);
      this.playRandomBgm(volume);
      return;
    }
    this.playBgmBySrc(src, volume);
    this.currentBgmKey = normalized;
  }

  // 播放自定义背景音乐
  public playCustomBGM(custom: string, volume?: number): void {
    const normalized = custom.trim();
    if (!normalized) return;
    if (this.currentBgmKey === normalized) {
      console.log(`[Audio] BGM already playing: ${normalized}, skip`);
      return;
    }
    let src = normalized;
    if (!src.startsWith('/') && !src.startsWith('http')) {
      src = AUDIO_PATHS.bgm[normalized as keyof typeof AUDIO_PATHS.bgm] || `/audio/bgm/${normalized}.mp3`;
    }
    this.playBgmBySrc(src, volume);
    this.currentBgmKey = normalized;
  }

  // 随机播放
  public playRandomBgm(volume?: number): void {
    if (this.bgmList.length === 0) return;
    const randomIndex = Math.floor(Math.random() * this.bgmList.length);
    const src = this.bgmList[randomIndex];
    this.playBgmBySrc(src, volume);
    // 随机播放时，使用 src 路径作为标识
    this.currentBgmKey = src;
  }

  // 停止背景音乐
  public stopBGM(): void {
    if (this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm = null;
      this.currentBgmKey = null;
    }
  }

  // 内部播放方法（原有逻辑不变，但确保停止时清空标识已在 stopBGM 中处理）
  private playBgmBySrc(src: string, volume?: number): void {
    if (this.currentBgm) {
      this.currentBgm.stop();
    }
    const howl = new Howl({
      src: [src],
      loop: true,
      volume: volume ?? this.bgmVolume,
      preload: true,
    });
    howl.play();
    this.currentBgm = howl;
    // 注意：currentBgmKey 已在调用前设置，此处不再重复
  }
  // 环境音效
  public playAmbientByLocation(location: string, volume?: number): void {
    const src = AUDIO_PATHS.ambient[location as keyof typeof AUDIO_PATHS.ambient];
    if (!src) {
      console.warn(`未找到地点 "${location}" 的环境音效，停止当前环境音`);
      this.stopAmbient();
      return;
    }
    this.playAmbient(src, volume);
  }

  public playAmbient(src: string, volume?: number, loop: boolean = true): void {
    if (this.currentAmbient) {
      this.currentAmbient.stop();
    }
    const howl = new Howl({
      src: [src],
      loop,
      volume: volume ?? this.ambientVolume,
      preload: true,
    });
    howl.play();
    this.currentAmbient = howl;
  }

  public stopAmbient(): void {
    if (this.currentAmbient) {
      this.currentAmbient.stop();
      this.currentAmbient = null;
    }
  }

  // 音量控制
  public setBgmVolume(volume: number): void {
    this.bgmVolume = Math.min(1, Math.max(0, volume));
    if (this.currentBgm) {
      this.currentBgm.volume(this.bgmVolume);
    }
  }

  public setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.min(1, Math.max(0, volume));
    if (this.currentAmbient) {
      this.currentAmbient.volume(this.ambientVolume);
    }
  }

  public mute(shouldMute: boolean): void {
    this.isMuted = shouldMute;
    const bgmVol = shouldMute ? 0 : this.bgmVolume;
    const ambientVol = shouldMute ? 0 : this.ambientVolume;
    if (this.currentBgm) this.currentBgm.volume(bgmVol);
    if (this.currentAmbient) this.currentAmbient.volume(ambientVol);
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const audioService = new AudioService();
console.log('audioService loaded, playClick exists?', typeof audioService.playClick);