export const metadata = {
  title: "Galaxia — We'll Be Back Soon",
  description: "Galaxia is temporarily under maintenance. We'll be back shortly.",
};

export default function MaintenancePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#fff',
      fontFamily: 'var(--font-manrope), system-ui, sans-serif',
      padding: '2rem',
      textAlign: 'center' as const,
      position: 'relative' as const,
      overflow: 'hidden',
    }}>
      {/* Decorative glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(196,167,118,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '520px',
      }}>
        {/* Logo / Brand */}
        <div style={{
          fontSize: '3rem',
          fontWeight: 800,
          letterSpacing: '0.15em',
          background: 'linear-gradient(135deg, #c4a776, #f0d9a0, #c4a776)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '2rem',
        }}>
          GALAXIA
        </div>

        {/* Divider */}
        <div style={{
          width: '60px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #c4a776, transparent)',
          margin: '0 auto 2rem',
        }} />

        {/* Heading */}
        <h1 style={{
          fontSize: '1.6rem',
          fontWeight: 600,
          marginBottom: '1rem',
          color: '#f0f0f0',
        }}>
          We&apos;ll Be Back Soon
        </h1>

        {/* Message */}
        <p style={{
          fontSize: '1rem',
          lineHeight: 1.7,
          color: 'rgba(255,255,255,0.6)',
          marginBottom: '2.5rem',
        }}>
          We&apos;re currently making some improvements to give you an even better experience. 
          Please check back shortly.
        </p>

        {/* Subtle animated dots */}
        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#c4a776',
              opacity: 0.4,
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
