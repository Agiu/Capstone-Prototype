import { createContext, useContext, useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, onDisconnect } from 'firebase/database'

// Public web config (the apiKey is a client identifier, not a secret).
const firebaseConfig = {
  apiKey: 'AIzaSyBUbiIh2uh36IcHo7In3x1jL8443OgRmGY',
  authDomain: 'xboxcapstone.firebaseapp.com',
  databaseURL: 'https://xboxcapstone-default-rtdb.firebaseio.com',
  projectId: 'xboxcapstone',
  storageBucket: 'xboxcapstone.firebasestorage.app',
  messagingSenderId: '179926477180',
  appId: '1:179926477180:web:6f09cde7811f47de839cf9',
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

// The shared room the 4 testers join (from ?room=…). One room = one group.
export const ROOM_ID = new URLSearchParams(window.location.search).get('room') || 'session1'

/**
 * Subscribe a component tree to a shared room. The whole blends array is the
 * synced document — small enough that whole-array writes are simplest and give
 * last-write-wins, which is fine for a moderated 4-person test.
 */
export function useRoom({ self, seedBlends }) {
  const [blends, setBlendsState] = useState(seedBlends)
  const [ready, setReady] = useState(false)
  const [online, setOnline] = useState([])
  // Moderator-set display-name overrides, keyed by identity (abby/blake/…).
  const [names, setNames] = useState({})
  useEffect(() => {
    const r = ref(db, `rooms/${ROOM_ID}/names`)
    const unsub = onValue(r, (snap) => setNames(snap.val() || {}))
    return () => unsub()
  }, [])
  // Moderator-hidden profiles, keyed by identity — hidden everywhere for everyone.
  const [hiddenProfiles, setHiddenProfiles] = useState({})
  useEffect(() => {
    const r = ref(db, `rooms/${ROOM_ID}/hidden`)
    const unsub = onValue(r, (snap) => setHiddenProfiles(snap.val() || {}))
    return () => unsub()
  }, [])

  // Blends: subscribe. Rooms start empty (no premade Mixes) and stay whatever
  // the group builds — an empty room reads back as null, which we treat as [].
  useEffect(() => {
    const r = ref(db, `rooms/${ROOM_ID}/blends`)
    const unsub = onValue(r, (snap) => {
      const v = snap.val()
      // RTDB returns arrays for contiguous integer keys; normalize just in case.
      setBlendsState(Array.isArray(v) ? v.filter(Boolean) : v && typeof v === 'object' ? Object.values(v) : [])
      setReady(true)
    })
    return () => unsub()
    // seedBlends is a stable module constant; roomId is fixed per load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Presence: heartbeat my profile, and track who's currently online.
  useEffect(() => {
    if (!self) return
    const meRef = ref(db, `rooms/${ROOM_ID}/presence/${self}`)
    const beat = () => set(meRef, Date.now())
    beat()
    onDisconnect(meRef).remove()
    const t = setInterval(beat, 20000)
    const pRef = ref(db, `rooms/${ROOM_ID}/presence`)
    const unsub = onValue(pRef, (snap) => {
      const v = snap.val() || {}
      const now = Date.now()
      setOnline(Object.keys(v).filter((k) => now - v[k] < 60000))
    })
    return () => {
      clearInterval(t)
      unsub()
      set(meRef, null)
    }
  }, [self])

  const setBlends = (next) => set(ref(db, `rooms/${ROOM_ID}/blends`), next)
  // Patch one blend's fields via LEAF writes (blends/<idx>/<field>) instead of a
  // whole-array set. Whole-array last-write-wins clobbers concurrent edits — e.g.
  // one person accepting an invite (adding themselves to `members`) while another
  // edits a different blend would lose the membership. Per-field leaf writes let
  // those land independently. Structural add/remove still go through setBlends.
  const patchBlendById = (id, patch) => {
    const idx = blends.findIndex((b) => b && b.id === id)
    if (idx < 0) return
    Object.entries(patch).forEach(([k, v]) => set(ref(db, `rooms/${ROOM_ID}/blends/${idx}/${k}`), v))
  }
  // Reset wipes the Mixes AND the ephemeral room state: DM history, any live
  // spin/launch party, group preferences/wheels, and the spectate mirrors.
  const resetRoom = () => {
    set(ref(db, `rooms/${ROOM_ID}/blends`), seedBlends)
    set(ref(db, `rooms/${ROOM_ID}/dms`), null)
    set(ref(db, `rooms/${ROOM_ID}/spin`), null)
    set(ref(db, `rooms/${ROOM_ID}/launch`), null)
    set(ref(db, `rooms/${ROOM_ID}/prefs`), null)
    set(ref(db, `rooms/${ROOM_ID}/wheel`), null)
    set(ref(db, `rooms/${ROOM_ID}/spectate`), null)
    set(ref(db, `rooms/${ROOM_ID}/hidden`), null)
  }

  const setName = (key, name) => set(ref(db, `rooms/${ROOM_ID}/names/${key}`), name || null)
  const setHiddenProfile = (key, hidden) => set(ref(db, `rooms/${ROOM_ID}/hidden/${key}`), hidden ? true : null)
  return { blends, ready, online, names, hiddenProfiles, setBlends, patchBlendById, resetRoom, setName, setHiddenProfile }
}

// Sync an arbitrary sub-tree of the room (e.g. decide-a-game preferences).
// `ready` tells you the first snapshot has landed, so callers can tell "no
// value" apart from "not loaded yet".
export function useRoomNode(path, fallback) {
  const [val, setVal] = useState(fallback)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(false)
    const r = ref(db, `rooms/${ROOM_ID}/${path}`)
    const unsub = onValue(r, (snap) => {
      setVal(snap.val() ?? fallback)
      setReady(true)
    })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])
  const write = (next) => set(ref(db, `rooms/${ROOM_ID}/${path}`), next)
  return [val, write, ready]
}

// Write a single leaf without touching its siblings. Used where several people
// write into the same object at once (e.g. one vote each) and a whole-object
// write would drop the votes that landed in between.
export function writeRoomPath(path, value) {
  return set(ref(db, `rooms/${ROOM_ID}/${path}`), value)
}

const RoomContext = createContext(null)
export const RoomProvider = RoomContext.Provider
export function useRoomCtx() {
  return useContext(RoomContext)
}
