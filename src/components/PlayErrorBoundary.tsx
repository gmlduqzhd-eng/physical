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
 * - 인터넷이 끊겨 있으면 새로고침하지 않고(브라우저 오류 페이지가 된다), 연결이 돌아오면 저절로 새로고침한다.
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
  public componentDidMount() { window.addEventListener('online', this.onOnline); window.addEventListener('offline', this.onNetworkChange); }
  public componentWillUnmount() {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onNetworkChange);
    // 오류 화면을 떠나면(목록으로, 다른 놀이로) 다음 놀이는 화면 파일을 새로 받는다.
    if (this.state.error) resetFailedLazies();
    this.clearSignal();
  }
  private clearSignal() { if (this.signalled) { this.signalled = false; playErrorCleared(); } }
  // 인터넷이 끊긴 채 화면 파일을 못 받았으면, 연결이 돌아올 때 저절로 새로고침해 다시 연다.
  // (끊긴 동안 스타일 파일도 함께 실패하는데, 같은 창에서는 그 스타일을 다시 받지 않아 새로고침이 가장 확실하다.
  //  연결된 뒤의 새로고침이라 브라우저의 '인터넷 없음' 페이지로 바뀌지 않는다. 수업 진행은 저장소에 남아 있다.)
  private onOnline = () => { if (isChunkLoadError(this.state.error)) window.location.reload(); else this.forceUpdate(); };
  private onNetworkChange = () => { if (this.state.error) this.forceUpdate(); };
  private retry = () => {
    const { error, attempt, softRetried } = this.state;
    const chunk = isChunkLoadError(error);
    // 끊긴 채로 새로고침하면 브라우저의 '인터넷 없음' 페이지가 되어 이 화면과 '오늘 수업' 막대가 사라진다.
    // 연결이 돌아오면(online) 저절로 다시 시도하므로 여기서는 기다린다.
    if (chunk && navigator.onLine === false) { this.forceUpdate(); return; }
    // 파일 주소를 모르면(스타일 파일이 먼저 실패했거나 Safari) 같은 창에서 다시 받을 방법이 없어 새로고침한다.
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
    const offline = chunk && typeof navigator !== 'undefined' && navigator.onLine === false;
    return <FlowShell utilities back="/hub" backLabel="활동 목록">
      <section className="play-error" role="alert" data-play-error>
        <p className="app-error-icon" aria-hidden="true">🧩</p>
        <h1>이 놀이를 못 열었어요</h1>
        <p>{offline ? '인터넷이 끊겨 있어요. 연결되면 저절로 다시 열어요.' : chunk ? '놀이 파일을 받지 못했어요. 인터넷을 확인하고 다시 열어 봐요.' : '놀이를 여는 중에 문제가 생겼어요. 기록은 그대로예요.'}</p>
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
