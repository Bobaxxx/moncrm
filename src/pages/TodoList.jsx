import { useState, useEffect, useCallback } from 'react';
import { 
  Check, 
  Trash2, 
  Plus, 
  ListTodo, 
  Calendar,
  CheckCircle2,
  Circle,
  Loader2
} from 'lucide-react';
import { getPlanningTasks, createPlanningTask, updatePlanningTask, deletePlanningTask } from '../services/api';

const JOURS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function TodoList() {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const today = new Date();
  const dateStr = formatDate(today);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPlanningTasks({ date: dateStr });
      // Filtrer uniquement les tâches de type 'todo'
      const todos = res.data.filter(t => t.type === 'todo');
      setTasks(todos);
    } catch (err) {
      console.error('Error loading todos:', err);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setSubmitting(true);
      const newTask = {
        titre: newTitle.trim(),
        description: '',
        type: 'todo',
        date: dateStr,
        heure_debut: null,
        heure_fin: null,
        couleur: '#10b981', // Emerald default for todos
        completed: false
      };
      
      const res = await createPlanningTask(newTask);
      setTasks(prev => [res.data, ...prev]);
      setNewTitle('');
    } catch (err) {
      console.error('Error adding todo:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
      
      await updatePlanningTask(task.id, { completed: !task.completed });
    } catch (err) {
      console.error('Error toggling todo:', err);
      // Revert on error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: task.completed } : t));
    }
  };

  const handleDeleteTodo = async (task) => {
    if (!confirm(`Supprimer "${task.titre}" ?`)) return;
    
    try {
      // Optimistic update
      setTasks(prev => prev.filter(t => t.id !== task.id));
      await deletePlanningTask(task.id);
    } catch (err) {
      console.error('Error deleting todo:', err);
      // Reload on error to sync with DB
      loadTasks();
    }
  };

  // Group and sort: active tasks first, completed tasks last, ordered by ID desc within groups
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed === b.completed) {
      return Number(b.id) - Number(a.id); // newer first
    }
    return a.completed ? 1 : -1;
  });

  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = totalCount - completedCount;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ListTodo className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-surface-50">Tâches du jour</h1>
          </div>
          <p className="text-surface-500 mt-2 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-500" />
            {JOURS_FULL[today.getDay()]} {today.getDate()} {MOIS[today.getMonth()]} {today.getFullYear()}
          </p>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Total Tâches</p>
            <p className="text-3xl font-bold mt-1 text-surface-100">{totalCount}</p>
          </div>
          <ListTodo className="w-10 h-10 text-surface-700/50" />
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">En cours</p>
            <p className="text-3xl font-bold mt-1 text-amber-500">{pendingCount}</p>
          </div>
          <Circle className="w-10 h-10 text-amber-500/30" />
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Complétées</p>
            <p className="text-3xl font-bold mt-1 text-emerald-500">{completedCount}</p>
          </div>
          <CheckCircle2 className="w-10 h-10 text-emerald-500/30" />
        </div>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="glass-card p-5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-surface-400">Progression</span>
            <span className="font-bold text-emerald-400">{percentComplete}%</span>
          </div>
          <div className="w-full bg-surface-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {/* Add Todo input */}
      <form onSubmit={handleAddTodo} className="flex gap-3">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Ajouter une tâche à faire aujourd'hui..."
          disabled={submitting}
          className="input-field flex-1 text-sm py-3 px-4"
          id="new-todo-input"
        />
        <button
          type="submit"
          disabled={submitting || !newTitle.trim()}
          className="btn-primary py-3 px-6 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>Ajouter</span>
        </button>
      </form>

      {/* Tasks List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="glass-card p-10 text-center space-y-3">
          <ListTodo className="w-12 h-12 text-surface-600 mx-auto opacity-40 animate-pulse-soft" />
          <h3 className="text-lg font-bold text-surface-300">Aucune tâche pour aujourd'hui</h3>
          <p className="text-sm text-surface-500 max-w-md mx-auto">
            Ajoutez votre première tâche ci-dessus pour planifier votre journée de prospection.
          </p>
        </div>
      ) : (
        <div className="glass-card divide-y divide-surface-800/40 overflow-hidden">
          {sortedTasks.map(task => (
            <div 
              key={task.id}
              className={`flex items-center justify-between p-4 group transition-colors hover:bg-surface-800/10
                ${task.completed ? 'bg-surface-900/10' : ''}`}
            >
              <div 
                className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                onClick={() => handleToggleComplete(task)}
              >
                <button
                  type="button"
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all flex-shrink-0
                    ${task.completed 
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                      : 'border-surface-600 group-hover:border-emerald-500/50 text-transparent'}`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <span className={`text-sm font-semibold truncate transition-all duration-300
                  ${task.completed ? 'line-through text-surface-500' : 'text-surface-200'}`}>
                  {task.titre}
                </span>
              </div>

              <button
                onClick={() => handleDeleteTodo(task)}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-9 h-9 rounded-lg flex items-center justify-center text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-all ml-4 flex-shrink-0"
                title="Supprimer la tâche"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
