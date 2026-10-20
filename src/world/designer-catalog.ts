import { createContext } from 'react';

/**
 * The designer's hand-made models (original work, see public/models/designer/CREDITS.md).
 * Contract: glTF 2.0, metres, Y up, front +Z. Pivot is bottom-centre, back-centre for wall pieces and the hanging
 * point for lanterns and raincoats, so `anchor` says which way a piece sits against its placement point.
 */
export const DESIGNER_FILES = [
  'keepsake-cactus',
  'keepsake-heart-mirror-box',
  'keepsake-phin-keychain',
  'keepsake-taro-milk-tea',
  'keepsake-stitch',
  'keepsake-photobooth-album',
  'keepsake-bubu-dudu',
  'keepsake-radio',
  'keepsake-fried-chicken-plush',
  'keepsake-raincoats',
  'keepsake-bubble-wand',
  'keepsake-two-lanterns',
  'keepsake-white-lily',
  'keepsake-ten-oclock-flower',
  'keepsake-ecuador-roses',
  'keepsake-film-camera',
  'keepsake-rice-paper-jar',
  'keepsake-guava',
  'keepsake-guppy-tank',
  'keepsake-blue-hydrangea',
  'keepsake-pajama-bear',
  'keepsake-shell-car',
  'keepsake-hello-kitty',
  'scene-sala-flower',
  'scene-paper-lantern',
  'scene-wall-sconce',
  'scene-hall-bench',
  'scene-bookcase',
  'scene-umbrella-stand',
  'scene-door-set',
  'keepsake-blue-gift-box',
  'keepsake-yarn-basket',
  'keepsake-mask-toy',
  'keepsake-sale-bear',
  'keepsake-mc-certificate',
  'keepsake-mc-mic',
  'keepsake-flower-shop',
  'tm-umbrella-open',
  'tm-banh-mi',
  'tm-scooter',
  'tm-truck',
  'tm-red-stool',
  'tm-banh-mi-bag',
  'tm-chicken-bucket',
  'tm-movie-ticket-pair',
  'tm-long-letter',
  'tm-menu-card',
  'tm-firefly-necklace',
  'tm-baby-photo-frame',
  'tm-bouquet-wrapped',
  'tm-chalkboard',
  'tm-exciter',
  'tm-raincoat-worn',
] as const;
export type DesignerFile = (typeof DESIGNER_FILES)[number];

export const designerUrl = (file: string) => `${import.meta.env.BASE_URL}models/designer/${file}.glb`;

/**
 * Nothing is fetched until a Designer actually renders with this switched on. The title screen shows the café street
 * in `preview` mode with the switch off, so it costs no model downloads; the café turns it on when play starts, and
 * the rain chapters (their own renderer) fetch only the few files their level asks for.
 */
export const DesignerEnabled = createContext(true);
