'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
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

  // Extract all SelectItems to create a value-to-text mapping
  const valueToTextMap = useMemo(() => {
    const map = new Map<string, string>()
    const extractItems = (node: React.ReactNode): void => {
      React.Children.forEach(node, child => {
        if (React.isValidElement(child)) {
          if (child.type === SelectContent) {
            extractItems(child.props.children)
          } else if (child.type === SelectItem) {
            const itemValue = child.props.value
            // Get text from children - handle both string and React nodes
            let itemText = ''
            const children = child.props.children
            
            // Helper function to recursively extract text from React nodes
            const extractText = (node: React.ReactNode): string => {
              if (typeof node === 'string') {
                return node
              }
              if (typeof node === 'number') {
                return String(node)
              }
              if (Array.isArray(node)) {
                return node.map(extractText).join('')
              }
              if (React.isValidElement(node)) {
                if (node.props?.children) {
                  return extractText(node.props.children)
                }
                return ''
              }
              return ''
            }
            
            itemText = extractText(children).trim()
            
            if (itemValue && itemText) {
              map.set(itemValue, itemText)
            }
          } else if (child.props?.children) {
            extractItems(child.props.children)
          }
        }
      })
    }
    extractItems(children)
    return map
  }, [children])

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
            // Pass value, isOpen, and valueToTextMap to trigger
            return React.cloneElement(child, {
              onClick: () => setIsOpen(!isOpen),
              isOpen,
              currentValue: value,
              valueToTextMap
            })
          }
          if (child.type === SelectContent) {
            // Only render SelectContent when open
            if (isOpen) {
              return React.cloneElement(child, {
                onSelect: (value: string) => {
                  onValueChange(value)
                  setIsOpen(false)
                },
                currentValue: value
              })
            }
            // Don't render SelectContent when closed
            return null
          }
        }
        // Render other children as-is (like SelectValue inside SelectTrigger)
        return child
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
  currentValue?: string
  valueToTextMap?: Map<string, string>
}

export function SelectTrigger({ children, className, onClick, isOpen, currentValue, valueToTextMap, ...props }: SelectTriggerProps) {
  return (
    <div
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === SelectValue) {
          return React.cloneElement(child, {
            currentValue,
            valueToTextMap
          })
        }
        return child
      })}
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
    <div className="absolute z-[100] w-full top-full mt-1 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
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

interface SelectValueProps {
  placeholder?: string
  currentValue?: string
  valueToTextMap?: Map<string, string>
  children?: React.ReactNode
}

export function SelectValue({ placeholder, currentValue, valueToTextMap }: SelectValueProps) {
  // If we have a current value and a map, look up the display text
  if (currentValue && valueToTextMap && valueToTextMap.has(currentValue)) {
    const displayText = valueToTextMap.get(currentValue)
    return <span className="text-gray-900">{displayText}</span>
  }
  
  return <span className="text-gray-500">{placeholder}</span>
}

