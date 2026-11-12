import { Play, Lock } from 'lucide-react';
import { useState, useRef } from 'react';

export default function MessageBubble({ message, isMe, isTiva, isPrivate }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const playAudio = () => {
    if (!message.audio_url) return;
    const audio = new Audio(message.audio_url);
    audioRef.current = audio;
    setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.play().catch(() => setPlaying(false));
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[75%] ${isTiva ? 'w-full' : ''}`}>
        {isPrivate && (
          <div className={`flex items-center gap-1 mb-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
            <Lock className="w-2.5 h-2.5 text-amber" />
            <span className="text-[9px] text-amber font-medium">Private</span>
          </div>
        )}
        <div className={`px-4 py-3 rounded-2xl ${
          isMe ? 'bg-tiva-teal text-[#0A0F0D] rounded-tr-sm' :
          isTiva ? 'bg-mint/30 text-navy border border-mint-deep/20 rounded-xl' :
          isPrivate ? 'bg-peach/30 text-navy border border-amber/30 rounded-tl-sm' :
          'bg-lavender/60 text-navy rounded-tl-sm'
        }`}>
          {!isMe && !isTiva && (
            <p className="text-xs font-semibold text-lavender-deep mb-1">{message.sender_name}</p>
          )}
          {isTiva && (
            <p className="text-xs font-semibold text-mint-deep mb-1">Tiva</p>
          )}

          {message.message_type === 'voice' && message.audio_url ? (
            <div className="flex items-center gap-3">
              <button
                onClick={playAudio}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all flex-shrink-0"
              >
                <Play className={`w-4 h-4 ${isMe ? 'text-[#0A0F0D]' : 'text-navy'} ${playing ? 'animate-pulse' : ''}`} fill="currentColor" />
              </button>
              <div className="flex items-center gap-0.5">
                {[0,1,2,3,4,5,6,7].map(i => (
                  <div
                    key={i}
                    className={`w-1 rounded-full ${isMe ? 'bg-[#0A0F0D]/60' : 'bg-navy/40'}`}
                    style={{ height: `${8 + (i % 4) * 4}px` }}
                  />
                ))}
              </div>
              <span className={`text-xs ${isMe ? 'text-[#0A0F0D]/70' : 'text-muted-foreground'}`}>Voice note</span>
            </div>
          ) : message.message_type === 'image' && (message.image_url || message.media_url) ? (
            <img src={message.image_url || message.media_url} alt="Shared" className="rounded-xl max-w-full max-h-60 object-cover" />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        <p className={`text-[10px] text-muted-foreground mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
          {new Date(message.sent_at || message.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}