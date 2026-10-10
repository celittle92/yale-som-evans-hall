import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import World from './World.jsx'
import Player from './Player.jsx'
import Minimap from './Minimap.jsx'
import TouchControls from './TouchControls.jsx'
import ChatWindow from './ChatWindow.jsx'
import { EYE, SPAWN } from './layout.js'

// Professors you can actually talk to. The backend has an agent for each id.
const TALKABLE = {
  zaman: {
    name: 'Prof. Tauhid Zaman',
    subtitle: 'MGT 409 · AI Foundations for Managers · Room 2400',
    greeting: "Yo. You caught me between sections — what's up?",
  },
}

export default function App() {
  const [locked, setLocked] = useState(false)
  const [where, setWhere] = useState('')
  const [showMap, setShowMap] = useState(true)
  const lockRef = useRef()
  const mapRef = useRef()
  const onLock = useCallback((v) => setLocked(v), [])
  const onWhere = useCallback((w) => setWhere(w), [])
  // phones have no pointer lock, so they get a joystick + drag-to-look instead
  const [isTouch] = useState(() => matchMedia('(pointer: coarse)').matches) // phones + tablets; touchscreen laptops still get mouse mode
  const [touchOn, setTouchOn] = useState(false)
  const touchRef = useRef({ active: false, move: [0, 0], look: [0, 0], jump: false })
  const setTouch = (on) => {
    touchRef.current.active = on
    touchRef.current.move = [0, 0]
    setTouchOn(on)
  }
  const playing = locked || touchOn

  // who you are currently aimed at, and who you are mid-conversation with
  const [focusedProf, setFocusedProf] = useState(null)
  const [chatWith, setChatWith] = useState(null)
  const onProfFocus = useCallback((id) => setFocusedProf(id), [])

  const openChat = useCallback((id) => {
    if (!TALKABLE[id]) return
    document.exitPointerLock?.()
    touchRef.current.move = [0, 0]
    setChatWith(id)
  }, [])

  const closeChat = useCallback(() => {
    setChatWith(null)
    // Walk away, back into the room. Only re-lock if the mouse was driving before; the joystick
    // never had pointer lock. Chrome rejects a lock request straight after exitPointerLock,
    // so give it a beat and swallow the failure if it still says no.
    if (!isTouch && !touchOn) {
      setTimeout(() => {
        try {
          lockRef.current?.()
        } catch {
          /* the overlay will offer to walk back in */
        }
      }, 300)
    }
  }, [isTouch, touchOn])

  useEffect(() => {
    const k = (e) => {
      if (chatWith) return // typing in the chat box should not drive the game
      if (e.code === 'KeyM') setShowMap((v) => !v)
      if (e.code === 'KeyE' && focusedProf) openChat(focusedProf)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [chatWith, focusedProf, openChat])

  // While pointer-locked there is no cursor to click with, so a click anywhere counts as
  // "click the professor you are aimed at".
  useEffect(() => {
    if (!playing || chatWith || !focusedProf) return
    const onClick = () => openChat(focusedProf)
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [playing, chatWith, focusedProf, openChat])

  const talkable = focusedProf && TALKABLE[focusedProf]

  return (
    <>
      <Canvas
        camera={{ fov: 72, near: 0.05, far: 800, position: [SPAWN.x, EYE, SPAWN.z] }}
        dpr={[1, 1.75]}
      >
        <World talkingTo={chatWith} onProfFocus={onProfFocus} onProfActivate={openChat} />
        <Player lockRef={lockRef} mapRef={mapRef} touchRef={touchRef} onLock={onLock} onWhere={onWhere} />
      </Canvas>

      <div className="where">
        <span className="dot" />
        {where}
      </div>
      <div className={showMap ? 'mapwrap' : 'mapwrap hidden'}>
        <Minimap drawRef={mapRef} />
      </div>
      <button className="maptoggle" onClick={() => setShowMap((s) => !s)}>
        {showMap ? 'hide map' : 'map'}
      </button>
      {playing && !chatWith && <div className="crosshair" />}
      {playing && !chatWith && talkable && (
        <div className="talkhint">
          <b>Click</b> or press <b>E</b> to talk to {talkable.name}
        </div>
      )}
      {touchOn && !chatWith && <TouchControls touchRef={touchRef} onPause={() => setTouch(false)} />}

      {chatWith && (
        <div className="chatscrim" onClick={closeChat}>
          <ChatWindow
            professorId={chatWith}
            professorName={TALKABLE[chatWith].name}
            subtitle={TALKABLE[chatWith].subtitle}
            greeting={TALKABLE[chatWith].greeting}
            onClose={closeChat}
          />
        </div>
      )}

      {!playing && !chatWith && (
        <div className="overlay" onClick={() => (isTouch ? setTouch(true) : lockRef.current?.())}>
          <div className="card">
            <div className="kicker">Yale SOM · Evans Hall</div>
            <h1>Floor 2</h1>
            <p className="sub">Classroom drums, the cloister, Ross Library, the Beinecke Terrace Room, and the courtyard.</p>
            <button className="go">{isTouch ? 'Tap to walk in' : 'Click to walk in'}</button>
            {!isTouch && (
              <button
                className="go alt"
                onClick={(e) => {
                  e.stopPropagation()
                  setTouch(true)
                }}
              >
                Use on-screen joystick
              </button>
            )}
            {isTouch ? (
              <div className="keys">
                <span><b>Left thumb</b> joystick to walk (push all the way to hurry)</span>
                <span><b>Right thumb</b> drag to look</span>
              </div>
            ) : (
              <div className="keys">
                <span><b>W A S D</b> walk</span>
                <span><b>Mouse</b> look</span>
                <span><b>Shift</b> sprint</span>
                <span><b>Space</b> jump</span>
                <span><b>C</b> crouch</span>
                <span><b>M</b> map</span>
                <span><b>E</b> talk</span>
                <span><b>Esc</b> pause</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
