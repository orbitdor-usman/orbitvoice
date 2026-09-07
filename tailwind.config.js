/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./frontend/app/**/*.{js,jsx}', './frontend/components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10231f',
        sage: '#dce9e2',
        mint: '#8bd1b1',
        forest: '#1c6b4f'
      },
      boxShadow: {
        soft: '0 18px 48px rgba(28, 65, 53, 0.12)'
      }
    }
  },
  plugins: []
};
