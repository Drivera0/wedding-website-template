import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import Lenis from "lenis";
import App from "./App";
import { setLenis } from "./lib/scroll";
import "./styles/globals.css";

function Root() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.8,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      touchMultiplier: 1.5,
      autoRaf: true,
    });

    setLenis(lenis);

    return () => {
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
