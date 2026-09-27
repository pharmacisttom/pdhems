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
          canvas: '#f0f5fa',
          surface: '#ffffff',
          inset: '#f4f7fb',
          ink: '#16324f',
          muted: '#52677e',
          dark: '#16324f',
          card: '#ffffff',
          border: '#dbe5ef',
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
