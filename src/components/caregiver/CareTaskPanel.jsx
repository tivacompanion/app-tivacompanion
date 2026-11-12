import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckSquare, Plus, Loader2, Check, Circle, Clock, Trash2, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-mint-deep', dot: 'bg-mint-deep' },
  { value: 'medium', label: 'Medium', color: 'text-peach-deep', dot: 'bg-peach-deep' },
  { value: 'high', label: 'High', color: 'text-destructive', dot: 'bg-destructive' },
];

const STATUS_CONFIG = {
  pending: { icon: Circle, label: 'Pending', color: 'text-muted-foreground' },
  in_progress: { icon: Clock, label: 'In Progress', color: 'text-peach-deep' },
  completed: { icon: Check, label: 'Completed', color: 'text-mint-deep' },
};

export default function CareTaskPanel({ patientUserId, patientName, source }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const functionName = source === 'caregiver' ? 'caregiverPortal' : 'institutionPortal';

  const loadTasks = useCallback(async () => {
    try {
      const res = await base44.functions.invoke(functionName, {
        action: 'get_care_tasks',
        patient_user_id: patientUserId,
      });
      setTasks(res.data?.tasks || []);
    } catch {
      setTasks([]);
    }
    setLoading(false);
  }, [patientUserId, functionName]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await base44.functions.invoke(functionName, {
        action: 'add_care_task',
        patient_user_id: patientUserId,
        patient_name: patientName,
        title: title.trim(),
        description: description.trim(),
        priority,
        due_date: dueDate || undefined,
      });
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setShowForm(false);
      loadTasks();
    } catch {}
    setSubmitting(false);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    setUpdatingId(taskId);
    try {
      await base44.functions.invoke(functionName, {
        action: 'update_care_task_status',
        task_id: taskId,
        status: newStatus,
      });
      loadTasks();
    } catch {}
    setUpdatingId(null);
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    setUpdatingId(taskId);
    try {
      await base44.functions.invoke(functionName, {
        action: 'delete_care_task',
        task_id: taskId,
      });
      loadTasks();
    } catch {}
    setUpdatingId(null);
  };

  const sorted = [...tasks].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (b.status === 'completed' && a.status !== 'completed') return -1;
    const pOrder = { high: 0, medium: 1, low: 2 };
    return pOrder[a.priority] - pOrder[b.priority];
  });

  const pendingCount = tasks.filter(t => t.status !== 'completed').length;

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold text-navy flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-tiva-teal" /> Care Tasks
          {pendingCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-tiva-teal/15 text-tiva-teal text-xs font-semibold">
              {pendingCount} open
            </span>
          )}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="text-tiva-teal hover:text-navy"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Task
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title (e.g., Remind patient to pick up medication)"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details..."
            rows={2}
            className="resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border flex items-center gap-1 ${
                    priority === p.value
                      ? 'border-tiva-teal bg-tiva-teal/15 text-navy'
                      : 'border-white/10 text-muted-foreground hover:text-navy'
                  }`}
                >
                  <Flag className="w-3 h-3" /> {p.label}
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-navy"
            />
            <Button
              onClick={handleAdd}
              disabled={!title.trim() || submitting}
              size="sm"
              className="ml-auto bg-tiva-teal text-[#0A0F0D]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No care tasks yet. Add one to coordinate with the care team.</p>
      ) : (
        <div className="space-y-2 max-h-[350px] overflow-y-auto scrollbar-thin">
          {sorted.map(task => {
            const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            const priorityCfg = PRIORITIES.find(p => p.value === task.priority) || PRIORITIES[1];
            const isCompleted = task.status === 'completed';
            const isOverdue = task.due_date && !isCompleted && new Date(task.due_date) < new Date();

            return (
              <div
                key={task.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-white/[0.02] border-white/5 opacity-60'
                    : isOverdue
                      ? 'bg-destructive/5 border-destructive/15'
                      : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => handleStatusChange(task.id, isCompleted ? 'pending' : 'completed')}
                    disabled={updatingId === task.id}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-mint-deep border-mint-deep'
                        : 'border-white/20 hover:border-tiva-teal'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3 text-[#0A0F0D]" /> : null}
                    {updatingId === task.id && !isCompleted && <Loader2 className="w-3 h-3 animate-spin" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-navy'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                    )}
                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                      <span className={`text-[10px] font-medium flex items-center gap-1 ${priorityCfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} /> {priorityCfg.label}
                      </span>
                      {task.due_date && (
                        <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                          <Clock className="w-2.5 h-2.5" />
                          {isOverdue ? 'Overdue' : ''} {new Date(task.due_date).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        by {task.assigned_by_name || task.created_by_role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {!isCompleted && task.status !== 'in_progress' && (
                      <button
                        onClick={() => handleStatusChange(task.id, 'in_progress')}
                        disabled={updatingId === task.id}
                        className="p-1 rounded-lg text-muted-foreground hover:text-peach-deep transition-all"
                        title="Mark in progress"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(task.id)}
                      disabled={updatingId === task.id}
                      className="p-1 rounded-lg text-muted-foreground hover:text-destructive transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}