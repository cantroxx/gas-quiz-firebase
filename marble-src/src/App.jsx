// App.jsx — 전체를 하나로 묶는 최상위 컴포넌트
//  - useReducer 로 게임 상태를 관리
//  - 랜덤(주사위/시장배수/이벤트)은 여기 핸들러에서 뽑아 리듀서에 전달
//  - 상태가 바뀔 때마다 localStorage 에 자동 저장
import { useReducer, useEffect, useState } from 'react'
import {
  reducer,
  createInitialState,
  rollDice,
  planMove,
  saveState,
  loadState,
  clearSave,
} from './gameLogic.js'
import Board from './components/Board.jsx'
import PlayerInfo from './components/PlayerInfo.jsx'
import ActionPanel from './components/ActionPanel.jsx'
import ResultScreen from './components/ResultScreen.jsx'
import MapLearn from './components/MapLearn.jsx'
import Battle from './components/Battle.jsx'

export default function App() {
  // 화면 탭: 'game'(무역 게임) | 'map'(지도로 배우기)
  const [tab, setTab] = useState('game')

  // 저장된 게임이 있으면 이어서, 없으면 새 게임으로 시작
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState() || createInitialState())

  // 상태가 바뀔 때마다 자동 저장
  useEffect(() => {
    saveState(state)
  }, [state])

  // 화면에서 호출할 행동들 (랜덤은 여기서 만들어 넘김)
  const actions = {
    roll: () => dispatch({ type: 'ROLL', dice: rollDice() }),
    move: (steps) => dispatch({ type: 'MOVE', plan: planMove(state, steps) }),
    buy: (productId) => dispatch({ type: 'BUY', productId }),
    sell: (index) => dispatch({ type: 'SELL', index }),
    sellAll: () => dispatch({ type: 'SELL_ALL' }),
    answerQuiz: (choice) => dispatch({ type: 'ANSWER_QUIZ', choice }),
    endTurn: () => dispatch({ type: 'END_TURN' }),
    skipTurn: () => dispatch({ type: 'SKIP_TURN' }),
    restart: () => {
      clearSave()
      dispatch({ type: 'RESTART' })
    },
  }

  return (
    <div className="app">
      <h1 className="app-title">🧑‍🌾 특산물 부루마블 무역 게임 🚢</h1>

      {/* 상단 탭: 무역 게임 / 지도로 배우기 */}
      <div className="main-tabs">
        <button
          className={`main-tab ${tab === 'game' ? 'active' : ''}`}
          onClick={() => setTab('game')}
        >
          🎲 무역 게임
        </button>
        <button
          className={`main-tab ${tab === 'map' ? 'active' : ''}`}
          onClick={() => setTab('map')}
        >
          🗺️ 지도로 배우기
        </button>
        <button
          className={`main-tab ${tab === 'battle' ? 'active' : ''}`}
          onClick={() => setTab('battle')}
        >
          ⚔️ 대전
        </button>
      </div>

      {tab === 'map' && <MapLearn />}
      {tab === 'battle' && <Battle />}

      {tab === 'game' && (
      <div className="layout">
        <Board state={state} />

        <div>
          <PlayerInfo state={state} />
          <ActionPanel state={state} actions={actions} />

          {/* 활동 기록 */}
          <div className="panel">
            <h2>활동 기록</h2>
            {state.log.length === 0 ? (
              <p style={{ color: '#9e9e9e', margin: 0 }}>아직 기록이 없어요.</p>
            ) : (
              <ul className="log-list">
                {state.log.map((entry, i) => (
                  <li key={i}>
                    <b>{entry.turn}턴</b> · {entry.message}
                  </li>
                ))}
              </ul>
            )}
            <button
              className="btn btn-red"
              onClick={actions.restart}
              style={{ marginTop: 12 }}
            >
              새 게임 시작
            </button>
          </div>
        </div>
      </div>
      )}

      {/* 게임 종료 시 결과 화면 (무역 게임 탭에서만) */}
      {tab === 'game' && state.phase === 'ended' && state.result && (
        <ResultScreen result={state.result} onRestart={actions.restart} />
      )}
    </div>
  )
}
