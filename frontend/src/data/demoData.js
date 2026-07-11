export const categories = [
  { id: 'all', label: 'Everything', glyph: '✦' },
  { id: 'audio', label: 'Audio', glyph: '◉' },
  { id: 'electronics', label: 'Electronics', glyph: '⌁' },
  { id: 'kitchen', label: 'Kitchen', glyph: '◒' },
  { id: 'home', label: 'Home', glyph: '⌂' },
  { id: 'computing', label: 'Computing', glyph: '⌨' },
  { id: 'outdoors', label: 'Outdoors', glyph: '△' },
  { id: 'tools', label: 'Tools', glyph: '◇' },
  { id: 'appliances', label: 'Appliances', glyph: '◎' },
];

export const products = [
  {
    id: 'auraflow-nc1',
    name: 'AuraFlow NC1',
    brand: 'AuraFlow',
    model: 'NC1',
    category: 'audio',
    categoryLabel: 'Over-ear headphones',
    price: 329,
    currency: 'AUD',
    rating: 4.3,
    reviewCount: 127,
    owners: 84,
    longTermOwners: 39,
    buyAgain: 78,
    lifespanMonths: 48,
    repairability: 3.8,
    releaseYear: 2023,
    validation: 'Community validated',
    trendingRank: 1,
    savedCount: 216,
    palette: 'clay',
    glyph: '🎧',
    summary: 'Comfortable noise-cancelling headphones with replaceable cushions and a wired listening mode.',
    discussion: 'Are the new ones actually better than a two-year-old pair?',
    distribution: [4, 5, 13, 31, 74],
    officialUrl: 'https://example.com/auraflow-nc1',
    specs: [
      ['Battery', 'Up to 38 hours'],
      ['Weight', '254 g'],
      ['Replaceable parts', 'Ear cushions, cable'],
      ['Warranty', '24 months'],
    ],
  },
  {
    id: 'morrow-k2',
    name: 'Morrow K2 Kettle',
    brand: 'Morrow',
    model: 'K2',
    category: 'kitchen',
    categoryLabel: 'Electric kettle',
    price: 119,
    currency: 'AUD',
    rating: 4.7,
    reviewCount: 68,
    owners: 51,
    longTermOwners: 34,
    buyAgain: 91,
    lifespanMonths: 84,
    repairability: 4.5,
    releaseYear: 2021,
    validation: 'Moderator reviewed',
    trendingRank: 4,
    savedCount: 143,
    palette: 'sage',
    glyph: '♨',
    summary: 'A stainless kettle with a replaceable lid seal, switch and heating-base connector.',
    discussion: 'Seven years on: the switch is cheap to replace.',
    distribution: [1, 1, 4, 10, 52],
    officialUrl: 'https://example.com/morrow-k2',
    specs: [['Capacity', '1.5 L'], ['Body', 'Stainless steel'], ['Replaceable parts', 'Switch, seal, base connector'], ['Warranty', '36 months']],
  },
  {
    id: 'fold-one',
    name: 'Fold One',
    brand: 'Common Circuit',
    model: 'F1',
    category: 'electronics',
    categoryLabel: 'Modular smartphone',
    price: 749,
    currency: 'AUD',
    rating: 3.8,
    reviewCount: 42,
    owners: 28,
    longTermOwners: 7,
    buyAgain: 62,
    lifespanMonths: 60,
    repairability: 4.8,
    releaseYear: 2024,
    validation: 'Community validated',
    trendingRank: 2,
    savedCount: 302,
    palette: 'ink',
    glyph: '▣',
    summary: 'A modular phone designed around replaceable camera, battery, port and display assemblies.',
    discussion: 'Repairability is excellent, but is the camera good enough?',
    distribution: [2, 4, 11, 15, 10],
    officialUrl: 'https://example.com/fold-one',
    specs: [['Storage', '256 GB'], ['Support window', '7 years'], ['Replaceable parts', 'Battery, camera, display, port'], ['Warranty', '24 months']],
  },
  {
    id: 'presswell-brewer',
    name: 'Presswell Brewer',
    brand: 'Presswell',
    model: 'P6',
    category: 'kitchen',
    categoryLabel: 'Manual coffee brewer',
    price: 64,
    currency: 'AUD',
    rating: 4.6,
    reviewCount: 94,
    owners: 73,
    longTermOwners: 49,
    buyAgain: 89,
    lifespanMonths: 120,
    repairability: 4.7,
    releaseYear: 2019,
    validation: 'Moderator reviewed',
    trendingRank: 6,
    savedCount: 187,
    palette: 'cream',
    glyph: '☕',
    summary: 'A glass-and-steel manual brewer with replaceable mesh, seal and beaker.',
    discussion: 'Mine is eight years old. The cheaper glass replacement fits.',
    distribution: [1, 2, 5, 16, 70],
    officialUrl: 'https://example.com/presswell-p6',
    specs: [['Capacity', '650 ml'], ['Filter', 'Reusable steel mesh'], ['Replaceable parts', 'Beaker, mesh, seal'], ['Warranty', '12 months']],
  },
  {
    id: 'tern-pack-24', name: 'Tern Everyday Pack 24', brand: 'Tern', model: '24L', category: 'outdoors', categoryLabel: 'Everyday backpack', price: 189, currency: 'AUD', rating: 4.4, reviewCount: 55, owners: 46, longTermOwners: 30, buyAgain: 84, lifespanMonths: 96, repairability: 4.2, releaseYear: 2020, validation: 'Community validated', trendingRank: 7, savedCount: 122, palette: 'ochre', glyph: '▰', summary: 'A waxed-canvas day pack with replaceable buckles and a repair programme.', discussion: 'Four years of commuting: what actually wears first?', distribution: [1, 2, 7, 15, 30], officialUrl: 'https://example.com/tern-pack', specs: [['Volume', '24 L'], ['Material', 'Waxed canvas'], ['Replaceable parts', 'Buckles, sternum strap'], ['Warranty', '5 years']] },
  {
    id: 'quietkey-84', name: 'QuietKey 84', brand: 'QuietKey', model: '84', category: 'computing', categoryLabel: 'Mechanical keyboard', price: 179, currency: 'AUD', rating: 4.1, reviewCount: 31, owners: 25, longTermOwners: 11, buyAgain: 71, lifespanMonths: 84, repairability: 4.6, releaseYear: 2022, validation: 'Community validated', trendingRank: 9, savedCount: 99, palette: 'plum', glyph: '⌨', summary: 'A compact hot-swappable keyboard with a replaceable cable, switches and battery.', discussion: 'Great hardware, uneven wireless wake-up.', distribution: [1, 3, 5, 8, 14], officialUrl: 'https://example.com/quietkey-84', specs: [['Layout', '84 key'], ['Connection', 'USB-C, Bluetooth'], ['Replaceable parts', 'Switches, caps, battery'], ['Warranty', '24 months']] },
  {
    id: 'glowline-lamp', name: 'Glowline Desk Lamp', brand: 'Glowline', model: 'D3', category: 'home', categoryLabel: 'Task lighting', price: 145, currency: 'AUD', rating: 4.8, reviewCount: 18, owners: 14, longTermOwners: 8, buyAgain: 94, lifespanMonths: 120, repairability: 4.1, releaseYear: 2020, validation: 'Community validated', trendingRank: 8, savedCount: 74, palette: 'lemon', glyph: '◐', summary: 'A dimmable task light with a standard replaceable LED module and weighted steel base.', discussion: 'The light that survived three home offices.', distribution: [0, 0, 1, 3, 14], officialUrl: 'https://example.com/glowline-d3', specs: [['Output', '650 lm'], ['Colour temperature', '2700–5000 K'], ['Replaceable parts', 'LED module, cable'], ['Warranty', '5 years']] },
  {
    id: 'mend-v4', name: 'Mend V4', brand: 'Mend', model: 'V4', category: 'appliances', categoryLabel: 'Cordless vacuum', price: 449, currency: 'AUD', rating: 3.2, reviewCount: 76, owners: 61, longTermOwners: 28, buyAgain: 46, lifespanMonths: 60, repairability: 4.4, releaseYear: 2022, validation: 'Needs correction', trendingRank: 3, savedCount: 164, palette: 'rose', glyph: '↯', summary: 'A bagless cordless vacuum with a user-swappable battery, filter and roller head.', discussion: 'Easy to repair, frustrating to use — owners are split.', distribution: [9, 14, 19, 21, 13], officialUrl: 'https://example.com/mend-v4', specs: [['Runtime', 'Up to 52 minutes'], ['Weight', '2.7 kg'], ['Replaceable parts', 'Battery, filter, roller'], ['Warranty', '24 months']] },
  {
    id: 'loopstick-s2', name: 'LoopStick S2', brand: 'Loop', model: 'S2', category: 'kitchen', categoryLabel: 'Stick blender', price: 79, currency: 'AUD', rating: 3.6, reviewCount: 8, owners: 6, longTermOwners: 1, buyAgain: 63, lifespanMonths: 48, repairability: 2.9, releaseYear: 2025, validation: 'Community submitted', trendingRank: 10, savedCount: 41, palette: 'blue', glyph: '│', summary: 'A compact variable-speed blender with a steel shaft and detachable whisk.', discussion: 'Early owners like it, but we need longer-term reports.', distribution: [0, 1, 2, 2, 3], officialUrl: 'https://example.com/loopstick-s2', specs: [['Power', '700 W'], ['Speeds', 'Variable'], ['Replaceable parts', 'Shaft only'], ['Warranty', '24 months']] },
  {
    id: 'cloudrest-8', name: 'CloudRest 8', brand: 'CloudRest', model: '8', category: 'home', categoryLabel: 'Foam mattress', price: 899, currency: 'AUD', rating: 2.9, reviewCount: 23, owners: 19, longTermOwners: 13, buyAgain: 39, lifespanMonths: 96, repairability: 1.3, releaseYear: 2021, validation: 'Community validated', trendingRank: 12, savedCount: 52, palette: 'lavender', glyph: '▱', summary: 'A medium-firm layered foam mattress with a removable washable cover.', discussion: 'Comfortable at first; long-term owners report softening.', distribution: [4, 6, 5, 5, 3], officialUrl: 'https://example.com/cloudrest-8', specs: [['Depth', '28 cm'], ['Firmness', 'Medium-firm'], ['Replaceable parts', 'Cover only'], ['Warranty', '10 years']] },
  {
    id: 'trailshell-r2', name: 'TrailShell R2', brand: 'Northbound', model: 'R2', category: 'outdoors', categoryLabel: 'Rain jacket', price: 259, currency: 'AUD', rating: 4.5, reviewCount: 47, owners: 38, longTermOwners: 25, buyAgain: 87, lifespanMonths: 72, repairability: 3.9, releaseYear: 2020, validation: 'Community validated', trendingRank: 11, savedCount: 116, palette: 'moss', glyph: '♜', summary: 'A three-layer rain shell backed by a patch-and-zip repair service.', discussion: 'Still waterproof after five winters with one reproof.', distribution: [1, 1, 4, 10, 31], officialUrl: 'https://example.com/trailshell-r2', specs: [['Waterproof rating', '20,000 mm'], ['Weight', '410 g'], ['Repair support', 'Patch and zip service'], ['Warranty', '5 years']] },
  {
    id: 'pebble-reader', name: 'Pebble Reader Mini', brand: 'Pebble', model: 'Mini 2', category: 'electronics', categoryLabel: 'E-reader', price: 229, currency: 'AUD', rating: 4.2, reviewCount: 64, owners: 48, longTermOwners: 26, buyAgain: 77, lifespanMonths: 72, repairability: 2.6, releaseYear: 2022, validation: 'Moderator reviewed', trendingRank: 5, savedCount: 201, palette: 'aqua', glyph: '▯', summary: 'A compact waterproof e-reader with warm light and physical page buttons.', discussion: 'The old model may be all you need.', distribution: [2, 3, 8, 18, 33], officialUrl: 'https://example.com/pebble-mini', specs: [['Display', '6 inch e-ink'], ['Storage', '32 GB'], ['Waterproofing', 'IPX8'], ['Warranty', '24 months']] },
  {
    id: 'dawn-clock', name: 'Dawn Clock', brand: 'Dawn', model: 'C2', category: 'home', categoryLabel: 'Alarm clock', price: 89, currency: 'AUD', rating: 3.9, reviewCount: 12, owners: 10, longTermOwners: 5, buyAgain: 67, lifespanMonths: 96, repairability: 3.2, releaseYear: 2023, validation: 'Community validated', trendingRank: 13, savedCount: 37, palette: 'sun', glyph: '◷', summary: 'A screen-free sunrise alarm with tactile controls and a replaceable power cable.', discussion: 'Useful routine tool or another thing on the bedside?', distribution: [1, 1, 2, 3, 5], officialUrl: 'https://example.com/dawn-c2', specs: [['Light', 'Warm sunrise simulation'], ['Controls', 'Physical dial'], ['Replaceable parts', 'Power cable'], ['Warranty', '24 months']] },
  {
    id: 'rivet-d12', name: 'Rivet D12', brand: 'Rivet', model: 'D12', category: 'tools', categoryLabel: 'Cordless drill', price: 199, currency: 'AUD', rating: 4.6, reviewCount: 82, owners: 67, longTermOwners: 42, buyAgain: 90, lifespanMonths: 120, repairability: 4.3, releaseYear: 2018, validation: 'Moderator reviewed', trendingRank: 14, savedCount: 88, palette: 'amber', glyph: '⚒', summary: 'A compact drill using a long-running interchangeable 18V battery platform.', discussion: 'Six years of weekend jobs on the original motor.', distribution: [1, 2, 5, 16, 58], officialUrl: 'https://example.com/rivet-d12', specs: [['Voltage', '18 V'], ['Chuck', '13 mm'], ['Replaceable parts', 'Battery, chuck, brushes'], ['Warranty', '5 years']] },
  {
    id: 'everpan-28', name: 'EverPan 28', brand: 'EverPan', model: '28', category: 'kitchen', categoryLabel: 'Stainless frypan', price: 139, currency: 'AUD', rating: 4.7, reviewCount: 106, owners: 92, longTermOwners: 61, buyAgain: 93, lifespanMonths: 180, repairability: 4.9, releaseYear: 2017, validation: 'Moderator reviewed', trendingRank: 15, savedCount: 177, palette: 'steel', glyph: '◡', summary: 'A tri-ply stainless frypan with a bolted handle and no disposable non-stick coating.', discussion: 'The pan owners keep for a decade.', distribution: [1, 2, 6, 16, 81], officialUrl: 'https://example.com/everpan-28', specs: [['Diameter', '28 cm'], ['Material', 'Tri-ply stainless steel'], ['Replaceable parts', 'Handle and bolts'], ['Warranty', 'Lifetime limited']] },
];

