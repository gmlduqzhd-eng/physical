import { Component, Fragment } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FlowShell } from '../presentation/FlowShell';
import { chunkUrlFrom, resetFailedLazies } from '../application/lazyWithRetry';
import { playErrorCleared, playErrorShown } from '../application/playErrorSignal';
import { isChunkLoadError } from './chunkLoadError';
import './ErrorBoundary.css';

interface State { error?: Error; attempt: number; softRetried: boolean }

/**
 * 놀이 화면(/play/:gameType) 하나만 감싸는 오류 화면.
 * 놀이를 못 열어도 머리말과 '오늘 수업' 막대(App 쪽)는 남아서, 선생님이 목록이나 다음 단계로 바로 갈 수 있다.
 *
 * 화면 파일을 못 받은 경우:
 * - '다시 열기'는 먼저 새로고침 없이 다시 받아 본다(놀이 화면은 lazyWithRetry라 주소를 바꿔 새로 받는다).
 *   그래도 안 되거나 브라우저가 파일 주소를 알려 주지 않으면 그때 새로고침한다.
 * - '목록으로'나 다른 놀이로 옮기면 이 오류 화면은 사라지고, 다음 놀이는 새로 받는다.
 */
class Boundary extends Component<{ children?: ReactNode }, State> {
  public state: State = { attempt: 0, softRetried: false };
  private signalled = false;
  public static getDerivedStateFromError(error: Error): Partial<State> { return { error }; }
  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Play screen error:', error, info);
    if (!this.signalled) { this.signalled = true; playErrorShown(); }
  }
  public componentWillUnmount() {
    // 오류 화면을 떠나면(목록으로, 다른 놀이로) 다음 놀이는 화면 파일을 새로 받는다.
    if (this.state.error) resetFailedLazies();
    this.clearSignal();
  }
  private clearSignal() { if (this.signalled) { this.signalled = false; playErrorCleared(); } }
  private retry = () => {
    const { error, attempt, softRetried } = this.state;
    const chunk = isChunkLoadError(error);
    // 파일 주소를 모르면(일부 브라우저) 같은 창에서 다시 받을 방법이 없어 바로 새로고침한다.
    if (chunk && (softRetried || !chunkUrlFrom(error))) { window.location.reload(); return; }
    if (chunk) resetFailedLazies();
    this.clearSignal();
    this.setState({ error: undefined, attempt: attempt + 1, softRetried: chunk });
  };
  public render() {
    const { error, attempt } = this.state;
    // attempt가 바뀌면 안쪽을 새로 그려서, 놀이 화면 파일을 새로 받게 한다.
    if (!error) return <Fragment key={attempt}>{this.props.children}</Fragment>;
    const chunk = isChunkLoadError(error);
    return <FlowShell utilities back="/hub" backLabel="활동 목록">
      <section className="play-error" role="alert" data-play-error>
        <p className="app-error-icon" aria-hidden="true">🧩</p>
        <h1>이 놀이를 못 열었어요</h1>
        <p>{chunk ? '놀이 파일을 받지 못했어요. 인터넷을 확인하고 다시 열어 봐요.' : '놀이를 여는 중에 문제가 생겼어요. 기록은 그대로예요.'}</p>
        <div className="app-error-actions">
          <button type="button" className="app-error-primary" onClick={this.retry}>다시 열기</button>
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
