// Battle.jsx — 1:1 대전 화면 (연습·봇 모드). 온라인은 net 어댑터로 이후 확장.
import { useReducer, useEffect, useState } from 'react'
import {
  battleReducer,
  createBattleState,
  planBattleMove,
  botChooseSteps,
  rollDice,
  RANK_WIN,
  RANK_LOSE,
  TURNS_PER_PLAYER,
} from '../battleLogic.js'
import { CONFIG } from '../data.js'
import BattleBoard from './BattleBoard.jsx'
import BattleActionPanel from './BattleActionPanel.jsx'
import { firebaseReady, prepare, createRoom, joinRoom, listRooms, OnlineSession } from '../online.js'

export default function Battle() {
  const [config, setConfig] = useState(null) // null=메뉴 / {mode,...}

  if (!config) return <BattleMenu onStart={setConfig} />
  if (config.mode === 'online')
    return <OnlineBattleGame key={config.code} config={config} onExit={() => setConfig(null)} />
  return <BattleGame key={JSON.stringify(config)} config={config} onExit={() => setConfig(null)} />
}

// ── 모드 선택 메뉴 ──────────────────────────────
function BattleMenu({ onStart }) {
  const [myName, setMyName] = useState('나')
  const [foeName, setFoeName] = useState('친구')

  return (
    <div className="panel" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h2>⚔️ 특산물 대전 — 1:1</h2>
      <div className="compare">
        같은 게임판·시장에서 번갈아 <b>{TURNS_PER_PLAYER}턴</b>씩! 먼저 목표 <b>{CONFIG.goal.toLocaleString()}원</b>{' '}
        도달하거나, 끝났을 때 현금이 많으면 승리! 🏆
      </div>

      <div style={{ margin: '14px 0' }}>
        <label className="battle-label">
          내 이름
          <input className="battle-input" value={myName} onChange={(e) => setMyName(e.target.value)} maxLength={6} />
        </label>
      </div>

      <button
        className="btn btn-purple"
        style={{ marginBottom: 10 }}
        onClick={() => onStart({ mode: 'bot', names: [myName || '나', '또박이 봇'] })}
      >
        🤖 봇과 대전 (혼자 연습)
      </button>

      <div style={{ margin: '10px 0 6px', color: '#8d6e63' }}>또는 한 컴퓨터에서 둘이 번갈아:</div>
      <label className="battle-label" style={{ marginBottom: 8 }}>
        친구 이름
        <input className="battle-input" value={foeName} onChange={(e) => setFoeName(e.target.value)} maxLength={6} />
      </label>
      <button
        className="btn btn-green"
        onClick={() => onStart({ mode: 'local', names: [myName || '나', foeName || '친구'] })}
      >
        👫 둘이 대전 (번갈아 하기)
      </button>

      <OnlineMenu myName={myName} onStart={onStart} />
    </div>
  )
}

