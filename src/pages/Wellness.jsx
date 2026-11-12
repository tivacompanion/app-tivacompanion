import { useState, useEffect } from 'react';
import { Heart, Plus, Droplet, Smile, Dumbbell, Apple, Brain, Meh, Frown, Laugh, Mic, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const moodConfig = [
  { score: 1, label: 'Very Low', icon: Frown, color: 'bg-destructive/15 text-red-300' },
  { score: 2, label: 'Low', icon: Meh, color: 'bg-peach text-peach-deep' },
  { score: 3, label: 'Okay', icon: Smile, color: 'bg-lavender text-lavender-deep' },
  { score: 4, label: 'Good', icon: Laugh, color: 'bg-mint text-mint-deep' },
  { score: 5, label: 'Great', icon: Heart, color: 'bg-mint text-mint-deep' },
];

export default function Wellness() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [entryType, setEntryType] = useState('mood');
  const [moodScore, setMoodScore] = useState(3);
  const [content, setContent] = useState('');
  const [activityType, setActivityType] = useState('');
  const [duration, setDuration] = useState('');
  const [water, setWater] = useState(0);
  const [aiAdvice, setAiAdvice] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await base44.entities.WellnessEntry.list('-created_date', 50).catch(() => []);
    setEntries(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    const entry = {
      entry_type: entryType,
      recorded_at: new Date().toISOString(),
    };

    if (entryType === 'mood') {
      entry.mood_score = moodScore;
      entry.mood_label = moodConfig[moodScore - 1].label;
      entry.content = content;
    } else if (entryType === 'exercise') {
      entry.activity_type = activityType;
      entry.duration_minutes = parseInt(duration) || 0;
      entry.content = content;
    } else if (entryType === 'hydration') {
      entry.glasses_of_water = water;
    } else if (entryType === 'mental_check') {
      entry.content = content;
    } else {
      entry.content = content;
    }

    // Generate AI advice
    try {
      let prompt = '';
      if (entryType === 'mood') {
        prompt = `The user logged their mood as "${moodConfig[moodScore - 1].label}" (score ${moodScore}/5)${content ? ` with note: "${content}"` : ''}. Provide a brief, warm, supportive wellness tip (1-2 sentences).`;
      } else if (entryType === 'exercise') {
        prompt = `The user logged ${activityType} for ${duration} minutes. Provide brief encouraging feedback and a tip for next time.`;
      } else if (entryType === 'hydration') {
        prompt = `The user logged ${water} glasses of water today. Provide brief feedback on their hydration.`;
      } else {
        prompt = `The user did a mental wellness check. Provide a brief supportive message.`;
      }

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      entry.ai_advice = typeof response === 'string' ? response : response.response || '';
    } catch (e) {}

    await base44.entities.WellnessEntry.create(entry);
    resetForm();
    setShowAdd(false);
    loadData();
  };

  const resetForm = () => {
    setEntryType('mood');
    setMoodScore(3);
    setContent('');
    setActivityType('');
    setDuration('');
    setWater(0);
  };

  if (loading) return <AppLayout><LoadingState label="Loading wellness data..." /></AppLayout>;

  const todayEntries = entries.filter(e => new Date(e.recorded_at).toDateString() === new Date().toDateString());
  const todayMood = todayEntries.find(e => e.entry_type === 'mood');
  const todayWater = todayEntries.filter(e => e.entry_type === 'hydration').reduce((sum, e) => sum + (e.glasses_of_water || 0), 0);
  const todayExercise = todayEntries.filter(e => e.entry_type === 'exercise');

  return (
    <AppLayout>
      <SectionHeader
        title="Healthy Living Companion"
        subtitle="Your daily wellness coach"
        action={
          <Button onClick={() => setShowAdd(true)} className="bg-tiva-teal text-[#0A0F0D]">
            <Plus className="w-4 h-4 mr-1" /> Log Entry
          </Button>
        }
      />

      {/* Today's Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="w-9 h-9 rounded-lg bg-lavender flex items-center justify-center mb-2">
            <Smile className="w-4 h-4 text-lavender-deep" />
          </div>
          <p className="font-heading font-bold text-xl text-navy">{todayMood ? moodConfig[todayMood.mood_score - 1]?.label : '--'}</p>
          <p className="text-xs text-muted-foreground">Today's Mood</p>
        </div>
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="w-9 h-9 rounded-lg bg-mint flex items-center justify-center mb-2">
            <Droplet className="w-4 h-4 text-mint-deep" />
          </div>
          <p className="font-heading font-bold text-xl text-navy">{todayWater}</p>
          <p className="text-xs text-muted-foreground">Glasses of Water</p>
        </div>
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="w-9 h-9 rounded-lg bg-peach flex items-center justify-center mb-2">
            <Dumbbell className="w-4 h-4 text-peach-deep" />
          </div>
          <p className="font-heading font-bold text-xl text-navy">{todayExercise.length}</p>
          <p className="text-xs text-muted-foreground">Exercises Today</p>
        </div>
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center mb-2">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <p className="font-heading font-bold text-xl text-navy">{todayEntries.filter(e => e.entry_type === 'mental_check').length}</p>
          <p className="text-xs text-muted-foreground">Mental Checks</p>
        </div>
      </div>

      {/* Daily AI Advice */}
      <div className="bg-gradient-to-br from-tiva-teal/15 to-tiva-teal/5 rounded-2xl p-5 mb-6 border border-white/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-mint" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-navy mb-1">Today's Wellness Tip from Tiva</h3>
            <p className="text-sm text-navy">
              {todayMood?.mood_score <= 2
                ? "It seems like you're having a tough day. Remember to be gentle with yourself. Try a short 5-minute breathing exercise, drink some water, and reach out to someone you trust."
                : "Great job staying on top of your wellness! Keep up the good work. Remember to stay hydrated, take short walks, and check in with yourself mentally throughout the day."}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Mood Check */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10 mb-6">
        <h3 className="font-heading font-semibold text-navy mb-3">Quick Mood Check</h3>
        <div className="flex justify-between gap-2">
          {moodConfig.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.score}
                onClick={() => {
                  setMoodScore(m.score);
                  setEntryType('mood');
                  handleSubmit();
                }}
                className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                  todayMood?.mood_score === m.score ? 'border-tiva-teal bg-tiva-teal/15' : 'border-white/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-full ${m.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-navy">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hydration Tracker */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-navy flex items-center gap-2">
            <Droplet className="w-4 h-4 text-mint-deep" /> Hydration Tracker
          </h3>
          <span className="text-sm font-medium text-muted-foreground">{todayWater} / 8 glasses</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <button
              key={i}
              onClick={async () => {
                await base44.entities.WellnessEntry.create({
                  entry_type: 'hydration',
                  glasses_of_water: 1,
                  recorded_at: new Date().toISOString(),
                });
                loadData();
              }}
              className={`flex-1 h-12 rounded-lg border-2 transition-all ${
                i < todayWater ? 'bg-mint border-mint-deep' : 'border-white/10 hover:border-mint-deep/40'
              }`}
            >
              <Droplet className={`w-5 h-5 mx-auto ${i < todayWater ? 'text-mint-deep' : 'text-muted-foreground'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Entries */}
      {entries.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-navy mb-3">Recent Wellness Entries</h3>
          <div className="space-y-2">
            {entries.slice(0, 10).map((e) => {
              const icons = { mood: Smile, exercise: Dumbbell, hydration: Droplet, mental_check: Brain, nutrition: Apple, advice: Sparkles, voice_note: Mic };
              const Icon = icons[e.entry_type] || Heart;
              const accents = {
                mood: 'bg-lavender text-lavender-deep',
                exercise: 'bg-mint text-mint-deep',
                hydration: 'bg-mint text-mint-deep',
                mental_check: 'bg-peach text-peach-deep',
                nutrition: 'bg-peach text-peach-deep',
              };
              return (
                <div key={e.id} className="bg-card/50 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg ${accents[e.entry_type] || 'bg-lavender text-lavender-deep'} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy capitalize">
                      {e.entry_type.replace(/_/g, ' ')}
                      {e.mood_label && ` · ${e.mood_label}`}
                      {e.activity_type && ` · ${e.activity_type}`}
                      {e.glasses_of_water && ` · ${e.glasses_of_water} glass(es)`}
                    </p>
                    {e.content && <p className="text-xs text-muted-foreground mt-0.5">{e.content}</p>}
                    {e.ai_advice && (
                      <div className="mt-1.5 flex items-start gap-1.5">
                        <Sparkles className="w-3 h-3 text-lavender-deep flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-navy">{e.ai_advice}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(e.recorded_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Wellness Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2 flex-wrap">
              {[
                { type: 'mood', label: 'Mood', icon: Smile },
                { type: 'exercise', label: 'Exercise', icon: Dumbbell },
                { type: 'hydration', label: 'Hydration', icon: Droplet },
                { type: 'mental_check', label: 'Mental Check', icon: Brain },
                { type: 'nutrition', label: 'Nutrition', icon: Apple },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.type}
                    onClick={() => setEntryType(t.type)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      entryType === t.type ? 'bg-lavender text-navy' : 'bg-white/5 text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {t.label}
                  </button>
                );
              })}
            </div>

            {entryType === 'mood' && (
              <div>
                <Label className="text-sm font-medium mb-2 block">How are you feeling?</Label>
                <div className="flex justify-between gap-2">
                  {moodConfig.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.score}
                        onClick={() => setMoodScore(m.score)}
                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                          moodScore === m.score ? 'border-tiva-teal bg-tiva-teal/15' : 'border-white/10'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full ${m.color} flex items-center justify-center`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-medium text-navy">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {entryType === 'exercise' && (
              <>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Activity Type</Label>
                  <input
                    type="text"
                    value={activityType}
                    onChange={e => setActivityType(e.target.value)}
                    placeholder="e.g. Walking, Yoga, Stretching"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-lavender-deep/30"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Duration (minutes)</Label>
                  <input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-lavender-deep/30"
                  />
                </div>
              </>
            )}

            {entryType === 'hydration' && (
              <div>
                <Label className="text-sm font-medium mb-1 block">Glasses of Water</Label>
                <input
                  type="number"
                  value={water}
                  onChange={e => setWater(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-lavender-deep/30"
                />
              </div>
            )}

            {(entryType === 'mood' || entryType === 'mental_check' || entryType === 'exercise' || entryType === 'nutrition') && (
              <div>
                <Label className="text-sm font-medium mb-1 block">Notes</Label>
                <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Add any notes..." />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-tiva-teal text-[#0A0F0D]">Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}