import type { Config } from "tailwindcss";

// 新东方美学 token，取自 mockups。
// 语义色走 CSS 变量（支持 light/dark）；品牌常量色保留备用。
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // 语义 token（随主题翻转）
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        line: "var(--line)",
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          ink: "var(--accent-ink)",
        },
        cel: {
          DEFAULT: "var(--cel)",
          soft: "var(--cel-soft)",
          ink: "var(--cel-ink)",
        },
        // 鎏金点缀（收藏高亮 / 进度高光 / 勋章），随主题翻转
        gold: {
          DEFAULT: "var(--gold)",
          soft: "color-mix(in srgb, var(--gold) 18%, transparent)",
        },
        // 品牌常量（印章、图谱节点等）
        cinnabar: { DEFAULT: "#993C1D", deep: "#4A1B0C", soft: "#FAECE7" },
        celadon: { DEFAULT: "#5DCAA5", bg: "#E1F5EE", deep: "#04342C" },
      },
      fontFamily: {
        serif: ['"Songti SC"', '"STSong"', '"Noto Serif SC"', "serif"],
        sans: ['"PingFang SC"', '"Hiragino Sans GB"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
