import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-screen bg-slate-900 text-white p-4">
          <h1 className="text-3xl font-bold text-red-500 mb-4">앗! 시스템 오류 발생 🚨</h1>
          <p className="text-gray-300 mb-6 text-center max-w-md">
            예기치 않은 오류가 발생하여 안전하게 화면을 보호했습니다.
            {this.state.error && (
              <span className="block mt-2 text-sm text-red-400 bg-black p-2 rounded">
                {this.state.error.message}
              </span>
            )}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
          >
            화면 새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
