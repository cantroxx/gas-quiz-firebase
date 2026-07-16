import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// 참고: 게임 로직(useReducer)에서 랜덤을 다루므로,
// 개발 중 리듀서를 2번 호출하는 StrictMode는 일부러 사용하지 않았습니다.
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
