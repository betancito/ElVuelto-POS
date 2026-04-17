import ColorBends from '@/components/ui/ColorBends'

export default function ColorBendsTestPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#fff8f0' }}>
      <ColorBends
        colors={['#A855F7', '#6d28d9', '#c084fc']}
        rotation={90}
        autoRotate={5}
        speed={0.2}
        scale={1}
        frequency={1}
        warpStrength={1}
        mouseInfluence={1}
        parallax={0.5}
        noise={0.15}
        iterations={3}
        intensity={1.5}
        bandWidth={6}
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
        zIndex: 1,
      }}>
        ColorBends Test — if you see animated purple waves behind this card it works ✓
      </div>
    </div>
  )
}
