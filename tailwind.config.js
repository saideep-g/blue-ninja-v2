export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'color-primary': 'var(--color-primary)',
        'color-primary-light': 'var(--color-primary-light)',
        'color-text': 'var(--color-text)',
        'color-text-secondary': 'var(--color-text-secondary)',
        'color-bg': 'var(--color-bg)',
        'color-card': 'var(--color-card)',
        'color-border': 'var(--color-border)',
        theme: {
          primary: 'var(--color-primary)',
          secondary: 'var(--color-secondary)',
          accent: 'var(--color-accent)',
          surface: 'var(--color-surface)',
          bg: 'var(--color-bg)',
          card: 'var(--color-card)',
          text: 'var(--color-text)',
          border: 'var(--color-border)',
        }
      }
    },
  },
}