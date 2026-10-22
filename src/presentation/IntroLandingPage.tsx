import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AVAILABLE_GAMES as GAMES } from "../domain/gamesData";
import accessQr from "../assets/access-qr.svg?inline";
import {ForestBrand} from './components/ForestIdentity';
import "./IntroLandingPage.css";
import { BackgroundMusicButton } from "./components/BackgroundMusicButton";
import { LinkShareButton } from "./components/LinkShareButton";
import {
  AccessQrDialog,
  type AccessQrDialogHandle,
} from "./components/AccessQrDialog";

const domains = [
  { name: "운동", description: "체력·건강·기본 움직임" },
  { name: "스포츠", description: "기술·전략·협동 활동" },
  { name: "표현", description: "리듬·동작·창의적 표현" },
];

export function IntroLandingPage() {
  const accessQrDialog = useRef<AccessQrDialogHandle>(null);
  return (
    <div className="intro-landing">
      <div className="shell">
        <header className="header">
          <Link className="brand" to="/" aria-label="땀방울 원정대 홈">
            <ForestBrand subtitle="함께 움직이는 체육 시간"/>
          </Link>
          <div className="header-actions">
            <BackgroundMusicButton />
            <div className="access-actions">
            <button
              className="qr-trigger"
              type="button"
              aria-haspopup="dialog"
              aria-controls="access-qr-dialog"
              aria-label="접속 QR 크게 보기"
              onClick={() => accessQrDialog.current?.open()}
            >
              <img src={accessQr} alt="접속 QR" width={111} height={111} />
              <span>
                <b>접속 QR</b>
                <small>카메라로 QR을 스캔하세요.</small>
                <em>
                  크게 보기 <ArrowRight aria-hidden="true" />
                </em>
              </span>
            </button>
            <LinkShareButton />
            </div>
          </div>
        </header>
        <main className="hero">
          <section className="hero-copy">
            <div className="eyebrow">2022 개정 교육과정 연계</div>
            <h1>
              체육 수업에,
              <br />
              <span>움직임의 즐거움을</span>
            </h1>
            <p className="intro">
              2022 개정 교육과정 체육과 영역별·학년별
              <br />
              <strong>{GAMES.length}개 자료</strong>를 담고 있습니다.
              <br />
              체력 활동부터 스포츠와 표현까지,
              <br />
              수업에 맞는 활동을 간편하게 찾아보세요.
            </p>
            <div className="actions">
              <Link className="action primary" to="/start">
                접속하기 <ArrowRight aria-hidden="true" />
              </Link>
              <Link className="action secondary" to="/lobby">
                개설방 입장하기
              </Link>
            </div>
          </section>
          <aside className="library" aria-label="자료 구성">
            <div className="library-top">
              CURRICULUM LIBRARY
              <span className="dot" />
            </div>
            <div className="total">
              <strong>{GAMES.length}</strong>
              <span>개의 활동 자료</span>
            </div>
            <p className="library-description">
              학년과 영역에 맞춰 살펴보는 체육 콘텐츠
            </p>
            {domains.map((domain, index) => (
              <div className="domain" key={domain.name}>
                <div className="domain-left">
                  <span className="domain-index">0{index + 1}</span>
                  <div>
                    <h2>{domain.name}</h2>
                    <p>{domain.description}</p>
                  </div>
                </div>
                <div className="domain-count">
                  {GAMES.filter((game) => game.domain === domain.name).length}
                  <small>개</small>
                </div>
              </div>
            ))}
            <div className="grade-note">1–2학년군 · 3–4학년군 · 5–6학년군</div>
          </aside>
        </main>
        <footer className="footer">
          <span>움직임으로 배우는 체육 · 땀방울 원정대</span>
          <nav aria-label="도움말">
            <Link to="/admin">교사 수업 관리 ↗</Link>
            <Link to="/manual">이용 안내</Link>
          </nav>
        </footer>
      </div>
      <AccessQrDialog dialogRef={accessQrDialog} />
    </div>
  );
}
