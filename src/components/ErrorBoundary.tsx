import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { isChunkLoadError } from './chunkLoadError';
import './ErrorBoundary.css';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/** 앱 전체를 감싸는 마지막 안전망. 놀이 화면은 PlayErrorBoundary가 먼저 받아 머리말과 수업 막대를 남긴다. */
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

  // 인터넷이 끊겨 화면 파일을 못 받았으면, 연결이 돌아오는 순간 저절로 다시 연다.
  private retryWhenOnline = () => { if (this.state.hasError && isChunkLoadError(this.state.error)) window.location.reload(); };
  public componentDidMount() { window.addEventListener('online', this.retryWhenOnline); }
  public componentWillUnmount() { window.removeEventListener('online', this.retryWhenOnline); }

  public render() {
    if (this.state.hasError) {
      const chunk = isChunkLoadError(this.state.error);
      const offline = chunk && typeof navigator !== 'undefined' && navigator.onLine === false;
      if (offline) return (
        <main className="app-error" role="alert" data-app-error="offline">
          <p className="app-error-icon" aria-hidden="true">📶</p>
          <h1>인터넷이 끊겨서 이 화면을 아직 못 받았어요</h1>
          <p>인터넷이 다시 연결되면 저절로 열려요. 그동안 처음 화면과 전에 한 번 열어 본 화면은 바로 쓸 수 있어요.</p>
          <div className="app-error-actions">
            <button type="button" className="app-error-primary" onClick={() => window.location.reload()}>다시 열기</button>
            <a href="/">처음 화면으로</a>
          </div>
        </main>
      );
      return (
        <main className="app-error" role="alert">
          <p className="app-error-icon" aria-hidden="true">🌧️</p>
          <h1>화면을 열다가 멈췄어요</h1>
          <p>{chunk ? '화면 파일을 받지 못했어요. 인터넷이 잠깐 끊겼거나 앱이 새로 바뀌었을 수 있어요.' : '잠깐 문제가 생겼어요. 기록은 그대로예요.'} 아래 단추를 눌러 다시 열어 봐요.</p>
          <div className="app-error-actions">
            <button type="button" className="app-error-primary" onClick={() => window.location.reload()}>다시 열기</button>
            <a href="/">처음 화면으로</a>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
