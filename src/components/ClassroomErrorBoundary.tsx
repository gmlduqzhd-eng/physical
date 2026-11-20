import { Component, Fragment } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FlowShell } from '../presentation/FlowShell';
import { chunkUrlFrom, resetFailedLazies } from '../application/lazyWithRetry';
import { isChunkLoadError } from './chunkLoadError';
import './ErrorBoundary.css';

interface Props { children?: ReactNode; back: string; backLabel: string; title: string }
interface State { error?: Error; attempt: number; softRetried: boolean }

/**
 * 수업 화면(TV 점수판, 학생 모둠 폰, 교사 리모컨·관리) 하나만 감싸는 오류 화면.
 * 예전에는 이 화면에서 오류가 나면 앱 전체가 '화면을 열다가 멈췄어요'로 바뀌었다.
 * 이제는 머리말이 남고 '다시 시도'를 누르면 새로고침 없이 이 화면만 다시 그린다.
 * 수업 기록은 서버와 기기 저장 대기열에 있어서 다시 그려도 사라지지 않는다.
 */
class Boundary extends Component<Props, State> {
  public state: State = { attempt: 0, softRetried: false };
  public static getDerivedStateFromError(error: Error): Partial<State> { return { error }; }
  public componentDidCatch(error: Error, info: ErrorInfo) { console.error('[땀방울] 수업 화면 오류', window.location.pathname, error, info); }
  public componentDidMount() { window.addEventListener('online', this.onOnline); }
  public componentWillUnmount() {
    window.removeEventListener('online', this.onOnline);
    if (this.state.error) resetFailedLazies();
  }
  // 인터넷이 끊긴 채 화면 파일을 못 받았으면, 연결이 돌아올 때 저절로 다시 시도한다.
  private onOnline = () => { if (isChunkLoadError(this.state.error)) this.retry(); };
  private retry = () => {
    const { error, attempt, softRetried } = this.state;
    const chunk = isChunkLoadError(error);
    if (chunk && navigator.onLine === false) { this.forceUpdate(); return; }
    if (chunk && (softRetried || !chunkUrlFrom(error))) { window.location.reload(); return; }
    if (chunk) resetFailedLazies();
    this.setState({ error: undefined, attempt: attempt + 1, softRetried: chunk });
  };
  public render() {
    const { error, attempt } = this.state;
    if (!error) return <Fragment key={attempt}>{this.props.children}</Fragment>;
    const chunk = isChunkLoadError(error);
    const offline = chunk && typeof navigator !== 'undefined' && navigator.onLine === false;
    return <FlowShell utilities back={this.props.back} backLabel={this.props.backLabel}>
      <section className="play-error" role="alert" data-classroom-error>
        <p className="app-error-icon" aria-hidden="true">🧩</p>
        <h1>{this.props.title}</h1>
        <p>{offline ? '인터넷이 끊겨 있어요. 연결되면 저절로 다시 열어요.' : chunk ? '화면 파일을 받지 못했어요. 인터넷을 확인하고 다시 시도해 봐요.' : '잠깐 문제가 생겼어요. 점수와 기록은 그대로예요.'}</p>
        <div className="app-error-actions">
          <button type="button" className="app-error-primary" onClick={this.retry}>다시 시도</button>
          <Link to={this.props.back}>{this.props.backLabel}</Link>
        </div>
      </section>
    </FlowShell>;
  }
}

/** 주소가 바뀌면(다른 방·다른 모둠) 오류 화면도 새로 시작한다. */
export function ClassroomErrorBoundary(props: Props) {
  const { pathname } = useLocation();
  return <Boundary key={pathname} {...props} />;
}
