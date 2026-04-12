import { Component, type ErrorInfo, type ReactNode } from 'react';

type MarkdownErrorBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
  /** When this changes (e.g. new stream chunk), clear the error and retry markdown. */
  resetKey: string;
};

type MarkdownErrorBoundaryState = {
  hasError: boolean;
};

/**
 * react-markdown can throw on unusual partial tokens while streaming; fall back to plain text.
 */
export class MarkdownErrorBoundary extends Component<
  MarkdownErrorBoundaryProps,
  MarkdownErrorBoundaryState
> {
  state: MarkdownErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MarkdownErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('[ChatMarkdown] render error, using plain fallback', msg, info.componentStack);
    }
  }

  override componentDidUpdate(prevProps: MarkdownErrorBoundaryProps): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
