import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Building2, Mail, Phone, MapPin, ArrowLeft, Loader2, CheckCircle, Send } from 'lucide-react';

export default function RequestInstitution() {
  const [form, setForm] = useState({ name: '', type: 'hospital', address: '', contact_email: '', contact_phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.functions.invoke('institutionPortal', { action: 'request_access', ...form });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-tiva-teal flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#0A0F0D]" />
          </div>
          <h1 className="font-heading font-bold text-2xl text-navy mb-2">Request Submitted!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Thank you for your interest in Tiva. Our team will review your request and send an approval email to <span className="text-tiva-teal font-medium">{form.contact_email}</span> with login instructions once approved.
          </p>
          <Link to="/institution-login">
            <Button className="bg-tiva-teal text-[#0A0F0D]">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link to="/institution-login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to institution login
        </Link>

        <div className="bg-card/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-tiva-teal flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-[#0A0F0D]" strokeWidth={2} />
            </div>
            <h1 className="font-heading font-bold text-2xl text-navy mb-1">Request Institution Access</h1>
            <p className="text-sm text-muted-foreground">Tell us about your healthcare facility. Our team will review and respond within 48 hours.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Institution Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Central Hospital Yaoundé" className="pl-10 h-12" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Facility Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="care_home">Care Home</SelectItem>
                  <SelectItem value="insurance">Insurance Company</SelectItem>
                  <SelectItem value="home_care">Home Care Company</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Yaoundé, Cameroon" className="pl-10 h-12" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="admin@hospital.cm" className="pl-10 h-12" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="+237..." className="pl-10 h-12" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 font-medium bg-tiva-teal text-[#0A0F0D] hover:bg-tiva-teal/90" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Submit Request</>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}