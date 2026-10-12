import { useState, useEffect } from 'react';
import './App.css';

const INITIAL_TASKS = [
  { id: 1, title: 'Susidėti kuprinę', target: 1 },
  { id: 2, title: 'Valytis dantis', target: 2 },
  { id: 3, title: 'Gerti vandenį', target: 5 },
];

export default function App() {
  const [isTestMode, setIsTestMode] = useState(() => {
    const saved = localStorage.getItem('mano_rutina_test_mode');
    return saved ? JSON.parse(saved) : false;
  });

  const [testDate, setTestDate] = useState(() => {
    const saved = localStorage.getItem('mano_rutina_test_date');
    return saved || new Date().toISOString().slice(0, 10);
  });

  const [selectedHistoryDate, setSelectedHistoryDate] = useState('');

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('mano_rutina_tasks_v3');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('mano_rutina_history_v3');
    if (saved) return JSON.parse(saved);
    const oldSaved = localStorage.getItem('mano_rutina_history');
    if (!oldSaved) return {};

    try {
      const parsed = JSON.parse(oldSaved);
      const migrated = {};
      Object.keys(parsed).forEach((dateKey) => {
        migrated[dateKey] = {};
        Object.keys(parsed[dateKey]).forEach((taskId) => {
          const val = parsed[dateKey][taskId];
          const isDone = typeof val === 'boolean' ? val : val?.completed;
          migrated[dateKey][taskId] = {
            count: isDone ? 1 : 0,
            target: 1,
          };
        });
      });
      return migrated;
    } catch {
      return {};
    }
  });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTarget, setNewTaskTarget] = useState(1);

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTarget, setEditingTarget] = useState(1);

  const currentDate = isTestMode
    ? testDate
    : new Date().toISOString().slice(0, 10);

  useEffect(() => {
    localStorage.setItem('mano_rutina_test_mode', JSON.stringify(isTestMode));
    localStorage.setItem('mano_rutina_test_date', testDate);
  }, [isTestMode, testDate]);

  useEffect(() => {
    localStorage.setItem('mano_rutina_tasks_v3', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('mano_rutina_history_v3', JSON.stringify(history));
  }, [history]);

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
    setHistory((prev) => {
      const currentDay = prev[currentDate] || {};
      const { count, target } = getTaskDataForDate(taskId, currentDate);
      return {
        ...prev,
        [currentDate]: {
          ...currentDay,
          [taskId]: { count: count + 1, target },
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
    const { target } = getTaskDataForDate(task.id, currentDate);
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
      const currentDay = prev[currentDate] || {};
      const { count } = getTaskDataForDate(taskId, currentDate);
      return {
        ...prev,
        [currentDate]: {
          ...currentDay,
          [taskId]: { count, target: targetNum },
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
          <div style={{ marginTop: '10px' }}>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px' }}
            />
          </div>
        )}
        <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>
          Dabartinė diena: <strong>{currentDate}</strong>
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
            const { count, target } = getTaskDataForDate(task.id, currentDate);
            const isReached = count >= target;
            const isEditing = editingTaskId === task.id;

            return (
              <li
                key={task.id}
                style={{
                  background: '#334155',
                  margin: '8px 0',
                  padding: '12px',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
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