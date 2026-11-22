import { useId, useRef, useState } from "react";
import { HeaderPopover } from './HeaderPopover';
import { Share2 } from "lucide-react";
import "./LinkShareButton.css";

const shareUrl = "https://physical-pi.vercel.app/";

/** 링크 공유 동작과 안내 문구. 메뉴 안에서도 쓸 수 있게 단추와 따로 둔다. */
// eslint-disable-next-line react-refresh/only-export-components
export function useLinkShare() {
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [manualCopy, setManualCopy] = useState(false);

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
            text: `2022 개정 교육과정 연계 · 운동·스포츠·표현 영역별·학년별 체육 활동 자료`,
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
  const reset = () => { setShareStatus(''); setManualCopy(false); };
  return { sharing, shareStatus, manualCopy, shareLink, reset, shareUrl };
}

/** 공유할 링크를 직접 고를 수 있는 칸(클립보드를 못 쓸 때). */
export function ShareLinkInput() {
  return <input aria-label="공유할 링크" readOnly value={shareUrl}
    onFocus={(event) => event.currentTarget.select()}
    onTouchEnd={(event) => {
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
    }}
    onClick={(event) => {
      event.currentTarget.focus();
      event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
    }} />;
}

export function LinkShareButton({ hub = false }: { hub?: boolean }) {
  const { sharing, shareStatus, manualCopy, shareLink, reset } = useLinkShare();
  const shareTrigger = useRef<HTMLButtonElement>(null);
  const feedbackId = useId();
  return (
    <div className="share-control">
      <button ref={shareTrigger} className={hub ? "hub-action share-trigger" : "share-trigger"} type="button" title={sharing ? "공유 중" : "링크 공유"} aria-expanded={Boolean(shareStatus)} aria-controls={shareStatus ? feedbackId : undefined} onClick={shareLink} disabled={sharing}>
        <Share2 aria-hidden="true" />
        <span>{sharing ? "공유 중" : "링크 공유"}</span>
      </button>
      <HeaderPopover open={Boolean(shareStatus)} onClose={reset} anchor={shareTrigger} id={feedbackId} label="공유 안내">
        <div className="header-share-feedback" role="status"><p>{shareStatus}</p></div>
        {manualCopy && <ShareLinkInput/>}
      </HeaderPopover>
    </div>
  );
}
