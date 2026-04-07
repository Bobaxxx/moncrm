import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Clock,
  MessageSquare,
  Phone,
  Palette,
  FileText,
  RotateCcw,
  Calendar,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { getPlanningTasks, createPlanningTask, updatePlanningTask, deletePlanningTask } from '../services/api';

const TASK_TYPES = [
  { value: 'sms_session', label: 'Session SMS', icon: MessageSquare, color: '#6366f1' },
  { value: 'appel', label: 'Appel', icon: Phone, color: '#10b981' },
  { value: 'maquette', label: 'Maquette', icon: Palette, color: '#f59e0b' },
  { value: 'relance', label: 'Relance', icon: RotateCcw, color: '#ef4444' },
  { value: 'rdv', label: 'Rendez-vous', icon: Calendar, color: '#8b5cf6' },
  { value: 'autre', label: 'Autre', icon: FileText, color: '#64748b' },
];

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const JOURS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekDays(date) {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isToday(date) {
  const t = new Date();
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
}

export default function Planning() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [view, setView] = useState('week'); // week or day

  const weekDays = getWeekDays(currentDate);
  const weekStart = formatDate(weekDays[0]);
  const weekEnd = formatDate(weekDays[6]);

  const loadTasks = useCallback(async () => {
    try {
      const params = view === 'week'
        ? { from: weekStart, to: weekEnd }
        : { date: formatDate(currentDate) };
      const res = await getPlanningTasks(params);
      setTasks(res.data);
    } catch (err) {
      console.error('Planning error:', err);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, currentDate, view]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const navigate = (direction) => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (view === 'week') next.setDate(next.getDate() + direction * 7);
      else next.setDate(next.getDate() + direction);
      return next;
    });
  };

  const goToday = () => setCurrentDate(new Date());

  const handleToggleComplete = async (task) => {
    const updated = await updatePlanningTask(task.id, { completed: !task.completed });
    setTasks(prev => prev.map(t => t.id === task.id ? updated.data : t));
  };

  const handleDelete = async (task) => {
    if (!confirm(`Supprimer "${task.titre}" ?`)) return;
    await deletePlanningTask(task.id);
    setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  const openNewTask = (date) => {
    setEditingTask({
      titre: '',
      description: '',
      type: 'sms_session',
      date: date || formatDate(currentDate),
      heure_debut: '09:00',
      heure_fin: '10:00',
      couleur: '#6366f1'
    });
    setShowModal(true);
  };

  const openEditTask = (task) => {
    setEditingTask({ ...task });
    setShowModal(true);
  };

  const tasksForDate = (dateStr) => tasks.filter(t => t.date === dateStr);

  // Time slots for day view
  const timeSlots = Array.from({ length: 14 }, (_, i) => {
    const h = i + 7;
    return `${String(h).padStart(2, '0')}:00`;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-50">Planning</h1>
          <p className="text-surface-500 mt-2">Organisez vos journées de prospection</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-surface-800/50 rounded-xl border border-surface-700/40 p-1">
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${view === 'week' ? 'bg-primary-600/20 text-primary-400' : 'text-surface-500 hover:text-surface-300'}`}
            >
              Semaine
            </button>
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${view === 'day' ? 'bg-primary-600/20 text-primary-400' : 'text-surface-500 hover:text-surface-300'}`}
            >
              Jour
            </button>
          </div>
          <button onClick={goToday} className="btn-ghost flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4" />
            Aujourd'hui
          </button>
          <button onClick={() => openNewTask()} className="btn-primary flex items-center gap-2 text-sm" id="add-task-btn">
            <Plus className="w-4 h-4" />
            Nouvelle tâche
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between glass-card px-5 py-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg hover:bg-surface-800/60 flex items-center justify-center text-surface-400 hover:text-surface-200 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-surface-200">
          {view === 'week'
            ? `${weekDays[0].getDate()} - ${weekDays[6].getDate()} ${MOIS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
            : `${JOURS_FULL[(currentDate.getDay() + 6) % 7]} ${currentDate.getDate()} ${MOIS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
          }
        </h2>
        <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg hover:bg-surface-800/60 flex items-center justify-center text-surface-400 hover:text-surface-200 transition-all">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'week' ? (
        /* ===== WEEK VIEW ===== */
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, i) => {
            const dateStr = formatDate(day);
            const dayTasks = tasksForDate(dateStr);
            const today = isToday(day);

            return (
              <div
                key={dateStr}
                className={`rounded-2xl border p-3 min-h-[280px] flex flex-col transition-all
                  ${today
                    ? 'border-primary-500/30 bg-primary-500/5'
                    : 'border-surface-800/50 bg-surface-900/30'
                  }`}
              >
                {/* Day header */}
                <div className="text-center mb-3 pb-2 border-b border-surface-800/40">
                  <p className={`text-xs font-medium ${today ? 'text-primary-400' : 'text-surface-500'}`}>
                    {JOURS[i]}
                  </p>
                  <p className={`text-lg font-bold mt-0.5 ${today ? 'text-primary-400' : 'text-surface-300'}`}>
                    {day.getDate()}
                  </p>
                </div>

                {/* Tasks */}
                <div className="flex-1 space-y-1.5 overflow-y-auto">
                  {dayTasks.map(task => (
                    <TaskPill
                      key={task.id}
                      task={task}
                      onToggle={() => handleToggleComplete(task)}
                      onClick={() => openEditTask(task)}
                      compact
                    />
                  ))}
                </div>

                {/* Add button */}
                <button
                  onClick={() => openNewTask(dateStr)}
                  className="mt-2 w-full py-1.5 rounded-lg border border-dashed border-surface-700/40 text-surface-600 hover:text-primary-400 hover:border-primary-500/30 transition-all text-xs flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* ===== DAY VIEW ===== */
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-surface-800/30">
            {timeSlots.map(slot => {
              const slotTasks = tasks.filter(t => t.heure_debut && t.heure_debut.startsWith(slot.slice(0, 2)));
              const currentHour = new Date().getHours();
              const slotHour = parseInt(slot.slice(0, 2));
              const isCurrentHour = isToday(currentDate) && currentHour === slotHour;

              return (
                <div
                  key={slot}
                  className={`flex gap-4 px-5 py-3 min-h-[64px] transition-colors
                    ${isCurrentHour ? 'bg-primary-500/5 border-l-2 border-l-primary-500' : 'hover:bg-surface-800/20'}`}
                >
                  <div className={`w-14 text-sm font-medium pt-0.5 flex-shrink-0 ${isCurrentHour ? 'text-primary-400' : 'text-surface-600'}`}>
                    {slot}
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    {slotTasks.map(task => (
                      <TaskPill
                        key={task.id}
                        task={task}
                        onToggle={() => handleToggleComplete(task)}
                        onClick={() => openEditTask(task)}
                      />
                    ))}
                    {slotTasks.length === 0 && (
                      <button
                        onClick={() => {
                          setEditingTask({
                            titre: '',
                            description: '',
                            type: 'sms_session',
                            date: formatDate(currentDate),
                            heure_debut: slot,
                            heure_fin: `${String(slotHour + 1).padStart(2, '0')}:00`,
                            couleur: '#6366f1'
                          });
                          setShowModal(true);
                        }}
                        className="opacity-0 hover:opacity-100 transition-opacity text-xs text-surface-600 hover:text-primary-400 py-1"
                      >
                        + Ajouter une tâche
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unscheduled tasks (no time) */}
          {tasks.filter(t => !t.heure_debut).length > 0 && (
            <div className="border-t border-surface-700/50 px-5 py-4">
              <p className="text-xs font-semibold text-surface-500 mb-2">Sans horaire</p>
              <div className="space-y-1.5">
                {tasks.filter(t => !t.heure_debut).map(task => (
                  <TaskPill
                    key={task.id}
                    task={task}
                    onToggle={() => handleToggleComplete(task)}
                    onClick={() => openEditTask(task)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={() => { setShowModal(false); setEditingTask(null); }}
          onSave={async (data) => {
            if (data.id) {
              const res = await updatePlanningTask(data.id, data);
              setTasks(prev => prev.map(t => t.id === data.id ? res.data : t));
            } else {
              const res = await createPlanningTask(data);
              setTasks(prev => [...prev, res.data]);
            }
            setShowModal(false);
            setEditingTask(null);
          }}
          onDelete={async (id) => {
            await deletePlanningTask(id);
            setTasks(prev => prev.filter(t => t.id !== id));
            setShowModal(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

/* ===== Task pill component ===== */
function TaskPill({ task, onToggle, onClick, compact }) {
  const typeInfo = TASK_TYPES.find(t => t.value === task.type) || TASK_TYPES[5];
  const Icon = typeInfo.icon;

  return (
    <div
      className={`group flex items-start gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer transition-all border
        ${task.completed
          ? 'opacity-50 border-surface-800/30 bg-surface-800/20'
          : 'border-surface-700/30 hover:border-surface-600/50 bg-surface-800/40'
        }`}
      style={{ borderLeftColor: task.couleur || typeInfo.color, borderLeftWidth: '3px' }}
      onClick={onClick}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`w-4 h-4 rounded-md border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
          ${task.completed
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
            : 'border-surface-600 hover:border-primary-500'
          }`}
      >
        {task.completed && <Check className="w-3 h-3" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 flex-shrink-0" style={{ color: task.couleur || typeInfo.color }} />
          <span className={`text-xs font-semibold truncate ${task.completed ? 'line-through text-surface-600' : 'text-surface-200'}`}>
            {task.titre}
          </span>
        </div>
        {!compact && task.heure_debut && (
          <span className="text-[10px] text-surface-500 flex items-center gap-1 mt-0.5">
            <Clock className="w-2.5 h-2.5" />
            {task.heure_debut}{task.heure_fin ? ` - ${task.heure_fin}` : ''}
          </span>
        )}
        {!compact && task.prospect_nom && (
          <span className="text-[10px] text-primary-400/70 mt-0.5 truncate block">{task.prospect_nom}</span>
        )}
      </div>
    </div>
  );
}

/* ===== Task modal ===== */
function TaskModal({ task, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(task);
  const isEdit = !!task.id;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'type') {
      const t = TASK_TYPES.find(tt => tt.value === value);
      if (t) setForm(prev => ({ ...prev, couleur: t.color }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-lg p-6 animate-slide-up" style={{ borderTop: `3px solid ${form.couleur}` }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-surface-100">
            {isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-800/60 flex items-center justify-center text-surface-500 hover:text-surface-300 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <input
            type="text"
            placeholder="Titre de la tâche..."
            value={form.titre}
            onChange={e => handleChange('titre', e.target.value)}
            className="input-field w-full text-lg font-semibold"
            autoFocus
            id="task-title-input"
          />

          {/* Type selector */}
          <div>
            <label className="text-xs font-medium text-surface-500 mb-2 block">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {TASK_TYPES.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChange('type', value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border
                    ${form.type === value
                      ? 'border-primary-500/40 bg-primary-500/10 text-primary-400'
                      : 'border-surface-700/40 text-surface-400 hover:border-surface-600/60'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => handleChange('date', e.target.value)}
                className="input-field w-full text-sm"
                id="task-date-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Début</label>
              <input
                type="time"
                value={form.heure_debut || ''}
                onChange={e => handleChange('heure_debut', e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Fin</label>
              <input
                type="time"
                value={form.heure_fin || ''}
                onChange={e => handleChange('heure_fin', e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-surface-500 mb-1.5 block">Notes</label>
            <textarea
              placeholder="Détails, objectif du jour..."
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              className="input-field w-full text-sm resize-none h-20"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="btn-primary flex items-center gap-2 flex-1 justify-center" id="task-save-btn">
              <CheckCircle2 className="w-4 h-4" />
              {isEdit ? 'Enregistrer' : 'Créer la tâche'}
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-surface-500 hover:text-red-400 hover:bg-red-500/10 border border-surface-700/40 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
