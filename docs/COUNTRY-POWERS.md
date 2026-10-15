# Country fantasy signatures

The catalog gives each of the 196 playable countries one original fantasy signature, covering the existing 193 UN member states plus Palestine, Vatican City and Taiwan. Country IDs, names and flag artwork remain in the existing roster. No country is selected through a regional or generic fallback.

Each choice draws on a particular landscape, material, craft, plant, animal, emblem or cultural practice. These are creative starting points, not descriptions of everyone from a country, and a motif need not be exclusive to one place. The effects and move names are fiction. Iran's requested Uranium Pulse deliberately uses a bright green fantasy glow.

The signatures supply visual and sound identity for the separate special move. Shared combat rules determine damage, timing and projectile behavior; this catalog contains no strength rankings or combat statistics.

## API

Load `browser/src/powers.js` before the game integration, or use `require('./browser/src/powers.js')` in Node. Both expose the same `{ POWERS, get }` API, with the browser API at `window.NationPowers`.

- `POWERS` is a frozen object keyed by the exact two-letter roster country ID.
- `get('pk')` returns Pakistan's frozen signature; unknown IDs return `undefined`.
- Every record contains `id`, `name`, `kind`, `color`, `accent`, `motif`, `seed`, `sound` and `description`.
- `kind` selects one of nine renderer families: energy, crystal, metal, leaf, sand, water, wind, ember or star.
- `motif` is a stable descriptive string, not a country-name template. `seed` is an unsigned FNV-1a hash of `id + ':' + motif` so repeated loads reproduce the same decoration. Renaming a move alone does not alter its seed.
- `color` and `accent` are six-digit RGB hex colors. `sound` selects energy, metal, water, wind, fire, earth, ice or lightning.

## Reviewed inspirations

