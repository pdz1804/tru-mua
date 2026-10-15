import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useGame, SU_DRESS, PHU_SHIRT, HAIR, type Who } from '../state/store';
import { MEMORIES, memoryById } from '../content/memories';
import { CHAPTERS, chapterById, isChoice, type Line } from '../content/chapters';
import { onFocus, type Interactable } from '../game/interactions';
import { press, stick, look } from '../game/input';
import { toastBus } from '../lib/toast';

export function Title() {
  const setPhase = useGame((s) => s.setPhase);
  const seen = useGame((s) => s.seen.length);
  const [album, setAlbum] = useState(false);
  if (album) return <Album onBack={() => setAlbum(false)} />;
  return (
    <div className="title">
      <span className="eyebrow">Dành riêng cho Su, từ Phú</span>
      <h1>Trú Mưa</h1>
      <p>
        Có những cơn mưa sinh ra chỉ để hai người đứng gần nhau hơn. Sau cánh cửa này là một căn phòng nhỏ, nơi anh cất {MEMORIES.length} kỷ niệm của hai đứa:
        từ bó hoa đầu tiên ngày 13/06 tới bó hồng Ecuador hôm em ốm.
      </p>
      <div className="row">
        <button className="btn gold" type="button" onClick={() => setPhase('studio')} autoFocus>
          Bắt đầu
        </button>
        {seen > 0 && (
          <button className="btn glass" type="button" onClick={() => setAlbum(true)}>
            Album kỷ niệm
          </button>
        )}
        {seen > 0 && (
          <span className="eyebrow">
            Đã mở {seen}/{MEMORIES.length} kỷ niệm
          </span>
        )}
      </div>
      <span className="credit">Phu Nguyen — HCMC, VN</span>
    </div>
  );
}

function Swatches({ colors, value, onPick, label }: { colors: readonly string[]; value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div className="swatches" role="group" aria-label={label}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className="sw"
          style={{ background: c }}
          aria-pressed={c === value}
          aria-label={`${label} ${c}`}
          onClick={() => onPick(c)}
        />
      ))}
    </div>
  );
}

