import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-accent/40 flex items-center justify-center mb-6">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5E7F8C"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-ink mb-2">
            Something went wrong
          </h1>
          <p className="text-[13px] text-ink-soft font-light max-w-md mb-8">
            An unexpected error occurred. Please reload the page to try again.
          </p>
          {this.state.error && (
            <p className="text-[11px] text-ink-faint font-mono mb-6 max-w-lg break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReload}
            className="text-[12px] font-medium tracking-[2px] uppercase text-cream bg-dark px-8 py-3.5 transition-all duration-500 ease-out hover:bg-accent hover:-translate-y-px"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