| Country (ID) | Fantasy signature | Visual family | Selected inspiration and fictional effect |
| --- | --- | --- | --- |
| Japan (`jp`) | Sakura Radiance | star | Cherry-blossom petals become a luminous spiral inspired by Japan's sakura displays. |
| Pakistan (`pk`) | Emerald Crescent | energy | Pakistan's flag crescent inspires an emerald arc with a trailing star of fictional light. |
| Afghanistan (`af`) | Lapis Skyshard | crystal | Badakhshan lapis lazuli inspires a flight of deep blue crystal shards. |
| Albania (`al`) | Twin Eagle Gale | wind | The double-headed eagle on Albania's flag becomes two sweeping wings of scarlet air. |
| Algeria (`dz`) | Tassili Sunveil | sand | The sandstone formations of Tassili n'Ajjer inspire a curling veil of sunlit sand. |
| Andorra (`ad`) | Pyrenean Icebell | crystal | Andorra's Pyrenean peaks inspire a ringing arc of snow-bright crystals. |
| Angola (`ao`) | Palanca Thunder | energy | The giant sable antelope, native to Angola, inspires a luminous curve shaped like its horns. |
| Antigua and Barbuda (`ag`) | Frigatebird Sunrise | wind | Barbuda's frigatebirds and the flag's rising sun inspire golden wing-shaped gusts. |
| Argentina (`ar`) | Pampas Sunwheel | star | Argentina's flag sun and open Pampas inspire a spinning sky-blue wheel of light. |
| Armenia (`am`) | Apricot Ember | ember | Armenia's apricot-growing tradition inspires warm blossom-shaped sparks. |
| Australia (`au`) | Opal Mirage | crystal | Australian opal inspires a shifting fan of rainbow crystal facets. |
| Austria (`at`) | Alpine Arpeggio | wind | Austria's Alpine scenery and orchestral tradition inspire a rising ribbon of musical air. |
| Azerbaijan (`az`) | Caspian Fireweave | ember | Baku's flame imagery and Azerbaijani carpet patterns inspire interlaced ribbons of fantasy fire. |
| Bahamas (`bs`) | Blue Hole Vortex | water | Dean's Blue Hole in the Bahamas inspires a turquoise spiral edged with bright foam. |
| Bahrain (`bh`) | Pearl Prism | crystal | Bahrain's historic pearling tradition inspires an iridescent pearl with a halo of facets. |
| Bangladesh (`bd`) | Waterlily Monsoon | water | Bangladesh's river delta and national waterlily inspire a flower-shaped surge of monsoon water. |
| Barbados (`bb`) | Flying Fish Flash | water | Flying fish associated with Barbados inspire a swift blue splash with fin-shaped trails. |
| Belarus (`by`) | Bison Forest Charge | leaf | European bison in Belarus's Belovezh forest inspire a broad sweep of glowing woodland leaves. |
| Belgium (`be`) | Atomium Orbit | metal | Brussels' Atomium inspires linked silver spheres orbiting a bright metallic core. |
| Belize (`bz`) | Reef Jaguar | water | Belize's barrier reef and jaguar habitats inspire a spotted turquoise wave. |
| Benin (`bj`) | Ganvie Lakeweave | water | Ganvié's stilt village on Benin's Lake Nokoué inspires interlaced ribbons of luminous water. |
| Bhutan (`bt`) | Thunder Dragon Breath | energy | The dragon on Bhutan's flag inspires a golden cloud threaded with fictional lightning. |
| Bolivia (`bo`) | Uyuni Mirrorburst | crystal | Salar de Uyuni's reflective salt flats inspire a burst of mirrored crystal tiles. |
| Bosnia and Herzegovina (`ba`) | Neretva Arch | water | Mostar's bridge over the Neretva inspires a high arch of emerald water. |
| Botswana (`bw`) | Okavango Diamond | crystal | Botswana's diamonds and Okavango Delta inspire a clear gem surrounded by glittering droplets. |
| Brazil (`br`) | Carnival Canopy | leaf | Brazilian carnival ribbons and rainforest canopies inspire a dancing green-and-gold leaf spiral. |
| Brunei Darussalam (`bn`) | Rainforest Crown | leaf | Brunei's tropical rainforest canopy inspires a luminous crown of green and golden leaves. |
| Bulgaria (`bg`) | Rose Valley Bloom | leaf | Bulgaria's Rose Valley inspires a swirling bloom of bright pink petals. |
| Burkina Faso (`bf`) | Lostwax Bronze Echo | metal | Ouagadougou's bronze-casting craft inspires a rippling ring of glowing cast-metal shapes. |
| Burundi (`bi`) | Royal Drum Ripple | energy | Burundi's royal drumming tradition inspires expanding rings of fictional rhythmic energy. |
| Cabo Verde (`cv`) | Morna Sea Breeze | wind | Cabo Verde's morna music and Atlantic island breezes inspire gently twisting blue ribbons. |
| Cambodia (`kh`) | Angkor Lotuslight | star | Angkor's lotus-like temple towers inspire a radiant layered flower of light. |
| Cameroon (`cm`) | Volcanic Lionheart | ember | Mount Cameroon and the country's football lion emblem inspire a mane of glowing volcanic sparks. |
| Canada (`ca`) | Maple Aurora | leaf | Canada's maple-leaf emblem and northern auroras inspire a luminous ribbon of red leaves. |
| Central African Republic (`cf`) | Dzanga Forest Halo | leaf | Forest elephants in Dzanga-Sangha inspire a broad green halo of canopy leaves. |
| Chad (`td`) | Tibesti Cinder | ember | Chad's volcanic Tibesti Mountains inspire floating cinders around a warm stone-colored core. |
| Chile (`cl`) | Atacama Starfall | star | The dark skies above Chile's Atacama observatories inspire a stream of violet starlight. |
| China (`cn`) | Jade Dragon Coil | crystal | Chinese jade carving and dragon motifs inspire a translucent green coil. |
| Colombia (`co`) | Emerald Hummingbird | crystal | Colombian emeralds and hummingbirds inspire a glittering bird-shaped fan of green facets. |
| Comoros (`km`) | Ylang Moonwind | wind | Comorian ylang-ylang blossoms inspire a pale yellow flower carried on a curling island breeze. |
| Costa Rica (`cr`) | Quetzal Cloudforest | leaf | Quetzals in Costa Rica's cloud forests inspire long, shimmering green leaf trails. |
| Côte d’Ivoire (`ci`) | Cocoa Gold Swirl | leaf | Côte d'Ivoire's cocoa cultivation inspires a golden pod surrounded by curling green leaves. |
| Croatia (`hr`) | Adriatic Checkerwave | water | Croatia's checkerboard emblem and Adriatic coast inspire a blue wave with glowing square crests. |
| Cuba (`cu`) | Son Rhythm Flare | energy | Cuban son music inspires syncopated orange rings circling a bright fictional energy core. |
| Cyprus (`cy`) | Copper Suncrest | metal | Cyprus's long copper-mining history inspires a warm metallic sun disc. |
| Czechia (`cz`) | Bohemian Glasswing | crystal | Bohemian cut glass inspires a wing-shaped fan of sparkling colored facets. |
| Democratic Republic of the Congo (`cd`) | Congo Cobalt Current | metal | The Democratic Republic of the Congo's cobalt and great river inspire flowing blue metallic ribbons. |
| Denmark (`dk`) | Amber Coast Spark | crystal | Amber found along Denmark's coasts inspires a honey-colored crystal with tiny luminous flecks. |
| Djibouti (`dj`) | Assal Saltflare | crystal | Djibouti's salt-fringed Lake Assal inspires a brilliant white-and-blue crystalline ring. |
| Dominica (`dm`) | Sisserou Rainburst | leaf | Dominica's sisserou parrot inspires a purple-and-green swirl above rainforest leaves. |
| Dominican Republic (`do`) | Larimar Tide | crystal | Dominican larimar gemstone inspires a pale turquoise crystal veined like sunlit water. |
| Ecuador (`ec`) | Galapagos Spiral | water | Galápagos giant tortoise shell patterns inspire a curling ocean spiral with luminous polygon panels. |
| Egypt (`eg`) | Pyramid Sunshard | sand | The pyramids at Giza inspire a triangular sunlit shard traveling through golden sand. |
| El Salvador (`sv`) | Izalco Embercrest | ember | El Salvador's Izalco volcano inspires a glowing cone of fantasy embers. |
| Equatorial Guinea (`gq`) | Ceiba Canopy Ring | leaf | The silk-cotton tree on Equatorial Guinea's coat of arms inspires a wide ring of luminous leaves. |
| Eritrea (`er`) | Dahlak Coralgleam | water | Eritrea's Dahlak Archipelago and Red Sea coral inspire an aqua wave edged with coral-colored light. |
| Estonia (`ee`) | Baltic Songlight | wind | Estonia's song-festival tradition inspires overlapping ribbons of sky-blue air. |
| Eswatini (`sz`) | Ngwenya Glassbloom | crystal | Ngwenya's recycled-glass craft in Eswatini inspires a purple flower assembled from shining glass petals. |
| Ethiopia (`et`) | Coffee Blossom Dawn | leaf | Ethiopia's coffee-growing heritage inspires a bright coffee blossom circled by green leaves. |
| Fiji (`fj`) | Reef Sail Surge | water | Fijian drua sailing canoes and coral reefs inspire a sweeping sail-shaped turquoise wave. |
| Finland (`fi`) | Lake Aurora Shards | crystal | Finland's lake ice and auroras inspire a cool fan of glowing blue-green shards. |
| France (`fr`) | Fleur de Lumiere | star | French decorative lily motifs and Parisian iron latticework inspire a flower of golden light. |
| Gabon (`ga`) | Loango Surfstride | water | Loango's meeting of forest and Atlantic beach inspires a strong green-blue surf arc. |
| Gambia (`gm`) | River Kora Ripple | water | The Gambia River and regional kora music inspire fine golden lines across a blue water ripple. |
| Georgia (`ge`) | Kvevri Amberwave | energy | Georgia's clay kvevri vessels inspire warm amber rings with an earthen glow. |
| Germany (`de`) | Clockwork Ironstar | metal | German precision engineering and clockmaking inspire interlocking silver gears around a golden star. |
| Ghana (`gh`) | Kente Starweave | star | Ghanaian kente weaving and the flag's star inspire a bright interlaced star pattern. |
| Greece (`gr`) | Aegean Olive Halo | leaf | Greek olive wreaths and the Aegean Sea inspire a silver-green ring with blue trails. |
| Grenada (`gd`) | Nutmeg Emberwhirl | ember | Grenada's nutmeg cultivation inspires a warm, spice-shaped spiral of fictional sparks. |
| Guatemala (`gt`) | Jade Quetzal Arc | crystal | Guatemalan jade carving and the quetzal inspire a long green arc with faceted feather shapes. |
| Guinea (`gn`) | Fouta Cascade | water | Guinea's Fouta Djallon highland waterfalls inspire a bright descending curl of water. |
| Guinea-Bissau (`gw`) | Bijagos Mangrove | leaf | Mangrove channels around Guinea-Bissau's Bijagós islands inspire twisting green root-shaped light. |
| Guyana (`gy`) | Kaieteur Skyfall | water | Guyana's Kaieteur Falls inspires a tall rolling wave with a crown of luminous mist. |
| Haiti (`ht`) | Ironwork Sunburst | metal | Croix-des-Bouquets cut-metal art inspires a radiating sun shape with intricate iron curls. |
| Honduras (`hn`) | Scarlet Macaw Flare | wind | Honduras's national scarlet macaw inspires a sweeping red-and-gold feather gust. |
| Hungary (`hu`) | Danube Paprika Spark | ember | Hungarian paprika and the Danube inspire a red ember ribbon curling like a river bend. |
| Iceland (`is`) | Geyser Aurora | water | Iceland's geysers and auroras inspire a rising spray threaded with violet light. |
| India (`in`) | Monsoon Lotus | water | India's lotus emblem and monsoon rains inspire a radiant flower opening inside a water ring. |
| Indonesia (`id`) | Batik Emberwing | ember | Indonesian batik wax-resist patterns inspire patterned amber wings made of fantasy embers. |
| Iran (`ir`) | Uranium Pulse | energy | The requested uranium motif becomes a bright green fictional energy pulse; its glow is a fantasy effect. |
| Iraq (`iq`) | Tigris Wave | water | The Tigris flowing through Iraq inspires a curling turquoise river crest. |
| Ireland (`ie`) | Harpwind Clover | wind | Ireland's harp and shamrock emblems inspire fine green wind strings around three luminous leaves. |
| Israel (`il`) | Citrus Sun Halo | star | Israel's citrus-growing tradition inspires a golden segmented halo with bright sky-blue trails. |
| Italy (`it`) | Murano Solar Glass | crystal | Murano glassmaking inspires a molten-looking glass sun with colorful translucent lobes. |
| Jamaica (`jm`) | Hummingbird Basswave | energy | Jamaica's doctor bird and musical bass rhythms inspire a green pulse with long feather-like trails. |
| Jordan (`jo`) | Petra Rosewind | sand | Petra's rose-colored sandstone inspires a curling pink-gold arch of enchanted sand. |
| Kazakhstan (`kz`) | Steppe Eagle Sun | star | The eagle and sun on Kazakhstan's flag inspire a wide golden disc with sky-blue wings. |
| Kenya (`ke`) | Savanna Acacia Arc | leaf | Kenya's flat-topped acacia silhouettes inspire a broad green canopy-shaped arc. |
| Kiribati (`ki`) | Dawn Frigate Tide | water | Kiribati's flag frigatebird above sunrise and ocean waves inspires a glowing winged tide. |
| Kuwait (`kw`) | Golden Dhow | metal | Kuwait's dhow-sailing heritage inspires a gold sail-shaped shard with a bright wake. |
| Kyrgyzstan (`kg`) | Tunduk Sunwheel | star | The yurt roof opening on Kyrgyzstan's flag inspires a crossed sunwheel of golden light. |
| Laos (`la`) | Mekong Naga Flow | water | Lao naga sculpture and the Mekong River inspire a long, curling jade-colored wave. |
| Latvia (`lv`) | Amber Oak Spiral | leaf | Latvian oak imagery and Baltic amber inspire a spiral of green leaves with honey-colored flecks. |
| Lebanon (`lb`) | Cedar Skycrown | leaf | The cedar on Lebanon's flag inspires a tiered crown of luminous green needles. |
| Lesotho (`ls`) | Maloti Snowspiral | crystal | Snow on Lesotho's Maloti Mountains inspires a cool spiral with sharp mountain-shaped facets. |
| Liberia (`lr`) | Pepper Coast Star | star | Liberia's single-star flag and historic Pepper Coast name inspire a golden star in a blue coastal halo. |
| Libya (`ly`) | Sahara Glassflare | crystal | Libyan desert glass inspires translucent yellow facets with a bright sandy trail. |
| Liechtenstein (`li`) | Alpine Stamp Sigil | star | Liechtenstein's artist-designed postage stamps and Alpine scenery inspire a blue seal with golden ridges. |
| Lithuania (`lt`) | Amber Sunthread | crystal | Lithuanian amber craft inspires a golden crystal sun trailing fine luminous threads. |
| Luxembourg (`lu`) | Red Lion Prism | crystal | Luxembourg's red lion emblem inspires a rose-colored faceted mane with pale blue sparks. |
| Madagascar (`mg`) | Baobab Moonbloom | leaf | Madagascar's baobabs inspire a broad branching silhouette crowned with luminous night flowers. |
| Malawi (`mw`) | Cichlid Sunstream | water | Lake Malawi's colorful cichlid fish inspire a blue-and-gold wave with fin-shaped crests. |
| Malaysia (`my`) | Hibiscus Prism | leaf | Malaysia's national hibiscus inspires five glowing petals with sweeping rose-colored trails. |
| Maldives (`mv`) | Atoll Moonwake | water | Maldivian atolls and bioluminescent shoreline displays inspire a luminous turquoise ring. |
| Mali (`ml`) | Mudcloth Stargrid | sand | Malian bògòlanfini mudcloth patterns inspire geometric bands of glowing earth-colored sand. |
| Malta (`mt`) | Limestone Harbor Arc | sand | Malta's honey-colored limestone harbors inspire a bright stone-shaped arch with a sandy wake. |
| Marshall Islands (`mh`) | Stickchart Starpath | star | Marshallese navigational stick charts inspire intersecting luminous paths around a sea-blue star. |
| Mauritania (`mr`) | Richat Sandeye | sand | Mauritania's Richat Structure inspires concentric copper-colored rings of enchanted sand. |
| Mauritius (`mu`) | Seven Earths Halo | sand | Chamarel's Seven Coloured Earths in Mauritius inspire a layered, many-hued sand halo. |
| Mexico (`mx`) | Marigold Suntrail | leaf | Mexican marigold decoration inspires a golden sun of petals with a bright orange trail. |
| Micronesia (`fm`) | Reef Star Compass | star | Carolinian star-navigation traditions in Micronesia inspire a pale blue compass of starlight. |
| Moldova (`md`) | Vineyard Dawncoil | leaf | Moldova's vineyards inspire a curling vine of green leaves and violet bead-like lights. |
| Monaco (`mc`) | Harbor Velocity | energy | Monaco's harbor racing circuit inspires a streamlined scarlet pulse with silver motion ribbons. |
| Mongolia (`mn`) | Steppe Horsewind | wind | Mongolia's horse culture and open steppe inspire a flowing blue gust shaped like a horse's mane. |
| Montenegro (`me`) | Black Mountain Gleam | crystal | Montenegro's mountain landscape, including Lovćen, inspires a violet-gray faceted peak. |
| Morocco (`ma`) | Zellige Sunmosaic | crystal | Moroccan zellige tilework inspires a geometric star assembled from turquoise and gold facets. |
| Mozambique (`mz`) | Dhow Coral Crescent | water | Mozambique's coastal dhow sailing and coral reefs inspire a sail-shaped crescent of water. |
| Myanmar (`mm`) | Lacquer Sunset | ember | Bagan lacquerware's layered patterns inspire glossy sunset rings carrying gentle fantasy embers. |
| Namibia (`na`) | Dune Diamond Dawn | sand | The Namib's red dunes and Namibia's diamonds inspire a rolling sand arc with faceted glints. |
| Nauru (`nr`) | Buada Rainring | water | Nauru's inland Buada Lagoon and surrounding vegetation inspire a green-blue ring of glowing rain. |
| Nepal (`np`) | Himalayan Rhododendron | leaf | Nepal's national rhododendron and Himalayan snow inspire rose-colored petals with white mountain trails. |
| Netherlands (`nl`) | Tulip Windwheel | wind | Dutch tulip fields and windmills inspire an orange flower turning inside a wheel of air. |
| New Zealand (`nz`) | Silver Fern Spiral | leaf | New Zealand's silver fern emblem inspires a curling frond traced in silver-green light. |
| Nicaragua (`ni`) | Volcano Lakeglow | ember | Nicaragua's volcanoes and large lakes inspire an amber ember core inside cool blue rings. |
| Niger (`ne`) | Air Sandspire | sand | Niger's Aïr Mountains inspire a tall sandstone-colored spiral of enchanted desert grains. |
| Nigeria (`ng`) | Adire Indigo Wave | water | Yoruba adire indigo-dyed textiles from Nigeria inspire patterned bands across a deep blue wave. |
| North Korea (`kp`) | Paektu Frost Halo | crystal | Mount Paektu's crater lake inspires a cool blue halo edged with fictional frost crystals. |
| North Macedonia (`mk`) | Ohrid Sunpearl | crystal | Lake Ohrid's pearl-making tradition and North Macedonia's flag sun inspire a radiant golden pearl. |
| Norway (`no`) | Fjord Aurora Wake | water | Norway's fjords and auroras inspire a high blue wave with violet luminous ribbons. |
| Oman (`om`) | Frankincense Flare | ember | Oman's frankincense resin trade inspires warm golden droplets that unfold into fictional sparks. |
| Palau (`pw`) | Jellyfish Moonring | water | Palau's Jellyfish Lake inspires glowing bell-shaped ripples inside a turquoise moonring. |
| Panama (`pa`) | Canal Orchid Stream | water | Panama's orchid emblem and canal inspire a pale violet flower on a flowing blue ribbon. |
| Papua New Guinea (`pg`) | Paradise Featherlight | wind | Papua New Guinea's birds-of-paradise inspire a broad fan of golden feather-shaped light. |
| Paraguay (`py`) | Nanduti Starweb | star | Paraguayan ñandutí lace inspires a delicate circular web of luminous threads. |
| Peru (`pe`) | Andean Condor Gleam | wind | Condors above Peru's Andes inspire wide violet-and-gold gusts with feathered edges. |
| Philippines (`ph`) | Pearl Archipelago | crystal | Philippine South Sea pearls inspire an iridescent orb surrounded by island-like crystal glints. |
| Poland (`pl`) | Vistula Amberwing | crystal | Poland's Baltic amber craft and Vistula River inspire a flowing wing of honey-colored crystal. |
| Portugal (`pt`) | Azulejo Torrent | water | Portuguese azulejo tiles inspire a blue-and-white torrent with repeating geometric crests. |
| Qatar (`qa`) | Pearl-Gold Comet | star | Qatar's pearling heritage inspires a luminous pearl flying inside a long golden comet tail. |
| Republic of the Congo (`cg`) | Odzala Canopy Flow | leaf | The Republic of the Congo's Odzala rainforest inspires flowing bands of bright canopy leaves. |
| Romania (`ro`) | Carpathian Glassflare | crystal | Romania's Carpathian mountain ridges inspire a fan of violet crystal peaks. |
| Russia (`ru`) | Baikal Icecomet | crystal | Lake Baikal's clear winter ice inspires a blue faceted comet with a frosty trail. |
| Rwanda (`rw`) | Thousand Hills Bloom | leaf | Rwanda's rolling green hills inspire layered leaf arcs opening like a flower. |
| Saint Kitts and Nevis (`kn`) | Brimstone Sunring | ember | Saint Kitts' volcanic landscape and Brimstone Hill inspire a warm ring of golden fantasy cinders. |
| Saint Lucia (`lc`) | Piton Twincrest | crystal | Saint Lucia's twin Pitons inspire two tall turquoise facets with a shared luminous wake. |
| Saint Vincent and the Grenadines (`vc`) | Botanic Diamond Bloom | leaf | Saint Vincent's historic botanic garden and the flag's diamonds inspire a geometric green bloom. |
| Samoa (`ws`) | Tapa Oceanfold | water | Samoan siapo barkcloth patterns inspire a folded wave with warm geometric markings. |
| San Marino (`sm`) | Titan Threefold | crystal | San Marino's three towers on Mount Titano inspire three pale stone-like crystal points. |
| Sao Tome and Principe (`st`) | Cocoa Island Halo | leaf | São Tomé and Príncipe's cocoa groves inspire a green leaf halo with warm gold pod-shaped lights. |
| Saudi Arabia (`sa`) | Gilded Dune | sand | Saudi Arabia's dunes and date palms inspire a rolling golden crest with palm-like rays. |
| Senegal (`sn`) | Teranga Baobab Ray | leaf | Senegal's baobab landscapes inspire branching rays of green and gold leaf-light. |
| Serbia (`rs`) | Plum Blossom Current | leaf | Serbia's plum-growing tradition inspires a violet current of glowing blossom petals. |
| Seychelles (`sc`) | Coco de Mer Spiral | leaf | The Seychelles' coco de mer palm inspires a broad green frond turning in a golden spiral. |
| Sierra Leone (`sl`) | Diamond Surfglint | crystal | Sierra Leone's diamonds and Atlantic beaches inspire a clear facet carried on an aqua trail. |
| Singapore (`sg`) | Orchid Skyline Pulse | energy | Singapore's national orchid and illuminated skyline inspire a violet flower of fictional energy. |
| Slovakia (`sk`) | Tatra Crystal Crest | crystal | Slovakia's High Tatras inspire a sharp blue crystal crest with snow-white edges. |
| Slovenia (`si`) | Karst Dragon Gleam | crystal | Slovenia's karst caves and Ljubljana dragon emblem inspire a curling pale green crystal. |
| Solomon Islands (`sb`) | Shellmoney Tidewheel | water | Solomon Islands shell-money craft inspires concentric pearl-colored beads carried by a blue tide. |
| Somalia (`so`) | Frankincense Starwind | wind | Somalia's frankincense and flag star inspire a sky-blue gust with warm resin-colored sparks. |
| South Africa (`za`) | Protea Platinum Bloom | metal | South Africa's king protea and platinum inspire a metallic flower with silver-pink petals. |
| South Korea (`kr`) | Taegeuk Neonwheel | energy | South Korea's taegeuk emblem and city neon inspire interlocking rose and blue energy arcs. |
| South Sudan (`ss`) | Sudd Papyrus Wave | leaf | South Sudan's Sudd wetlands inspire a bright fan of papyrus-shaped leaves. |
| Spain (`es`) | Saffron Sunfan | star | Spanish saffron and decorative hand fans inspire a folding fan of golden rays. |
| Sri Lanka (`lk`) | Sapphire Lotuswake | crystal | Sri Lanka's sapphires and blue waterlily inspire a faceted flower with a violet-blue wake. |
| State of Palestine (`ps`) | Olive Dawn | leaf | Palestinian olive cultivation inspires a silver-green branch surrounded by warm dawn light. |
| Sudan (`sd`) | Nubian Pyramid Glow | sand | The Nubian pyramids at Meroë in Sudan inspire slender golden triangles with a sandy halo. |
| Suriname (`sr`) | Waterlily Rainveil | water | Giant waterlilies and tropical rain in Suriname inspire a broad violet-green veil of water. |
| Sweden (`se`) | Midsummer Birchlight | leaf | Swedish midsummer birch decorations inspire a bright ring of green leaves and warm light. |
| Switzerland (`ch`) | Glacier Clockwork | metal | Swiss watchmaking and Alpine glaciers inspire an icy silver gear with golden moving rings. |
| Syria (`sy`) | Damask Rose Spiral | leaf | The Damask rose associated with Damascus inspires a layered pink spiral of glowing petals. |
| Taiwan (`tw`) | Magpie Prismflight | wind | Taiwan's endemic blue magpie inspires a vivid blue gust with long orange-tipped light trails. |
| Tajikistan (`tj`) | Pamir Crystal Dawn | crystal | Tajikistan's Pamir peaks inspire violet crystal points edged with the warm colors of dawn. |
| Tanzania (`tz`) | Tanzanite Skycrest | crystal | Tanzanite and Mount Kilimanjaro inspire a violet-blue crystal with a snow-bright crest. |
| Thailand (`th`) | Silk Lotus Flare | star | Thai silk weaving and lotus motifs inspire folded golden ribbons opening into a flower of light. |
| Timor-Leste (`tl`) | Tais Sunrise Weave | energy | Timor-Leste's tais textiles inspire narrow woven bands that radiate like sunrise. |
| Togo (`tg`) | Kpalime Butterfly | wind | Butterflies in the forested hills around Kpalimé inspire a green-and-coral fan of air. |
| Tonga (`to`) | Whale Song Crescent | water | Humpback whales visiting Tonga inspire a blue crescent with a broad tail-shaped crest. |
| Trinidad and Tobago (`tt`) | Steelpan Sunroll | metal | Trinidad and Tobago's steelpan tradition inspires bright concentric metal rings. |
| Tunisia (`tn`) | Carthage Mosaic Flare | crystal | Tunisia's ancient mosaic art inspires a warm tiled sun with cool blue glints. |
| Türkiye (`tr`) | Tulip Turquoise Arc | crystal | Turkish İznik ceramics and tulip motifs inspire a turquoise arc with pink floral facets. |
| Turkmenistan (`tm`) | Akhal Teke Goldwind | wind | The metallic sheen of Turkmenistan's Akhal-Teke horses inspires a flowing golden mane of air. |
| Tuvalu (`tv`) | Nine Island Starwake | star | The nine island stars on Tuvalu's flag inspire a linked trail of golden lights over blue. |
| Uganda (`ug`) | Crowned Crane Halo | wind | Uganda's grey crowned crane inspires a wide fan of fine golden rays. |
| Ukraine (`ua`) | Sunflower Skywheel | leaf | Ukraine's sunflower fields inspire a golden petal wheel with sky-blue trails. |
| United Arab Emirates (`ae`) | Golden Falcon | metal | The UAE's falconry heritage inspires a pair of golden metallic wings with radiant feather trails. |
| United Kingdom (`gb`) | Clocktower Stormring | energy | Westminster's clocktower and chiming bells inspire a circular blue pulse edged with gold. |
| United States of America (`us`) | Redwood Lightning | energy | The giant redwoods of the United States inspire towering branch-shaped trails of fictional lightning. |
| Uruguay (`uy`) | Celeste Sunstream | star | Uruguay's sky-blue football colors and flag sun inspire a golden disc with blue motion trails. |
| Uzbekistan (`uz`) | Samarkand Starvault | crystal | Samarkand's turquoise tilework inspires a many-pointed crystal star with a golden center. |
| Vanuatu (`vu`) | Yasur Embercoil | ember | Vanuatu's Mount Yasur inspires a twisting orange coil of fantasy volcanic sparks. |
| Vatican City (`va`) | Mosaic Starlight | star | Vatican mosaic craft inspires small golden tesserae gathering into a luminous star. |
| Venezuela (`ve`) | Angel Falls Skyveil | water | Venezuela's Angel Falls inspires a long descending veil of bright water and mist. |
| Vietnam (`vn`) | Lotus Lacquer Halo | leaf | Vietnamese lacquer art and lotus blossoms inspire glossy pink petals with green light trails. |
| Yemen (`ye`) | Dragonblood Bloom | leaf | Socotra's dragon's blood trees inspire an umbrella-shaped green canopy with warm red glints. |
| Zambia (`zm`) | Copper Falls Halo | metal | Zambia's copper and Victoria Falls inspire a copper-colored ring edged with shimmering spray. |
| Zimbabwe (`zw`) | Soapstone Birdglow | crystal | The soapstone birds of Great Zimbabwe inspire a pale green bird-shaped crystal with a golden wake. |

## Validation

Run `node --test Tests/Browser/powers.test.cjs` from the repository root. The suite checks exact roster coverage, unique names/motifs/descriptions, valid renderer and sound families, deterministic browser/CommonJS data, requested country themes, unchanged country/flag mappings, immutability and unknown-ID handling. It also checks easily confused country pairs and specific small-state inspirations.

This catalog is authored separately from generated roster data so rebuilding flag metadata cannot overwrite the fantasy powers.
