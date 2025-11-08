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
        // Theme-based colors (CSS variables)
        'brown': 'var(--color-primary)',
        'brown-dark': 'var(--color-primary-dark)',
        'brown-light': 'var(--color-primary-light)',
        'brown-lighter': 'var(--color-primary-light)',
        'pink-light': 'var(--color-secondary)',
        'pink': 'var(--color-secondary-dark)',
        'pink-dark': 'var(--color-accent)',
        // Legacy support (mapped to theme colors)
        'red': 'var(--color-accent)',
        'red-light': 'var(--color-secondary)',
        'red-dark': 'var(--color-secondary-dark)',
        'pink-dark-text': 'var(--color-primary)',
        // Background colors
        'baby-pink': 'var(--color-background)',
        'baby-pink-light': 'var(--color-background)',
        // Neutral colors (keep static)
        'beige': '#F5F1EB',
        'beige-light': '#FAF8F5',
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

