/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 8px)',
  			sm: 'calc(var(--radius) - 12px)',
        xl: 'calc(var(--radius) - 4px)',
        '2xl': 'calc(var(--radius) - 2px)',
        '3xl': 'var(--radius)',
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
        tiva: {
          canvas: '#0A0F0D',
          card: '#0F1614',
          panel: '#0C1210',
          border: '#1A2520',
          navy: '#FFFFFF',
          'navy-soft': '#C0C0C0',
          teal: '#40C9A2',
          'teal-mid': '#2BA884',
          lavender: '#1A3F33',
          'lavender-mid': '#2BA884',
          'lavender-deep': '#40C9A2',
          'lavender-light': '#0F2A22',
          mint: '#1A3F33',
          'mint-mid': '#2BA884',
          'mint-deep': '#40C9A2',
          'mint-light': '#0F2A22',
          peach: '#2A2519',
          'peach-deep': '#E8B86D',
          'peach-light': '#1A1610',
          amber: '#F5E6C8',
          red: '#F2C9C9',
          'red-mid': '#E8A8A8',
        }
  		},
  		fontFamily: {
  			heading: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			display: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			mono: ['var(--font-mono)']
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
