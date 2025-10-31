'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={selectRef} className="relative">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === SelectTrigger) {
            // Only pass visual/control props; avoid forwarding handlers/values to DOM
            return React.cloneElement(child, {
              onClick: () => setIsOpen(!isOpen),
              isOpen
            })
          }
          if (child.type === SelectContent && isOpen) {
            return React.cloneElement(child, {
              onSelect: (value: string) => {
                onValueChange(value)
                setIsOpen(false)
              },
              currentValue: value
            })
          }
        }
        return null
      })}
    </div>
  )
}

interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  onClick?: () => void
  isOpen?: boolean
  onValueChange?: (value: string) => void
  value?: string
}

export function SelectTrigger({ children, className, onClick, isOpen, ...props }: SelectTriggerProps) {
  return (
    <div
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
    </div>
  )
}

interface SelectContentProps {
  children: React.ReactNode
  onSelect?: (value: string) => void
  currentValue?: string
}

export function SelectContent({ children, onSelect, currentValue }: SelectContentProps) {
  return (
    <div className="absolute z-50 w-full mt-1 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === SelectItem) {
          return React.cloneElement(child, {
            onSelect,
            isSelected: child.props.value === currentValue
          })
        }
        return child
      })}
    </div>
  )
}

interface SelectItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  children: React.ReactNode
  value: string
  onSelect?: (value: string) => void
  isSelected?: boolean
}

export function SelectItem({ children, value, onSelect, isSelected, className, ...props }: SelectItemProps) {
  return (
    <div
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100",
        isSelected && "bg-blue-50 text-blue-600",
        className
      )}
      onClick={() => onSelect?.(value)}
      {...props}
    >
      {children}
    </div>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-gray-500">{placeholder}</span>
}

