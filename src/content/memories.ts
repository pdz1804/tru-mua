/**
 * Every interactable object in the room is a real memory of Phú & Su.
 * Copy is intentionally sentimental ("sến") and written from Phú's side.
 * Privacy rule: no address, phone number, or other identifying data lives here.
 */
export type MemoryKind =
  | 'bouquet'
  | 'umbrella'
  | 'cactus'
  | 'bear'
  | 'keychain'
  | 'album'
  | 'jar'
  | 'ticket'
  | 'camera'
  | 'chicken'
  | 'bubbles'
  | 'mirrorbox'
  | 'bread'
  | 'lantern'
  | 'figurines'
  | 'fishtank'
  | 'letter'
  | 'candy'
  | 'music'
  | 'florist'
  | 'chalkboard'
  | 'menu'
  | 'necklace'
  | 'childhood';

export interface Memory {
  id: string;
  kind: MemoryKind;
  /** Day/month only, the year is always 2026. Empty for timeless memories. */
  date: string;
  title: string;
  /** One short line shown on the interaction prompt. */
  hint: string;
  /** The full sentimental note, 2–5 short paragraphs. */
  body: string[];
  /** Little facts rendered as chips under the note. */
  chips?: string[];
}

export const MEMORIES: Memory[] = [
  {
    id: 'first-bouquet',
    kind: 'bouquet',
    date: '13/06',
    title: 'Bó hoa đầu tiên',
    hint: 'Ngày em khép lại mười hai năm đèn sách',
    body: [
      'Hôm đó anh chạy Exciter qua nhà em, tim đập nhanh hơn tiếng máy xe. Em bước ra trong chiếc đầm xanh, dễ thương tới mức anh quên mất câu chào đã tập sẵn.',
      'Một bó hoa, một lá thư tay, và một bé Hello Kitty mặc đầm hồng: mừng em xong kỳ thi tốt nghiệp, mừng mười hai năm đèn sách của một cô bé chăm ngoan.',
      'Anh không biết đó là bó hoa đầu tiên của rất nhiều bó hoa về sau. Chỉ biết là từ hôm ấy, mỗi lần đi ngang tiệm hoa, anh đều nghĩ tới em.',
    ],
    chips: ['Đầm xanh', 'Thư tay', 'Hello Kitty đầm hồng', 'Exciter'],
  },
  {
    id: 'shell-car',
    kind: 'jar',
    date: '23/06',
    title: 'Bánh bơ và chiếc xe vỏ sò',
    hint: 'Món quà nhỏ em tặng anh',
    body: [
      'Em tặng anh bánh bơ và một chiếc xe vỏ sò nhỏ xíu. Quà bé xíu thôi, mà cầm trên tay anh thấy cả một mùa hè.',
      'Anh gửi lại em bánh Givral, quà Vũng Tàu, cùng một bó hoa hồng. Hai đứa trao qua trao lại mấy món quà nhỏ xíu, mà vui như đang trao nhau cả một mùa hè.',
    ],
    chips: ['19/06 chính thức tìm hiểu', 'Bánh Givral', 'Hoa hồng'],
  },
  {
    id: 'cactus',
    kind: 'cactus',
    date: '04/07',
    title: 'Chậu xương rồng',
    hint: 'Sở thú, Highlands, bún đậu, và một chậu xương rồng',
    body: [
      'Một ngày đi sở thú của hai đứa, nơi em thích tới mức mắt sáng lên mỗi lần thấy con vật nhỏ. Rồi Highlands, rồi bún đậu mắm tôm Hoàng Hoa Thám, rồi đi mua len cho em.',
      'Cuối ngày em tặng anh chậu xương rồng. Anh tưởng xương rồng thì gai góc, hoá ra nó chỉ cần một chút nắng và rất ít nước là sống được thật lâu. Giống tình cảm hai đứa: nhẹ nhàng mà bền.',
    ],
    chips: ['Sở thú', 'Len cho em', 'Dalat Hasfarm'],
  },
  {
    id: 'yellow-umbrella',
    kind: 'umbrella',
    date: '07/07',
    title: 'Cơn mưa hôm 07/07',
    hint: 'Ngày bé Su bắt đầu thương anh Phú',
    body: [
      'Trời đổ mưa, hai đứa ăn bánh tráng với gà rán, rồi anh che mưa đưa em về. Anh chẳng nhớ mình ướt bao nhiêu, chỉ nhớ em đi ngay bên cạnh.',
      'Với anh, đó là ngày bé Su bắt đầu thương anh Phú. Anh cất chiếc dù ở đây, để mỗi lần trời mưa là nhớ: có những cơn mưa sinh ra chỉ để người ta đứng gần nhau hơn.',
    ],
    chips: ['Bánh tráng', 'Gà rán', 'Che mưa đưa em về'],
  },
  {
    id: 'stitch',
    kind: 'bear',
    date: '18/07',
    title: 'Gấu Stitch',
    hint: 'Món quà nhỏ cho cô gái nhỏ',
    body: ['Chút quà nhỏ và một bạn Stitch tai to, mặt nghịch. Anh mong bạn ấy ở cạnh em những lúc anh chưa kịp tới.'],
    chips: ['Stitch'],
  },
  {
    id: 'dalat-keychain',
    kind: 'keychain',
    date: '19/07',
    title: 'Móc khoá và phin cà phê Đà Lạt',
    hint: 'Em đi Đà Lạt mà vẫn nhớ mang quà về cho anh',
    body: [
      'Em đi Đà Lạt với bạn mấy hôm, về tặng anh móc khoá và cái phin cà phê. Em không uống được cà phê, vậy mà vẫn chọn phin cho anh. Anh đã biết thương là gì từ cái phin nhỏ ấy.',
      'Hôm đó hai đứa ghé Highlands, rồi lần đầu vào photobooth, dạo phố, ăn cơm tấm, uống sinh tố 606. Một ngày bình thường, mà anh nhớ từng góc.',
    ],
    chips: ['Photobooth lần đầu', 'Cơm tấm', 'Sinh tố 606'],
  },
  {
    id: 'sala-flower',
    kind: 'bouquet',
    date: '25/07',
    title: 'Bông hoa khổng lồ ở Sala',
    hint: 'Ngày anh được làm bạn trai đồng hành với em',
    body: [
      'Thiso Mall Sala, con gấu săn sale mãi mới được, phim Conan, gà rán KFC với kem. Rồi anh dắt em đi dạo bờ hồ, câu giờ chờ hoa Dalat Hasfarm tới, tim đập như đang chạy marathon. Trong lúc chờ, hai đứa chụp hình bên bông hoa khổng lồ và dọc bờ sông.',
      'Hoa tới rồi. Giữa bó hoa đẹp và em xinh nhất trên đời, anh nói thật lòng mình, và em đồng ý cho anh làm bạn trai đồng hành với em.',
      'Rồi trời mưa. Hai đứa trú ở Trung Nguyên, và em là người dang hai tay ôm anh trước. Cái ôm đầu tiên, mở ra cả một chuỗi ngày gặp là ôm. Hôm đó em mặc đúng chiếc đầm xanh của ngày đầu gặp nhau.',
    ],
    chips: ['Đầm xanh', 'Conan', 'Trung Nguyên', 'Cái ôm đầu tiên'],
  },
  {
    id: 'photobooth-album',
    kind: 'album',
    date: '03/10',
    title: 'Album photobooth',
    hint: 'Bài tập về nhà em giao: nhớ mang theo hình',
    body: [
      'Ngày quốc tế bạn trai, anh quên, em nhớ. Em tặng anh cuốn album để đựng hết những tấm photobooth của hai đứa, kèm một lá thư tay thật dài.',
      'Lật từng trang: 19/07 lần đầu tiên. 02/08 lần đầu em quàng tay anh, pose em nháy mắt, pose em cắn anh. 16/08 tấm cả hai cùng thích nhất. 05/09 sáu khung lần đầu. 19/09 ba lần trong một ngày, có cả bể cá. Mấy trang sau còn trống, để dành cho những lần sau.',
      'Hoá ra photobooth không chụp khuôn mặt. Nó chụp lại cái cách hai đứa nhìn nhau.',
    ],
    chips: ['Thư tay siêu dài', 'Gấu nâu mặc đồ ngủ', 'Tấm 16/08'],
  },
  {
    id: 'banh-trang-jar',
    kind: 'jar',
    date: '05/08',
    title: 'Hũ bánh tráng của dì',
    hint: 'Lần đầu anh được gặp ba em',
    body: [
      'Nhà em cho anh ổi chùa còn nguyên cuống. Em dặn kỹ: phủi kiến đi thôi, không được giết tụi nó. Anh cười mãi, vì cô bé của anh thương cả mấy con kiến nhỏ.',
      'Dì em tặng hũ bánh tráng siêu ngon. Anh tặng lại em gà rán thật và gà rán gấu bông. Và hôm đó, lần đầu anh được gặp ba em, run nhưng vui.',
    ],
    chips: ['Ổi chùa', 'Gà rán gấu bông', 'Gặp ba lần đầu'],
  },
  {
    id: 'movie-ticket',
    kind: 'ticket',
    date: '08/08',
    title: 'Vé phim "Thư tình gửi ngoại"',
    hint: 'Lần đầu anh được hun em khi chụp hình',
    body: [
      'Galaxy Nguyễn Du, rồi GS25 gần Hồ Con Rùa có góc cà phê siêu đẹp. Anh chụp chưa ưng, nên về sau em mang máy ảnh cho anh tập chụp.',
      'Và lần đầu tiên, trong một tấm hình, anh được hun em. Cuối ngày là chè Kai Kai gần sở thú, bờ kè Nhiêu Lộc gió thổi mát rượi.',
    ],
    chips: ['Hồ Con Rùa', 'GS25', 'Chè Kai Kai'],
  },
  {
    id: 'lily-hcmue',
    kind: 'bouquet',
    date: '11/08',
    title: 'Bó hoa ly mừng em đậu đại học',
    hint: '19h30, Sư phạm Tiểu học, HCMUE',
    body: [
      '7 giờ tối anh về tới nhà, 7 giờ 15 ra tiệm hoa, vừa chọn hoa vừa nhắn em, lòng vừa háo hức vừa lo. 7 giờ 30, lúc bó hoa đang được gói, em báo tin: em đậu rồi.',
      '8 giờ 15, anh đứng trước mặt em với bó hoa ly xinh nhất từ trước tới giờ, kèm một lá thư tay. Cô giáo tiểu học tương lai của anh, anh tự hào về em lắm.',
    ],
    chips: ['HCMUE', 'Sư phạm Tiểu học', 'Bó hoa ly'],
  },
  {
    id: 'lamour-camera',
    kind: 'camera',
    date: '16/08',
    title: 'Máy ảnh cơ ở Lamour',
    hint: 'Lần đầu em cho anh hun má',
    body: [
      'Hai đứa đi làm hoa ở Lamour Saigon. Em chỉ anh cắt giấy, cắt giấy kiếng, cắm từng cành. Em cầm máy cơ chỉ anh chụp, và lần đầu anh chụp em bằng máy cơ, chụp cả em, cả hoa, cả hai đứa.',
      'Mắc mưa nhỏ, ghé photobooth lần ba, chụp cùng bó hoa tự tay làm. Hai đứa cùng thích nhất một tấm. Rồi em chủ động cho anh hun má, lần đầu tiên. Anh vẫn nhớ cảm giác ấy, như mưa vừa tạnh mà trời còn thơm.',
    ],
    chips: ['Lamour Saigon', 'Máy cơ', 'Tấm ảnh hai đứa cùng thích'],
  },
  {
    id: 'teddy-drumstick',
    kind: 'chicken',
    date: '19/08',
    title: 'Đùi gà gấu bông Lotteria',
    hint: 'Chị nhân viên khen em đáng yêu',
    body: [
      'Hai đứa đi săn đùi gà gấu bông ở Lotteria. Chị nhân viên khen em đáng yêu, anh đứng bên cạnh cười như được khen chính mình.',
      'Hôm đó anh tập buộc tóc cho em mà chưa được. Ghi chú cho anh của sau này: học lại buộc tóc, học cả tô son cho em nữa.',
    ],
    chips: ['Lotteria', 'Học buộc tóc'],
  },
  {
    id: 'bubbles',
    kind: 'bubbles',
    date: '23/08',
    title: 'Ống thổi bong bóng',
    hint: 'Hai đứa lớn mà chơi như hai đứa nhỏ',
    body: [
      "Ăn McDonald's xong, hai đứa mua đồ thổi bong bóng, nghịch ngay trước sảnh. Mấy bé con chạy tới đập bong bóng, cười giòn tan. Về tới nhà, hai đứa còn đứng thổi tiếp trước cửa.",
      'Em yêu trẻ con, trẻ con cũng yêu em. Anh đứng nhìn và nghĩ: cô giáo tương lai của mấy bé đây rồi.',
    ],
    chips: ["McDonald's", 'Nice day'],
  },
  {
    id: 'mirror-heart',
    kind: 'mirrorbox',
    date: '25/08',
    title: 'Hộp gương trái tim xanh biển',
    hint: 'Một tháng của chúng mình',
    body: [
      'Anh đón em ở Vạn Hạnh Mall với bó hoa calla lily, loài hoa người ta hay dùng cho đám cưới. Em tặng anh một món quà bí ẩn trong hộp xanh có ruy băng nơ, màu hộp em thích nhất.',
      'Bên trong là chiếc áo thun có cổ thêu con ngựa, màu em thích anh mặc. Và một chiếc hộp gương trái tim xanh biển kim tuyến em tự tay làm, có hoa, có vỏ ốc, có hình hai đứa.',
      'Kèm lá thư em nói em yêu anh, và một nụ hôn. Đáng yêu vô cùng tận.',
    ],
    chips: ['Anni một tháng', 'Calla lily', 'Cacao dừa dì Lan'],
  },
  {
    id: 'bread-for-everyone',
    kind: 'bread',
    date: '13/09',
    title: 'Mười hai ổ bánh mì, thêm năm ổ',
    hint: 'Áo mưa đỏ, áo mưa xanh',
    body: [
      'Mưa to gió lớn, hai đứa mặc áo mưa một đỏ một xanh, áo hơi dài với em. Dưới mưa nhỏ, em lại chủ động dang tay, hai đứa ôm nhau mấy chục giây, rồi anh xin hun má, hun trán em. Lãng mạn tới mức anh còn tưởng mình đang đóng phim.',
      'Trên đường, anh bảo em quay mặt sang phải để tránh nước xe lớn bên trái. Tới Nowzone ăn Dookki, em thích gà sốt chua, mì tương đen, tokbokki.',
      'Rồi hai đứa mua mười hai ổ bánh mì đi phát. Tới cây xăng còn đúng một ổ cho hai cô, em nảy ý mua thêm năm ổ, còn đòi trả chung cho vui. Hôm đó anh thương em thêm một lần nữa, vì trái tim em.',
    ],
    chips: ['Áo mưa đỏ và xanh', 'Dookki', 'Nowzone', 'Bánh mì cho mọi người'],
  },
  {
    id: 'mini-lanterns',
    kind: 'lantern',
    date: '20/09',
    title: 'Hai chiếc lồng đèn nhỏ',
    hint: 'A queen in a long jacket',
    body: [
      'Anh mua cho em và em bé hai chiếc lồng đèn nho nhỏ. Hai đứa đi ăn tokbokki khổng lồ to như bảy viên ngọc rồng, rồi cơm tấm, ngồi kể lại lần đầu đi ăn, lần đầu đi chơi.',
      'Sáng đó em còn tặng anh cặp Bubu Dudu. Hai đứa đi tìm phấn, khăn, hộp cho ngày đầu em đi học. Trên đường về em kêu lạnh, anh khoác áo cho em. Em mặc vào, xinh như một nữ hoàng nhỏ trong chiếc áo khoác rộng thùng thình.',
    ],
    chips: ['Tokbokki khổng lồ', 'Phấn và khăn', 'Áo khoác của anh'],
  },
  {
    id: 'bubu-dudu',
    kind: 'figurines',
    date: '26/09',
    title: 'Bubu và Dudu',
    hint: 'Dudu nấu ăn bị té gãy muỗng',
    body: [
      'Cặp Bubu Dudu em tặng anh từ hôm 20/09. Đến 26/09, hai đứa chụp hình cùng nhau, Dudu nấu ăn bị té gãy cái muỗng, hai đứa mua lại.',
      'Rồi hai đứa chụp cả hình effects xịn trên Instagram, y như hai đứa mình.',
    ],
    chips: ['Bubu Dudu', 'Effects xịn trên Instagram'],
  },
  {
    id: 'guppies',
    kind: 'fishtank',
    date: '27/09',
    title: 'Bể cá bảy màu và bó cẩm tú cầu',
    hint: 'Bó hoa đầu tiên trong đời anh là từ em',
    body: [
      'Hai đứa đi tiệm cá, mua cá bảy màu, cá moli, cả ốc. Em ngồi ngắm cá, đáng yêu tới mức anh quên luôn mình đang ngắm cá.',
      'Trên đường, em thấy bó hoa tốt nghiệp xanh xinh và mua tặng anh, bó hoa đầu tiên trong đời anh được nhận. Tới tiệm cá thì hoa ướt, rớt mất. Anh xin lỗi rối rít, vậy mà em kéo anh qua tiệm hoa, mua lại tặng anh một bó cẩm tú cầu xanh dương.',
      'Về nhà dưới mưa râm râm, lành lạnh, em ôm anh, anh đưa áo khoác cho em đỡ lạnh. Hết mưa thì tới nhà.',
    ],
    chips: ['Cá bảy màu', 'Moli', 'Cẩm tú cầu xanh', 'Gongcha khoai môn'],
  },
  {
    id: 'brown-bear-letter',
    kind: 'letter',
    date: '03/10',
    title: 'Lá thư thật dài',
    hint: 'Em là cô MC giỏi nhất',
    body: [
      'Hôm em thi MC xong, em mặc đầm xanh đậm, trông vừa giống cô giáo, vừa giống MC thật. Rồi em tặng anh chú gấu nâu mặc đồ ngủ, tay ôm thêm một bạn gấu nhỏ có mặc quần.',
      'Và một lá thư tay siêu dài. Anh đọc chậm từng dòng, như sợ đọc nhanh thì hết. Cảm ơn em đã nhớ những ngày anh quên, và thương anh theo cách dịu dàng nhất.',
    ],
    chips: ['Quốc tế bạn trai', 'Gấu nâu', 'Thư tay'],
  },
  {
    id: 'ecuador-roses',
    kind: 'candy',
    date: '04/10',
    title: 'Kẹo ngậm và hồng Ecuador',
    hint: 'Bé mau khoẻ nhé',
    body: [
      'Hôm em đi lấy chứng chỉ MC, trời mưa nhẹ, em còn sốt nhẹ. Anh chở em đi mua thuốc, mua kẹo ngậm, rồi ghé tiệm hoa bên cạnh mua bó hồng Ecuador siêu to.',
      'Em mặc đầm trắng siêu đáng yêu. Photoism, lần đầu chụp hình hun gần dính. Ăn vặt Thành Thái hứa sẽ quay lại. Mau khoẻ nha cô MC của anh.',
    ],
    chips: ['Chứng chỉ MC', 'Đầm trắng', 'Photoism'],
  },
  {
    id: 'song',
    kind: 'music',
    date: '',
    title: 'Dù cho tận thế',
    hint: 'Bài hát của em',
    body: [
      'Em thích J97, thích bài "Dù cho tận thế". Anh để đĩa nhạc ở đây, bật lên là căn phòng ấm hẳn.',
      'Còn ba em thì nghe Hotel California, One Way Ticket trên xe, ở nhà mở cải lương loa lớn, Paris By Night. Thì ra cô bé của anh lớn lên giữa những giai điệu như vậy.',
      'Điểm chung đầu tiên của hai đứa: FAPtv, Đậu Phộng.',
    ],
    chips: ['J97', 'FAPtv', 'Hotel California'],
  },
  {
    id: 'florist-table',
    kind: 'florist',
    date: '',
    title: 'Bàn cắm hoa của cô florist',
    hint: 'Ước mơ làm florist của em',
    body: [
      'Em mơ làm florist. Nên căn phòng này có một chiếc bàn cắm hoa chờ sẵn: ly kép trắng tâm vàng, hồng hồng và hồng trắng, tulip, cẩm chướng tươi hai tuần, hồng Ohara thơm mà chỉ tươi ba ngày.',
      'Còn dạ lan hương và linh lan, hai loài hoa thơm dịu em thích, anh để dành ở một góc riêng của bàn, như để dành một điều dịu dàng.',
      'Hồi nhỏ đi công trường với ba, em đã để ý những nhúm hoa mười giờ. Hoá ra yêu hoa là chuyện của em từ rất lâu rồi.',
    ],
    chips: ['Ly', 'Hồng', 'Tulip', 'Hoa mười giờ'],
  },
  {
    id: 'chalkboard',
    kind: 'chalkboard',
    date: '',
    title: 'Bảng phấn của cô giáo nhỏ',
    hint: 'Cô giáo tiểu học tương lai',
    body: [
      'Văn và Anh đưa em vào LHP, rồi Sư phạm Tiểu học ở HCMUE. Em thương trẻ con, thương học trò, thương cả những lớp học nhỏ xíu.',
      'Chữ mẹ em đẹp nhất nhà, và anh đoán chữ em trên bảng phấn rồi cũng sẽ đẹp như vậy. Một ngày nào đó sẽ có một lớp học nhỏ gọi em là cô Su.',
    ],
    chips: ['LHP', 'HCMUE'],
  },
  {
    id: 'favourite-menu',
    kind: 'menu',
    date: '',
    title: 'Thực đơn của em',
    hint: 'Ghi nhớ cho anh: hôm nay em muốn ăn gì',
    body: [
      "Bún bò, bún sườn bò, bún mắm nêm. Ốc. Cơm tấm. Gà rán: KFC thì gà viên, khoai tây, kem vani; McDonald's thì McWings với sốt chua ngọt; Lotteria vì đùi gà gấu bông.",
      "Pizza phải có dứa, Domino's vì có olive. Sushi, lẩu, hàu nướng phô mai, xúc xích phô mai GS25, kem Celano socola và dâu, snack Oishi cà chua. Koi trăm phần trăm đường, Gongcha bảy mươi. Uống trà được, cà phê thì không.",
      'Còn hột vịt lộn với cháo ếch: anh gạch tên vĩnh viễn khỏi thực đơn.',
    ],
    chips: ['Pizza có dứa', 'Koi 100%', 'Không cà phê'],
  },
  {
    id: 'firefly-necklace',
    kind: 'necklace',
    date: '',
    title: 'Dây chuyền đom đóm',
    hint: 'Ánh sáng nhỏ em thích',
    body: [
      'Em thích dây chuyền đom đóm, thích Hello Kitty, thích thiên nhiên và màu hồng. Thích số 2, con số may mắn, hai người.',
      'Em thích hồng vì dễ thương, vàng nhạt vì nhìn thấy tâm hồn dễ chịu, trắng vì sang, xanh baby nhạt vì đáng yêu, xanh baby đậm vì ngầu. Còn anh, em thích anh mặc kem, đen, hay vàng nhạt.',
    ],
    chips: ['Số 2', 'Hello Kitty', 'Nature & pink'],
  },
  {
    id: 'childhood',
    kind: 'childhood',
    date: '',
    title: 'Tấm hình em bé bị chét kem',
    hint: 'Kí ức tuổi nhỏ',
    body: [
      'Em là bé đầu tiên trong nhà, được cả nhà cưng tới mức gọi các dì các chú là mẹ, là ba. Hồi nhỏ em sợ múa mặt nạ, và mấy dì phải chở em đi vòng vòng thì em mới chịu ngủ.',
      'Có tấm hình em bé bị chét kem lem luốc cả mặt, nhìn là muốn cười. Anh treo nó ở đây, vì cô bé ấy đã lớn lên thành người con gái anh thương nhất.',
    ],
    chips: ['Bé đầu tiên trong nhà', 'Sợ múa mặt nạ'],
  },
];

export const memoryById = (id: string) => MEMORIES.find((m) => m.id === id);
