// Tailwind v4 is processed via its PostCSS plugin under Next (was @tailwindcss/vite under Vite).
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
