import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/');
    }
  }, [countdown, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", background: '#0f1117', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>

      {/* Stars */}
      {[...Array(40)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 3 === 0 ? 2 : 1,
          height: i % 3 === 0 ? 2 : 1,
          background: 'rgba(255,255,255,0.4)',
          borderRadius: '50%',
          top: `${Math.sin(i * 137.5) * 50 + 50}%`,
          left: `${(i * 7.3) % 100}%`,
        }} />
      ))}

      {/* 404 */}
      <div style={{ fontSize: 'clamp(80px, 18vw, 160px)', fontWeight: 900, letterSpacing: '-4px', lineHeight: 1, color: 'transparent', WebkitTextStroke: '2px #f59e0b', marginBottom: '8px', fontFamily: "'Barlow Condensed', sans-serif", animation: 'pulse404 3s ease-in-out infinite' }}>
        404
      </div>

      <p style={{ color: '#9ca3af', fontSize: '13px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '4px' }}>
        Wrong Turn Detected
      </p>
      <p style={{ color: '#4b5563', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '48px' }}>
        This road doesn&apos;t exist
      </p>

      {/* Road scene */}
      <div style={{ width: '100%', maxWidth: '600px', position: 'relative', height: '120px', marginBottom: '40px' }}>

        {/* Road */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: '#1f2937', borderTop: '3px solid #374151', borderBottom: '3px solid #374151' }}>
          {/* Dashes */}
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '3px', transform: 'translateY(-50%)', overflow: 'hidden' }}>
            <div style={{ width: '200%', height: '100%', background: 'repeating-linear-gradient(90deg, #f59e0b 0px, #f59e0b 40px, transparent 40px, transparent 70px)', animation: 'roadScroll 0.5s linear infinite' }} />
          </div>
        </div>

        {/* Mountains / scenery */}
        <svg style={{ position: 'absolute', bottom: '60px', left: 0, right: 0, width: '100%' }} height="60" viewBox="0 0 600 60" preserveAspectRatio="none">
          <polygon points="0,60 80,10 160,60" fill="#1e293b" />
          <polygon points="100,60 200,5 300,60" fill="#243044" />
          <polygon points="250,60 350,20 450,60" fill="#1e293b" />
          <polygon points="400,60 500,8 600,60" fill="#243044" />
        </svg>

        {/* Moon */}
        <div style={{ position: 'absolute', top: '0px', right: '60px', width: '28px', height: '28px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 20px rgba(251,191,36,0.4)' }} />

        {/* Car — bouncing */}
        <div style={{ position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', animation: 'carBounce 0.25s ease-in-out infinite alternate' }}>
          <svg width="120" height="52" viewBox="0 0 120 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Body */}
            <rect x="8" y="22" width="104" height="22" rx="4" fill="#f59e0b"/>
            {/* Roof */}
            <path d="M30 22 L40 8 L82 8 L92 22 Z" fill="#fbbf24"/>
            {/* Windows */}
            <rect x="42" y="10" width="16" height="11" rx="2" fill="#93c5fd" opacity="0.8"/>
            <rect x="62" y="10" width="16" height="11" rx="2" fill="#93c5fd" opacity="0.8"/>
            {/* Wheels */}
            <circle cx="30" cy="44" r="8" fill="#111827"/>
            <circle cx="30" cy="44" r="4" fill="#374151"/>
            <circle cx="90" cy="44" r="8" fill="#111827"/>
            <circle cx="90" cy="44" r="4" fill="#374151"/>
            {/* Headlight */}
            <rect x="108" y="26" width="6" height="8" rx="2" fill="#fef3c7"/>
            {/* Taillight */}
            <rect x="6" y="26" width="4" height="8" rx="2" fill="#ef4444"/>
            {/* Door line */}
            <line x1="60" y1="22" x2="60" y2="44" stroke="#d97706" strokeWidth="1.5"/>
            {/* Door handles */}
            <rect x="48" y="31" width="8" height="2.5" rx="1.25" fill="#d97706"/>
            <rect x="64" y="31" width="8" height="2.5" rx="1.25" fill="#d97706"/>
          </svg>
          {/* Headlight beam */}
          <div style={{ position: 'absolute', right: '-30px', top: '28px', width: '35px', height: '12px', background: 'linear-gradient(90deg, rgba(254,243,199,0.5), transparent)', borderRadius: '0 50% 50% 0', transform: 'skewY(-8deg)' }} />
          {/* Exhaust puffs */}
          <div style={{ position: 'absolute', left: '-10px', top: '28px', display: 'flex', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(156,163,175,0.5)', animation: 'puff 0.6s ease-out infinite' }} />
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(156,163,175,0.3)', animation: 'puff 0.6s ease-out 0.2s infinite' }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '10px 28px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'DM Mono', monospace", transition: 'background 0.2s' }}
          onMouseOver={e => e.target.style.background = '#d97706'}
          onMouseOut={e => e.target.style.background = '#f59e0b'}
        >
          Back to Dashboard
        </button>
        <p style={{ color: '#4b5563', fontSize: '11px', letterSpacing: '1px' }}>
          Auto-redirecting in {countdown}s
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Barlow+Condensed:wght@400;600;700;800&display=swap');
        @keyframes carBounce {
          from { transform: translateX(-50%) translateY(0px); }
          to   { transform: translateX(-50%) translateY(-2px); }
        }
        @keyframes roadScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-70px); }
        }
        @keyframes pulse404 {
          0%, 100% { opacity: 1; text-shadow: 0 0 40px rgba(245,158,11,0.3); }
          50%       { opacity: 0.7; text-shadow: 0 0 80px rgba(245,158,11,0.6); }
        }
        @keyframes puff {
          0%   { transform: translateX(0) scale(1); opacity: 0.6; }
          100% { transform: translateX(-20px) scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
