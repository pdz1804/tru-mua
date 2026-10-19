import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '../state/store';
import { Engine, type HudState, type Postcard } from './engine/runtime';
import { chapterInfo } from '.';
import { wetWord } from './tuning';
import { howtoSeen, markHowtoSeen } from './howto-copy';
import HowTo from './HowTo';

const touchDevice = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/** Virtual stick that writes straight into the engine's joystick axis. */
function Stick({ engine }: { engine: Engine | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !engine) return;
    let id: number | null = null;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2),
        dy = e.clientY - (r.top + r.height / 2);
      const m = Math.hypot(dx, dy),
        mx = r.width * 0.36;
      if (m > mx) {
        dx *= mx / m;
        dy *= mx / m;
      }
      engine.joy.x = dx / mx;
      engine.joy.y = dy / mx;
      if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const down = (e: PointerEvent) => {
      id = e.pointerId;
      el.setPointerCapture(e.pointerId);
      move(e);
    };
    const mv = (e: PointerEvent) => e.pointerId === id && move(e);
    const end = () => {
      id = null;
      engine.joy.x = engine.joy.y = 0;
      if (knob.current) knob.current.style.transform = '';
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', mv);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => el.addEventListener(t, end));
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', mv);
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => el.removeEventListener(t, end));
    };
  }, [engine]);
  return (
    <div className="joy" ref={ref} role="application" aria-label="Cần điều khiển: kéo để đi">
      <i ref={knob} />
    </div>
  );
}

