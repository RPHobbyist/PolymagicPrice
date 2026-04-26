import { Component, ErrorInfo, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
                    <Card className="max-w-xl w-full p-6 shadow-xl border-red-100">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
                            <p className="text-gray-600">
                                An unexpected error occurred while rendering this page.
                            </p>

                            {this.state.error && (
                                <div className="w-full mt-4 p-4 bg-gray-100 rounded-lg overflow-auto max-h-64 text-left">
                                    <p className="font-mono text-sm text-red-600 font-semibold mb-2">
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo && (
                                        <pre className="font-mono text-xs text-gray-500 whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-4 mt-6">
                                <Button onClick={this.handleReload} variant="default" className="gap-2">
                                    <RefreshCw className="w-4 h-4" />
                                    Reload Page
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
