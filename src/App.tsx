import { Suspense, lazy, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { useGame, type Who } from './state/store';
import { Title, Studio, Hud, MemoryCard, ChapterPlayer, Loader } from './ui/Overlays';
import { Chibi } from './world/Chibi';
import { attachKeyboard, setInputEnabled } from './game/input';
import { cue, setSoundEnabled } from './game/audio';

const World = lazy(() => import('./world/World'));
const touchDevice = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/** The dressing-room preview: both characters on a soft-lit turntable. */
function StudioScene({ focus }: { focus: Who }) {
  const { su, phu } = useGame();
  const narrow = useThree((st) => st.size.width < 700);
  const camera = useThree((st) => st.camera);
  useEffect(() => {
    camera.position.set(0, narrow ? 1.1 : 1.5, narrow ? 6.4 : 4.2);
  }, [camera, narrow]);
  return (
    <>
      <color attach="background" args={['#1a1f33']} />
      <fog attach="fog" args={['#1a1f33', 8, 18]} />
      <hemisphereLight args={['#c9d7ff', '#2a2233', 0.9]} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-2.5, 2, 1.5]} intensity={6} color="#ffcf8a" />
      <Environment preset="apartment" environmentIntensity={0.35} />
      <group position={[narrow ? 0 : focus === 'su' ? 0.45 : -0.45, 0, 0]}>
        <group position={[-0.45, 0, 0]} rotation={[0, 0.25, 0]}>
          <Chibi kind="su" su={su} phu={phu} />
        </group>
        <group position={[0.45, 0, 0]} rotation={[0, -0.25, 0]}>
          <Chibi kind="phu" su={su} phu={phu} />
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.4, 64]} />
        <meshStandardMaterial color="#2b2f45" roughness={0.6} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.5} blur={2.2} far={2} />
      <OrbitControls
        target={[0, narrow ? -0.55 : 1, 0]}
        enablePan={false}
        minDistance={2.4}
        maxDistance={7.5}
        minPolarAngle={0.6}
        maxPolarAngle={1.5}
        autoRotate
        autoRotateSpeed={0.6}
      />
    </>
  );
}

export default function App() {
  const phase = useGame((s) => s.phase);
  const [tab, setTab] = useState<Who>('su');
  const modal = useGame((s) => !!s.active || !!s.chapter);
  useEffect(() => attachKeyboard(), []);
  const sound = useGame((s) => s.sound);
  useEffect(() => setSoundEnabled(sound), [sound]);
  // One-shot cues follow state changes, so UI code never has to remember to play them.
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        if (s.doorOpen && !prev.doorOpen) cue('door');
        if (s.active && s.active !== prev.active) cue('memory');
        if (s.chapter && s.chapter !== prev.chapter) cue('page');
        if (s.chaptersDone.length > prev.chaptersDone.length) cue('postcard');
      }),
    [],
  );
  // Walking pauses while a memory card or a rain chapter is on screen.
  useEffect(() => setInputEnabled(!modal), [modal]);
  const playing = phase === 'play';
  return (
    <div className="app">
      <Canvas
        shadows
        dpr={[1, touchDevice ? 1.5 : 2]}
        camera={{ position: phase === 'studio' ? [0, 1.5, 4.2] : [0, 3, 12], fov: 45 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>{playing ? <World /> : phase === 'studio' ? <StudioScene focus={tab} /> : <World preview />}</Suspense>
      </Canvas>
      {phase === 'title' && <Title />}
      {phase === 'studio' && <Studio tab={tab} setTab={setTab} />}
      {playing && !modal && <Hud touch={touchDevice} />}
      <MemoryCard />
      <ChapterPlayer />
      <Loader />
    </div>
  );
}
