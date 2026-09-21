import { useState, useEffect } from 'react'
import './App.css'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function App() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('mano-rutina')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [text, setText] = useState('')
  const [time, setTime] = useState('')

  useEffect(() => {
    localStorage.setItem('mano-rutina', JSON.stringify(items))
  }, [items])

  function addItem(e) {
    e.preventDefault()
    if (!text.trim()) return
    setItems([
      ...items,
      { id: Date.now(), text: text.trim(), time, doneOn: [] },
    ])
    setText('')
    setTime('')
  }

  function toggle(id) {
    const today = todayKey()
    setItems(
      items.map((it) => {
        if (it.id !== id) return it
        const done = it.doneOn.includes(today)
        return {
          ...it,
          doneOn: done
            ? it.doneOn.filter((d) => d !== today)
            : [...it.doneOn, today],
        }
      })
    )
  }

  function remove(id) {
    setItems(items.filter((it) => it.id !== id))
  }

  function streak(it) {
    let count = 0
    const d = new Date()
    while (it.doneOn.includes(d.toISOString().slice(0, 10))) {
      count++
      d.setDate(d.getDate() - 1)
    }
    return count
  }

  const today = todayKey()
  const doneCount = items.filter((it) => it.doneOn.includes(today)).length
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0
  const sorted = [...items].sort((a, b) =>
    (a.time || '99:99').localeCompare(b.time || '99:99')
  )

  return (
    <div className="app">
      <h1>Mano rutina</h1>
      <p className="date">
        {new Date().toLocaleDateString('lt-LT', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      <div className="progress-box">
        <div className="progress-text">
          Šiandien atlikta: {doneCount} / {items.length} ({percent}%)
        </div>
        <div className="bar">
          <div className="bar-fill" style={{ width: percent + '%' }} />
        </div>
      </div>

      <form className="add-form" onSubmit={addItem}>
        <input
          type="text"
          placeholder="Nauja rutinos užduotis..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <button type="submit">Pridėti</button>
      </form>

      <ul className="list">
        {sorted.length === 0 && (
          <li className="empty">Kol kas nieko nėra. Pridėkite pirmą užduotį.</li>
        )}
        {sorted.map((it) => {
          const done = it.doneOn.includes(today)
          const s = streak(it)
          return (
            <li key={it.id} className={done ? 'item done' : 'item'}>
              <input type="checkbox" checked={done} onChange={() => toggle(it.id)} />
              <div className="item-text">
                <span className="title">{it.text}</span>
                {it.time && <span className="time">🕐 {it.time}</span>}
              </div>
              {s > 0 && <span className="streak">🔥 {s}</span>}
              <button className="del" onClick={() => remove(it.id)}>✕</button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default App