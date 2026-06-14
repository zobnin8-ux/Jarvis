"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ModuleErrorBoundaryProps {
  name: string;
  children: ReactNode;
}

interface ModuleErrorBoundaryState {
  hasError: boolean;
}

export class ModuleErrorBoundary extends Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  state: ModuleErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ModuleErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.name}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="module-offline panel-glow rounded-lg border border-white/10 bg-black/20 p-5 md:p-6">
          <div className="label text-white/35">Module Offline</div>
          <div className="mt-2 font-mono text-xs tracking-[0.2em] text-white/50 uppercase">
            {this.props.name}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
