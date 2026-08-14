import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface MarqueeProps {
  children: ReactNode
  className?: string
  loop?: boolean
  speed?: number
}

export function Marquee({ children, className = '', loop = true, speed = 50 }: MarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const check = () => {
      const c = containerRef.current
      const text = textRef.current
      if (!c || !text) return
      const over = text.scrollWidth > c.clientWidth
      setOverflowing(over)
      if (over) {
        setDuration(Math.max(5, (text.scrollWidth - c.clientWidth) / speed))
      }
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(container)
    window.addEventListener('resize', check)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [children, speed])

  return (
    <div ref={containerRef} className={`min-w-0 overflow-hidden ${className}`}>
      {overflowing ? (
        <div
          className={`marquee-track ${loop ? '' : 'marquee-once'}`}
          style={{ animationDuration: `${duration}s` }}
        >
          <span ref={textRef}>{children}</span>
          <span aria-hidden>{children}</span>
        </div>
      ) : (
        <span ref={textRef} className="block truncate">
          {children}
        </span>
      )}
    </div>
  )
}
