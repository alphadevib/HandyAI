import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { BrandMark } from '../components/Brand'
import { Icon } from '../components/Icons'
import ProductCard from '../components/ProductCard'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useFavoriteToggle } from '../hooks'
import { randomId } from '../visitor'

const STORAGE_KEY = 'handyai.chat'
const STARTERS = [
  'Edit videos for my YouTube channel',
  'Summarise my meetings automatically',
  "I'm a chartered accountant",
  'Free tools to design a logo',
]

const SpeechRecognition =
  typeof window === 'undefined' ? null : window.SpeechRecognition ?? window.webkitSpeechRecognition

function readSaved() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved?.messages) return saved
  } catch {
    /* start fresh */
  }
  return { messages: [], context: null }
}

/**
 * Conversational tool finder. Type or speak; every answer comes with the matching tools and a few
 * one-tap follow-ups. The conversation is kept for this browser tab only.
 */
export default function Chat() {
  const { user } = useAuth()
  const { currency } = usePrefs()
  const [{ messages, context }, setConversation] = useState(readSaved)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const recognition = useRef(null)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, context }))
    } catch {
      /* the conversation just will not survive a reload */
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, context])

  useEffect(() => () => recognition.current?.abort(), [])

  const send = useCallback(
    async (text) => {
      const message = text.trim()
      if (!message || sending) return
      setDraft('')
      setSending(true)
      setConversation((current) => ({
        ...current,
        messages: [...current.messages, { role: 'user', text: message, id: randomId() }],
      }))
      try {
        // The site's currency switch decides, except while a budget is set: "under $20" must stay
        // twenty dollars on the next turn even if the switch says rupees.
        const outgoing = {
          ...(context ?? {}),
          currency: context?.maxMonthlyPrice != null ? context.currency : currency,
        }
        const reply = await api.chat(message, outgoing)
        setConversation((current) => ({
          context: reply.context,
          messages: [
            ...current.messages,
            {
              role: 'assistant',
              id: randomId(),
              text: reply.reply,
              picks: reply.recommendations,
              suggestions: reply.suggestions,
            },
          ],
        }))
      } catch (error) {
        setConversation((current) => ({
          ...current,
          messages: [
            ...current.messages,
            { role: 'assistant', id: randomId(), text: error.message, error: true },
          ],
        }))
      } finally {
        setSending(false)
        inputRef.current?.focus()
      }
    },
    [context, currency, sending],
  )

  const toggleVoice = () => {
    setVoiceError('')
    if (!SpeechRecognition) {
      setVoiceError('Voice input needs Chrome, Edge or Safari. You can still type your question.')
      return
    }
    if (listening) {
      recognition.current?.stop()
      return
    }
    const recogniser = new SpeechRecognition()
    recogniser.lang = 'en-IN'
    recogniser.interimResults = true
    recogniser.continuous = false
    let finalText = ''
    recogniser.onresult = (event) => {
      let interim = ''
      for (const result of event.results) {
        if (result.isFinal) finalText = result[0].transcript
        else interim += result[0].transcript
      }
      setDraft(finalText || interim)
    }
    recogniser.onerror = (event) => {
      setVoiceError(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone access was blocked. Allow it in the browser to talk to HandyAI.'
          : event.error === 'no-speech'
            ? 'I did not catch that. Tap the microphone and try again.'
            : 'Voice input stopped. You can type instead.',
      )
    }
    recogniser.onend = () => {
      setListening(false)
      recognition.current = null
      if (finalText.trim()) send(finalText)
    }
    recognition.current = recogniser
    setListening(true)
    recogniser.start()
  }

  const applyFavorite = useCallback((update) => {
    setConversation((current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.picks
          ? { ...message, picks: message.picks.map((pick) => ({ ...pick, tool: update(pick.tool) })) }
          : message,
      ),
    }))
  }, [])
  const favorites = useFavoriteToggle(applyFavorite)

  const reset = () => {
    recognition.current?.abort()
    setConversation({ messages: [], context: null })
  }

  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
  const chips = messages.length === 0 ? STARTERS : (lastAssistant?.suggestions ?? [])

  return (
    <section className="page chat-page">
      <header className="chat-head">
        <div>
          <p className="eyebrow">AI Chat</p>
          <h1>Ask HandyAI</h1>
          <p className="lede">
            Say or type what you are trying to do. Refine with “only free ones”, “under ₹1,000 a
            month” or “I&apos;m a teacher”.
            {user?.profession && ` Answers are tuned for a ${user.profession.toLowerCase()}.`}
          </p>
        </div>
        {messages.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
            New chat
          </button>
        )}
      </header>

      <div className="chat-window" aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <BrandMark size={56} />
            <h2>What do you need an AI tool for?</h2>
            <p>Tap the microphone and just say it, or pick a starter below.</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`bubble-row ${message.role}`}>
            {message.role === 'assistant' && <BrandMark size={30} className="bubble-avatar" />}
            <div className={`bubble ${message.error ? 'is-error' : ''}`}>
              <p>{message.text}</p>
              {message.picks?.length > 0 && (
                <div className="chat-picks">
                  {message.picks.map((pick) => (
                    <ProductCard
                      key={pick.tool.slug}
                      tool={pick.tool}
                      reasons={pick.reasons}
                      matchScore={pick.matchScore}
                      busy={favorites.busySlug === pick.tool.slug}
                      onToggleFavorite={favorites.toggle}
                      compact
                      source="chat"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="bubble-row assistant">
            <BrandMark size={30} className="bubble-avatar" />
            <div className="bubble typing" aria-label="HandyAI is typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {chips.length > 0 && (
        <div className="chip-row">
          {chips.map((chip) => (
            <button key={chip} type="button" className="chip" onClick={() => send(chip)} disabled={sending}>
              {chip}
            </button>
          ))}
        </div>
      )}

      {voiceError && <p className="voice-error" role="alert">{voiceError}</p>}
      {favorites.error && <p className="voice-error" role="alert">{favorites.error}</p>}

      <form
        className="chat-input"
        onSubmit={(event) => {
          event.preventDefault()
          send(draft)
        }}
      >
        <button
          type="button"
          className={`mic-btn ${listening ? 'is-listening' : ''}`}
          onClick={toggleVoice}
          aria-pressed={listening}
          title={listening ? 'Stop listening' : 'Speak your question'}
        >
          <Icon name="mic" size={22} />
          <span className="sr-only">{listening ? 'Stop listening' : 'Speak your question'}</span>
        </button>
        <label htmlFor="chat-draft" className="sr-only">
          Your message
        </label>
        <input
          id="chat-draft"
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={listening ? 'Listening…' : 'e.g. I need to turn podcasts into short clips'}
          maxLength={500}
          autoComplete="off"
        />
        <button type="submit" className="send-btn" disabled={!draft.trim() || sending}>
          <Icon name="send" size={20} />
          <span className="sr-only">Send</span>
        </button>
      </form>
    </section>
  )
}
