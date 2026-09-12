# 분수 월드 이미지 제작 — 2026-09-12

Built-in `image_gen` 사용. 신규 이미지 10장을 채택했다. 투명 배경 추출 편집 1회도 시도했으나 원본 PNG의 실제 알파 채널 확인 후 원본을 채택했다. 운영 파일은 `public/fraction-world/assets/`에 저장했다. 배경/커버는 sips로 JPEG 품질 85 인코딩만 수행했으며, 투명 멤버/전투 캐릭터는 원본 PNG를 보존했다. 아틀라스는 CSS 또는 Canvas에서 셀을 선택해 표시한다.

## 채택 자산 및 사용 위치

| 파일 | 내용 | 사용 위치 |
|---|---|---|
| tower-cover-v1.jpg | 토끼 귀 모험가와 탑, 작은 몬스터 | 탑 로비 카드 |
| ruins-v1.jpg | 이끼빛 폐허 바닥 | 지역 입장·실제 전투 |
| desert-v1.jpg | 유리 사막 바닥 | 지역 입장·실제 전투 |
| castle-v1.jpg | 푸른 잿불 성채 바닥 | 지역 입장·실제 전투 |
| void-v1.jpg | 별 없는 왕좌 바닥 | 지역 입장·실제 전투 |
| rehearsal-v1.jpg | 빈 연습실 | 스튜디오 기본 배경 |
| concert-v1.jpg | 첫 콘서트 무대 | 로비·팬 100명 이상 무대 |
| members-v1.png | 4열×2행, 멤버 8명 | 멤버 선택·상세 카드·연습실/무대 |
| actors-v1.png | 주인공과 일반 몬스터 4열×2행 | 실제 전투 스프라이트 |
| bosses-v1.jpg | 2열×2행, 보스 4명 | 보스 입장 배너 |

멤버 PNG는 투명 기본 외형이며 의상별 그림은 아직 없다. 의상의 능력치 효과와 이름 표시는 유지된다. 주인공과 일반 몬스터는 투명 아틀라스를 전투에 사용한다. 보스의 실제 전투 그림은 기존 코드 그림을 유지하고 입장 배너에 생성 초상화를 사용한다. 행동별 프레임과 의상별 신규 그림은 이번 배포에 포함하지 않았다. 전투 배경·캐릭터 로딩 실패 시 기존 코드 그림으로, 인물/커버 실패 시 기존 SVG로 복구한다. 경기 규칙·저장·학생 데이터는 변경하지 않았다.

## 제작 프롬프트 세트

모든 신규 자산의 use case는 stylized-concept다. 아래는 채택 이미지의 생성 요청 내용이다.

### ruins-v1
Production game background asset, landscape 3:2. An original hand-painted fantasy top-down arena for a tablet action game, mossy ancient ruins in deep teal stone, luminous mint rune accents. Camera strictly overhead, rectangular playable floor occupying full image, worn large stone paving, central subtle compass engraving. Beautiful detailed vegetation, ruined stone arch lintels and lanterns ONLY along outermost 8 percent of edges. Keep interior 84 percent flat, unobstructed and low-contrast so small enemies and bullets are readable. No characters, no UI, no text, no chests, no obstacles in interior, no perspective horizon. Premium illustrated indie game environment with crisp shapes, atmospheric ambient lighting, restrained detail. Entire image is usable game arena.

### rehearsal-v1
Production background illustration for a cozy idol management tablet game. Landscape 3:2. A beautiful small dance rehearsal studio, front facing dollhouse room interior, soft lavender and peach palette, warm morning light, polished wood floor, mirrors on back wall, a small keyboard, microphone stand, portable speaker and leafy plant along the side edges, pinboard with abstract star shapes and no readable writing. The middle and entire bottom half must be empty wooden floor for placing three animated game characters. No people, no silhouettes in mirrors, no words, no UI. High quality hand-painted anime game environment, crisp friendly shapes, detailed materials, gentle lighting, age appropriate for primary school children.

### members-v1
A production character sprite atlas for a cozy idol raising tablet game. Exactly EIGHT different full-body chibi performers in a strictly aligned FOUR COLUMN by TWO ROW grid, each character centered in their equal rectangular cell, fully inside their cell with large clear margins, no overlap. TRANSPARENT background, actual alpha, no checker pattern, no words, no border, no labels, no shadows outside feet. High quality cohesive anime game illustration, charming 3-head-tall proportions, modest pastel rehearsal jackets and trousers or knee-length skirts with sneakers, friendly confident expressions. Row1 left to right: lavender long-haired girl with star hairclip; peach short-haired sporty boy; sky-blue long-haired girl holding small microphone; pink bob-haired girl with bow. Row2 left to right: mint short-haired boy; apricot curly pigtail girl; silver-lavender wavy-haired boy; blond swept-haired boy. Clear distinct faces/hair but identical art style, full body front facing slight three-quarter, neutral relaxed pose. Landscape atlas aspect 3:2, cells have consistent scale and identical baseline inside each row. Every cell contains exactly one character.

