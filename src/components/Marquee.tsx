import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface MarqueeProps {
  children: ReactNode
  className?: string
  loop?: boolean
}

export function Marquee({ children, className = '', loop = true }: MarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    const text = textRef.current
    if (!container || !text) return
    const check = () => {
      const over = text.scrollWidth > container.clientWidth
      setOverflowing(over)
      if (over) {
        setDuration(Math.max(5, (text.scrollWidth - container.clientWidth) / 50))
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
  }, [children])

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
