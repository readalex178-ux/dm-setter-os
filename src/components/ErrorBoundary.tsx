import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Friendly name of the area being guarded, e.g. "Inbox". */
  name?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * App-wide error boundary. Wrap feature areas so a single component failure
 * cannot white-screen the whole application.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to console for debugging; production analytics can hook here.
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[40vh]">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            {this.props.name ? `${this.props.name} hit a snag` : "Something went wrong"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            This section failed to load, but the rest of the app is still working. Try reloading just this part.
          </p>
        </div>
        <Button onClick={this.reset} variant="outline" size="sm">
          <RotateCw className="h-4 w-4 mr-1.5" /> Reload section
        </Button>
      </div>
    );
  }
}
