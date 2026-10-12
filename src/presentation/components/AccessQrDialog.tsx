import { useRef, useImperativeHandle, type Ref } from "react";
import { X } from "lucide-react";
import accessQr from "../../assets/access-qr.svg?inline";
import "./AccessQrDialog.css";

export interface AccessQrDialogHandle {
  open: () => Promise<void>;
}

export function AccessQrDialog({
  dialogRef,
}: {
  dialogRef: Ref<AccessQrDialogHandle>;
}) {
  const qrDialog = useRef<HTMLDialogElement>(null);
  const ownsFullscreen = useRef(false);
  const openQr = async () => {
    if (!document.fullscreenElement && document.fullscreenEnabled) {
      try {
        await document.documentElement.requestFullscreen();
        ownsFullscreen.current = true;
      } catch {
        // The viewport-sized dialog also works when fullscreen is unavailable.
      }
    }
    qrDialog.current?.showModal();
  };
  useImperativeHandle(dialogRef, () => ({ open: openQr }));
  return (
    <dialog
      id="access-qr-dialog"
      ref={qrDialog}
      aria-labelledby="qr-title"
      onClose={() => {
        if (ownsFullscreen.current && document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {});
        }
        ownsFullscreen.current = false;
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          event.currentTarget.close();
      }}
    >
      <button
        className="close"
        type="button"
        aria-label="QR 확대 닫기"
        autoFocus
        onClick={() => qrDialog.current?.close()}
      >
        <X aria-hidden="true" />
      </button>
      <div className="qr-caption">
        <h2 id="qr-title">모바일로 바로 접속하세요</h2>
        <p>스마트폰 카메라로 QR 코드를 비춰 주세요.</p>
      </div>
      <div className="qr-stage">
        <img
          className="large-qr"
          src={accessQr}
          alt="https://physical-pi.vercel.app/ 접속 QR 코드"
          width={370}
          height={370}
        />
      </div>
      <div className="qr-controls">
        <div className="url">physical-pi.vercel.app</div>
        <a
          className="save"
          href={accessQr}
          download="땀방울-원정대-접속-QR.svg"
        >
          QR 이미지 저장
        </a>
      </div>
    </dialog>
  );
}
