/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom Color Palette
        'brown': '#733D26',        // Dark brown - text, borders
        'brown-dark': '#5A2F1D',   // Darker brown - accents, form backgrounds
        'brown-light': '#AF7F73',  // Muted rose/brown - accents
        'brown-lighter': '#D4B5A8', // Very light brown - backgrounds
        'pink-light': '#F9D0DE',   // Light pink - backgrounds
        'pink': '#F8B0C8',         // Medium pink - buttons, highlights
        'pink-dark': '#F790B2',    // Brighter pink - primary actions
        // Legacy support (mapped to new colors)
        'red': '#F790B2',
        'red-light': '#F9D0DE',
        'red-dark': '#F8B0C8',
        'pink-dark-text': '#733D26',
        // Neutral colors
        'beige': '#F5F1EB',
        'beige-light': '#FAF8F5',
        // Background colors
        'baby-pink': '#F9D0DE',
        'baby-pink-light': '#F9D0DE',
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 10px 40px rgba(0, 0, 0, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 1s ease-in-out',
        'fade-in-up': 'fadeInUp 1s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'scroll': 'scroll 30s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}

