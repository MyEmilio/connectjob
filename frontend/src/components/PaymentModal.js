import { useState, useEffect } from 'react';
import api from '../services/api';

// Design tokens
const T = {
  dark: "#0f172a",
  dark2: "#1e293b",
  dark3: "#334155",
  card: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  text2: "#cbd5e1",
  text3: "#94a3b8",
  green: "#059669",
  greenLight: "#34d399",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  orange: "#f59e0b",
  red: "#ef4444",
};

export default function PaymentModal({ job, payee, onClose, onSuccess }) {
  const [amount, setAmount] = useState(job?.salary || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  useEffect(() => {
    checkStripeConfig();
  }, []);

  // Poll payment status
  useEffect(() => {
    if (!paymentId || paymentStatus === 'held' || paymentStatus === 'failed') return;

    const pollInterval = setInterval(async () => {
      try {
        const { data } = await api.get(`/payments/${paymentId}/status`);
        setPaymentStatus(data.status);
        
        if (data.status === 'held') {
          clearInterval(pollInterval);
          onSuccess?.(data);
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setError('El pago ha fallado. Por favor, inténtalo de nuevo.');
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [paymentId, paymentStatus, onSuccess]);

  const checkStripeConfig = async () => {
    try {
      const { data } = await api.get('/payments/stripe-config');
      setStripeConfigured(data.configured);
    } catch (err) {
      console.error('Error checking Stripe config:', err);
    }
  };

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Por favor, introduce un importe válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post('/payments/create-intent', {
        job_id: job.id || job._id,
        payee_id: payee.id || payee._id,
        amount: parseFloat(amount),
      });

      setPaymentId(data.payment_id);
      
      if (data.simulated) {
        // Simulated payment - directly show success
        setPaymentStatus('held');
        setTimeout(() => onSuccess?.(data), 1500);
      } else if (data.client_secret) {
        // Real Stripe payment - would integrate with Stripe Elements here
        // For now, show that payment is processing
        setPaymentStatus('processing');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  const commission = amount ? (parseFloat(amount) * 0.05).toFixed(2) : '0.00';
  const total = amount ? (parseFloat(amount) * 1.05).toFixed(2) : '0.00';

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          background: T.dark, borderRadius: 20, width: '100%', maxWidth: 440,
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 22, fontWeight: 800, color: T.text, margin: '0 0 4px' }}>
              💳 Pago en Escrow
            </h2>
            <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>
              Los fondos se retienen hasta finalizar el trabajo
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: 24, color: T.text3, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {/* Job Info */}
          <div style={{
            background: T.card, borderRadius: 14, padding: 16, marginBottom: 20,
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
              Empleo
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>
              {job?.title || 'Empleo'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: T.green,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#fff',
              }}>
                {payee?.initials || '?'}
              </div>
              <div>
                <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{payee?.name || 'Trabajador'}</div>
                <div style={{ fontSize: 12, color: T.text3 }}>Beneficiario</div>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text2, marginBottom: 8 }}>
              Importe a pagar (€)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Ej: 500"
              disabled={paymentStatus}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 18, fontWeight: 700,
                background: T.dark3, border: `2px solid ${T.border}`, color: T.text,
                outline: 'none', textAlign: 'center',
              }}
            />
          </div>

          {/* Price Breakdown */}
          <div style={{
            background: `${T.green}11`, borderRadius: 14, padding: 16, marginBottom: 20,
            border: `1px solid ${T.green}33`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: T.text2 }}>Importe del trabajo</span>
              <span style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{amount || '0'} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: T.text2 }}>Comisión plataforma (5%)</span>
              <span style={{ fontSize: 14, color: T.orange }}>{commission} €</span>
            </div>
            <div style={{ height: 1, background: T.border, margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, color: T.text, fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 20, color: T.greenLight, fontWeight: 800 }}>{total} €</span>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div style={{
              background: `${T.red}22`, borderRadius: 10, padding: 12, marginBottom: 16,
              border: `1px solid ${T.red}44`, color: T.red, fontSize: 13, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {paymentStatus === 'processing' && (
            <div style={{
              background: `${T.blue}22`, borderRadius: 10, padding: 12, marginBottom: 16,
              border: `1px solid ${T.blue}44`, color: T.blue, fontSize: 13, textAlign: 'center',
            }}>
              ⏳ Procesando el pago...
            </div>
          )}

          {paymentStatus === 'held' && (
            <div style={{
              background: `${T.green}22`, borderRadius: 10, padding: 12, marginBottom: 16,
              border: `1px solid ${T.green}44`, color: T.greenLight, fontSize: 13, textAlign: 'center',
            }}>
              ✅ ¡Pago retenido con éxito en escrow!
            </div>
          )}

          {/* Warning */}
          {!stripeConfigured && !paymentStatus && (
            <div style={{
              background: `${T.orange}15`, borderRadius: 10, padding: 12, marginBottom: 16,
              border: `1px solid ${T.orange}33`, fontSize: 12, color: T.orange,
            }}>
              ⚠️ <strong>Modo demostración</strong> - Stripe no está configurado. Los pagos son simulados.
            </div>
          )}

          {/* Info */}
          <div style={{ fontSize: 12, color: T.text3, marginBottom: 20, lineHeight: 1.5 }}>
            🔒 Los fondos se retienen de forma segura hasta que confirmes la finalización del trabajo.
            El trabajador recibe el dinero solo después de que estés satisfecho con el resultado.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0 24px 24px', display: 'flex', gap: 12,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: 'transparent', border: `1px solid ${T.border}`,
              color: T.text2, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handlePayment}
            disabled={loading || paymentStatus}
            style={{
              flex: 2, padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 700,
              background: paymentStatus === 'held' 
                ? T.green 
                : `linear-gradient(135deg, ${T.purple}, #6d28d9)`,
              border: 'none', color: '#fff', cursor: loading || paymentStatus ? 'not-allowed' : 'pointer',
              boxShadow: `0 4px 16px ${T.purple}44`,
              opacity: loading || paymentStatus ? 0.7 : 1,
            }}
          >
            {loading ? 'Procesando...' : paymentStatus === 'held' ? '✓ Pagado' : `Pagar ${total} €`}
          </button>
        </div>
      </div>
    </div>
  );
}
