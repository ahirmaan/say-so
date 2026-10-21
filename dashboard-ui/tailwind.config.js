/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0D12',
        sidebar: '#10131A',
        card: '#151922',
        elevated: '#1B202B',
        accent: '#8B7CFF',
        'accent-cyan': '#62D9F5',
        text: '#F5F7FB',
        'text-secondary': '#9299AA',
        'text-muted': '#697184',
        border: '#272D39',
        success: '#42D392',
        warning: '#F2B866',
        error: '#F07178',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
};
