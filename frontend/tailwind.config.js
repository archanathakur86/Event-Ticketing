module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // primary brand color used across the site (homepage blue)
        brand: {
          DEFAULT: '#123386',
          light: '#17338a',
          dark: '#041030'
        }
      }
    }
  },
  plugins: []
}
