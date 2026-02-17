/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        colors: {
            brand: {
                primary: '#10b981',
                secondary: '#064e3b',
                accent: '#f59e0b'

            },
            surface: {
                DEFAULT: '#ffffff',   // White
                muted: '#f3f4f6',     // Light Gray (Backgrounds)
                dark: '#1f2937',      // Dark Gray (Cards in Dark Mode)
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'], // Professional font stack
            }

        }
    },
  },
  plugins: [],
}