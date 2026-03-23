import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          gsap: ["gsap"],
          dotlottie: ["@lottiefiles/dotlottie-react", "@lottiefiles/dotlottie-web"],
        },
      },
    },
  },
});
