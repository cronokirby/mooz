const { colors } = require('tailwindcss/defaultTheme');

module.exports = {
  purge: [
    './src/**/*.jsx',
    './src/**/*.tsx',
    './pages/**/*.jsx',
    './pages/**/*.tsx',
    './components/**/*.jsx',
    './components/**/*.tsx',
  ],
  theme: {
    extend: {
      colors: {
        main: {
          ...colors.pink,
        },
      },
    },
  },
  variants: {},
  plugins: [],
};
