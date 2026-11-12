import { base44 } from '@/api/base44Client';
import { ttsLRUCache } from './lruCache';

let currentAudio = null;

// --- Browser TTS fallback voice selection (female, prefer non-Western) ---
let selectedVoice = null;

function findBestVoice(voices) {
  if (!voices || voices.length === 0) return null;
  const africanLangs = ['en-ng', 'en-za', 'en-ke', 'en-gh'];
  const africanKeywords = ['nigerian', 'south african', 'african', 'ndidi', 'zulu', 'afrikaans', 'kenyan', 'ghanaian'];
  const femaleKeywords = ['female', 'woman', 'samantha', 'victoria', 'karen', 'tessa', 'fiona', 'moira', 'serena', 'zira', 'susan', 'allison', 'ava', 'catherine', 'amara'];

  for (const v of voices) {
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    if (africanLangs.includes(lang) && (name.includes('female') || femaleKeywords.some(fk => name.includes(fk)))) return v;
  }
  for (const v of voices) {
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    if (africanLangs.includes(lang) || africanKeywords.some(ak => name.includes(ak))) return v;
  }
  for (const v of voices) {
    const name = (v.name || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    if (lang.startsWith('en') && (name.includes('female') || femaleKeywords.some(fk => name.includes(fk)))) return v;
  }
  for (const v of voices) {
    const name = (v.name || '').toLowerCase();
    if (name.includes('female') || femaleKeywords.some(fk => name.includes(fk))) return v;
  }
  return null;
}

function getBrowserVoice() {
  if (selectedVoice) return selectedVoice;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  selectedVoice = findBestVoice(voices);
  return selectedVoice;
}

export function cancel() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export async function speak(text, { rate = 0.95, pitch = 1.05 } = {}) {
  cancel();
  if (typeof window === 'undefined' || !text) return;

  const trimmed = text.trim();
  const cacheKey = `tts_${trimmed.toLowerCase().slice(0, 300)}`;

  // 1. Check LRU cache for instant 0ms playback of repeated phrases
  const cachedUrl = ttsLRUCache.get(cacheKey);
  if (cachedUrl) {
    currentAudio = new Audio(cachedUrl);
    currentAudio.play().catch(() => {});
    return;
  }

  // 2. Server-side TTS — "honey" voice is warm and soft, consistent across devices
  try {
    const result = await base44.integrations.Core.GenerateSpeech({
      text: text.slice(0, 5000),
      voice: 'honey',
      language_code: 'en',
    });
    if (result?.url) {
      ttsLRUCache.set(cacheKey, result.url);
      currentAudio = new Audio(result.url);
      currentAudio.play().catch(() => {});
      return;
    }
  } catch (e) {
    // Fall through to browser TTS
  }

  // Fallback: browser TTS with best available female voice
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 500));
  utterance.rate = 0.88;
  utterance.pitch = 1.12;
  const voice = getBrowserVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    selectedVoice = null;
    getBrowserVoice();
  });
  window.speechSynthesis.getVoices();
}