export function Studio({ tab, setTab }: { tab: Who; setTab: (w: Who) => void }) {
  const { su, phu, setSu, setPhu, setPhase, twoPlayer, setTwoPlayer } = useGame();
  return (
    <aside className="studio glass" aria-label="Chuẩn bị nhân vật">
      <div style={{ display: 'grid', gap: 4 }}>
        <span className="eyebrow">Trước khi bước vào</span>
        <h2>Hôm nay mặc gì nhỉ?</h2>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'su'} className={`btn ${tab === 'su' ? 'on' : ''}`} onClick={() => setTab('su')} type="button">
          Su
        </button>
        <button role="tab" aria-selected={tab === 'phu'} className={`btn ${tab === 'phu' ? 'on' : ''}`} onClick={() => setTab('phu')} type="button">
          Phú
        </button>
      </div>
      {tab === 'su' ? (
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div className="field">
            <label>Chiếc đầm</label>
            <Swatches label="Màu đầm" colors={SU_DRESS} value={su.dress} onPick={(dress) => setSu({ dress })} />
          </div>
          <div className="field">
            <label>Màu tóc</label>
            <Swatches label="Màu tóc Su" colors={HAIR} value={su.hair} onPick={(hair) => setSu({ hair })} />
          </div>
          <label className="toggle">
            Nơ đỏ kiểu Hello Kitty
            <input type="checkbox" checked={su.bow} onChange={(e) => setSu({ bow: e.target.checked })} />
          </label>
          <label className="toggle">
            Dây chuyền đom đóm
            <input type="checkbox" checked={su.necklace} onChange={(e) => setSu({ necklace: e.target.checked })} />
          </label>
          <p className="note">
            Đầm xanh là chiếc đầm của ngày đầu gặp nhau và ngày tỏ tình. Hồng vì dễ thương, trắng vì sang, vàng nhạt vì dễ chịu, xanh đậm vì ngầu.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div className="field">
            <label>Chiếc áo</label>
            <Swatches label="Màu áo" colors={PHU_SHIRT} value={phu.shirt} onPick={(shirt) => setPhu({ shirt })} />
          </div>
          <div className="field">
            <label>Màu tóc</label>
            <Swatches label="Màu tóc Phú" colors={HAIR} value={phu.hair} onPick={(hair) => setPhu({ hair })} />
          </div>
          <label className="toggle">
            Mang theo áo khoác cho Su
            <input type="checkbox" checked={phu.jacket} onChange={(e) => setPhu({ jacket: e.target.checked })} />
          </label>
          <p className="note">Em thích anh mặc màu kem, đen, hay vàng nhạt. Áo khoác để dành cho những tối em kêu lạnh.</p>
        </div>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="row">
          <button type="button" className={`btn ${!twoPlayer ? 'on' : ''}`} onClick={() => setTwoPlayer(false)}>
            1 người
          </button>
          <button type="button" className={`btn ${twoPlayer ? 'on' : ''}`} onClick={() => setTwoPlayer(true)}>
            2 người, chung bàn phím
          </button>
        </div>
        <button type="button" className="btn gold" onClick={() => setPhase('play')}>
          Tới trước cửa quán ▶
        </button>
      </div>
    </aside>
  );
}

function Joystick() {
  const ref = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current!;
    let id: number | null = null;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const m = Math.hypot(dx, dy);
      const max = r.width * 0.36;
      if (m > max) {
        dx *= max / m;
        dy *= max / m;
      }
      stick.x = dx / max;
      stick.z = dy / max;
      if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const down = (e: PointerEvent) => {
      id = e.pointerId;
      el.setPointerCapture(e.pointerId);
      move(e);
    };
    const mv = (e: PointerEvent) => {
      if (e.pointerId === id) move(e);
    };
    const end = () => {
      id = null;
      stick.x = stick.z = 0;
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
  }, []);
  return (
    <div className="joy" ref={ref} aria-label="Cần điều khiển: kéo để đi" role="application">
      <i ref={knob} />
    </div>
  );
}

