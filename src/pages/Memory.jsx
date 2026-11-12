import { useState, useEffect } from 'react';
import { Brain, Plus, Mic, CheckCircle2, Circle, Notebook, Lightbulb, ListTodo } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, EmptyState, LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const brainExercises = [
  { type: 'word_recall', label: 'Word Recall', description: 'Remember and recall a list of words', icon: Brain },
  { type: 'number_sequence', label: 'Number Sequence', description: 'Complete the number pattern', icon: Brain },
  { type: 'memory_match', label: 'Memory Match', description: 'Match pairs from memory', icon: Brain },
  { type: 'story_quiz', label: 'Story Quiz', description: 'Read a short story and answer questions', icon: Brain },
];

export default function Memory() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [noteType, setNoteType] = useState('text_note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [listening, setListening] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await base44.entities.MemoryNote.list('-created_date', 50).catch(() => []);
    setNotes(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!title && !content) return;
    const note = {
      note_type: noteType,
      title: title || (noteType === 'task' ? 'New Task' : 'New Note'),
      content,
      recorded_at: new Date().toISOString(),
    };
    if (noteType === 'task' && taskDue) {
      note.task_due_date = new Date(taskDue).toISOString();
    }
    await base44.entities.MemoryNote.create(note);
    resetForm();
    setShowAdd(false);
    loadData();
  };

  const resetForm = () => {
    setNoteType('text_note');
    setTitle('');
    setContent('');
    setTaskDue('');
  };

  const toggleTask = async (note) => {
    await base44.entities.MemoryNote.update(note.id, { task_completed: !note.task_completed });
    loadData();
  };

  const startVoiceNote = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
      setContent(transcript);
      if (event.results[0].isFinal) setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
    setNoteType('voice_note');
  };

  const startBrainExercise = async (exercise) => {
    try {
      const prompt = `Generate a short ${exercise.type} brain exercise for an elderly user. Keep it simple and encouraging. Provide the exercise question and the answer. Format as JSON with "question" and "answer" fields.`;
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
          },
        },
      });
      await base44.entities.MemoryNote.create({
        note_type: 'brain_exercise',
        title: exercise.label,
        content: response.question || 'Exercise generated',
        brain_exercise_type: exercise.type,
        exercise_score: 0,
        recorded_at: new Date().toISOString(),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <AppLayout><LoadingState label="Loading memory notes..." /></AppLayout>;

  const tasks = notes.filter(n => n.note_type === 'task');
  const voiceNotes = notes.filter(n => n.note_type === 'voice_note');
  const brainExercisesDone = notes.filter(n => n.note_type === 'brain_exercise');
  const journals = notes.filter(n => n.note_type === 'journal');

  return (
    <AppLayout>
      <SectionHeader
        title="Memory & Cognitive Support"
        subtitle="Voice notes, brain exercises, and task management"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={startVoiceNote} className="border-tiva-teal/40">
              <Mic className={`w-4 h-4 mr-1 ${listening ? 'animate-pulse-soft text-destructive' : ''}`} />
              {listening ? 'Listening...' : 'Voice Note'}
            </Button>
            <Button onClick={() => setShowAdd(true)} className="bg-tiva-teal text-[#0A0F0D]">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        }
      />

      {/* Brain Exercises */}
      <div className="mb-6">
        <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-peach-deep" /> Brain Exercises
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {brainExercises.map((ex) => {
            const Icon = ex.icon;
            return (
              <button
                key={ex.type}
                onClick={() => startBrainExercise(ex)}
                className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:-translate-y-0.5 hover:border-peach-deep/30 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-peach flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-peach-deep" />
                </div>
                <p className="font-heading font-semibold text-sm text-navy mb-1">{ex.label}</p>
                <p className="text-xs text-muted-foreground">{ex.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tasks */}
      {tasks.length > 0 && (
        <div className="mb-6">
          <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-mint-deep" /> Tasks
          </h3>
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="bg-card/50 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3">
                <button onClick={() => toggleTask(t)}>
                  {t.task_completed ? <CheckCircle2 className="w-5 h-5 text-mint-deep" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                </button>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${t.task_completed ? 'text-muted-foreground line-through' : 'text-navy'}`}>
                    {t.title}
                  </p>
                  {t.content && <p className="text-xs text-muted-foreground">{t.content}</p>}
                  {t.task_due_date && (
                    <p className="text-xs text-peach-deep mt-0.5">
                      Due: {new Date(t.task_due_date).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes & Journals */}
      {notes.length === 0 ? (
        <EmptyState
          icon={Notebook}
          title="No memory notes yet"
          description="Create voice notes, text notes, tasks, and brain exercises to support your memory and cognitive health."
          action={<Button onClick={() => setShowAdd(true)} className="bg-tiva-teal text-[#0A0F0D]"><Plus className="w-4 h-4 mr-1" /> Create your first note</Button>}
        />
      ) : (
        <div>
          <h3 className="font-heading font-semibold text-navy mb-3">All Notes & Memories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notes.map((n) => {
              const icons = { voice_note: Mic, text_note: Notebook, brain_exercise: Brain, task: ListTodo, journal: Notebook };
              const Icon = icons[n.note_type] || Notebook;
              const accents = {
                voice_note: 'bg-lavender text-lavender-deep',
                text_note: 'bg-mint text-mint-deep',
                brain_exercise: 'bg-peach text-peach-deep',
                task: 'bg-mint text-mint-deep',
                journal: 'bg-lavender text-lavender-deep',
              };
              return (
                <div key={n.id} className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${accents[n.note_type]} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy">{n.title}</p>
                      {n.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{n.content}</p>}
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {new Date(n.recorded_at).toLocaleString()} · {n.note_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Memory Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2 flex-wrap">
              {[
                { type: 'text_note', label: 'Note' },
                { type: 'task', label: 'Task' },
                { type: 'journal', label: 'Journal' },
                { type: 'voice_note', label: 'Voice' },
              ].map((t) => (
                <button
                  key={t.type}
                  onClick={() => setNoteType(t.type)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    noteType === t.type ? 'bg-lavender text-navy' : 'bg-white/5 text-muted-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title" />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your note..." rows={4} />
            </div>
            {noteType === 'task' && (
              <div>
                <Label>Due Date (optional)</Label>
                <Input type="datetime-local" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-tiva-teal text-[#0A0F0D]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}