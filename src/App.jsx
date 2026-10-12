import { useState, useEffect } from 'react';
import './App.css';

const INITIAL_TASKS = [
  { id: 1, title: 'Susidėti kuprinę', target: 1 },
  { id: 2, title: 'Valytis dantis', target: 2 },
  { id: 3, title: 'Gerti vandenį', target: 5 },
];

const getLocalDateTimeString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

export default function App() {
  const [isTestMode, setIsTestMode] = useState(() => {
    const saved = localStorage.getItem('mano_rutina_test_mode_v4');
    return saved ? JSON.parse(saved) : false;
  });

  const [testDateTime, setTestDateTime] = useState(() => {
    const saved = localStorage.getItem('mano_rutina_test_datetime_v4');
    return saved || getLocalDateTimeString();
  });

  const [appliedDateTime, setAppliedDateTime] = useState(() => {
    const saved = localStorage.getItem('mano_rutina_applied_datetime_v4');
    return saved || getLocalDateTimeString();
  });

  const [selectedHistoryDate, setSelectedHistoryDate] = useState('');

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('mano_rutina_tasks_v4');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('mano_rutina_history_v4');
    if (saved) return JSON.parse(saved);

    const oldSaved = localStorage.getItem('mano_rutina_history_v3');
    if (!oldSaved) return {};

    try {
      const parsed = JSON.parse(oldSaved);
      const migrated = {};
      Object.keys(parsed).forEach((dateKey) => {
        migrated[dateKey] = {};
        Object.keys(parsed[dateKey]).forEach((taskId) => {
          const val = parsed[dateKey][taskId];
          migrated[dateKey][taskId] = {
            count: val?.count ?? 0,
            target: val?.target ?? 1,
            completions: val?.completions || [],
          };
        });
      });
      return migrated;
    } catch {
      return {};
    }
  });

  // Tiesioginė paskutinių paspaudimų laiko žyma kiekvienai užduočiai (užtikrina momentinį 30 min. blokuvimą)
  const [lastClickTimes, setLastClickTimes] = useState(() => {
    const saved = localStorage.getItem('mano_rutina_last_clicks_v4');
    if (saved) return JSON.parse(saved);

    // Bandome išsitraukti vėliausią timestamp iš istorijos
    const initialClicks = {};
    // ...bus užpildyta automatiškai arba išsaugojo
    return initialClicks;
  });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTarget, setNewTaskTarget] = useState(1);

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTarget, setEditingTarget] = useState(1);

  const [cooldownMessages, setCooldownMessages] = useState({});

  const currentActiveDateObj = isTestMode ? new Date(appliedDateTime) : new Date();
  const currentDateKey = `${currentActiveDateObj.getFullYear()}-${String(currentActiveDateObj.getMonth() + 1).padStart(2, '0')}-${String(currentActiveDateObj.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    localStorage.setItem('mano_rutina_test_mode_v4', JSON.stringify(isTestMode));
    localStorage.setItem('mano_rutina_test_datetime_v4', testDateTime);
    localStorage.setItem('mano_rutina_applied_datetime_v4', appliedDateTime);
  }, [isTestMode, testDateTime, appliedDateTime]);

  useEffect(() => {
    localStorage.setItem('mano_rutina_tasks_v4', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('mano_rutina_history_v4', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('mano_rutina_last_clicks_v4', JSON.stringify(lastClickTimes));
  }, [lastClickTimes]);

  const handleApplyTestTime = (e) => {
    e.preventDefault();
    setAppliedDateTime(testDateTime);
  };

  const isValidTarget = (val) => {
    const num = Number(val);
    return Number.isInteger(num) && num > 0;
  };

  const getTaskDataForDate = (taskId, dateKey) => {
    const task = tasks.find((t) => t.id === taskId);
    const dayRecord = history[dateKey]?.[taskId];
    const count = dayRecord?.count ?? 0;
    const target = dayRecord?.target ?? task?.target ?? 1;
    return { count, target };
  };

  const handleIncrement = (taskId) => {
    const currentTime = isTestMode ? new Date(appliedDateTime).getTime() : new Date().getTime();
    
    // Patikriname paskutinio paspaudimo laiką tiesiogiai iš lastClickTimes
    const lastTs = lastClickTimes[taskId];

    if (lastTs !== undefined && lastTs !== null) {
      const diffMs = currentTime - lastTs;
      const diffMins = diffMs / (1000 * 60);

      if (diffMins < 30) {
        const remainingMins = Math.ceil(30 - diffMins);
        setCooldownMessages((prev) => ({
          ...prev,
          [taskId]: `Per anksti! Liko laukti ${remainingMins} min.`,
        }));
        return;
      }
    }

    // Jei praėjo >= 30 min arba tai pirmas kartas
    setCooldownMessages((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      return copy;
    });

    // Atnaujiname paskutinio paspaudimo laiką
    setLastClickTimes((prev) => ({
      ...prev,
      [taskId]: currentTime,
    }));

    setHistory((prev) => {
      const currentDay = prev[currentDateKey] || {};
      const taskData = getTaskDataForDate(taskId, currentDateKey);
      const existingCompletions = currentDay[taskId]?.completions || [];

      return {
        ...prev,
        [currentDateKey]: {
          ...currentDay,
          [taskId]: {
            count: taskData.count + 1,
            target: taskData.target,
            completions: [...existingCompletions, currentTime],
          },
        },
      };
    });
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const targetNum = Number(newTaskTarget);
    if (!isValidTarget(targetNum)) {
      alert('Tikslas turi būti teigiamas sveikasis skaičius!');
      return;
    }

    const newTask = {
      id: Date.now(),
      title: newTaskTitle.trim(),
      target: targetNum,
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskTarget(1);
  };

  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    const { target } = getTaskDataForDate(task.id, currentDateKey);
    setEditingTarget(target);
  };

  const saveEditing = (taskId) => {
    if (!editingTitle.trim()) return;

    const targetNum = Number(editingTarget);
    if (!isValidTarget(targetNum)) {
      alert('Tikslas turi būti teigiamas sveikasis skaičius!');
      return;
    }

    setTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, title: editingTitle.trim(), target: targetNum } : t
      )
    );

    setHistory((prev) => {
      const currentDay = prev[currentDateKey] || {};
      const taskData = getTaskDataForDate(taskId, currentDateKey);
      return {
        ...prev,
        [currentDateKey]: {
          ...currentDay,
          [taskId]: {
            count: taskData.count,
            target: targetNum,
            completions: currentDay[taskId]?.completions || [],
          },
        },
      };
    });

    setEditingTaskId(null);
  };

  const deleteTask = (taskId) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Mano rutina</h1>

      <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', marginBottom: '15px', color: '#fff' }}>
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={isTestMode}
            onChange={(e) => setIsTestMode(e.target.checked)}
          />
          <strong>Testavimo režimas</strong>
        </label>

        {isTestMode && (
          <form onSubmit={handleApplyTestTime} style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="datetime-local"
              value={testDateTime}
              onChange={(e) => setTestDateTime(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px' }}
            />
            <button type="submit" style={{ padding: '6px 12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Taikyti
            </button>
          </form>
        )}
        <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>
          Dabartinė aktyvi diena ir laikas programėlėje: <strong>{isTestMode ? appliedDateTime.replace('T', ' ') : getLocalDateTimeString().replace('T', ' ')}</strong>
        </p>
      </div>

      <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', marginBottom: '15px', color: '#fff' }}>
        <h3 style={{ marginTop: 0 }}>Peržiūros data:</h3>
        <input
          type="date"
          value={selectedHistoryDate}
          onChange={(e) => setSelectedHistoryDate(e.target.value)}
          style={{ padding: '6px', borderRadius: '4px' }}
        />
        {selectedHistoryDate && (
          <div style={{ marginTop: '10px' }}>
            <h4>Rezultatai ({selectedHistoryDate}):</h4>
            <ul>
              {tasks.map((task) => {
                const { count, target } = getTaskDataForDate(task.id, selectedHistoryDate);
                const isReached = count >= target;
                return (
                  <li key={task.id}>
                    {task.title}: <strong>{count}/{target}</strong> {isReached ? '✅ Pasiektas' : '❌ Nepasiektas'}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Įrašyk užduotį..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          style={{ flex: 1, padding: '8px', borderRadius: '4px' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fff' }}>
          <label>Tikslas:</label>
          <input
            type="number"
            min="1"
            value={newTaskTarget}
            onChange={(e) => setNewTaskTarget(e.target.value)}
            style={{ width: '60px', padding: '8px', borderRadius: '4px' }}
          />
        </div>
        <button type="submit" style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Pridėti
        </button>
      </form>

      <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', color: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Šiandienos užduotys</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map((task) => {
            const { count, target } = getTaskDataForDate(task.id, currentDateKey);
            const isReached = count >= target;
            const isEditing = editingTaskId === task.id;
            const cooldownMsg = cooldownMessages[task.id];

            return (
              <li
                key={task.id}
                style={{
                  background: '#334155',
                  margin: '8px 0',
                  padding: '12px',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      style={{ flex: 1, padding: '4px' }}
                    />
                    <input
                      type="number"
                      min="1"
                      value={editingTarget}
                      onChange={(e) => setEditingTarget(e.target.value)}
                      style={{ width: '50px', padding: '4px' }}
                    />
                    <button onClick={() => saveEditing(task.id)}>OK</button>
                    <button onClick={() => setEditingTaskId(null)}>X</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{task.title}</div>
                        <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                          Pažanga: <strong>{count}/{target}</strong> {isReached && '✅ Pasiekta!'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleIncrement(task.id)}
                          style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          +1 Atlikta
                        </button>
                        <button onClick={() => startEditing(task)} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}>
                          Redaguoti
                        </button>
                        <button onClick={() => deleteTask(task.id)} style={{ background: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer' }}>
                          Ištrinti
                        </button>
                      </div>
                    </div>
                    {cooldownMsg && (
                      <div style={{ color: '#fca5a5', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        ⚠️ {cooldownMsg}
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}