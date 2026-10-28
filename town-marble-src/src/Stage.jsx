import React, { useEffect, useRef, useState } from "react";
import FlatBoard, { Character } from "./Board.jsx";
import { BOARD, CHARACTERS, money } from "../shared/data.js";
export { Character };

export default function Stage(props) {
  const {
    game,
    seats,
    selected,
    onSelect,
    canTravel,
    reduced,
    speed = 1,
    onMoving,
    rolling,
    previewCharacter,
    onBrowse,
  } = props;
  const host = useRef(null),
    world = useRef(null),
    labels = useRef([]),
    actors = useRef(new Map()),
    latest = useRef(props),
    cueTimer = useRef(null);
  const [flat, setFlat] = useState(false),
    [error, setError] = useState(""),
    [phase, setPhase] = useState("loading"),
    [cue, setCue] = useState(null),
    [follow, setFollow] = useState(true),
    [low, setLow] = useState(false);
  latest.current = props;
  const players =
    game?.players ||
    seats.map((p, i) => ({ ...p, id: p.id || `preview-${i}` }));
  useEffect(() => {
    if (flat) return;
    let cancelled = false;
    onMoving(true);
    import("./scene/world.js")
      .then(({ MarbleWorld }) => {
        if (cancelled) return;
        const instance = new MarbleWorld(host.current, {
          onMoving,
          onPhase: setPhase,
          onQuality: setLow,
          onReaction: (value) => latest.current.onEmotion?.(value),
          onCue: (value) => {
            setCue(value);
            clearTimeout(cueTimer.current);
            cueTimer.current = setTimeout(
              () => setCue(null),
              value.duration / (latest.current.speed || 1),
            );
          },
          onError: (message) => {
            setError(message);
            setFlat(true);
          },
          onSelect: (index) => latest.current.onSelect(index),
          labelElements: labels.current,
          actorElements: actors.current,
        });
        world.current = instance;
        instance.update(latest.current);
        setPhase("idle");
        onMoving(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "이 기기에서는 입체 화면을 사용할 수 없어 간단한 화면으로 전환했어요.",
          );
          setFlat(true);
          onMoving(false);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(cueTimer.current);
      world.current?.dispose();
      world.current = null;
    };
  }, [flat]);
  useEffect(
    () => world.current?.update(props),
    [
      game,
      seats,
      selected,
      canTravel,
      reduced,
      rolling,
      previewCharacter,
      speed,
    ],
  );
  const control = (action) => {
    world.current?.controls(action);
    if (action === "follow") setFollow(!follow);
  };
  if (flat)
    return (
      <div className="flat-fallback">
        <p role="status">{error}</p>
        <FlatBoard {...props} />
      </div>
    );
  return (
    <div
      className={`stage3d ${phase === "walking" ? "travelling" : ""} ${canTravel ? "travel-select" : ""} ${cue ? "has-cue" : ""}`}
      data-scene-phase={phase}
    >
      <div className="world-viewport" ref={host}>
        <div className="world-labels" aria-label="도시와 특별한 칸">
          {BOARD.map((tile) => {
            const lot = game?.properties[tile.index],
              owner = lot?.owner
                ? game.players.find((p) => p.id === lot.owner)
                : null;
            return (
              <button
                key={tile.index}
                ref={(el) => (labels.current[tile.index] = el)}
                className={`city-label tile-${tile.type} ${selected === tile.index ? "selected" : ""} ${owner ? "owned" : ""}`}
                style={{
                  "--owner-color": owner
                    ? CHARACTERS[owner.character].color
                    : "#648b9e",
                }}
                onClick={() => onSelect(tile.index)}
                aria-label={`${tile.name}${owner ? `, ${owner.name} 소유, ${lot.level}단계` : ""}${tile.price ? `, ${money(tile.price)}` : ""}`}
              >
                <strong>{tile.name}</strong>
                <small>
                  {owner
                    ? `${owner.name} ${"★".repeat(lot.level)}`
                    : tile.price
                      ? money(tile.price)
                      : tile.type === "card"
                        ? "행운 카드"
                        : tile.type === "start"
                          ? "+20만"
                          : tile.type === "island"
                            ? "잠깐 쉬어요"
                            : tile.type === "travel"
                              ? "순간이동"
                              : "복지기금"}
                </small>
              </button>
            );
          })}
        </div>
        <div className="actor-labels">
          {players.map((p) => (
            <span
              className={`actor-name ${game?.players[game.current]?.id === p.id ? "active" : ""}`}
              key={p.id}
              ref={(el) => {
                if (el) actors.current.set(p.id, el);
                else actors.current.delete(p.id);
              }}
              style={{ "--actor-color": CHARACTERS[p.character].color }}
            >
              {game?.players[game.current]?.id === p.id && <b>▼ </b>}
              {p.name}
            </span>
          ))}
        </div>
      </div>
      {phase === "loading" && (
        <div className="world-loading">
          <span className="loading-die">⚄</span>
          <strong>구름 위 세상을 열고 있어요</strong>
        </div>
      )}
      <div className="scene-controls" role="group" aria-label="게임판 시점">
        <button onClick={onBrowse} aria-label="도시 목록">
          ☷<span>도시 목록</span>
        </button>
        <button onClick={() => control("rotate")} aria-label="시점 돌리기">
          ↻<span>시점 회전</span>
        </button>
        <button onClick={() => control("zoom")} aria-label="가까이 보기">
          ⌕<span>확대</span>
        </button>
        <button onClick={() => control("reset")} aria-label="전체 보기">
          ⌂<span>전체 보기</span>
        </button>
        <button
          onClick={() => control("follow")}
          aria-label="카메라 따라가기"
          aria-pressed={follow}
          className={follow ? "selected" : ""}
        >
          ◎<span>따라가기</span>
        </button>
        <button
          onClick={() => control("quality")}
          aria-label="화면 효과 줄이기"
          aria-pressed={low}
        >
          {low ? "◐" : "☀"}
          <span>{low ? "가벼운 효과" : "화면 효과"}</span>
        </button>
      </div>
      {canTravel && (
        <div className="travel-instruction">
          🚀 가고 싶은 도시를 골라 주세요!
        </div>
      )}
      {cue && (
        <div
          key={`${cue.type}-${cue.title}`}
          className={`scene-cue cue-${cue.type}`}
          aria-live="polite"
        >
          <span className="cue-spark">
            {cue.type === "card"
              ? "✦"
              : cue.type === "build"
                ? "⚑"
                : cue.type === "win"
                  ? "★"
                  : "✧"}
          </span>
          <div>
            <small>
              {cue.type === "card"
                ? "GOLDEN KEY"
                : cue.type === "build"
                  ? "MY LITTLE CITY"
                  : cue.type === "win"
                    ? "HAPPY JOURNEY"
                    : "LET’S GO!"}
            </small>
            <strong>{cue.title}</strong>
            <p>{cue.subtitle}</p>
          </div>
        </div>
      )}
    </div>
  );
}
