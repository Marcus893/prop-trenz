import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface AccordionItemProps {
  question: string
  answer: React.ReactNode
  defaultOpen?: boolean
}

export function AccordionItem({ question, answer, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${question.slice(0, 20).replace(/\s+/g, '-')}`}
      >
        <h3 className="text-lg font-medium text-gray-900 pr-4 flex-1">{question}</h3>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div
          id={`faq-answer-${question.slice(0, 20).replace(/\s+/g, '-')}`}
          className="pb-4 pl-2 text-sm leading-6 text-gray-700"
        >
          {answer}
        </div>
      )}
    </div>
  )
}

interface AccordionProps {
  items: Array<{ question: string; answer: React.ReactNode }>
  defaultOpenIndex?: number
}

export function Accordion({ items, defaultOpenIndex }: AccordionProps) {
  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <AccordionItem
          key={item.question}
          question={item.question}
          answer={item.answer}
          defaultOpen={index === defaultOpenIndex}
        />
      ))}
    </div>
  )
}

