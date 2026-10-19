import { safeStorage } from '../state/store';

/** What the how-to card says about a chapter: the goal, then the tips that are easy to miss. */
export interface HowToCopy {
  goal: string;
  tips: string[];
}

export const HOWTO: Record<string, HowToCopy> = {
  'rain-0707': {
    goal: 'Che chung một cây dù đi dọc phố, nhặt bánh tráng và hộp gà rán, rồi ghé sạp bánh tráng cuối đường.',
    tips: [
      'Dù chỉ che người đứng sát bên dưới. Đứng gần nhau, rồi đưa dù cho nhau cầm.',
      'Nắm tay để đi chung dù mà không chậm lại. Đang nắm tay thì Su không nhảy đôi được.',
      'Su lạnh thì Phú khoác áo cho em. Xe tạt nước thì nép sát dưới dù, hoặc nhảy qua.',
      'Hộp gà rán nằm trên thùng: đổi sang Su, buông tay, rồi nhảy hai lần liền.',
    ],
  },
  'rain-2507': {
    goal: 'Câu giờ chờ hoa: chụp hai tấm ảnh cùng nhau, nhận bó hoa, rồi chạy dưới mưa tới quán Trung Nguyên.',
    tips: [
      'Cả hai cùng đứng vào vòng tròn vàng rồi mới chụp được.',
      'Khi mưa xuống: che chung một cây dù, nắm tay, đứng dưới đèn vàng của quán.',
      'Su lạnh thì khoác áo cho em. Ướt quá thì hắt xì và phải về mái hiên gần nhất.',
    ],
  },
  'rain-1309': {
    goal: 'Phú lái xe, Su ngồi sau. Chạy tới Nowzone, rồi đi dọc phố trao bánh mì cho những người đang chờ.',
    tips: [
      'Xe lớn vượt bên trái thì giữ “Su quay mặt” sang phải, kẻo ướt mặt.',
      'Lái tránh những vũng nước trên đường.',
      'Trao bánh mì: áp sát lề phải rồi chạy ngang người đang chờ.',
    ],
  },
};

const KEY = 'tru-mua-howto-v1';

const readSeen = (): string[] => {
  try {
    const v: unknown = JSON.parse(safeStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

/** Has this chapter's how-to card been closed once on this device? */
export const howtoSeen = (id: string) => readSeen().includes(id);

export const markHowtoSeen = (id: string) => {
  const seen = readSeen();
  if (!seen.includes(id)) safeStorage.setItem(KEY, JSON.stringify([...seen, id]));
};
