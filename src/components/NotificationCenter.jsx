import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, AlertTriangle, Check, ChevronRight, CheckCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const active = await base44.entities.Alert.filter({ status: 'active' }, '-created_date', 10);
      setAlerts(active || []);
    } catch {
      setAlerts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    if (open) loadAlerts();
  }, [open]);

  const markAsRead = async (alertId, e) => {
    e.stopPropagation();
    try {
      await base44.entities.Alert.update(alertId, { status: 'acknowledged' });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await Promise.all(alerts.map(a => base44.entities.Alert.update(a.id, { status: 'acknowledged' })));
      setAlerts([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAlertClick = () => {
    setOpen(false);
    navigate('/emergency');
  };

  const unreadCount = alerts.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center hover:bg-muted transition-all"
        title="Notifications"
      >
        <Bell className={`w-5 h-5 text-navy ${unreadCount > 0 ? 'animate-pulse-soft' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg h-[90vh] flex flex-col bg-card rounded-t-3xl border-t border-white/10 shadow-2xl overflow-hidden animate-slide-up"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-tiva-teal/15 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-tiva-teal" />
                </div>
                <span className="font-heading font-semibold text-navy text-base">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-destructive/15 text-destructive px-2 py-0.5 rounded-full font-semibold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                <X className="w-5 h-5 text-navy" />
              </button>
            </div>

            {/* Action bar */}
            {unreadCount > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <span className="text-[11px] text-muted-foreground">Recent alerts</span>
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-tiva-teal hover:underline font-medium transition-all">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              </div>
            )}

            {/* Alert list */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 rounded-full animate-spin" style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-mint/15 flex items-center justify-center mb-3">
                    <Check className="w-8 h-8 text-mint-deep" />
                  </div>
                  <p className="text-sm font-heading font-semibold text-navy">You're all caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">No unread alerts.</p>
                </div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {alerts.map((a) => {
                    const sevConfig = {
                      red: { bg: 'bg-destructive/15', icon: 'text-destructive', border: 'border-l-destructive', dot: 'bg-destructive' },
                      amber: { bg: 'bg-peach/20', icon: 'text-peach-deep', border: 'border-l-peach-deep', dot: 'bg-peach-deep' },
                      green: { bg: 'bg-mint/15', icon: 'text-mint-deep', border: 'border-l-mint-deep', dot: 'bg-mint-deep' },
                    };
                    const sev = sevConfig[a.severity] || sevConfig.green;
                    return (
                      <div
                        key={a.id}
                        onClick={handleAlertClick}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-all border-l-2 ${sev.border}`}
                      >
                        {/* Icon + unread dot */}
                        <div className="relative mt-0.5 flex-shrink-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sev.bg}`}>
                            <AlertTriangle className={`w-4 h-4 ${sev.icon}`} />
                          </div>
                          <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${sev.dot} border-2 border-card`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy leading-tight">{a.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {new Date(a.created_date).toLocaleString()}
                          </p>
                        </div>

                        {/* Mark as read */}
                        <button
                          onClick={(e) => markAsRead(a.id, e)}
                          className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/5 hover:bg-mint/20 flex items-center justify-center transition-all"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 p-3 bg-white/[0.02]">
              <button
                onClick={() => { setOpen(false); navigate('/emergency'); }}
                className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl text-sm font-semibold text-tiva-teal bg-tiva-teal/10 hover:bg-tiva-teal/15 transition-all"
              >
                View all alerts <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}