'use client'

import { useState, useRef, useEffect, useId, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { NeonButton } from './ui/NeonButton'
import { useStore } from '@/lib/store'
import { useSSEStream } from '@/lib/sse'
import type { AgentStreamEvent } from '@/lib/types'

const SUGGESTED_QUESTIONS = [
  'Why was last month so high?',
  'What\'s my biggest impact area?',
  'How do I hit 2t CO₂e by year end?',
]

export function CarbonConversations() {
  const { chatOpen, chatMessages, chatStreaming, activities, setChatOpen, addChatMessage, updateLastAssistantMessage, setChatStreaming } =
    useStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const reducedMotion = useReducedMotion()
  const panelId = useId()
  const headingId = useId()
  const { stream, abort } = useSSEStream()

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' })
  }, [chatMessages, reducedMotion])

  // Focus input on open
  useEffect(() => {
    if (chatOpen) inputRef.current?.focus()
  }, [chatOpen])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || chatStreaming) return
    setInput('')

    // Build session history for context
    const sessionHistory = chatMessages.slice(-6).map((m) => ({ role: m.role, content: m.content }))

    addChatMessage({ id: `user-${Date.now()}`, role: 'user', content: text })
    addChatMessage({ id: `ai-${Date.now()}`, role: 'assistant', content: '', isStreaming: true, agent: 'Carbon AI' })
    setChatStreaming(true)

    await stream(
      '/api/v1/chat',
      { body: { message: text, relevant_activities: activities.slice(0, 20), session_history: sessionHistory } },
      (event: AgentStreamEvent) => {
        if (event.type === 'token') {
          updateLastAssistantMessage(event.content)
        }
      },
      () => {
        updateLastAssistantMessage('', true)
        setChatStreaming(false)
      },
      () => {
        updateLastAssistantMessage(' (error — please try again)', true)
        setChatStreaming(false)
      },
    )
  }, [chatStreaming, chatMessages, activities, stream, addChatMessage, updateLastAssistantMessage, setChatStreaming])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void sendMessage(input)
  }

  function handleClose() {
    abort()
    setChatOpen(false)
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => chatOpen ? handleClose() : setChatOpen(true)}
        aria-expanded={chatOpen}
        aria-controls={panelId}
        aria-label={chatOpen ? 'Close Carbon AI chat' : 'Open Carbon AI chat'}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl glass border border-neon-purple/30 text-neon-purple shadow-neon-purple hover:bg-neon-purple/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple"
        whileHover={reducedMotion ? {} : { scale: 1.05 }}
        whileTap={reducedMotion ? {} : { scale: 0.97 }}
      >
        <span aria-hidden="true" className="text-lg">✦</span>
        <span className="font-display font-semibold text-sm">Carbon AI</span>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={headingId}
            className="fixed bottom-20 right-6 z-40 w-[min(480px,calc(100vw-48px))] flex flex-col"
            style={{ height: 'min(600px, calc(100dvh - 120px))' }}
            initial={reducedMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 400, damping: 30 }}
          >
            <GlassCard variant="glow-purple" padding="none" className="flex flex-col h-full">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-neon-purple" aria-hidden="true">✦</span>
                  <h2 id={headingId} className="font-display font-semibold text-text-primary">
                    Carbon AI
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  aria-label="Close chat panel"
                  className="text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple rounded p-0.5"
                >
                  ✕
                </button>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3"
                aria-label="Chat messages"
                aria-live="polite"
              >
                {chatMessages.length === 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-text-muted text-sm text-center py-4">
                      Ask me anything about your carbon data
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {SUGGESTED_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => void sendMessage(q)}
                          className="text-left text-sm text-text-secondary glass px-3 py-2 rounded-xl hover:text-neon-purple hover:border-neon-purple/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {msg.role === 'assistant' && msg.agent && (
                      <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider px-1">
                        via {msg.agent}
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'glass border border-neon-cyan/20 text-text-primary'
                          : 'glass border border-neon-purple/20 text-text-primary'
                      }`}
                    >
                      {msg.content}
                      {msg.isStreaming && (
                        <span
                          className={`inline-block w-0.5 h-4 bg-neon-purple ml-0.5 align-middle ${reducedMotion ? '' : 'animate-pulse'}`}
                          aria-label="Typing indicator"
                        />
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className="px-4 py-3 border-t border-white/10 flex gap-2 flex-shrink-0"
              >
                <label htmlFor="chat-input" className="sr-only">
                  Ask about your carbon data
                </label>
                <input
                  ref={inputRef}
                  id="chat-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about your carbon data..."
                  disabled={chatStreaming}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/30 disabled:opacity-50"
                />
                <NeonButton
                  type="submit"
                  size="sm"
                  variant="purple"
                  disabled={!input.trim() || chatStreaming}
                  aria-label="Send message"
                >
                  ↑
                </NeonButton>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
