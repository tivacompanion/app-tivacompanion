import { useState, useEffect } from 'react';
import { Check, Crown, Smartphone, Zap, AlertCircle, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const plans = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    price: 'Free',
    period: '14 days',
    features: ['AI Companion Chat', 'Medication Reminders', 'Health Tracking', 'Emergency Alerts', '1 Family Member'],
    icon: Sparkles,
    accent: 'lavender',
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '5,000 XAF',
    period: '/ 6 months',
    features: ['Everything in Free Trial', 'Predictive Care Engine', 'Medical Document Vault', 'Unlimited Family Members', 'Voice Navigation', 'Offline Mode'],
    icon: Zap,
    accent: 'mint',
    popular: true,
  },
  {
    id: 'family',
    name: 'Family',
    price: '12,000 XAF',
    period: '/ 6 months',
    features: ['Everything in Standard', 'Up to 5 family accounts', 'Caregiver Dashboard Access', 'Priority Emergency Response', 'WhatsApp Alerts', 'Family Analytics'],
    icon: Crown,
    accent: 'peach',
  },
];

export default function Subscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mtn_momo');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const subs = await base44.entities.Subscription.list('-created_date', 5).catch(() => []);
    setSubscription(subs[0] || null);
    setLoading(false);
  };

  const handleSubscribe = (plan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const isFreeTrial = selectedPlan?.id === 'free_trial';

  const processPayment = async () => {
    if (!isFreeTrial && !paymentPhone) return;
    setProcessing(true);

    try {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const subEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

      await base44.entities.Subscription.create({
        plan: selectedPlan.id,
        status: isFreeTrial ? 'trial' : 'active',
        trial_start_date: now.toISOString().split('T')[0],
        trial_end_date: trialEnd.toISOString().split('T')[0],
        subscription_start_date: isFreeTrial ? undefined : now.toISOString().split('T')[0],
        subscription_end_date: isFreeTrial ? undefined : subEnd.toISOString().split('T')[0],
        duration_months: 6,
        payment_method: isFreeTrial ? undefined : paymentMethod,
        payment_phone: isFreeTrial ? undefined : paymentPhone.replace(/[^\d+]/g, ''),
        amount_paid: isFreeTrial ? 0 : parseInt(selectedPlan.price.replace(/[^\d]/g, '') || '0', 10),
        currency: 'XAF',
        auto_renew: false,
        payment_history: isFreeTrial ? [] : [{
          date: now.toISOString(),
          amount: parseInt(selectedPlan.price.replace(/[^\d]/g, '') || '0', 10),
          status: 'completed',
          transaction_id: 'TXN' + Date.now(),
        }],
      });

      setShowPayment(false);
      setPaymentPhone('');
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <AppLayout><LoadingState label="Loading subscription..." /></AppLayout>;

  const daysLeft = subscription?.trial_end_date
    ? Math.ceil((new Date(subscription.trial_end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <AppLayout>
      <SectionHeader
        title="Subscription & Payment"
        subtitle="Manage your Tiva plan with African mobile money"
      />

      {/* Current Subscription Status */}
      {subscription && (
        <div className={`rounded-2xl p-5 mb-6 border ${
          subscription.status === 'trial' ? 'bg-tiva-teal/10 border-tiva-teal/20' :
          subscription.status === 'active' ? 'bg-tiva-teal/15 border-tiva-teal/20' :
          'bg-amber/10 border-amber/20'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  subscription.status === 'trial' ? 'bg-lavender text-lavender-deep' :
                  subscription.status === 'active' ? 'bg-mint text-mint-deep' :
                  'bg-peach text-peach-deep'
                }`}>
                  {subscription.status.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-navy capitalize">{subscription.plan} Plan</span>
              </div>
              {subscription.status === 'trial' && (
                <p className="text-sm text-navy">
                  <span className="font-bold text-2xl text-navy">{daysLeft}</span> days left in your free trial
                </p>
              )}
              {subscription.status === 'active' && (
                <p className="text-sm text-navy">
                  Active until <span className="font-semibold">{new Date(subscription.subscription_end_date).toLocaleDateString()}</span>
                </p>
              )}
              {subscription.payment_method && (
                <p className="text-xs text-muted-foreground mt-1">
                  Paid via {subscription.payment_method === 'mtn_momo' ? 'MTN Mobile Money' : subscription.payment_method === 'orange_money' ? 'Orange Money' : subscription.payment_method}
                </p>
              )}
            </div>
            {subscription.status === 'trial' && daysLeft <= 3 && (
              <div className="flex items-center gap-2 text-peach-deep">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Trial ending soon!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const accents = {
            lavender: { bg: 'bg-lavender', text: 'text-lavender-deep', border: 'border-lavender-deep/30' },
            mint: { bg: 'bg-mint', text: 'text-mint-deep', border: 'border-mint-deep/30' },
            peach: { bg: 'bg-peach', text: 'text-peach-deep', border: 'border-peach-deep/30' },
          };
          const a = accents[plan.accent];
          const isCurrent = subscription?.plan === plan.id;
          return (
            <div
              key={plan.id}
              className={`bg-card/50 backdrop-blur-md rounded-2xl p-6 border-2 transition-all ${
                plan.popular ? 'border-tiva-teal shadow-lg' : 'border-border/40'
              } ${isCurrent ? 'ring-2 ring-mint-deep' : ''}`}
            >
              {plan.popular && (
                <span className="inline-block text-xs font-semibold px-2 py-1 rounded-full bg-tiva-teal text-[#0A0F0D] mb-3">
                  Most Popular
                </span>
              )}
              <div className={`w-12 h-12 rounded-xl ${a.bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${a.text}`} />
              </div>
              <h3 className="font-heading font-bold text-lg text-navy mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="font-heading font-bold text-2xl text-navy">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-navy">
                    <Check className="w-4 h-4 text-mint-deep flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe(plan)}
                disabled={isCurrent}
                className={`w-full ${isCurrent ? 'bg-mint text-mint-deep' : plan.popular ? 'bg-navy' : 'bg-lavender text-navy'}`}
              >
                {isCurrent ? 'Current Plan' : plan.id === 'free_trial' ? 'Start Free Trial' : 'Subscribe Now'}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Payment Methods Info */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
        <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-lavender-deep" /> Supported Payment Methods
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center">
              <span className="font-heading font-bold text-sm text-[#0A0F0D]">MTN</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-navy">MTN Mobile Money</p>
              <p className="text-xs text-muted-foreground">Available across Cameroon</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <div className="w-10 h-10 rounded-lg bg-orange-500/100 flex items-center justify-center">
              <span className="font-heading font-bold text-sm text-white">OM</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-navy">Orange Money</p>
              <p className="text-xs text-muted-foreground">Available across Cameroon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subscribe to {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-tiva-teal/10">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-navy">{selectedPlan?.name} Plan</span>
                <span className="font-heading font-bold text-xl text-navy">{selectedPlan?.price}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedPlan?.period}</p>
            </div>

            {isFreeTrial ? (
              <div className="p-4 rounded-xl bg-mint/20 border border-mint-deep/20 text-sm text-navy">
                <p className="font-semibold text-white mb-1">Instant 14-Day Free Access</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No payment or mobile money number required. You get full access to AI health companion chat, vital telemetry, medication reminders, and family distress alerts.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <Label>Payment Method</Label>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setPaymentMethod('mtn_momo')}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        paymentMethod === 'mtn_momo' ? 'border-yellow-400 bg-yellow-400/10' : 'border-border'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
                        <span className="font-heading font-bold text-[10px] text-[#0A0F0D]">MTN</span>
                      </div>
                      <span className="text-sm font-medium text-navy">MTN MoMo</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('orange_money')}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        paymentMethod === 'orange_money' ? 'border-orange-500 bg-orange-500/10' : 'border-border'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-orange-500/100 flex items-center justify-center">
                        <span className="font-heading font-bold text-[10px] text-white">OM</span>
                      </div>
                      <span className="text-sm font-medium text-navy">Orange</span>
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Mobile Money Number</Label>
                  <Input
                    type="tel"
                    value={paymentPhone}
                    onChange={e => setPaymentPhone(e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                  />
                </div>
                <div className="p-3 rounded-xl bg-mint/20 border border-mint-deep/20">
                  <p className="text-xs text-navy">
                    You'll receive a payment prompt on your phone. Confirm the payment to activate your subscription. Your 6-month plan starts immediately after payment.
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button
              onClick={processPayment}
              disabled={(!isFreeTrial && !paymentPhone) || processing}
              className="bg-tiva-teal text-[#0A0F0D]"
            >
              {processing
                ? (isFreeTrial ? 'Activating...' : 'Processing...')
                : (isFreeTrial ? 'Activate 14-Day Free Trial' : `Pay ${selectedPlan?.price}`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}