/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        accent: {
          50: '#eef6ff',
          100: '#d9eaff',
          500: '#2f6fde',
          600: '#2459c2',
          700: '#1f489c',
        },
      },
    },
  },
  plugins: [],
};
