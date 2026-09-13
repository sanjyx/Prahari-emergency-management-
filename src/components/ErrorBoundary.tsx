import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  moduleName?: string;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary caught error in [${this.props.moduleName || 'Module'}]:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="my-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
            <AlertTriangle className="size-6" />
          </div>
          <h3 className="mt-3 font-display text-base font-bold uppercase text-white">
            {this.props.moduleName || 'Feature'} Temporarily Unavailable
          </h3>
          <p className="mt-1 font-mono text-xs text-slate-300">
            An isolated runtime error occurred in this module. The rest of the PRAHARI platform remains fully operational.
          </p>
          {this.state.error && (
            <p className="mt-2 font-mono text-[0.68rem] text-rose-300 bg-rose-950/60 p-2 rounded max-w-lg mx-auto overflow-x-auto text-left">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-4 inline-flex items-center gap-2 rounded bg-rose-600 px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-rose-500"
          >
            <RotateCcw className="size-3.5" />
            <span>Retry Module</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
