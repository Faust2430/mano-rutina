import React, { useState, useEffect } from 'react';

function App() {
  // Pagalbinė funkcija datai gauti formato 'YYYY-MM-DD'
  const formatDateString = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
  };

  // State išsaugojimui / užkrovimui iš localStorage
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('routine_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [completions, setCompletions] = useState(() => {
    const saved = localStorage.getItem('routine_completions');
    return saved ? JSON.parse(saved) : {}; // { 'YYYY-MM-DD': { taskId: true/false } }
  });

  const [taskHistory, setTaskHistory] = useState(() => {
    const saved = localStorage.getItem('routine_task_history');
    return saved ? JSON.parse(saved) : {}; // { taskId: { createdAt: 'YYYY-MM-DD', nameHistory: [{date: 'YYYY-MM-DD', name: '...'}] } }
  });

  // Testavimo režimo būsena
  const [testModeEnabled, setTestModeEnabled] = useState(() => {
    return localStorage.getItem('routine_test_mode') === 'true';
  });
  const [testDateTime, setTestDateTime] = useState(() => {
    return localStorage.getItem('routine_test_datetime') || formatDateString(new Date()) + 'T10:00';
  });

  // Dabartinė žiūrima data istorijai (null reiškia šiandieną)
  const [viewedDate, setViewedDate] = useState(null);

  const [newTaskName, setNewTaskName] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskName, setEditingTaskName] = useState('');

  // -------------------------------------------------------------
  // Laiko nustatymo logika
  // -------------------------------------------------------------
  const getCurrentDateObj = () => {
    if (testModeEnabled && testDateTime) {
      return new Date(testDateTime);
    }
    return new Date();
  };

  const currentActiveDateStr = formatDateString(getCurrentDateObj());
  const effectiveDisplayDate = viewedDate || currentActiveDateStr;

  // Išsaugojimas į localStorage
  useEffect(() => {
    localStorage.setItem('routine_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('routine_completions', JSON.stringify(completions));
  }, [completions]);

  useEffect(() => {
    localStorage.setItem('routine_task_history', JSON.stringify(taskHistory));
  }, [taskHistory]);

  useEffect(() => {
    localStorage.setItem('routine_test_mode', testModeEnabled);
    localStorage.setItem('routine_test_datetime', testDateTime);
  }, [testModeEnabled, testDateTime]);

  // -------------------------------------------------------------
  // Veiksmų valdymas (Šiandienos rodinyje)
  // -------------------------------------------------------------
  const handleAddTask = (e) => {
    e.preventDefault();
    const trimmed = newTaskName.trim();
    if (!trimmed) return;

    const newId = Date.now().toString();
    const todayStr = currentActiveDateStr;

    setTasks([...tasks, { id: newId, name: trimmed, createdAt: todayStr, deletedAt: null }]);
    setTaskHistory({
      ...taskHistory,
      [newId]: {
        createdAt: todayStr,
        nameHistory: [{ date: todayStr, name: trimmed }]
      }
    });
    setNewTaskName('');
  };

  const handleDeleteTask = (id) => {
    const todayStr = currentActiveDateStr;
    setTasks(tasks.map(t => t.id === id ? { ...t, deletedAt: todayStr } : t));
  };

  const handleStartEdit = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskName(task.name);
  };

  const handleSaveEdit = (id) => {
    const trimmed = editingTaskName.trim();
    if (!trimmed) return;
    const todayStr = currentActiveDateStr;

    setTasks(tasks.map(t => t.id === id ? { ...t, name: trimmed } : t));

    const currentHistory = taskHistory[id] || { createdAt: todayStr, nameHistory: [] };
    const updatedNameHistory = [...currentHistory.nameHistory, { date: todayStr, name: trimmed }];

    setTaskHistory({
      ...taskHistory,
      [id]: { ...currentHistory, nameHistory: updatedNameHistory }
    });

    setEditingTaskId(null);
    setEditingTaskName('');
  };

  const handleToggleCompletion = (id) => {
    if (viewedDate) return; // Praeities rodinyje keisti negalima

    const dateStr = currentActiveDateStr;
    const dayCompletions = completions[dateStr] || {};
    const currentStatus = !!dayCompletions[id];

    setCompletions({
      ...completions,
      [dateStr]: {
        ...dayCompletions,
        [id]: !currentStatus
      }
    });
  };

  // Pagalbinė funkcija gauti veiksmo pavadinimą konkrečiai dienai
  const getTaskNameForDate = (task, dateStr) => {
    const hist = taskHistory[task.id];
    if (!hist || !hist.nameHistory || hist.nameHistory.length === 0) return task.name;

    // Rasti paskutinį pavadinimą iki nurodytos dienos arba tą dieną
    let validName = task.name;
    for (let entry of hist.nameHistory) {
      if (entry.date <= dateStr) {
        validName = entry.name;
      }
    }
    return validName;
  };

  // Patikrinti, ar veiksmas egzistavo pasirinktą dieną
  const isTaskActiveOnDate = (task, dateStr) => {
    const created = task.createdAt || (taskHistory[task.id] && taskHistory[task.id].createdAt);
    if (created && dateStr < created) return false;
    if (task.deletedAt && dateStr >= task.deletedAt) return false;
    return true;
  };

  // Filtruoti veiksmus rodomai dienai
  const tasksForDisplayDate = tasks.filter(task => isTaskActiveOnDate(task, effectiveDisplayDate));
  
  // Ar ši diena turi duomenų (sukurtų užduočių)
  const dayHasData = tasksForDisplayDate.length > 0;

  return (
    <div style={{ maxWidth: '600px', margin: '30px auto', fontFamily: 'sans-serif', padding: '20px', background: '#1e1e1e', color: '#fff', borderRadius: '8px' }}>
      <h1 style={{ textAlign: 'center' }}>Mano rutina</h1>

      {/* Testavimo režimo skiltis */}
      <div style={{ background: '#2d2d2d', padding: '15px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #444' }}>
        <h3>Testavimo režimas</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            <input 
              type="checkbox" 
              checked={testModeEnabled} 
              onChange={(e) => setTestModeEnabled(e.target.checked)} 
            /> Įjungti testavimo režimą
          </label>
          <input 
            type="datetime-local" 
            value={testDateTime} 
            onChange={(e) => setTestDateTime(e.target.value)}
            style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '5px' }}
          />
          <button 
            onClick={() => {}} 
            style={{ padding: '5px 10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Taikyti
          </button>
        </div>
        {testModeEnabled && (
          <p style={{ color: '#ffc107', marginTop: '8px', fontSize: '14px' }}>
            ⚠️ Testavimo režimas įjungtas. Bandomasis laikas: <strong>{testDateTime}</strong>
          </p>
        )}
      </div>

      {/* Istorijos / Datos pasirinkimo skiltis */}
      <div style={{ background: '#2d2d2d', padding: '15px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #444' }}>
        <h3>Laiko / Istorijos rodinys</h3>
        <p>Dabartinė programėlės diena (šiandiena): <strong>{currentActiveDateStr}</strong></p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>Pasirinkti datą (istorija): </label>
          <input 
            type="date" 
            value={effectiveDisplayDate} 
            onChange={(e) => {
              const val = e.target.value;
              if (val === currentActiveDateStr) {
                setViewedDate(null);
              } else {
                setViewedDate(val);
              }
            }}
            style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '5px' }}
          />
          {viewedDate && (
            <button 
              onClick={() => setViewedDate(null)}
              style={{ padding: '5px 10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Grįžti į šiandieną
            </button>
          )}
        </div>
        <p style={{ marginTop: '8px', fontSize: '14px' }}>
          Rodoma data: <strong>{effectiveDisplayDate}</strong> {viewedDate ? '(Praeities rodinys – tik skaitymui)' : '(Šiandiena)'}
        </p>
      </div>

      {/* Naujo veiksmo pridėjimas (galimas tik šiandienos rodinyje) */}
      {!viewedDate ? (
        <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Įrašyk užduotį..." 
            value={newTaskName} 
            onChange={(e) => setNewTaskName(e.target.value)}
            style={{ flex: 1, padding: '10px', background: '#2a2a2a', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
          />
          <button type="submit" style={{ padding: '10px 20px', background: '#4c6ef5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Pridėti
          </button>
        </form>
      ) : (
        <div style={{ padding: '10px', background: '#332200', border: '1px solid #664400', borderRadius: '4px', marginBottom: '20px', textAlign: 'center' }}>
          Praeities rodinyje naujų veiksmų pridėti negalima.
        </div>
      )}

      <h2>Mano užduotys</h2>
      
      {!dayHasData ? (
        <div style={{ padding: '15px', background: '#252525', borderRadius: '4px', textAlign: 'center', color: '#aaa' }}>
          Data be veiksmų (neturi duomenų).
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasksForDisplayDate.map(task => {
            const dayCompletions = completions[effectiveDisplayDate] || {};
            const isCompleted = !!dayCompletions[task.id];
            const displayName = getTaskNameForDate(task, effectiveDisplayDate);

            return (
              <li key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#2a2a2a', padding: '10px 15px', marginBottom: '8px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <input 
                    type="checkbox" 
                    checked={isCompleted} 
                    disabled={viewedDate !== null} 
                    onChange={() => handleToggleCompletion(task.id)}
                    style={{ width: '18px', height: '18px', cursor: viewedDate ? 'not-allowed' : 'pointer' }}
                  />
                  
                  {editingTaskId === task.id && !viewedDate ? (
                    <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                      <input 
                        type="text" 
                        value={editingTaskName} 
                        onChange={(e) => setEditingTaskName(e.target.value)}
                        style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '4px', flex: 1 }}
                      />
                      <button onClick={() => handleSaveEdit(task.id)} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer' }}>Išsaugoti</button>
                      <button onClick={() => setEditingTaskId(null)} style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer' }}>Atšaukti</button>
                    </div>
                  ) : (
                    <span style={{ textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? '#888' : '#fff' }}>
                      {displayName}
                    </span>
                  )}
                </div>

                {!viewedDate && editingTaskId !== task.id && (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => handleStartEdit(task)} style={{ background: '#ffc107', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer', color: '#000' }}>Pervadinti</button>
                    <button onClick={() => handleDeleteTask(task.id)} style={{ background: '#dc3545', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer', color: '#fff' }}>Ištrinti</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default App;