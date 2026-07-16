// ResultScreen.jsx — 게임 종료 시 결과·등급 화면
import { CONFIG } from '../data.js'

const GRADE_MESSAGE = {
  S: '엄청난 무역왕이에요! 👑',
  A: '훌륭한 상인이에요! 🎉',
  B: '목표 달성 성공! 잘했어요 👍',
  C: '조금만 더 하면 목표 달성! 💪',
  D: '다음엔 더 싸게 사고 비싸게 팔아봐요 🙂',
}

export default function ResultScreen({ result, onRestart }) {
  const { success, cash, grade, turnsUsed } = result
  return (
    <div className="result-overlay">
      <div className="result-card">
        <div className="grade">{grade}</div>
        <h2>{success ? '🎯 목표 달성!' : '⏰ 게임 종료'}</h2>
        <div className="result-cash">최종 자금 {cash.toLocaleString()}원</div>
        <p style={{ margin: '0 0 8px', color: '#616161' }}>
          {turnsUsed}턴 사용 · 목표 {CONFIG.goal.toLocaleString()}원
        </p>
        <p style={{ fontSize: 20, margin: '4px 0 20px' }}>{GRADE_MESSAGE[grade]}</p>
        <button className="btn btn-primary" onClick={onRestart}>
          🔄 다시 하기
        </button>
      </div>
    </div>
  )
}
