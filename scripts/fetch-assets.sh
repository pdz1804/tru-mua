#!/usr/bin/env bash
# Usage: bash fetch-tru-mua-assets.sh <out-dir>   (e.g. public/assets). Needs curl, unzip (Git Bash ok).
set -euo pipefail
OUT="${1:-public/assets}"; TMP="$(mktemp -d)"; UA="Mozilla/5.0"
mkdir -p "$OUT"/{furniture-kenney,furniture-kaykit,restaurant-kaykit,food-kenney,street-kenney,street-misc,characters,fx,hdri,textures}

# zget <zip> <name> <dest>: extract <name>.glb from any folder inside zip
zget(){ f=$(unzip -Z1 "$1" | grep -E "(^|/)$2\.glb$" | grep -iv -E "fbx|obj|stl" | head -1); [ -n "$f" ] && unzip -joq "$1" "$f" -d "$3" || echo "MISSING $2"; }

# 1) Kenney Furniture Kit (CC0). GLBs use KHR_materials_unlit -> swap to MeshStandardMaterial in code
curl -fsSL -A "$UA" -o "$TMP/kfk.zip" https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip
for n in bear books bookcaseOpen bookcaseClosedWide bookcaseOpenLow chairCushion chairRounded chairDesk loungeSofa loungeSofaLong loungeDesignSofa loungeChair \
  table tableRound tableCoffee tableCoffeeGlass sideTable sideTableDrawers lampRoundTable lampRoundFloor lampSquareFloor lampWall plantSmall1 plantSmall2 plantSmall3 pottedPlant \
  rugRound rugRectangle rugDoormat stoolBar stoolBarSquare kitchenBar kitchenBarEnd kitchenCoffeeMachine doorway doorwayFront doorwayOpen wall wallWindow wallDoorway wallDoorwayWide \
  floorFull coatRack cardboardBoxClosed pillow pillowBlue pillowLong radio ceilingFan trashcan paneling cabinetTelevision; do zget "$TMP/kfk.zip" "$n" "$OUT/furniture-kenney"; done
unzip -joq "$TMP/kfk.zip" License.txt -d "$OUT/furniture-kenney"

# 2) Kenney Food Kit (CC0): cafe tabletop items
curl -fsSL -A "$UA" -o "$TMP/fk.zip" https://kenney.nl/media/pages/assets/food-kit/83086fa91c-1719418518/kenney_food-kit.zip
for n in cup-coffee cup-saucer cup-tea mug cake cake-birthday cupcake croissant donut glass soda-glass plate bowl; do zget "$TMP/fk.zip" "$n" "$OUT/food-kenney"; done

# 3) Kenney Retro Urban Kit (CC0): facade, doors, awnings, windows, lamps, asphalt
curl -fsSL -A "$UA" -o "$TMP/ruk.zip" https://kenney.nl/media/pages/assets/retro-urban-kit/8314d4db22-1738147509/kenney_retro-urban-kit.zip
for n in door-type-a door-type-b detail-awning-small detail-awning-wide detail-light-single detail-light-double detail-bench detail-dumpster-closed detail-barrier-type-a \
  window-wide-type-a window-small-type-a wall-a-flat-window wall-a-door wall-a-flat wall-a-roof road-asphalt-straight road-asphalt-pavement road-asphalt-side; do zget "$TMP/ruk.zip" "$n" "$OUT/street-kenney"; done
unzip -joq "$TMP/ruk.zip" License.txt -d "$OUT/street-kenney"

# 4) KayKit (CC0): codeload zip (no GitHub API rate limit) -> only the glTF folder (.gltf + .bin + shared texture png)
kk(){ # repo pkg dst regex
  curl -fsSL -o "$TMP/$3.zip" "https://codeload.github.com/KayKit-Game-Assets/$1/zip/refs/heads/main"
  unzip -Z1 "$TMP/$3.zip" | grep -E "Assets/gltf/[^/]+\.(gltf|bin|png)$" | grep -E "$4" > "$TMP/$3.lst" || true
  while read -r p; do unzip -joq "$TMP/$3.zip" "$p" -d "$OUT/$3"; done < "$TMP/$3.lst"
  unzip -joq "$TMP/$3.zip" "$(unzip -Z1 "$TMP/$3.zip" | grep -m1 "Assets/LICENSE.txt")" -d "$OUT/$3"; }