// 온라인 대전 메뉴 (퀴즈타운에 배포됐을 때만 = firebaseReady)
function OnlineMenu({ myName, onStart }) {
  const [ready] = useState(() => firebaseReady())
  const [rooms, setRooms] = useState([])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const refresh = () => {
    prepare()
      .then((deps) => listRooms(deps))
      .then(setRooms)
      .catch(() => {})
  }
  useEffect(() => {
    if (ready) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  if (!ready) {
    return (
      <div className="online-soon">
        🌐 온라인 대전은 <b>퀴즈타운</b>에 로그인해서 열면 이용할 수 있어요. (지금 화면은 봇·연습만)
      </div>
    )
  }

  const go = (fn) => {
    setBusy(true)
    setErr('')
    prepare()
      .then((deps) => fn(deps).then((c) => onStart({ mode: 'online', code: c })))
      .catch((e) => {
        setErr(e.message || '연결 실패')
        setBusy(false)
      })
  }

  return (
    <div className="online-box">
      <h3 style={{ margin: '4px 0' }}>🌐 온라인 대전 (친구와 각자 기기에서)</h3>
      <button className="btn btn-primary" disabled={busy} onClick={() => go((d) => createRoom(d, `${myName}의 방`))}>
        ➕ 방 만들기
      </button>
      <div className="join-row">
        <input
          className="battle-input"
          placeholder="방 번호 4자리"
          value={code}
          maxLength={4}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <button className="btn btn-green" disabled={busy || code.length !== 4} onClick={() => go((d) => joinRoom(d, code))}>
          입장
        </button>
      </div>
      <div className="room-list">
        <div className="rl-head">
          열린 방{' '}
          <button className="mini-link" onClick={refresh}>
            새로고침↻
          </button>
        </div>
        {rooms.length === 0 ? (
          <p style={{ color: '#9e9e9e', fontSize: 14 }}>아직 열린 방이 없어요. 방을 만들어 보세요!</p>
        ) : (
          rooms.map((r) => (
            <button key={r.code} className="room-item" disabled={busy} onClick={() => go((d) => joinRoom(d, r.code))}>
              {r.title} · {r.count}/2 · {r.code}
            </button>
          ))
        )}
      </div>
      {err && <p className="quiz-feedback wrong">{err}</p>}
    </div>
  )
}

// ── 온라인 대전 진행 ────────────────────────────
function OnlineBattleGame({ config, onExit }) {
  const [session, setSession] = useState(null)
  const [room, setRoom] = useState(null)
  const [recorded, setRecorded] = useState(false)

  // 세션 준비 + 구독
  useEffect(() => {
    let sess
    prepare().then((deps) => {
      sess = OnlineSession(deps, config.code)
      sess.onChange(() => setRoom({ ...sess.getRoom() }))
      setSession(sess)
      setRoom(sess.getRoom())
    })
    return () => sess && sess.leave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.code])

  // 게임 끝나면 내 랭크 1회 기록
  useEffect(() => {
    if (session && room && room.status === 'ended' && !recorded) {
      setRecorded(true)
      session.recordRank()
    }
  }, [session, room, recorded])

  if (!session || !room) {
    return (
      <div className="panel" style={{ maxWidth: 520, margin: '0 auto' }}>
        <h2>🌐 방 연결 중…</h2>
      </div>
    )
  }

  const seat = session.mySeat()
  const battle = room.battle

  // 대기실
  if (room.status === 'waiting') {
    const isHost = seat === 0
    const foe = room.seats[1]
    return (
      <div className="panel" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <button className="btn btn-gray back-btn" onClick={onExit} style={{ float: 'left' }}>
          ← 나가기
        </button>
        <h2>🌐 대기실</h2>
        <div className="room-code">방 번호 <b>{room.code}</b></div>
        <p>친구에게 이 번호를 알려주고 "입장"하라고 하세요!</p>
        <div className="seat-row">
          <div className="seat">🧑‍🌾 {room.seats[0].name}</div>
          <div className="seat">{foe ? `🧑‍🍳 ${foe.name}` : '⌛ 기다리는 중…'}</div>
        </div>
        {isHost ? (
          <button className="btn btn-primary" disabled={!foe} onClick={() => session.start()}>
            {foe ? '⚔️ 대전 시작!' : '상대를 기다려요…'}
          </button>
        ) : (
          <p style={{ color: '#616161' }}>방장이 시작하기를 기다리는 중…</p>
        )}
      </div>
    )
  }

  // 진행/종료
  const isMyTurn = battle && battle.current === seat && battle.phase !== 'ended'
  const oactions = {
    roll: () => session.act({ type: 'ROLL', dice: rollDice() }),
    move: (steps) => session.act({ type: 'MOVE', plan: planBattleMove(battle, steps) }),
    buy: (id) => session.act({ type: 'BUY', productId: id }),
    sell: (i) => session.act({ type: 'SELL', index: i }),
    sellAll: () => session.act({ type: 'SELL_ALL' }),
    answerQuiz: (c) => session.act({ type: 'ANSWER_QUIZ', choice: c }),
    endTurn: () => session.act({ type: 'END_TURN' }),
    skipTurn: () => session.act({ type: 'SKIP_TURN' }),
  }

  return (
    <div>
      <div className="battle-topbar">
        <button className="btn btn-gray back-btn" onClick={onExit}>
          ← 나가기
        </button>
        <div className="battle-players">
          {battle.players.map((p, i) => (
            <div key={i} className={`battle-pcard${battle.current === i && battle.phase !== 'ended' ? ' active' : ''}`}>
              <div className="bp-name">
                {i === seat ? '⭐' : '🧑'} {p.name}
              </div>
              <div className="bp-cash">{p.cash.toLocaleString()}원</div>
              <div className="bp-cargo">🎒 {p.cargo.length}/{CONFIG.cargoLimit}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="map-layout" style={{ marginTop: 12 }}>
        <BattleBoard state={battle} />
        <div>
          {battle.phase !== 'ended' &&
            (isMyTurn ? (
              <BattleActionPanel state={battle} actions={oactions} />
            ) : (
              <div className="panel">
                <h2>⏳ 상대 차례</h2>
                <p style={{ color: '#616161' }}>{battle.players[battle.current].name}이(가) 두는 중…</p>
              </div>
            ))}
          <div className="panel">
            <h2>활동 기록</h2>
            <ul className="log-list">
              {(battle.log || []).map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {battle.phase === 'ended' && (
        <BattleResult
          state={battle}
          config={{ mode: 'online' }}
          seat={seat}
          onRestart={onExit}
          onExit={onExit}
        />
      )}
    </div>
  )
}

// ── 대전 진행 ──────────────────────────────────
function BattleGame({ config, onExit }) {
  const [state, dispatch] = useReducer(battleReducer, undefined, () =>
    createBattleState(config.names, config.mode),
  )

  const isBotTurn = config.mode === 'bot' && state.current === 1

  // 봇 자동 진행 (한 동작씩, 볼 수 있게 약간의 딜레이)
  useEffect(() => {
    if (!isBotTurn || state.phase === 'ended') return
    const t = setTimeout(() => {
      if (state.phase === 'ready') {
        dispatch(state.players[1].skipNext ? { type: 'SKIP_TURN' } : { type: 'ROLL', dice: rollDice() })
      } else if (state.phase === 'choose') {
        dispatch({ type: 'MOVE', plan: planBattleMove(state, botChooseSteps(state)) })
      } else if (state.phase === 'action') {
        dispatch({ type: 'BOT_ACTION' })
      }
    }, 850)
    return () => clearTimeout(t)
  }, [state, isBotTurn])

  const actions = {
    roll: () => dispatch({ type: 'ROLL', dice: rollDice() }),
    move: (steps) => dispatch({ type: 'MOVE', plan: planBattleMove(state, steps) }),
    buy: (id) => dispatch({ type: 'BUY', productId: id }),
    sell: (i) => dispatch({ type: 'SELL', index: i }),
    sellAll: () => dispatch({ type: 'SELL_ALL' }),
    answerQuiz: (c) => dispatch({ type: 'ANSWER_QUIZ', choice: c }),
    endTurn: () => dispatch({ type: 'END_TURN' }),
    skipTurn: () => dispatch({ type: 'SKIP_TURN' }),
  }

  return (
    <div>
      <div className="battle-topbar">
        <button className="btn btn-gray back-btn" onClick={onExit}>
          ← 나가기
        </button>
        <div className="battle-players">
          {state.players.map((p, i) => (
            <div key={i} className={`battle-pcard${state.current === i && state.phase !== 'ended' ? ' active' : ''}`}>
              <div className="bp-name">
                {i === 0 ? '🧑‍🌾' : config.mode === 'bot' ? '🤖' : '🧑‍🍳'} {p.name}
              </div>
              <div className="bp-cash">{p.cash.toLocaleString()}원</div>
              <div className="bp-cargo">🎒 {p.cargo.length}/{CONFIG.cargoLimit}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="map-layout" style={{ marginTop: 12 }}>
        <BattleBoard state={state} />

        <div>
          {isBotTurn && state.phase !== 'ended' ? (
            <div className="panel">
              <h2>🤖 {state.players[1].name} 차례</h2>
              <p style={{ color: '#616161' }}>봇이 두는 중이에요…</p>
            </div>
          ) : state.phase !== 'ended' ? (
            <BattleActionPanel state={state} actions={actions} />
          ) : null}

          <div className="panel">
            <h2>활동 기록</h2>
            {state.log.length === 0 ? (
              <p style={{ color: '#9e9e9e', margin: 0 }}>아직 기록이 없어요.</p>
            ) : (
              <ul className="log-list">
                {state.log.map((e, i) => (
                  <li key={i}>{e.message}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {state.phase === 'ended' && (
        <BattleResult state={state} config={config} onRestart={() => dispatch({ type: 'RESTART' })} onExit={onExit} />
      )}
    </div>
  )
}

function BattleResult({ state, config, onRestart, onExit, seat = 0 }) {
  const draw = state.winner === 'draw'
  const winnerName = draw ? null : state.players[state.winner].name
  // 나(온라인=내 좌석, 봇/연습=플레이어0) 기준 승패 랭크 점수
  const iWon = state.winner === seat
  const rankPts = draw ? Math.round((RANK_WIN + RANK_LOSE) / 2) : iWon ? RANK_WIN : RANK_LOSE

  return (
    <div className="result-overlay">
      <div className="result-card">
        <div className="grade">{draw ? '🤝' : '🏆'}</div>
        <h2>{draw ? '무승부!' : `${winnerName} 승리!`}</h2>
        <div className="result-cash">
          {state.players[0].name} {state.players[0].cash.toLocaleString()}원 · {state.players[1].name}{' '}
          {state.players[1].cash.toLocaleString()}원
        </div>
        <p style={{ fontSize: 18 }}>
          {config.mode === 'bot' ? '내 랭크 점수' : `${state.players[0].name} 랭크 점수`}: <b>+{rankPts}</b>
          <br />
          <span style={{ fontSize: 14, color: '#8d6e63' }}>(온라인 대전에서는 랭킹에 누적돼요)</span>
        </p>
        <button className="btn btn-primary" onClick={onRestart} style={{ marginBottom: 8 }}>
          🔄 다시 대전
        </button>
        <button className="btn btn-gray" onClick={onExit}>
          나가기
        </button>
      </div>
    </div>
  )
}
