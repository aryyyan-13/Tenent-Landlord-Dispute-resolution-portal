/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1C2B39',
        'ink-light': '#3D5266',
        paper: '#FBFAF7',
        panel: '#FFFFFF',
        line: '#DDD7C8',
        accent: '#A9702E',
        'accent-dark': '#8A5A22',
        success: '#3F7A5E',
        warn: '#B8863B',
        danger: '#A23B3B'
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px'
      }
    }
  },
  plugins: []
};
