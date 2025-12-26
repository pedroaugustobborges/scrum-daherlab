/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'daher': {
          primary: '#1e40af', // Blue
          secondary: '#0891b2', // Cyan
          accent: '#06b6d4',
        }
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disable Tailwind's reset to avoid conflicts with MUI
  },
}
