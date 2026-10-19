import { HOWTO } from './howto-copy';

interface Props {
  id: string;
  date: string;
  title: string;
  ride: boolean;
  touch: boolean;
  twoPlayer: boolean;
  onClose: () => void;
}

type Row = [keys: string[], label: string];

const rowsFor = (id: string, ride: boolean): Row[] =>
  ride
    ? [
        [['A', 'D', '←', '→'], 'Lái xe'],
        [['S', '↓', 'Space'], 'Giữ để Su quay mặt'],
      ]
    : [
        [['W', 'A', 'S', 'D'], 'Đi'],
        [['Space'], 'Nhảy (Su nhảy được hai lần)'],
        [['E'], 'Đưa dù'],
        [['R'], 'Nắm tay'],
        [['C'], 'Áo khoác'],
        ...(id === 'rain-2507' ? ([[['F'], 'Chụp hình / tỏ tình']] as Row[]) : []),
        [['Q'], 'Đổi người điều khiển'],
      ];

/** Phone and tablet: the buttons on screen, named as they appear. */
const touchLine = (id: string, ride: boolean) =>
  ride
    ? 'Nút ◀ ▶ để lái. Giữ “Su quay mặt” khi xe lớn vượt bên trái.'
    : `Kéo cần bên trái để đi. Bên phải là các nút: Nhảy, Đưa dù, Nắm tay, Áo khoác${id === 'rain-2507' ? ', Chụp hình' : ''}, Đổi người.`;

/** The card shown when a chapter starts and whenever "?" is pressed; the game is paused while it is open. */
export default function HowTo({ id, date, title, ride, touch, twoPlayer, onClose }: Props) {
  const copy = HOWTO[id];
  if (!copy) return null;
  return (
    <div className="over howto">
      <div className="panel glass howto-panel" role="dialog" aria-modal="true" aria-label={`Cách chơi ${date}`}>
        <header>
          <span className="eyebrow">Cách chơi · {date}</span>
          <h3>{title}</h3>
        </header>
        <section>
          <span className="eyebrow">Mục tiêu</span>
          <p>{copy.goal}</p>
        </section>
        <section>
          <span className="eyebrow">Điều khiển</span>
          {touch ? (
            <p className="note">{touchLine(id, ride)}</p>
          ) : (
            <ul className="keylist">
              {rowsFor(id, ride).map(([keys, label]) => (
                <li key={label}>
                  <span className="ks">
                    {keys.map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </span>
                  <span>{label}</span>
                </li>
              ))}
              {twoPlayer && !ride && (
                <li>
                  <span className="ks">
                    <kbd>←</kbd>
                    <kbd>↑</kbd>
                    <kbd>↓</kbd>
                    <kbd>→</kbd>
                  </span>
                  <span>Su đi riêng: / nhảy · . dù · , nắm tay</span>
                </li>
              )}
            </ul>
          )}
        </section>
        <section>
          <span className="eyebrow">Mẹo nhỏ</span>
          <ul className="tips">
            {copy.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
        <div className="choice">
          <button type="button" className="btn gold" autoFocus onClick={onClose}>
            Chơi thôi
          </button>
        </div>
      </div>
    </div>
  );
}
