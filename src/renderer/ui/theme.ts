import type { GlobalThemeOverrides } from 'naive-ui';

/**
 * 全局语义色（供自定义 CSS / 玻璃容器使用，与 Naive 主题保持一致）
 * - 紫色：系统 / 叙事者 / 导航主色
 * - 琥珀色：玩家侧专属（用户气泡、发送动作）
 */
export const semanticColors = {
  primary: '#8b5cf6',
  primaryHover: '#a78bfa',
  primaryPressed: '#6d28d9',
  player: '#f59e0b',
  playerHover: '#fbbf24',
  playerPressed: '#d97706',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
} as const;

/**
 * Naive UI 主题覆盖：在 darkTheme 基础上统一为「星空 + 紫色玻璃」语言
 * 只定义品牌相关与圆角/字体；其余沿用 Naive 暗色默认，玻璃质感在容器层实现
 */
export const themeOverrides: GlobalThemeOverrides = {
  common: {
    // 主色（紫）
    primaryColor: semanticColors.primary,
    primaryColorHover: semanticColors.primaryHover,
    primaryColorPressed: semanticColors.primaryPressed,
    primaryColorSuppl: semanticColors.primary,

    // 状态色
    successColor: semanticColors.success,
    successColorHover: '#34d399',
    successColorPressed: '#059669',
    successColorSuppl: semanticColors.success,

    warningColor: semanticColors.warning,
    warningColorHover: semanticColors.playerHover,
    warningColorPressed: semanticColors.playerPressed,
    warningColorSuppl: semanticColors.warning,

    errorColor: semanticColors.error,
    errorColorHover: '#f87171',
    errorColorPressed: '#b91c1c',
    errorColorSuppl: semanticColors.error,

    // 圆角刻度（收敛，不再使用 20~60px）
    borderRadius: '12px',
    borderRadiusSmall: '8px',

    // 字体
    fontFamily:
      "'Inter', 'Segoe UI', system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
};