const reviewBodies = [
  ['Still comfortable after long workdays', 'I have used these most weekdays for just over two years. The cushions softened before anything electronic failed, and replacing them made the headset feel fresh again. Noise cancelling is strong on trains; the microphone is merely fine.', ['Comfort remains good', 'Replaceable cushions'], ['Average call microphone']],
  ['Good, but not a reason to upgrade', 'My older wired pair still sounded better at home, so these mainly earn their place when I travel. If you already own decent headphones, the convenience is the upgrade—not the sound.', ['Useful travel mode', 'Reliable battery'], ['Sound is not a dramatic leap']],
  ['Battery has held up', 'Eighteen months in, I still get several days between charges. The headband creaks a little now but there are no cracks. I would buy the cushions, not a whole new pair, when they wear out.', ['Battery longevity', 'Wired fallback'], ['Headband creak']],
  ['Too warm for me', 'The seal helps the noise cancelling, but my ears get hot after an hour. They sound balanced and the controls are easy to find without looking. I returned to lighter headphones for desk work.', ['Simple controls', 'Balanced sound'], ['Warm ear cups']],
  ['The repair guide made the difference', 'A small part failed outside warranty. The illustrated guide and standard screws meant I could replace it in twenty minutes instead of replacing the whole product.', ['Clear repair guide', 'Standard fasteners'], ['Part took a week to arrive']],
  ['Simple objects age well', 'There is not much to go wrong here. It has picked up scratches and looks better for them. Cleaning the seal every few months has been the only maintenance.', ['Easy maintenance', 'Durable materials'], ['Finish marks easily']],
  ['Strong first year, uncertain long term', 'The core job is done well and the controls make sense. I have only owned it for eleven months, so I cannot yet speak to the lifespan claims.', ['Thoughtful controls', 'Solid everyday use'], ['Too early to judge longevity']],
  ['Replacement part was actually available', 'I bought this because the battery was listed as replaceable, and two years later the part was still in stock. That should be normal, but it is worth calling out.', ['Parts still stocked', 'Straightforward repair'], ['Shipping was expensive']],
  ['Works better after learning the quirks', 'My first week was frustrating, but the community tips helped. Once set up, it has been steady. The manual should explain those details instead of leaving owners to discover them.', ['Reliable after setup', 'Helpful owner community'], ['Weak documentation']],
  ['The old model remains enough', 'I tried the newer version beside this one and could not find a meaningful difference in my daily use. Keeping the older one was the easy decision.', ['Still performs well', 'No forced upgrade'], ['Charging port is dated']],
  ['Built for maintenance', 'Everything that gets dirty comes apart without a special tool. I can see this lasting much longer than the sealed model it replaced.', ['Easy to clean', 'Replaceable wear parts'], ['A little heavier']],
  ['Mixed feelings after three years', 'The main body is holding up, but the soft-touch coating has become tacky around the controls. Functionally it is fine; cosmetically it aged sooner than expected.', ['Core function reliable'], ['Surface coating aged poorly']],
];

