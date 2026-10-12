import { Gamepad2, KeyRound, Play } from "lucide-react";
import { Link } from "react-router-dom";
import accessQr from "../assets/access-qr.svg?inline";
import "./IntroLandingPage.css";

export function IntroLandingPage() {
  return (
    <div className="intro-landing">
      <div className="wrap">
        <header>
          <Link className="brand" to="/" aria-label="땀방울 원정대 홈">
            <svg viewBox="0 0 40 48" aria-hidden="true">
              <path
                d="M20 2C16 10 3 20 3 30a17 17 0 0 0 34 0C37 20 24 10 20 2Z"
                fill="currentColor"
              />
              <path d="m16 22 10 7-10 7V22Z" fill="white" />
            </svg>
            <span>땀방울 원정대</span>
          </Link>
          <a
            className="qr-link"
            href={accessQr}
            download="땀방울-원정대-접속-QR.svg"
            aria-label="땀방울 원정대 접속 QR 이미지 저장"
          >
            <span className="qr-image">
              <img
                src={accessQr}
                alt="https://physical-pi.vercel.app/ 접속 QR 코드"
                width={148}
                height={148}
              />
            </span>
            <span className="qr-copy">
              <b>접속 QR</b>
              <span>
                스마트폰 카메라로
                <br />
                스캔해 주세요
              </span>
            </span>
          </a>
        </header>
        <main className="hero">
          <div className="hero-art" aria-hidden="true">
            <Gamepad2 />
          </div>
          <h1>
            몸을 움직이면,
            <br />
            <span className="accent">놀이가 시작돼요.</span>
          </h1>
          <p className="lead">스마트폰 하나로 즐기는 체육 활동</p>
          <div className="actions">
            <Link className="action primary" to="/hub">
              <Play aria-hidden="true" />
              게임 시작하기
            </Link>
            <Link className="action secondary" to="/lobby">
              <KeyRound aria-hidden="true" />
              수업에 참여하기
            </Link>
          </div>
        </main>
        <footer>
          <span>땀방울 원정대</span>
          <nav aria-label="도움말">
            <Link to="/admin">
              교사 수업 관리 <span aria-hidden="true">↗</span>
            </Link>
            <Link to="/manual">이용 안내</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
