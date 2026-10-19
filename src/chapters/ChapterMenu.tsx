import { useEffect } from 'react';
import { useGame } from '../state/store';
import { setInputEnabled } from '../game/input';
import { CHAPTER_META } from './catalog';

/**
 * The way into the rain chapters from anywhere outside them: one card per day, a ✓ once its postcard is earned.
 * Opens over the title screen and over the café HUD; picking a card starts that chapter.
 */
export default function ChapterMenu({ onClose }: { onClose: () => void }) {
  const postcards = useGame((s) => s.postcards);
  const playChapter = useGame((s) => s.playChapter);

  useEffect(() => {
    setInputEnabled(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', esc);
    return () => {
      removeEventListener('keydown', esc);
      setInputEnabled(true);
    };
  }, [onClose]);

  return (
    <div className="over" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel glass menu-panel" role="dialog" aria-modal="true" aria-label="Chọn chương mưa">
        <header>
          <span className="eyebrow">Chương mưa</span>
          <h3>Chọn một cơn mưa để bước vào</h3>
          <p className="note">Mỗi chương là một ngày thật của hai đứa. Chơi lại bao nhiêu lần cũng được.</p>
        </header>
        <div className="lvls">
          {CHAPTER_META.map((c, i) => {
            const done = postcards.some((p) => p.id === c.id);
            return (
              <button key={c.id} type="button" className={`lv ${done ? 'done' : ''}`} autoFocus={i === 0} onClick={() => playChapter(c.id)}>
                <span className="d">{c.date}</span>
                <span className="t">{c.title}</span>
                <span className="m">{c.memo}</span>
                <span className={`ok ${done ? 'on' : ''}`}>{done ? '✓ Đã có bưu thiếp' : 'Chưa chơi'}</span>
              </button>
            );
          })}
        </div>
        <div className="choice">
          <button type="button" className="btn" onClick={onClose}>
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}