const reviewers = [
  ['Nina P.', 'Currently own it', 26, 'NP'],
  ['Malik R.', 'Previously owned it', 38, 'MR'],
  ['Ari K.', 'Currently own it', 18, 'AK'],
  ['Jules T.', 'Briefly tested it', 1, 'JT'],
  ['Samira L.', 'Used regularly through work', 32, 'SL'],
  ['Theo B.', 'Currently own it', 64, 'TB'],
  ['Grace W.', 'Currently own it', 11, 'GW'],
  ['Em C.', 'Previously owned it', 29, 'EC'],
];

export const reviewsByProduct = Object.fromEntries(products.map((product, productIndex) => {
  const visibleCount = product.id === 'auraflow-nc1' ? 4 : 2;
  const reviews = Array.from({ length: visibleCount }, (_, reviewIndex) => {
    const body = reviewBodies[(productIndex * 2 + reviewIndex) % reviewBodies.length];
    const reviewer = reviewers[(productIndex + reviewIndex) % reviewers.length];
    const rawRating = Math.round(product.rating + (reviewIndex % 2 === 0 ? 0.45 : -0.65));
    return {
      id: `${product.id}-review-${reviewIndex + 1}`,
      userId: `demo-user-${productIndex}-${reviewIndex}`,
      user: reviewer[0],
      initials: reviewer[3],
      relationship: reviewer[1],
      ownershipMonths: reviewer[2],
      rating: Math.max(1, Math.min(5, rawRating)),
      title: body[0],
      text: body[1],
      pros: body[2],
      cons: body[3],
      wouldBuyAgain: reviewIndex % 3 !== 1,
      helpful: 14 + ((productIndex * 9 + reviewIndex * 7) % 58),
      comments: reviewIndex === 0 ? 3 + (productIndex % 5) : reviewIndex % 2,
      date: new Date(2026, 5 - (productIndex % 5), 18 - reviewIndex * 3).toISOString(),
      demo: true,
      commercialRelationship: false,
      receivedDiscount: false,
    };
  });
  return [product.id, reviews];
}));

