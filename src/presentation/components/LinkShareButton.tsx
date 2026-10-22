import { useState } from "react";
import { Share2 } from "lucide-react";
import { AVAILABLE_GAMES as GAMES } from "../../domain/gamesData";
import "./LinkShareButton.css";

export function LinkShareButton({ hub = false }: { hub?: boolean }) {
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const shareUrl = "https://physical-pi.vercel.app/";

  async function shareLink() {
    if (sharing) return;
    setSharing(true);
    setShareStatus("");
    setManualCopy(false);
    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "땀방울 원정대 | 움직임의 즐거움",
            text: `2022 개정 교육과정 연계 · 운동·스포츠·표현 영역별·학년별 ${GAMES.length}개 자료`,
            url: shareUrl,
          });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus("링크를 복사했습니다. 카카오톡에 붙여넣어 주세요.");
      } catch {
        setManualCopy(true);
        setShareStatus("아래 링크를 선택해 복사해 주세요.");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="share-control">
      <button className={hub ? "hub-action share-trigger" : "share-trigger"} type="button" onClick={shareLink} disabled={sharing}>
        <Share2 aria-hidden="true" />
        <span>{sharing ? "공유 중" : "링크 공유"}</span>
      </button>
      <div className="share-feedback" role="status">
        {manualCopy && <button type="button" className="share-dismiss" aria-label="공유 안내 닫기" onClick={() => { setShareStatus(""); setManualCopy(false); }}>닫기</button>}
        {shareStatus && <p>{shareStatus}</p>}
        {manualCopy && (
          <input aria-label="공유할 링크" readOnly value={shareUrl}
            onFocus={(event) => event.currentTarget.select()}
            onTouchEnd={(event) => {
              event.preventDefault();
              event.currentTarget.focus();
              event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
            }}
            onClick={(event) => {
              event.currentTarget.focus();
              event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
            }} />
        )}
      </div>
    </div>
  );
}
