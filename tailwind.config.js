/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0a0a0d',
          surface: '#121217',
          card: '#181820',
          border: '#262633',
          hover: '#22222e',
          text: '#f3f4f6',
          muted: '#8e92a0',
          red: '#ef4444',
          'red-dark': '#dc2626',
          cyan: '#06b6d4',
          amber: '#f59e0b',
          emerald: '#10b981',
          blue: '#3b82f6',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

