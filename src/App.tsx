import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import PasswordGate from "./components/PasswordGate";
import Wedding from "./pages/Wedding";
import Admin from "./pages/Admin";
import CityPage from "./pages/CityPage";
import InviteLanding from "./pages/InviteLanding";

function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-[clamp(64px,10vw,120px)] font-normal text-ink leading-none mb-4">
        404
      </h1>
      <p className="text-[13px] tracking-[3px] uppercase text-ink-muted font-normal mb-8">
        Page not found
      </p>
      <Link
        to="/"
        className="text-[12px] font-medium tracking-[2px] uppercase text-cream bg-dark px-8 py-3.5 transition-all duration-500 ease-out hover:bg-accent hover:-translate-y-px"
      >
        Back to Home
      </Link>
    </div>
  );
}

/** Everything a guest needs the password (or a valid invitation) to see. */
const Gated = ({ children }: { children: React.ReactNode }) => (
  <PasswordGate>{children}</PasswordGate>
);

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Personalised invitation links sit outside the gate: the code is
                the login. Everything else stays behind it. */}
            <Route path="/i/:code" element={<InviteLanding />} />

            <Route path="/" element={<Gated><Wedding /></Gated>} />
            <Route path="/discover/:slug" element={<Gated><CityPage /></Gated>} />
            <Route path="/admin" element={<Gated><Admin /></Gated>} />
            <Route path="*" element={<Gated><NotFound /></Gated>} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
