/**
 * The three rain chapters' public face (id, date, title, memo). Kept apart from `index.ts` so the café UI
 * can list chapters without pulling the chapter renderer into the first bundle.
 */
export const CHAPTER_META = [
  { id: 'rain-0707', date: '07 · 07', title: 'Che mưa đưa em về', memo: 'Ngày bé Su bắt đầu thương anh Phú.' },
  { id: 'rain-2507', date: '25 · 07', title: 'Sala, hoa và Trung Nguyên', memo: 'Su mặc đúng chiếc đầm xanh của ngày đầu gặp nhau.' },
  { id: 'rain-1309', date: '13 · 09', title: 'Áo mưa đỏ, áo mưa xanh', memo: 'Xe lớn bên trái thì em quay mặt sang phải.' },
] as const;

export type ChapterId = (typeof CHAPTER_META)[number]['id'];
