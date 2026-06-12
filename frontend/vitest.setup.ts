import '@testing-library/jest-dom'

// jsdom ships neither observer. framer-motion's `whileInView` needs
// IntersectionObserver; recharts' ResponsiveContainer needs ResizeObserver.
class MockObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return []
  }
}
globalThis.IntersectionObserver ??= MockObserver as unknown as typeof IntersectionObserver
globalThis.ResizeObserver ??= MockObserver as unknown as typeof ResizeObserver

// jsdom doesn't implement matchMedia; CountUp / useGsap (and prefers-reduced-motion
// checks) rely on it. Default to "no reduced-motion preference".
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/font/google — returns CSS variable names
vi.mock('next/font/google', () => ({
  Space_Grotesk: () => ({ variable: '--font-space-grotesk', className: 'space-grotesk' }),
  Inter: () => ({ variable: '--font-inter', className: 'inter' }),
  JetBrains_Mono: () => ({ variable: '--font-jetbrains-mono', className: 'jetbrains-mono' }),
}))

// Suppress console.error noise from React in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return
    originalError(...args)
  }
})
afterAll(() => {
  console.error = originalError
})
