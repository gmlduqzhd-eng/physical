import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FlowShell } from '../presentation/FlowShell';
import { isChunkLoadError } from './chunkLoadError';
import './ErrorBoundary.css';

interface State { error?: Error }

/**
 * 놀이 화면(/play/:gameType) 하나만 감싸는 오류 화면.
 * 놀이를 못 열어도 머리말과 '오늘 수업' 막대(App 쪽)는 남아서, 선생님이 목록이나 다음 단계로 바로 갈 수 있다.
 */
class Boundary extends Component<{ children?: ReactNode }, State> {
  public state: State = {};
  public static getDerivedStateFromError(error: Error): State { return { error }; }
  public componentDidCatch(error: Error, info: ErrorInfo) { console.error('Play screen error:', error, info); }
  public render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkLoadError(error);
    // 화면 파일을 못 받았을 때는 새로고침해야 다시 받는다. 그 밖에는 이 놀이만 다시 그린다.
    const retry = () => { if (chunk) window.location.reload(); else this.setState({ error: undefined }); };
    return <FlowShell utilities back="/hub" backLabel="활동 목록">
      <section className="play-error" role="alert" data-play-error>
        <p className="app-error-icon" aria-hidden="true">🧩</p>
        <h1>이 놀이를 못 열었어요</h1>
        <p>{chunk ? '놀이 파일을 받지 못했어요. 인터넷을 확인하고 다시 열어 봐요.' : '놀이를 여는 중에 문제가 생겼어요. 기록은 그대로예요.'}</p>
        <div className="app-error-actions">
          <button type="button" className="app-error-primary" onClick={retry}>다시 열기</button>
          <Link to="/hub">목록으로</Link>
        </div>
      </section>
    </FlowShell>;
  }
}

/** 다른 놀이로 옮기면 오류 화면도 새로 시작한다. */
export function PlayErrorBoundary({ children }: { children?: ReactNode }) {
  const { gameType } = useParams();
  return <Boundary key={gameType}>{children}</Boundary>;
}