참고: 원본 PNG에 투명 채널이 있으며 브라우저 캔버스로 모서리 알파 0을 검증했다.

### desert-v1
Production background for an overhead tablet fantasy action game, landscape 3:2. Glass desert arena inside ancient rose-sandstone ruins, warm dusky violet shadows, amber crystals and hourglass carvings confined to outermost 8 percent edge border. Strict straight overhead camera, entire central 84 percent is flat empty low contrast stone paving with a faint circular sand rune, no obstacles, no characters, no interface or writing. Hand painted premium anime fantasy game environment, crisp readable shapes, quiet central floor, beautiful dramatic amber rim lights. The floor fills the entire image; no sky, no horizon.

### castle-v1
Production top-down fantasy tablet action game arena background, landscape 3:2. Blue ember castle: dark navy medieval stone paving, icy blue braziers and ruined masonry restricted to outermost 8 percent edges. Strict overhead camera, no perspective horizon. Central 84 percent is EMPTY unobstructed flat low contrast blue stone floor, subtle engraved knight crest. Beautiful hand-painted fantasy game illustration, cool blue lighting and a little pale gold metal, crisp shapes readable behind small game characters. No characters, no interface, no text, no central obstacles. Full frame usable arena floor.

### void-v1
Top-down final arena background for fantasy tablet action game. Landscape 3:2. A starless purple crystal throne chamber floating in darkness: obsidian violet floor, faint magical concentric star engraving, shattered amethyst architecture confined to outermost 8 percent border. Strict directly overhead camera. Central 84 percent quiet flat unobstructed low-contrast paving, no characters, no objects in middle, no UI or lettering. Premium painted game art with delicate violet and cyan glows, mysterious but age appropriate, crisp readable shapes, no horizon.

### concert-v1
Premium anime game environment background for a cozy idol management tablet game. Landscape 3:2, straight-on view of a beautiful small concert stage from audience height. Lavender and peach spotlights, mint accent lights, elegant star-shaped decoration, layered curtains, distant audience glow sticks only at bottom edge. Entire central stage empty for overlaying three game characters. Open floor in bottom half. No performers, no text, no logo, no UI. Magical celebratory first debut mood, warm welcoming colors, high quality painted details, readable composition.

### bosses-v1
One production boss portrait atlas for a fantasy tablet game, 2 columns by 2 rows of perfectly equal rectangular panels, landscape 3:2. Every panel is a fully painted dramatic character portrait with a dark background, centered full upper body, identical scale, clear margins. Top left a moss-covered ancient tree guardian with branching antlers and mint crystal heart; top right a mysterious friendly-looking sand hourglass witch with a large pointed hat in amber and mauve; bottom left a blue armored knight with icy glowing visor and sword; bottom right a faceted amethyst living crystal heart with dark wings. Cohesive premium hand-painted chibi fantasy RPG art, strong distinct silhouettes, expressive and formidable but child appropriate, no gore, no writing, no frames, no UI, no text. Four distinctly separate equal panels, no crossover between panels.

### tower-cover-v1
Wide landscape 3:2 key illustration for original chibi fantasy action game. A brave small rabbit-eared lavender hooded adventurer holding a mint crystal star wand in the left foreground, standing before an enormous mysterious moss covered tower with a glowing broken rune doorway. Three small distinct monsters peek from ruins: horned purple imp, crimson charging beetle, floating amber crystal. Beautiful layered teal forest ruins, mint magic particles, premium anime fantasy RPG painting, welcoming adventure but exciting danger, clear readable silhouettes, dramatic moonlit lighting. No text, no logos, no UI. Character fully visible, tower dominates background. Designed as a tablet game lobby cover.

### actors-v1
Production transparent sprite atlas for an overhead chibi fantasy action RPG. Exactly 8 isolated full-body sprites, FOUR equal columns by TWO equal rows, no overlaps, each centered in its own cell with ample padding, aligned feet baseline. Actual TRANSPARENT ALPHA background. No backgrounds, shadows, frames, labels or text. Landscape 3:2. Row1 left to right: small rabbit-eared lavender hooded adventurer with a mint star wand; horned violet imp with glowing pink eyes; floating amber crystal sentry with single dark eye; stout crimson beetle with two charging horns. Row2 left to right: mint green twin-lobed slime; blue flying one-eyed bat; small yellow-petaled healing flower creature; purple armored mushroom creature. Strong crisp silhouettes readable at 48 pixels, 3/4 front overhead view, cohesive premium hand-painted chibi game style, simple shading, bright edges, no gore, friendly fantasy adventure. All eight characters completely contained inside equal 4 by 2 cells.
