/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Active Selection: Option 3 ("Hacker / Cyberpunk")
        cyber: {
          bg: '#05080A',
          surface: '#0C1217',
          surfaceHover: '#141E26',
          border: '#17232D',
          primary: '#00FF9D',     // Terminal Matrix Green
          accent: '#00E5FF',      // Cyberpunk Neon Cyan
          accentHover: '#00B4D8',
          success: '#00FF9D',     // Safe / Active
          warning: '#FFB800',     // Industrial Amber
          danger: '#FF2E63',      // Neon Scarlet / Disciplinary
          textPrimary: '#E6F1F8', // Ice White
          textMuted: '#708A9C',   // Cool Muted Steel
          textDim: '#44596B',
        },

        // Option 1: Modern Dark Mode (Archived Reference)
        modern: {
          bg: '#0B0F19',
          surface: '#111827',
          surfaceHover: '#1F2937',
          border: '#1E293B',
          primary: '#0EA5E9',
          accent: '#0284C7',
          accentHover: '#0369A1',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          textPrimary: '#F8FAFC',
          textMuted: '#94A3B8',
        },

        // Option 2: Trust & Enterprise (Archived Reference)
        enterprise: {
          bg: '#F1F5F9',
          surface: '#FFFFFF',
          surfaceHover: '#F8FAFC',
          border: '#E2E8F0',
          primary: '#0F172A',
          accent: '#1D4ED8',
          accentHover: '#1E40AF',
          success: '#059669',
          warning: '#D97706',
          danger: '#DC2626',
          textPrimary: '#0F172A',
          textMuted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
