/* eslint-disable react-refresh/only-export-components -- Toolbar dismissal event is shared with this popover. */
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const dismissEvent = 'physical:close-header-popovers';

export function closeHeaderPopovers(trigger?: EventTarget) {
  window.dispatchEvent(new CustomEvent(dismissEvent, { detail: trigger }));
}

/** Body portal avoids clipping by sticky headers, filters and game containers. */
export function HeaderPopover({ open, onClose, anchor, id, label, children, className = '' }: {
  open: boolean; onClose: () => void; anchor: RefObject<HTMLElement | null>;
  id: string; label: string; children: ReactNode; className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const el = panel.current;
      const trigger = anchor.current;
      if (!el || !trigger) return;
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const gap = 16;
      el.style.width = `${Math.min(360, width - gap * 2)}px`;
      const rect = trigger.getBoundingClientRect();
      // Expanding a constrained panel to measure it would reset scrollTop.
      const naturalHeight = el.scrollHeight + el.offsetHeight - el.clientHeight;
      const below = rect.bottom + 10;
      const spaceBelow = Math.max(0, top + height - gap - below);
      const spaceAbove = Math.max(0, rect.top - top - gap - 10);
      const placeBelow = spaceBelow >= naturalHeight || spaceBelow >= spaceAbove;
      // Short landscape screens must scroll inside the panel, never cover its trigger row.
      el.style.maxHeight = `${Math.max(1, Math.min(height - gap * 2, placeBelow ? spaceBelow : spaceAbove))}px`;
      const size = el.getBoundingClientRect();
      const desiredTop = placeBelow ? below : rect.top - size.height - 10;
      el.style.left = `${Math.max(left + gap, Math.min(rect.left, left + width - size.width - gap))}px`;
      el.style.top = `${Math.max(top + gap, Math.min(desiredTop, top + height - size.height - gap))}px`;
    };
    const dismiss = () => close.current();
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      position();
    };
    const dismissOthers = (event: Event) => {
      const target = (event as CustomEvent).detail;
      // Let the current trigger toggle itself; closing it in capture would reopen it.
      if (target instanceof Node && anchor.current?.contains(target)) return;
      dismiss();
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !anchor.current?.contains(target)) dismiss();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismiss();
      anchor.current?.focus();
    };
    position();
    panel.current?.focus({ preventScroll: true });
    const observer = new ResizeObserver(position);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', onScroll, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape);
    window.addEventListener(dismissEvent, dismissOthers);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', onScroll, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', escape);
      window.removeEventListener(dismissEvent, dismissOthers);
    };
  }, [open, anchor]);

  if (!open) return null;
  return createPortal(<div ref={panel} id={id} className={`header-icon-scope header-popup-layer ${className}`} role="dialog" aria-label={label} tabIndex={-1}>
    <div className="header-popup-heading"><strong>{label}</strong><button type="button" className="header-popup-close" aria-label={`${label} 닫기`} onClick={() => { onClose(); anchor.current?.focus(); }}><X aria-hidden="true"/></button></div>
    {children}
  </div>, document.body);
}
