/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
    theme: {
      container: {
        center: true,
        padding: "2rem",
        screens: {
          "2xl": "1400px",
        },
      },
      extend: {
        fontFamily: {
          display: ['Playfair Display', 'Georgia', 'serif'],
          body: ['Inter', 'system-ui', 'sans-serif'],
        },
        colors: {
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
            glow: "hsl(var(--primary-glow))",
          },
          secondary: {
            DEFAULT: "hsl(var(--secondary))",
            foreground: "hsl(var(--secondary-foreground))",
          },
          destructive: {
            DEFAULT: "hsl(var(--destructive))",
            foreground: "hsl(var(--destructive-foreground))",
          },
          muted: {
            DEFAULT: "hsl(var(--muted))",
            foreground: "hsl(var(--muted-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--accent))",
            foreground: "hsl(var(--accent-foreground))",
          },
          popover: {
            DEFAULT: "hsl(var(--popover))",
            foreground: "hsl(var(--popover-foreground))",
          },
          card: {
            DEFAULT: "hsl(var(--card))",
            foreground: "hsl(var(--card-foreground))",
          },
          glass: {
            DEFAULT: "hsl(var(--glass))",
            border: "hsl(var(--glass-border))",
            hover: "hsl(var(--glass-hover))",
          },
          // Custom Colors
          void: "#0a0a0a",
          gold: {
            DEFAULT: "#F2C94C",
            light: "#F7DC8D",
            dark: "#D4A832",
          },
          rose: {
            DEFAULT: "#E0AFA0",
            light: "#EED1C7",
            dark: "#C89080",
          },
          cyan: {
            DEFAULT: "#4FD1C5",
            light: "#7FDED4",
            dark: "#38A89D",
          },
          mist: "#F3F4F6",
        },
        borderRadius: {
          lg: "var(--radius)",
          md: "calc(var(--radius) - 2px)",
          sm: "calc(var(--radius) - 4px)",
          xl: "calc(var(--radius) + 4px)",
          "2xl": "calc(var(--radius) + 8px)",
        },
        boxShadow: {
          glow: "var(--shadow-glow)",
          soft: "var(--shadow-soft)",
          glass: "var(--shadow-glass)",
          "glow-sm": "0 0 20px hsl(var(--primary) / 0.2)",
          "glow-lg": "0 0 80px hsl(var(--primary) / 0.4)",
          "cyan-glow": "0 0 40px hsl(var(--accent) / 0.4)",
          "rose-glow": "0 0 40px hsl(var(--secondary) / 0.4)",
        },
        backgroundImage: {
          "gradient-cosmic": "var(--gradient-cosmic)",
          "gradient-rose": "var(--gradient-rose)",
          "gradient-void": "var(--gradient-void)",
          "gradient-gold-glow": "var(--gradient-gold-glow)",
          "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        },
        keyframes: {
          "accordion-down": {
            from: { height: "0" },
            to: { height: "var(--radix-accordion-content-height)" },
          },
          "accordion-up": {
            from: { height: "var(--radix-accordion-content-height)" },
            to: { height: "0" },
          },
          "fade-in": {
            from: { opacity: "0", transform: "translateY(20px)" },
            to: { opacity: "1", transform: "translateY(0)" },
          },
          "fade-out": {
            from: { opacity: "1" },
            to: { opacity: "0" },
          },
          "scale-in": {
            from: { opacity: "0", transform: "scale(0.95)" },
            to: { opacity: "1", transform: "scale(1)" },
          },
          "slide-up": {
            from: { opacity: "0", transform: "translateY(100%)" },
            to: { opacity: "1", transform: "translateY(0)" },
          },
          float: {
            "0%, 100%": { transform: "translateY(0px)" },
            "50%": { transform: "translateY(-20px)" },
          },
          "pulse-glow": {
            "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" },
            "50%": { boxShadow: "0 0 40px hsl(var(--primary) / 0.6), 0 0 60px hsl(var(--primary) / 0.3)" },
          },
          shimmer: {
            "0%": { backgroundPosition: "-200% 0" },
            "100%": { backgroundPosition: "200% 0" },
          },
          spin: {
            from: { transform: "rotate(0deg)" },
            to: { transform: "rotate(360deg)" },
          },
          "particle-float": {
            "0%, 100%": { transform: "translateY(0) translateX(0)" },
            "25%": { transform: "translateY(-10px) translateX(5px)" },
            "50%": { transform: "translateY(-5px) translateX(-5px)" },
            "75%": { transform: "translateY(-15px) translateX(3px)" },
          },
        },
        animation: {
          "accordion-down": "accordion-down 0.2s ease-out",
          "accordion-up": "accordion-up 0.2s ease-out",
          "fade-in": "fade-in 1s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
          "fade-out": "fade-out 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
          "scale-in": "scale-in 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
          "slide-up": "slide-up 0.8s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
          float: "float 6s ease-in-out infinite",
          "pulse-glow": "pulse-glow 3s ease-in-out infinite",
          shimmer: "shimmer 2s infinite",
          "spin-slow": "spin 20s linear infinite",
          "particle-float": "particle-float 8s ease-in-out infinite",
        },
      },
    },
    plugins: [require("tailwindcss-animate")],
  }