kk KayKit-Furniture-Bits-1.0 kaykit_furniture_bits furniture-kaykit '.'
kk KayKit-Restaurant-Bits-1.0 kaykit_restaurant_bits restaurant-kaykit '/(chair_|table_round|jar_|door_|wall|menu|pillar|plate|bowl|towelrail|restaurantbits_texture)'

# 5) Poly Pizza static CDN (license is PER MODEL). CC0 unless noted.
pp(){ curl -fsSL -o "$OUT/$2" "https://static.poly.pizza/$1.glb"; }
pp f3ffaf78-42ea-450c-bc58-e6702e74f313 street-misc/umbrella-closed.glb   # CreativeTrio CC0
pp 495274d9-0167-45ce-b826-933af7930602 street-misc/streetlight-kay.glb   # Kay Lousberg CC0
pp f040ce00-f0fb-4789-8035-e47db0e1cd1c street-misc/present.glb           # CreativeTrio CC0 (gift box)
pp f28280ed-888d-4d9b-9d13-af2baf36b749 fx/clownfish.glb                  # Quaternius CC0, 6 swim clips
pp 6805b99c-5fd7-4aab-bf57-3bb645e1108a fx/fish.glb                       # Quaternius CC0, 1 swim clip
pp eda09da3-80dc-4196-b20d-2ca4f40af846 street-misc/scooter.glb           # Julien Savoie CC-BY 3.0 -> credit
pp b771a0df-3c43-42a9-b0dd-6e3d10a83b31 street-misc/vespa.glb             # Jasmine Roberts CC-BY 3.0 -> credit

# 6) Characters: Quaternius Ultimate Modular Men/Women (these 4 = CC0). 24 clips each
pp 90a9e2d4-053f-42f1-99a2-8f5e1180ea7f characters/boy-casual.glb         # Casual Character (male)
pp bcd66ec5-5e81-4901-a222-47abc875fe2a characters/boy-hoodie.glb         # Hoodie Character (male)
pp ba7a1955-ea51-4cb9-a561-188bdef0a6c7 characters/girl-casual.glb        # Animated Woman (casual)
pp 46d6db5a-3c9f-4238-8cdf-8eb7194498dc characters/girl-formal.glb        # Animated Woman (formal)

# 7) Poly Haven (CC0): night HDRI 1k + 1k PBR jpg (diff/nor_gl/arm)
curl -fsSL -o "$OUT/hdri/kloppenheim_04_1k.hdr" https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_04_1k.hdr
PH=https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k
for t in asphalt_02 dark_wooden_planks grey_plaster_02 brown_floor_tiles; do mkdir -p "$OUT/textures/$t"
  for m in diff nor_gl arm; do curl -fsSL -o "$OUT/textures/$t/${t}_${m}_1k.jpg" "$PH/$t/${t}_${m}_1k.jpg"; done; done
rm -rf "$TMP"; echo done; du -sh "$OUT"

# Kenney GLBs reference sibling Textures/ folders; fetch them too.
tex() { tmp=$(mktemp -d); curl -sL -o "$tmp/k.zip" "$1"; unzip -q "$tmp/k.zip" -d "$tmp"; mkdir -p "$OUT/$2/Textures"; cp "$tmp"/Models/GLB\ format/Textures/* "$OUT/$2/Textures/"; rm -rf "$tmp"; }
tex https://kenney.nl/media/pages/assets/food-kit/83086fa91c-1719418518/kenney_food-kit.zip food-kenney
tex https://kenney.nl/media/pages/assets/retro-urban-kit/8314d4db22-1738147509/kenney_retro-urban-kit.zip street-kenney
# CC-BY models are deliberately not shipped (100% CC0 policy).
rm -f "$OUT/street-misc/scooter.glb" "$OUT/street-misc/vespa.glb"; rm -rf "$OUT/characters"