export const demoOwnedItems = [
  { id: 'owned-1', productId: 'drift-45', name: 'Drift 45 Headphones', category: 'audio', categoryLabel: 'Over-ear headphones', purchaseDate: '2025-05-10', purchasePrice: 249, expectedLifespanMonths: 48, condition: 'Good', status: 'Active', glyph: '🎧', palette: 'blue', notes: 'Replaced ear cushions once.' },
  { id: 'owned-2', productId: 'presswell-brewer', name: 'Presswell Brewer', category: 'kitchen', categoryLabel: 'Manual coffee brewer', purchaseDate: '2021-02-14', purchasePrice: 58, expectedLifespanMonths: 120, condition: 'Excellent', status: 'Active', glyph: '☕', palette: 'cream', notes: 'Mesh replaced in 2024.' },
  { id: 'owned-3', productId: 'pebble-reader', name: 'Pebble Reader Mini', category: 'electronics', categoryLabel: 'E-reader', purchaseDate: '2022-09-01', purchasePrice: 199, expectedLifespanMonths: 72, condition: 'Good', status: 'Active', glyph: '▯', palette: 'aqua', notes: 'Battery still lasts two weeks.' },
  { id: 'owned-4', productId: 'loopstick-old', name: 'MixMate Stick Blender', category: 'kitchen', categoryLabel: 'Stick blender', purchaseDate: '2019-01-20', purchasePrice: 65, expectedLifespanMonths: 60, condition: 'Fair', status: 'Damaged', glyph: '│', palette: 'rose', notes: 'Intermittent motor; checking repair options.' },
];

export const currentUser = {
  id: 'local-demo-user',
  displayName: 'Maya Chen',
  username: 'maya',
  email: 'demo@worthit.local',
  initials: 'MC',
  role: 'member',
  phoneVerified: true,
  bio: 'Trying to buy fewer things, and keep the good ones working.',
  memberSince: 'May 2026',
};

export const demoCredentials = {
  identifier: 'maya',
  alternateIdentifier: 'demo@worthit.local',
  password: 'worthit123',
};

export const trendingDiscussions = [
  { productId: 'mend-v4', title: 'Repairable, yes. Pleasant to use? Owners are split.', replies: 42, tag: 'Mixed reviews' },
  { productId: 'fold-one', title: 'Would seven years of software support change your mind?', replies: 31, tag: 'Open question' },
  { productId: 'morrow-k2', title: 'A $9 switch kept this kettle out of landfill.', replies: 27, tag: 'Repair story' },
];

export const communityStats = [
  { value: '2,840', label: 'items kept in use' },
  { value: '691', label: 'long-term owner notes' },
  { value: '38%', label: 'of checks ended in “keep it”' },
];

export const formatPrice = (product) => new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: product.currency || 'AUD',
  maximumFractionDigits: 0,
}).format(product.price || 0);
