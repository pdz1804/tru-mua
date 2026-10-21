# Designer models

All models in this folder are original work, built procedurally in Blender for the sister app Căn phòng của Su and reused here.
No outside models or textures were used, so there is nothing to attribute. They are not CC0 packs: they belong to the project.

Format: glTF 2.0 binary, metres, Y up, front +Z, no Draco or KTX2. Pivot is bottom-centre; back-centre for wall pieces;
the hanging point for the lanterns and raincoats; the hinge edge for the door.

Used in the café (`src/world/Designer.tsx`) and the rain chapters (`src/chapters/engine/designer.ts`):
keepsake-bubble-wand, keepsake-bubu-dudu, keepsake-cactus, keepsake-ecuador-roses, keepsake-film-camera,
keepsake-fried-chicken-plush, keepsake-guava, keepsake-guppy-tank, keepsake-heart-mirror-box, keepsake-hello-kitty,
keepsake-blue-hydrangea, keepsake-pajama-bear, keepsake-phin-keychain, keepsake-photobooth-album, keepsake-radio,
keepsake-raincoats, keepsake-rice-paper-jar, keepsake-shell-car, keepsake-stitch, keepsake-taro-milk-tea,
keepsake-ten-oclock-flower, keepsake-two-lanterns, keepsake-white-lily, scene-bookcase, scene-door-set,
scene-hall-bench, scene-paper-lantern, scene-sala-flower, scene-umbrella-stand, scene-wall-sconce,
keepsake-blue-gift-box, keepsake-yarn-basket, keepsake-mask-toy, keepsake-sale-bear, keepsake-mc-certificate,
keepsake-mc-mic, keepsake-flower-shop.

Room furniture reused from the sister app, unchanged (they come at an arbitrary size with a centred pivot, so the café
fits each one to the box of the piece it replaces with the `fit` prop of `Designer`): room-standing-lamp, room-oval-rug,
room-striped-rug, room-nightstand, room-dresser-cabinet, room-writing-desk, hall-runner-rug, held-coffee-table,
room-floor-cactus.

Built for this app (same pipeline, also original work): tm-umbrella-open, tm-banh-mi, tm-banh-mi-bag, tm-scooter, tm-truck,
tm-chicken-bucket, tm-movie-ticket-pair, tm-long-letter, tm-menu-card, tm-firefly-necklace, tm-baby-photo-frame,
tm-bouquet-wrapped, tm-chalkboard, tm-red-stool, tm-exciter, tm-raincoat-worn.
