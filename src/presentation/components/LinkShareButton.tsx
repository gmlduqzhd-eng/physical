import { useId, useRef, useState } from "react";
import { HeaderPopover } from './HeaderPopover';
import { Share2 } from "lucide-react";
import { AVAILABLE_GAMES as GAMES } from "../../domain/gamesData";
import "./LinkShareButton.css";

export function LinkShareButton({ hub = false }: { hub?: boolean }) {
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const shareTrigger = useRef<HTMLButtonElement>(null);
  const feedbackId = useId();
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
      <button ref={shareTrigger} className={hub ? "hub-action share-trigger" : "share-trigger"} type="button" title={sharing ? "공유 중" : "링크 공유"} aria-expanded={Boolean(shareStatus)} aria-controls={shareStatus ? feedbackId : undefined} onClick={shareLink} disabled={sharing}>
        <Share2 aria-hidden="true" />
        <span>{sharing ? "공유 중" : "링크 공유"}</span>
      </button>
      <HeaderPopover open={Boolean(shareStatus)} onClose={() => { setShareStatus(''); setManualCopy(false); }} anchor={shareTrigger} id={feedbackId} label="공유 안내">
        <div className="header-share-feedback" role="status"><p>{shareStatus}</p></div>
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
      </HeaderPopover>
    </div>
  );
}
