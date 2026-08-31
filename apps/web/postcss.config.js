/**
 * Tailwind 3 needs the PostCSS plugin pipeline. Tailwind 4's
 * `@tailwindcss/postcss` is NOT interchangeable with this — see AGENTS.md.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
