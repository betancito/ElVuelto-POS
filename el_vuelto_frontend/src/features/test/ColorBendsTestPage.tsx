import ColorBends from '@/components/ui/ColorBends'

export default function ColorBendsTestPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#fff8f0' }}>
      <ColorBends
        colors={['#8b3a0f', '#fff8f0']}
        rotation={90}
        speed={0.15}
        scale={1.2}
        frequency={0.8}
        warpStrength={0.8}
        mouseInfluence={0.4}
        parallax={0.3}
        noise={0.08}
        iterations={2}
        intensity={1.2}
        bandWidth={5}
        transparent
      />
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        padding: '2rem 3rem',
        borderRadius: '1rem',
        fontFamily: 'sans-serif',
        fontSize: '1.25rem',
        fontWeight: 600,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }}>
        ColorBends Test — if you see animated waves behind this card it works ✓
      </div>
    </div>
  )
}
