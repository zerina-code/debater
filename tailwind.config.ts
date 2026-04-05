import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'for-blue': '#185FA5',
        'against-red': '#A32D2D',
      },
      keyframes: {
        progress: {
          '0%': { width: '10%' },
          '50%': { width: '70%' },
          '100%': { width: '90%' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        progress: 'progress 2s ease-in-out infinite',
        blink: 'blink 0.8s step-end infinite',
      },
    },
  },
  plugins: [],
}

export default config
