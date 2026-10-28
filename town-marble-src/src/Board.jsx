import React, { useEffect, useRef } from "react";
import { BOARD, CHARACTERS, GROUPS, tilePoint, money } from "../shared/data.js";

export function Character({
  character = 0,
  className = "",
  label = false,
  emotion,
}) {
  return (
    <span
      className={`character character-${character} ${className}`}
      data-emotion={emotion || undefined}
      role={label ? "img" : undefined}
      aria-label={label ? CHARACTERS[character].name : undefined}
      aria-hidden={label ? undefined : true}
    />
  );
}
function Piece({
  p,
  seat,
  motion,
  active,
  trackRef,
  reduced,
  onMoving,
  speed,
}) {
  const speedRef = useRef(speed);
  speedRef.current = speed;
  useEffect(() => {
    if (animation.current) animation.current.playbackRate = speed;
  }, [speed]);
  const ref = useRef(null),
    latest = useRef(p),
    animation = useRef(null),
    seen = useRef(motion?.id);
  latest.current = p;
  const transform = (index, lift = 0) => {
    const unit = trackRef.current.clientWidth / 9,
      point = tilePoint(index);
    const dx = [-0.19, 0.19, -0.19, 0.19][seat] * unit;
    const dy = [0, 0, 0.18, 0.18][seat] * unit;
    return `translate(${(point.x + 0.5) * unit + dx}px, ${(point.y + 0.5) * unit + dy - lift}px)`;
  };
  useEffect(() => {
    let cancelled = false;
    const snap = () => {
      if (ref.current && trackRef.current)
        ref.current.style.transform = transform(latest.current.position);
    };
    if (
      !motion ||
      seen.current === motion.id ||
      motion.playerId !== p.id ||
      reduced ||
      document.hidden
    ) {
      snap();
      seen.current = motion?.id;
      return;
    }
    seen.current = motion.id;
    onMoving(true);
    const play = async () => {
      try {
        ref.current.classList.add("travelling");
        for (const segment of motion.segments) {
          let from = segment.from;
          for (const next of segment.path) {
            if (cancelled) return;
            const duration = segment.teleport
              ? 620
              : Math.max(115, Math.min(220, 2200 / segment.path.length));
            const start = transform(from),
              end = transform(next);
            const a = tilePoint(from),
              b = tilePoint(next);
            ref.current.style.setProperty("--facing", b.x < a.x ? "-1" : "1");
            const frames = segment.teleport
              ? [
                  { transform: start, opacity: 1 },
                  {
                    transform: `${start} scale(.3)`,
                    opacity: 0.2,
                    offset: 0.35,
                  },
                  { transform: `${end} scale(.3)`, opacity: 0.2, offset: 0.65 },
                  { transform: end, opacity: 1 },
                ]
              : [
                  { transform: start },
                  { transform: transform(from, 12), offset: 0.2 },
                  { transform: transform(next, 16), offset: 0.65 },
                  { transform: end },
                ];
            animation.current = ref.current.animate(frames, {
              duration,
              easing: "ease-in-out",
              fill: "forwards",
            });
            animation.current.playbackRate = speedRef.current;
            await animation.current.finished;
            ref.current.style.transform = end;
            animation.current.cancel();
            from = next;
          }
        }
      } catch {
        /* interrupted by a newer authoritative state or navigation */
      } finally {
        if (!cancelled) {
          ref.current?.classList.remove("travelling");
          snap();
          onMoving(false);
        }
      }
    };
    play();
    return () => {
      cancelled = true;
      animation.current?.cancel();
      onMoving(false);
    };
  }, [motion?.id, p.id, reduced]);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      animation.current?.cancel();
      if (ref.current)
        ref.current.style.transform = transform(latest.current.position);
    });
    observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`piece ${active ? "active" : ""} ${p.out ? "out" : ""}`}
      style={{ "--player-color": CHARACTERS[p.character].color }}
      aria-label={`${p.name}, ${BOARD[p.position].name}`}
    >
      <span className="piece-shadow" />
      <Character character={p.character} />
      <span className="piece-name">{p.name}</span>
    </div>
  );
}
export default function Board({
  game,
  seats,
  selected,
  onSelect,
  canTravel,
  reduced,
  speed = 1,
  onMoving,
}) {
  const trackRef = useRef(null);
  const players =
    game?.players ||
    seats.map((seat, i) => ({
      ...seat,
      id: seat.id || `preview-${i}`,
      position: 0,
      out: false,
    }));
  return (
    <div
      className={`board-frame ${canTravel ? "choose-travel" : ""} ${reduced ? "reduced" : ""}`}
    >
      <div className="board-track" ref={trackRef}>
        <div className="island-center">
          <img
            src="/town-marble/art/island.png"
            alt="민트빛 바다 위에 떠 있는 파스텔 성과 작은 마을"
            draggable="false"
          />
          <div className="island-caption">
            <span>✦ &nbsp; LITTLE WORLD, BIG ADVENTURE &nbsp; ✦</span>
            <strong>우리의 작은 세계여행</strong>
          </div>
          <div className="island-bottom">
            <span>✧ PASTEL ISLAND</span>
            <span>여행의 주인공은, 우리!</span>
          </div>
          {canTravel && (
            <div className="travel-banner">
              🚀 여행하고 싶은 칸을 눌러 주세요
            </div>
          )}
        </div>
        {BOARD.map((tile) => {
          const pos = tilePoint(tile.index),
            lot = game?.properties[tile.index];
          const owner = lot?.owner
            ? players.find((p) => p.id === lot.owner)
            : null;
          const color = owner
            ? CHARACTERS[owner.character].color
            : GROUPS[tile.group] || "#d2c4a6";
          return (
            <button
              key={tile.index}
              className={`tile tile-${tile.type} ${selected === tile.index ? "selected" : ""} ${owner ? "owned" : ""}`}
              style={{
                gridColumn: pos.x + 1,
                gridRow: pos.y + 1,
                "--tile-color": color,
              }}
              onClick={() => onSelect(tile.index)}
              aria-label={`${tile.name}${tile.price ? `, 가격 ${money(tile.price)}` : ""}${owner ? `, ${owner.name} 소유, 건물 ${lot.level}단계` : ""}`}
            >
              {tile.type === "city" && (
                <span className="tile-band">{owner ? owner.name : ""}</span>
              )}
              {lot?.level > 0 ? (
                <span
                  key={`${lot.owner}-${lot.level}`}
                  className={`building building-${lot.level}`}
                  aria-hidden="true"
                />
              ) : (
                <span className="tile-icon" aria-hidden="true">
                  {tile.icon}
                </span>
              )}
              <strong>{tile.name}</strong>
              <small>
                {tile.price
                  ? money(tile.price)
                  : tile.type === "card"
                    ? "행운을 열어요"
                    : tile.caption}
              </small>
              {lot?.level > 0 && (
                <span className="level-pips">{"●".repeat(lot.level)}</span>
              )}
            </button>
          );
        })}
        <div className="pieces" aria-live="off">
          {players.map((p, i) => (
            <Piece
              key={p.id}
              p={p}
              seat={i}
              motion={game?.motion}
              active={game && game.players[game.current].id === p.id}
              trackRef={trackRef}
              reduced={reduced}
              speed={speed}
              onMoving={onMoving}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
