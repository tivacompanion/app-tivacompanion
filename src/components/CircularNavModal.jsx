import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Pill, MessageCircle, Calendar, TrendingUp, Heart, X } from 'lucide-react';

const circularItems = [
  { label: 'Medications', path: '/medications', icon: Pill },
  { label: 'AI Companion', path: '/chat', icon: MessageCircle },
  { label: 'Appointments', path: '/appointments', icon: Calendar },
  { label: 'Predictive Care', path: '/predictions', icon: TrendingUp },
  { label: 'Wellness', path: '/wellness', icon: Heart },
];

export default function CircularNavModal({ open, onClose }) {
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
  };

  const R = 105;
  const count = circularItems.length;

  const getPos = (i) => {
    const angle = (-90 + (360 / count) * i) * (Math.PI / 180);
    return { x: R * Math.cos(angle), y: R * Math.sin(angle) };
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="lg:hidden fixed inset-0 z-[60] flex items-end justify-center pb-16"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

          {/* Ambient glow behind menu */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(64,201,162,0.2) 0%, transparent 70%)' }} />

          <motion.div
            initial={{ scale: 0.2, opacity: 0, y: 120 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.2, opacity: 0, y: 120 }}
            transition={{ type: 'spring', damping: 18, stiffness: 240 }}
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Outer rotating ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 w-[280px] h-[280px] rounded-full pointer-events-none"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(64,201,162,0.3) 25%, transparent 50%, rgba(64,201,162,0.15) 75%, transparent 100%)',
                maskImage: 'radial-gradient(circle, transparent 62%, black 64%, black 68%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 62%, black 64%, black 68%, transparent 70%)',
              }}
            />

            {/* Main circular container */}
            <div
              className="relative w-[280px] h-[280px] rounded-full"
              style={{
                background: 'radial-gradient(circle at 30% 20%, rgba(64,201,162,0.12) 0%, rgba(15,22,20,0.88) 55%, rgba(10,15,13,0.94) 100%)',
                backdropFilter: 'blur(32px) saturate(200%)',
                WebkitBackdropFilter: 'blur(32px) saturate(200%)',
                border: '1px solid rgba(64,201,162,0.2)',
                boxShadow: '0 0 80px rgba(64,201,162,0.15), 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(64,201,162,0.08)',
              }}
            >
              {/* Divider lines */}
              {circularItems.map((_, i) => {
                const angle = -90 + (360 / count) * i - (180 / count);
                return (
                  <div
                    key={`divider-${i}`}
                    className="absolute top-1/2 left-1/2 origin-left"
                    style={{
                      width: '140px',
                      height: '1px',
                      transform: `rotate(${angle}deg)`,
                      background: 'linear-gradient(to right, rgba(64,201,162,0.2), transparent)',
                    }}
                  />
                );
              })}

              {/* Inner ring decoration */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90px] h-[90px] rounded-full pointer-events-none"
                style={{ border: '1px solid rgba(64,201,162,0.1)' }}
              />

              {/* Center close button */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: 1.08 }}
                onClick={onClose}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full z-10 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #40C9A2 0%, #2BA884 100%)',
                  boxShadow: '0 0 24px rgba(64,201,162,0.4), 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                <X className="w-5 h-5 text-[#0A0F0D]" strokeWidth={2.5} />
              </motion.button>

              {/* Nav items */}
              {circularItems.map((item, i) => {
                const pos = getPos(i);
                const Icon = item.icon;
                return (
                  <div
                    key={item.path}
                    className="absolute top-1/2 left-1/2"
                    style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
                  >
                    <motion.button
                      initial={{ scale: 0, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.07 * i + 0.15, type: 'spring', damping: 12, stiffness: 200 }}
                      whileTap={{ scale: 0.85 }}
                      whileHover={{ scale: 1.12 }}
                      onClick={() => handleNavigate(item.path)}
                      className="flex flex-col items-center gap-1.5 w-[72px]"
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, rgba(64,201,162,0.18) 0%, rgba(64,201,162,0.06) 100%)',
                          border: '1px solid rgba(64,201,162,0.3)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.3), 0 0 16px rgba(64,201,162,0.15), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(64,201,162,0.08)',
                        }}
                      >
                        <Icon className="w-5 h-5 text-tiva-teal" strokeWidth={2} />
                      </div>
                      <span
                        className="text-[10px] font-semibold text-white/90 whitespace-nowrap leading-tight tracking-wide"
                        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
                      >
                        {item.label}
                      </span>
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}