export function Hud({ touch }: { touch: boolean }) {
  const [focus, setFocus] = useState<Interactable | null>(null);
  const [toast, setToast] = useState('');
  const seen = useGame((s) => s.seen.length);
  const chapters = useGame((s) => s.chaptersDone.length);
  const sound = useGame((s) => s.sound);
  const setSound = useGame((s) => s.setSound);
  const lead = useGame((s) => s.lead);
  const twoPlayer = useGame((s) => s.twoPlayer);
  const setPhase = useGame((s) => s.setPhase);
  useEffect(() => onFocus(setFocus), []);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    return toastBus.on((m) => {
      setToast(m);
      clearTimeout(t);
      t = setTimeout(() => setToast(''), 3200);
    });
  }, []);
  // Drag on empty canvas space rotates the camera (mouse and touch).
  useEffect(() => {
    let id: number | null = null;
    let lx = 0;
    let ly = 0;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
      id = e.pointerId;
      lx = e.clientX;
      ly = e.clientY;
    };
    const mv = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      look.dx += e.clientX - lx;
      look.dy += e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === id) id = null;
    };
    const wheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).tagName === 'CANVAS') look.zoom += Math.sign(e.deltaY);
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('wheel', wheel, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('wheel', wheel);
    };
  }, []);
  return (
    <div className="hud">
      <div className="topbar">
        <span className="pill glass">
          Kỷ niệm{' '}
          <b>
            {seen}/{MEMORIES.length}
          </b>{' '}
          · Chương mưa{' '}
          <b>
            {chapters}/{CHAPTERS.length}
          </b>
        </span>
        <div className="row">
          {!twoPlayer && <span className="pill glass">Đang đi: {lead === 'phu' ? 'Phú' : 'Su'}</span>}
          <button type="button" className="btn glass" aria-pressed={sound} onClick={() => setSound(!sound)}>
            {sound ? 'Tiếng mưa: bật' : 'Tiếng mưa: tắt'}
          </button>
          <button type="button" className="btn glass" onClick={() => setPhase('studio')}>
            Thay đồ
          </button>
        </div>
      </div>
      {toast && (
        <div className="toast glass" role="status">
          {toast}
        </div>
      )}
      {focus && (
        <button type="button" className="prompt glass" onClick={() => press('interact')}>
          {!touch && <kbd>E</kbd>} {focus.prompt}
        </button>
      )}
      {touch ? (
        <div className="touch">
          <Joystick />
          <div className="acts">
            <button type="button" className="btn glass" onClick={() => press('swap')}>
              Đổi người
            </button>
            <button type="button" className="btn glass" onClick={() => press('hold')}>
              Nắm tay
            </button>
            <button type="button" className="btn gold" style={{ gridColumn: '1 / -1' }} onClick={() => press('interact')}>
              Tương tác
            </button>
          </div>
        </div>
      ) : (
        <div className="keys glass">
          {twoPlayer ? (
            <>
              Phú <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> · Su <kbd>↑</kbd>
              <kbd>←</kbd>
              <kbd>↓</kbd>
              <kbd>→</kbd> · <kbd>E</kbd>/<kbd>Enter</kbd> xem · <kbd>R</kbd> nắm tay · kéo chuột để xoay
            </>
          ) : (
            <>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> đi · <kbd>E</kbd> xem kỷ niệm · <kbd>Q</kbd> đổi người · <kbd>R</kbd> nắm tay · kéo chuột để xoay, cuộn để zoom
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Modal behaviour shared by the memory card and the chapter player: focus moves into the
 * dialog, Tab cycles inside it, Escape closes it, and focus returns to where it was.
 */
function useDialog(ref: React.RefObject<HTMLElement>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const items = () => [...(ref.current?.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])') ?? [])];
    (ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0])?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        const list = items();
        if (!list.length) return;
        const i = list.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : i === list.length - 1 ? 0 : i + 1;
        e.preventDefault();
        list[next].focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      before?.focus?.();
    };
  }, [ref, open, onClose]);
}

export function MemoryCard() {
  const active = useGame((s) => s.active);
  const close = useGame((s) => s.close);
  const card = useRef<HTMLElement>(null);
  const m = active ? memoryById(active) : null;
  useDialog(card, !!m, close);
  if (!m) return null;
  return (
    <div className="veil" onClick={(e) => e.target === e.currentTarget && close()}>
      <article ref={card} className="card" role="dialog" aria-modal="true" aria-labelledby="mem-title">
        {m.date && <div className="date">{m.date}</div>}
        <h3 id="mem-title">{m.title}</h3>
        {m.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {m.chips && (
          <div className="chips">
            {m.chips.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </div>
        )}
        <div className="foot">
          <span style={{ fontSize: 12, opacity: 0.7 }}>Phú gửi Su</span>
          <button data-autofocus type="button" className="btn" onClick={close}>
            Cất lại ♡
          </button>
        </div>
      </article>
    </div>
  );
}

/**
 * A rain chapter told as a visual-novel scene over the café: one line at a time, one choice in
 * the middle, then a postcard. Advance with the button (Enter/Space on it); Escape leaves.
 */
export function ChapterPlayer() {
  const id = useGame((s) => s.chapter);
  const leave = useGame((s) => s.leaveChapter);
  const finish = useGame((s) => s.finishChapter);
  const ch = id ? chapterById(id) : null;
  const box = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [reply, setReply] = useState<Line[]>([]);
  const [r, setR] = useState(0);
  useEffect(() => {
    setStep(0);
    setReply([]);
    setR(0);
  }, [id]);
  useDialog(box, !!ch, leave);
  const done = !!ch && step >= ch.beats.length;
  useEffect(() => {
    if (done) finish();
  }, [done, finish]);
  // Keep focus on the advance button as lines change so Enter/Space keep working.
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, [step, r, reply]);
  if (!ch) return null;
  const beat = ch.beats[step];
  const inReply = reply.length > 0;
  const line: Line | null = inReply ? reply[r] : beat && !isChoice(beat) ? beat : null;
  const next = () => {
    if (inReply && r < reply.length - 1) return setR(r + 1);
    setReply([]);
    setR(0);
    setStep(step + 1);
  };
  return (
    <div className="chapter">
      <header className="chapter-head">
        <span className="date">{ch.date}</span>
        <div>
          <h3 id="ch-title">{ch.title}</h3>
          <p>{ch.mood}</p>
        </div>
      </header>
      <section ref={box} className="chapter-box glass" role="dialog" aria-modal="true" aria-labelledby="ch-title" aria-live="polite">
        {done ? (
          <div className="postcard">
            <span className="eyebrow">Bưu thiếp · {ch.date}</span>
            <p>{ch.postcard}</p>
            <div className="row">
              <button type="button" className="btn" onClick={() => setStep(0)}>
                Xem lại
              </button>
              <button data-autofocus type="button" className="btn gold" onClick={leave}>
                Cất vào album ♡
              </button>
            </div>
          </div>
        ) : line ? (
          <>
            {line.who && <b className={`who who-${line.who === 'Su' ? 'su' : 'phu'}`}>{line.who}</b>}
            <p className={line.who ? '' : 'narration'}>{line.text}</p>
            <div className="row chapter-foot">
              <span className="eyebrow">
                {Math.min(step + 1, ch.beats.length)}/{ch.beats.length}
              </span>
              <button data-autofocus type="button" className="btn gold" onClick={next}>
                Tiếp ▸
              </button>
            </div>
          </>
        ) : beat && isChoice(beat) ? (
          <>
            <p className="narration">{beat.prompt}</p>
            <div className="choices">
              {beat.options.map((o, i) => (
                <button key={o.label} data-autofocus={i === 0 ? true : undefined} type="button" className="btn" onClick={() => setReply(o.reply)}>
                  {o.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
        <button type="button" className="chapter-x" aria-label="Rời chương" onClick={leave}>
          ✕
        </button>
      </section>
    </div>
  );
}

/** Shown over the canvas while the lazily loaded 3D world and its assets stream in. */
export function Loader() {
  const { active, progress } = useProgress();
  const [show, setShow] = useState(false);
  // Avoid a flash for cached loads; only show when loading takes a moment.
  useEffect(() => {
    if (!active) return setShow(false);
    const t = setTimeout(() => setShow(true), 250);
    return () => clearTimeout(t);
  }, [active]);
  if (!show) return null;
  return (
    <div className="loading glass" role="status">
      Đang mở cửa… {Math.round(progress)}%
    </div>
  );
}

/** Everything already opened, readable again from the title screen without entering the café. */
function Album({ onBack }: { onBack: () => void }) {
  const seen = useGame((s) => s.seen);
  const done = useGame((s) => s.chaptersDone);
  const open = useGame((s) => s.open);
  const postcards = CHAPTERS.filter((c) => done.includes(c.id));
  const memories = seen.map(memoryById).filter((m): m is NonNullable<typeof m> => !!m);
  return (
    <div className="album">
      <header className="row album-head">
        <div>
          <span className="eyebrow">Những gì hai đứa đã mở</span>
          <h2>Album kỷ niệm</h2>
        </div>
        <button type="button" className="btn glass" onClick={onBack} autoFocus>
          ◂ Quay lại
        </button>
      </header>
      {postcards.length > 0 && (
        <section className="album-grid">
          {postcards.map((c) => (
            <article key={c.id} className="postcard">
              <span className="eyebrow">Bưu thiếp · {c.date}</span>
              <b>{c.title}</b>
              <p>{c.postcard}</p>
            </article>
          ))}
        </section>
      )}
      <section className="album-grid">
        {memories.map((m) => (
          <button key={m.id} type="button" className="album-item" onClick={() => open(m.id)}>
            {m.date && <span className="date">{m.date}</span>}
            <b>{m.title}</b>
            <span>{m.hint}</span>
          </button>
        ))}
      </section>
      <span className="credit">Phu Nguyen — HCMC, VN</span>
    </div>
  );
}
