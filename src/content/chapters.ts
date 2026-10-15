/**
 * The three rain chapters, told as short scenes in front of the café windows.
 * Every chapter is a straight line with one choice in the middle; both answers lead to the
 * same ending, so nothing can be "lost". Copy only, no logic.
 */
export type Speaker = 'Su' | 'Phú' | '';

export interface Line {
  who: Speaker;
  text: string;
}

export interface Choice {
  prompt: string;
  options: { label: string; reply: Line[] }[];
}

export type Beat = Line | Choice;

export interface Chapter {
  id: string;
  date: string;
  title: string;
  /** One-line mood shown under the title while the chapter plays. */
  mood: string;
  beats: Beat[];
  /** Shown on the postcard when the chapter ends. */
  postcard: string;
}

export const isChoice = (b: Beat): b is Choice => 'options' in b;

export const CHAPTERS: Chapter[] = [
  {
    id: 'rain-0707',
    date: '07 · 07',
    title: 'Che mưa đưa em về',
    mood: 'Ngày bé Su bắt đầu thương anh Phú.',
    beats: [
      { who: '', text: 'Chiều 07/07. Trời đổ mưa đúng lúc em vừa bước ra khỏi lớp.' },
      { who: 'Su', text: 'Mưa rồi… em quên đem dù.' },
      { who: 'Phú', text: 'Đi chung dù với anh nha. Anh đưa em về.' },
      { who: '', text: 'Cây dù vàng hơi nhỏ cho hai người. Phú nghiêng hết về phía em, vai áo mình ướt một nửa mà không nói gì.' },
      {
        prompt: 'Ngang qua sạp bánh tráng đầu hẻm…',
        options: [
          {
            label: 'Ghé mua bánh tráng',
            reply: [
              { who: 'Su', text: 'Bánh tráng trộn! Anh biết em thích món này hả?' },
              { who: 'Phú', text: 'Đoán bừa thôi. Trúng là được.' },
            ],
          },
          {
            label: 'Mua gà rán ăn cho ấm',
            reply: [
              { who: 'Su', text: 'Gà rán! Hôm nay may ghê.' },
              { who: 'Phú', text: 'Mưa thì phải có đồ nóng. Anh mua thêm phần bánh tráng cho em nữa.' },
            ],
          },
        ],
      },
      { who: '', text: 'Gió tạt, em rùng mình. Phú cởi áo khoác choàng lên vai em.' },
      { who: 'Su', text: 'Áo anh dài quá nè… mà ấm.' },
      { who: 'Phú', text: 'Mai mưa nữa thì anh lại đưa em về.' },
      { who: '', text: 'Hôm đó mưa không lớn lắm. Nhưng từ hôm đó, em bắt đầu mong trời mưa.' },
    ],
    postcard: 'Một cây dù vàng, một nửa vai áo ướt, và một cô bé bắt đầu thương.',
  },
  {
    id: 'rain-2507',
    date: '25 · 07',
    title: 'Sala, hoa và Trung Nguyên',
    mood: 'Su mặc đúng chiếc đầm xanh của ngày đầu gặp nhau.',
    beats: [
      { who: '', text: 'Tối 25/07, bờ sông Sala. Gió mát, đèn vàng, và một bó hoa vẫn còn đang trên đường tới.' },
      { who: 'Phú', text: '(Hoa chưa tới… dắt em đi dạo câu giờ đã.)' },
      { who: 'Su', text: 'Gió sông mát ghê. Anh chụp cho em vài tấm nha.' },
      {
        prompt: 'Chụp em ở góc nào trước?',
        options: [
          {
            label: 'Góc có đèn vàng',
            reply: [{ who: 'Su', text: 'Tấm này anh chụp xinh nè. Đèn ấm ghê.' }],
          },
          {
            label: 'Góc nhìn ra sông',
            reply: [{ who: 'Su', text: 'Gió thổi tóc em bay hết rồi… mà nhìn vẫn được ha.' }],
          },
        ],
      },
      { who: 'Phú', text: 'Hoa tới rồi!' },
      { who: '', text: 'Phú ôm bó hoa thật to, đứng trước em, nói những câu đã tập cả tuần mà vẫn run.' },
      { who: 'Phú', text: 'Su làm bạn gái anh nha?' },
      { who: 'Su', text: 'Dạ… đồng ý.' },
      { who: '', text: 'Vừa dứt câu thì trời đổ mưa. Hai đứa che dù chạy một mạch tới Trung Nguyên.' },
      { who: '', text: 'Dưới mái hiên, đèn vàng, áo hơi ướt. Su dang hai tay ôm Phú trước.' },
      { who: 'Phú', text: '(Bạn trai đồng hành với em. Yay.)' },
    ],
    postcard: 'Đầm xanh, bó hoa to, một câu "dạ đồng ý", và cái ôm đầu tiên dưới mái hiên Trung Nguyên.',
  },
  {
    id: 'rain-1309',
    date: '13 · 09',
    title: 'Áo mưa đỏ, áo mưa xanh',
    mood: 'Xe lớn bên trái thì em quay mặt sang phải.',
    beats: [
      { who: '', text: 'Sáng 13/09, mưa to. Hai chiếc áo mưa, một đỏ một xanh, trên chiếc Exciter quen thuộc.' },
      { who: 'Su', text: 'Mưa to quá…' },
      { who: 'Phú', text: 'Bám chắc nha. Xe lớn chạy ngang bên trái thì em quay mặt sang phải nè.' },
      { who: '', text: 'Trong cốp là mười hai ổ bánh mì, để trao cho các cô chú đứng chờ dọc đường.' },
      {
        prompt: 'Bánh mì phát hết mà phía trước vẫn còn người chờ…',
        options: [
          {
            label: 'Ghé tiệm mua thêm',
            reply: [
              { who: 'Su', text: 'Mình mua thêm năm ổ nha anh!' },
              { who: 'Phú', text: 'Ok luôn. Em nói là anh làm.' },
            ],
          },
          {
            label: 'Hỏi Su nên làm sao',
            reply: [
              { who: 'Su', text: 'Các cô còn chờ kìa… mua thêm năm ổ đi anh.' },
              { who: 'Phú', text: 'Biết ngay em sẽ nói vậy mà.' },
            ],
          },
        ],
      },
      { who: '', text: 'Mười hai ổ thành mười bảy ổ. Mưa vẫn rơi, mà lòng thì ấm.' },
      { who: '', text: 'Tới Nowzone thì mưa nhỏ lại. Su dang tay ra trước.' },
      { who: 'Su', text: 'Hôm nay vui ghê. Đi với anh, mưa cũng thành chuyện dễ thương.' },
    ],
    postcard: 'Áo mưa đỏ, áo mưa xanh, mười hai ổ bánh mì thêm năm, và một trái tim rất mềm.',
  },
];

export const chapterById = (id: string) => CHAPTERS.find((c) => c.id === id);
