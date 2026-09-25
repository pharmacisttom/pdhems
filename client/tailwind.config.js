/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ems: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          primary: '#0284c7',
          emergency: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
          refer: '#8b5cf6',
        }
      }
    },
  },
  plugins: [],
}