/** A held touch button (pointer down/up map to the engine's action). */
function Act({ engine, a, children, big }: { engine: Engine | null; a: string; children: React.ReactNode; big?: boolean }) {
  return (
    <button
      type="button"
      className={`btn glass ${big ? 'big' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault();
        engine?.touch(a, true);
      }}
      onPointerUp={() => engine?.touch(a, false)}
      onPointerLeave={() => engine?.touch(a, false)}
      onPointerCancel={() => engine?.touch(a, false)}
    >
      {children}
    </button>
  );
}

/** Wetness as a bar plus a word, never a number. */
function Meter({ name, value, icon }: { name: string; value: number; icon?: string }) {
  return (
    <div className={`meter glass ${value > 70 ? 'hot' : ''}`}>
      <div className="n">
        <span>
          {name} <i>{icon}</i>
        </span>
        <span>{wetWord(value)}</span>
      </div>
      <div className="t">
        <b style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/**
 * Points at the current objective. The engine projects it every frame; this reads it from its own rAF
 * and writes the transform directly, so it follows the camera smoothly instead of at the HUD's 10 Hz.
 */
function ObjectiveMarker({ engine }: { engine: Engine | null }) {
  const box = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = box.current,
      ar = arrow.current;
    if (!engine || !el || !ar) return;
    let raf = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const m = engine.marker;
      if (!m.on) {
        el.classList.remove('on');
        return;
      }
      el.classList.add('on');
      el.classList.toggle('edge', m.edge);
      el.style.transform = `translate(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px)`;
      const bob = engine.reduce ? 0 : Math.sin(t / 220) * 5;
      ar.style.transform = m.edge ? `rotate(${m.rot.toFixed(3)}rad)` : `translateY(${(-44 + bob).toFixed(1)}px) rotate(${m.rot.toFixed(3)}rad)`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);
  return (
    <div className="mark" ref={box} aria-hidden="true">
      <i className="ring" />
      <i className="arrow" ref={arrow} />
    </div>
  );
}

/** A finished chapter's postcard: the in-game snapshot, the date, the note and the stamps. */
export function PostcardCard({ p }: { p: Postcard }) {
  return (
    <div className="post">
      {p.img && <img src={p.img} alt={`Khoảnh khắc cuối chương ${p.date}`} />}
      <div className="d">{p.date}</div>
      <b>{p.title}</b>
      <p>{p.text}</p>
      <div className="stamps">
        {p.stamps.map((s) => (
          <span key={s.label} className={`st ${s.earned ? 'on' : ''}`}>
            {s.earned ? '✓ ' : ''}
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Plays one rain chapter full-screen with its own WebGL canvas (the café scene is unmounted
 * meanwhile), the design's HUD, touch controls per mode, and the postcard at the end.
 */
export default function ChapterView() {
  const id = useGame((s) => s.chapter);
  const su = useGame((s) => s.su);
  const phu = useGame((s) => s.phu);
  const twoPlayer = useGame((s) => s.twoPlayer);
  const savePostcard = useGame((s) => s.savePostcard);
  const backToRoom = useGame((s) => s.backToRoom);
  const stage = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [post, setPost] = useState<Postcard | null>(null);
  const [run, setRun] = useState(0);
  const [failed, setFailed] = useState(false);
  const [help, setHelp] = useState(false);
  const info = id ? chapterInfo(id) : undefined;

  useEffect(() => {
    const host = stage.current;
    if (!host || !info) return;
    // every run gets a fresh canvas: a released WebGL context cannot be reused (Chơi lại, StrictMode remounts)
    const canvas = document.createElement('canvas');
    canvas.className = 'chapter-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', `Chương mưa ${info.date}`);
    host.prepend(canvas);
    let eng: Engine | null = null;
    try {
      eng = new Engine(canvas, {
        twoPlayer,
        phu: { top: phu.shirt, bottom: phu.pants, hair: phu.hair },
        su: { top: su.dress, hair: su.hair, bow: su.bow },
        onHud: setHud,
        onFinish: (p) => {
          setPost(p);
          savePostcard(p);
        },
      });
      setPost(null);
      setFailed(false);
      // the first time on this device the how-to card opens over a frozen level, so the opening lines are not missed
      const first = !howtoSeen(info.id);
      eng.pause(first);
      setHelp(first);
      eng.play(info.make());
      setEngine(eng);
      if (import.meta.env.DEV) (window as unknown as { __ch?: Engine }).__ch = eng;
    } catch (err) {
      console.error('chapter failed to start', err);
      eng?.dispose();
      eng = null;
      setHud(null);
      setFailed(true);
    }
    return () => {
      eng?.dispose();
      canvas.remove();
      setEngine(null);
    };
    // looks are read once per run; changing them mid-chapter should not restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, run]);

  useEffect(() => {
    engine?.pause(help);
  }, [engine, help]);

  const closeHelp = useCallback(() => {
    if (id) markHowtoSeen(id);
    setHelp(false);
    stage.current?.querySelector<HTMLElement>('.chapter-canvas')?.focus();
  }, [id]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || post) return;
      if (help) closeHelp();
      else backToRoom();
    };
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [post, help, closeHelp, backToRoom]);

  const ride = hud?.mode === 'ride';
  return (
    <div className="chapter-stage" ref={stage}>
      {failed && (
        <div className="over">
          <div className="panel glass" role="alertdialog" aria-modal="true" aria-label="Không mở được chương mưa">
            <p>Máy này chưa mở được cảnh 3D của chương mưa (WebGL không khởi động được). Về phòng rồi thử lại sau nhé.</p>
            <div className="choice">
              <button type="button" className="btn gold" autoFocus onClick={backToRoom}>
                Về phòng
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="vign" />
      <div className="wetfx" style={{ opacity: Math.min(1, hud?.wetFx ?? 0) }} />
      <div className="flash" style={{ opacity: Math.max(0, ((hud?.flash ?? 0) / 0.4) * 0.75) }} />
      {hud && !post && <ObjectiveMarker engine={engine} />}
      {hud && (
        <div className={`chud ${help ? 'paused' : ''} ${hud.choice ? 'choosing' : ''} ${post ? 'done' : ''}`} aria-hidden={!!post}>
          <div className="meters">
            {!ride && <Meter name="Phú" value={hud.wetP} icon={hud.umb === 'p' ? '☂' : ''} />}
            <Meter
              name={ride ? 'Su ướt mặt' : 'Su'}
              value={hud.wetS}
              icon={ride ? (hud.shield ? '↪' : '') : `${hud.umb === 's' ? '☂ ' : ''}${hud.jacket ? '· áo khoác' : ''}`}
            />
          </div>
          {hud.objective && (
            <div className="obj glass">
              {hud.objective}
              {hud.objectiveSub && <small>{hud.objectiveSub}</small>}
            </div>
          )}
          <div className="right">
            {hud.counter && <span className="pill glass y">{hud.counter}</span>}
            {hud.hold && <span className="pill h">Đang nắm tay</span>}
            <div className="btns">
              <button type="button" className="btn glass help" onClick={() => setHelp(true)} aria-label="Cách chơi" title="Cách chơi">
                ?
              </button>
              <button type="button" className="btn glass" onClick={backToRoom}>
                Về phòng
              </button>
            </div>
          </div>
          <div className={`warn l ${hud.warnL ? 'on' : ''}`}>Xe lớn bên trái!</div>
          <div className={`warn r ${hud.warnR ? 'on' : ''}`}>Xe tới!</div>
          <div className={`ctoast glass ${hud.toast ? 'on' : ''}`} role="status">
            {hud.toast}
          </div>
          <div className={`talk glass ${hud.talk ? 'on' : ''}`}>
            {hud.talk?.who && <b className={hud.talk.who === 'Su' ? 'su' : 'phu'}>{hud.talk.who}</b>}
            <span>{hud.talk?.text}</span>
          </div>
          <div className={`ccard ${hud.card ? 'on' : ''}`}>
            <div className="d">{hud.card?.date}</div>
            <div className="s">{hud.card?.title}</div>
            <div className="m">{hud.card?.memo}</div>
          </div>
        </div>
      )}
      {help && info && !post && (
        <HowTo id={info.id} date={info.date} title={info.title} ride={ride} touch={touchDevice} twoPlayer={twoPlayer} onClose={closeHelp} />
      )}
      {hud?.choice && (
        <div className="over low">
          <div className="panel glass" role="dialog" aria-modal="true" aria-label="Lựa chọn">
            <p>{hud.choice.prompt}</p>
            <div className="choice">
              {hud.choice.options.map((o, i) => (
                <button key={o} type="button" className="btn gold" autoFocus={i === 0} onClick={() => engine?.answer(i)}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {post && (
        <div className="over">
          <div className="post-wrap" role="dialog" aria-modal="true" aria-label={`Bưu thiếp ${post.date}`}>
            <PostcardCard p={post} />
            <div className="row" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn glass" onClick={() => setRun((r) => r + 1)}>
                Chơi lại
              </button>
              <button type="button" className="btn gold" autoFocus onClick={backToRoom}>
                Cất vào album, về phòng ♡
              </button>
            </div>
          </div>
        </div>
      )}
      {!post &&
        (touchDevice ? (
          <div className="ctrl">
            {ride ? (
              <div className="steer">
                <Act engine={engine} a="sl">
                  ◀
                </Act>
                <Act engine={engine} a="sr">
                  ▶
                </Act>
              </div>
            ) : (
              <Stick engine={engine} />
            )}
            <div className="acts">
              {ride ? (
                <Act engine={engine} a="shield" big>
                  Su quay mặt
                </Act>
              ) : (
                <>
                  <Act engine={engine} a="pass">
                    ☂ Đưa dù
                  </Act>
                  <Act engine={engine} a="hold">
                    Nắm tay
                  </Act>
                  <Act engine={engine} a="jacket">
                    Áo khoác
                  </Act>
                  <Act engine={engine} a="act">
                    {hud?.actLabel ?? 'Chụp hình'}
                  </Act>
                  <Act engine={engine} a="swap">
                    Đổi người
                  </Act>
                  <Act engine={engine} a="jump" big>
                    Nhảy
                  </Act>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="ckeys glass">
            {ride ? (
              <>
                <kbd>A</kbd>
                <kbd>D</kbd> hoặc <kbd>←</kbd>
                <kbd>→</kbd> lái · giữ <kbd>S</kbd>/<kbd>↓</kbd>/<kbd>Space</kbd> để Su quay mặt · <kbd>Esc</kbd> về phòng
              </>
            ) : twoPlayer ? (
              <>
                Phú: <kbd>W</kbd>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd> · <kbd>Space</kbd> nhảy · <kbd>E</kbd> dù · <kbd>R</kbd> nắm tay · <kbd>C</kbd> áo khoác · <kbd>F</kbd>{' '}
                {hud?.actLabel.toLowerCase()}. Su: mũi tên · <kbd>/</kbd> nhảy · <kbd>.</kbd> dù · <kbd>,</kbd> nắm tay
              </>
            ) : (
              <>
                <kbd>W</kbd>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd> đi · <kbd>Space</kbd> nhảy · <kbd>E</kbd> đưa dù · <kbd>R</kbd> nắm tay · <kbd>C</kbd> áo khoác · <kbd>F</kbd>{' '}
                {hud?.actLabel.toLowerCase()} · <kbd>Q</kbd> đổi người · <kbd>Esc</kbd> về phòng
              </>
            )}
          </p>
        ))}
    </div>
  );
}
