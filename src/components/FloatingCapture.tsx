import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Circle, X } from "lucide-react";
import { captureCommandIds, type Command } from "../lib/commands";
import {
  CAPTURE_SIZE,
  capturePoint,
  clamp,
  snapCapture,
  type Bounds,
  type CapturePosition,
  type Point,
} from "../lib/capture-position";
import { change, useApp } from "../lib/store";

export function FloatingCapture({
  commands,
  onExecute,
  onLaunch,
}: {
  commands: Command[];
  onExecute: (command: Command) => void;
  onLaunch: (element: HTMLElement) => void;
}) {
  const saved = useApp((state) => state.data!.settings.capturePosition);
  const [position, setPosition] = useState(saved);
  const [bounds, setBounds] = useState<Bounds>({
    left: 12,
    top: 12,
    right: innerWidth - 12,
    bottom: innerHeight - 12,
  });
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [open, setOpen] = useState(false);
  const [idle, setIdle] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gesture = useRef<{
    pointer: number;
    start: Point;
    origin: Point;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const wake = () => {
    setIdle(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setIdle(true), 5000);
  };
  useEffect(() => {
    setPosition(saved);
  }, [saved.side, saved.y]);
  useEffect(() => {
    const measure = () => {
      const viewport = window.visualViewport;
      const style = frame.current && getComputedStyle(frame.current);
      const inset = (value?: string) => parseFloat(value || "0") || 0;
      const left = viewport?.offsetLeft || 0,
        top = viewport?.offsetTop || 0;
      setBounds({
        left: left + 12 + inset(style?.paddingLeft),
        top: top + 12 + inset(style?.paddingTop),
        right:
          left +
          (viewport?.width || innerWidth) -
          12 -
          inset(style?.paddingRight),
        bottom:
          top +
          (viewport?.height || innerHeight) -
          12 -
          inset(style?.paddingBottom),
      });
      gesture.current = null;
      setDragPoint(null);
    };
    measure();
    wake();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, []);
  const point = dragPoint || capturePoint(position, bounds);
  const persist = (next: CapturePosition) => {
    setPosition(next);
    void change((draft) => {
      draft.settings.capturePosition = next;
    }).catch(() =>
      setPosition(useApp.getState().data!.settings.capturePosition),
    );
  };
  const actions = captureCommandIds.map(
    (id) => commands.find((command) => command.id === id)!,
  );
  const menuWidth = Math.min(272, bounds.right - bounds.left);
  const menuLeft = clamp(
    position.side === "left" ? point.x : point.x + CAPTURE_SIZE - menuWidth,
    bounds.left,
    bounds.right - menuWidth,
  );
  const menuTop = clamp(point.y - 286, bounds.top, bounds.bottom - 274);
  const launch = (element: HTMLButtonElement) => {
    onLaunch(element);
    setOpen(true);
    wake();
  };
  return (
    <div ref={frame} className="capture-frame">
      <span id="capture-help" className="sr-only">
        Klik untuk aksi cepat. Geser untuk memindahkan. Tombol panah mengatur
        posisi; Home dan End memindahkan ke atas atau bawah.
      </span>
      <button
        ref={button}
        className={`capture-button ${idle ? "is-idle" : ""} ${dragPoint ? "is-dragging" : ""}`}
        style={{ left: point.x, top: point.y }}
        aria-label="Quick Capture"
        aria-describedby="capture-help"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={wake}
        onFocus={wake}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          wake();
          suppressClick.current = false;
          gesture.current = {
            pointer: event.pointerId,
            start: { x: event.clientX, y: event.clientY },
            origin: point,
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = gesture.current;
          if (!drag || drag.pointer !== event.pointerId) return;
          const dx = event.clientX - drag.start.x,
            dy = event.clientY - drag.start.y;
          if (Math.hypot(dx, dy) > 6) drag.moved = true;
          if (drag.moved) {
            suppressClick.current = true;
            setDragPoint({
              x: clamp(
                drag.origin.x + dx,
                bounds.left,
                bounds.right - CAPTURE_SIZE,
              ),
              y: clamp(
                drag.origin.y + dy,
                bounds.top,
                bounds.bottom - CAPTURE_SIZE,
              ),
            });
          }
        }}
        onPointerUp={(event) => {
          const drag = gesture.current;
          if (!drag || drag.pointer !== event.pointerId) return;
          if (drag.moved)
            persist(
              snapCapture(
                {
                  x: drag.origin.x + event.clientX - drag.start.x,
                  y: drag.origin.y + event.clientY - drag.start.y,
                },
                bounds,
              ),
            );
          else if (event.pointerType === "touch") {
            // Touch can omit the compatibility click after a captured drag.
            // Handle the tap here and ignore a duplicate synthesized click.
            suppressClick.current = true;
            launch(event.currentTarget);
          }
          gesture.current = null;
          setDragPoint(null);
          wake();
        }}
        onPointerCancel={() => {
          gesture.current = null;
          setDragPoint(null);
          suppressClick.current = true;
        }}
        onLostPointerCapture={() => {
          gesture.current = null;
          setDragPoint(null);
        }}
        onClick={(event) => {
          if (suppressClick.current && event.detail !== 0) {
            suppressClick.current = false;
            return;
          }
          launch(event.currentTarget);
        }}
        onKeyDown={(event) => {
          if (
            ![
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "Home",
              "End",
            ].includes(event.key)
          )
            return;
          event.preventDefault();
          wake();
          const step =
            32 / Math.max(1, bounds.bottom - bounds.top - CAPTURE_SIZE);
          persist({
            side:
              event.key === "ArrowLeft"
                ? "left"
                : event.key === "ArrowRight"
                  ? "right"
                  : position.side,
            y:
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? 1
                  : clamp(
                      position.y +
                        (event.key === "ArrowUp"
                          ? -step
                          : event.key === "ArrowDown"
                            ? step
                            : 0),
                      0,
                      1,
                    ),
          });
        }}
      >
        <Circle size={25} strokeWidth={5} aria-hidden="true" />
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay capture-overlay" />
          <Dialog.Content
            className="capture-menu"
            style={{
              left: menuLeft,
              top: menuTop,
              width: menuWidth,
              maxHeight: Math.max(0, bounds.bottom - menuTop),
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              requestAnimationFrame(() => {
                if (!document.querySelector('[role="dialog"]'))
                  button.current?.focus({ preventScroll: true });
              });
            }}
          >
            <div className="capture-menu-heading">
              <Dialog.Title>Quick Capture</Dialog.Title>
              <Dialog.Close
                className="btn btn-ghost btn-icon"
                aria-label="Tutup"
              >
                <X size={17} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Pilih aksi cepat.
            </Dialog.Description>
            {actions.map((command) => (
              <button
                className="capture-action"
                key={command.id}
                onClick={() => {
                  setOpen(false);
                  onExecute(command);
                }}
              >
                <span>{command.title}</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            ))}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
