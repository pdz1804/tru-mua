import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame, SU_DRESS, PHU_SHIRT, HAIR, type Who } from '../state/store';
import { MEMORIES, memoryById } from '../content/memories';
import { CHAPTER_META } from '../chapters/catalog';
import ChapterMenu from '../chapters/ChapterMenu';
import { onFocus, type Interactable } from '../game/interactions';
import { press, stick, setInputEnabled, look } from '../game/input';
import { toastBus } from '../lib/toast';

/** Screen-reader text for a postcard's stamp dots: words, never a count. */
const stampsLabel = (stamps: { label: string; earned: boolean }[]) => {
  const got = stamps.filter((s) => s.earned);
  if (got.length === 0) return 'Chưa có dấu nào';
  return got.length === stamps.length ? 'Đủ dấu' : 'Đã có dấu';
};

/** The finished chapters' postcards as a row of cards, one slot per chapter; stamps are dots, never a count. */
function Album() {
  const postcards = useGame((s) => s.postcards);
  return (
    <div className="album">
      {CHAPTER_META.map((c) => {
        const p = postcards.find((x) => x.id === c.id);
        if (!p)
          return (
            <div key={c.id} className="pc empty">
              <b>{c.date}</b>
              <span>Chưa có bưu thiếp</span>
            </div>
          );
        return (
          <div key={c.id} className="pc">
            {p.img && <img src={p.img} alt={p.title} />}
            <b>{p.date}</b>
            <span>{p.title}</span>
            <span className="dots" role="img" aria-label={stampsLabel(p.stamps)}>
              {p.stamps.map((s) => (
                <i key={s.label} className={s.earned ? 'on' : ''} />
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Title() {
  const setPhase = useGame((s) => s.setPhase);
  const seen = useGame((s) => s.seen.length);
  const postcards = useGame((s) => s.postcards);
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
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
          <span className="eyebrow">
            Đã mở {seen}/{MEMORIES.length} kỷ niệm
          </span>
        )}
      </div>
      <button type="button" className="lv chapter-entry" onClick={() => setMenu(true)} aria-label="Chương mưa: chọn một chương để chơi ngay">
        <span className="eyebrow">Chương mưa</span>
        <span className="t">Ba cơn mưa, ba ngày thật. Chơi thẳng từ đây.</span>
        <span className="chips">
          {CHAPTER_META.map((c) => (
            <span key={c.id} className={`chip ${postcards.some((p) => p.id === c.id) ? 'on' : ''}`}>
              {postcards.some((p) => p.id === c.id) ? '✓ ' : ''}
              {c.date}
            </span>
          ))}
        </span>
      </button>
      {postcards.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          <span className="eyebrow">Album bưu thiếp</span>
          <Album />
        </div>
      )}
      {menu && <ChapterMenu onClose={closeMenu} />}
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
  const lead = useGame((s) => s.lead);
  const twoPlayer = useGame((s) => s.twoPlayer);
  const setPhase = useGame((s) => s.setPhase);
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
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
          </b>
        </span>
        <div className="row">
          {!twoPlayer && <span className="pill glass">Đang đi: {lead === 'phu' ? 'Phú' : 'Su'}</span>}
          <button type="button" className="btn glass rain" onClick={() => setMenu(true)}>
            Chương mưa
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
      {menu && <ChapterMenu onClose={closeMenu} />}
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

export function MemoryCard() {
  const active = useGame((s) => s.active);
  const close = useGame((s) => s.close);
  const btn = useRef<HTMLButtonElement>(null);
  const m = active ? memoryById(active) : null;
  useEffect(() => {
    setInputEnabled(!m);
    if (!m) return;
    btn.current?.focus();
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [m, close]);
  if (!m) return null;
  return (
    <div className="veil" onClick={(e) => e.target === e.currentTarget && close()}>
      <article className="card" role="dialog" aria-modal="true" aria-labelledby="mem-title">
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
          <button ref={btn} type="button" className="btn" onClick={close}>
            Cất lại ♡
          </button>
        </div>
      </article>
    </div>
  );
}
