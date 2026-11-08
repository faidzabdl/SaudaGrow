export interface UMKM {
  id: string;
  name: string;
  owner: string;
  location: string;
  city: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  description: string;
  category: string;
  whatsapp: string;
  gofood: string;
  grabfood: string;
  shopeefood: string;
  mapsLink: string;
  avatar: string;
}

export interface Product {
  id: string;
  umkmId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  reviewCount: number;
  image: string;
  tags: string[];
  isPopular?: boolean;
}

export interface VideoFeed {
  id: string;
  productId: string;
  umkmId: string;
  image: string;
  caption: string;
  likes: number;
  comments: number;
  saves: number;
}

export const UMKM_LIST: UMKM[] = [
  {
    id: 'u1',
    name: 'Warung Nasi Uduk Bu Sari',
    owner: 'Sari Rahayu',
    location: 'Jl. Kemanggisan No. 12',
    city: 'Jakarta Barat',
    rating: 4.8,
    reviewCount: 312,
    verified: true,
    description: 'Nasi uduk legendaris sejak 1995, dengan bumbu rempah khas Betawi. Buka setiap hari mulai pukul 06.00 pagi.',
    category: 'Nasi & Lauk',
    whatsapp: 'https://wa.me/6281234567890',
    gofood: 'https://gofood.co.id',
    grabfood: 'https://food.grab.com',
    shopeefood: 'https://shopee.co.id/food',
    mapsLink: 'https://maps.google.com/?q=Warung+Nasi+Uduk+Bu+Sari+Jakarta',
    avatar: 'https://ui-avatars.com/api/?name=Bu+Sari&background=FF6B35&color=fff',
  },
  {
    id: 'u2',
    name: 'Bakso Malang Pak Joko',
    owner: 'Joko Susilo',
    location: 'Jl. Sudirman No. 45',
    city: 'Malang',
    rating: 4.7,
    reviewCount: 540,
    verified: true,
    description: 'Bakso premium dengan kuah kaldu sapi segar, topping lengkap. Sudah melayani pelanggan lebih dari 20 tahun.',
    category: 'Bakso & Mie',
    whatsapp: 'https://wa.me/6281234567891',
    gofood: 'https://gofood.co.id',
    grabfood: 'https://food.grab.com',
    shopeefood: 'https://shopee.co.id/food',
    mapsLink: 'https://maps.google.com/?q=Bakso+Malang+Pak+Joko',
    avatar: 'https://ui-avatars.com/api/?name=Pak+Joko&background=FF8C42&color=fff',
  },
  {
    id: 'u3',
    name: 'Martabak Manis Koh Acong',
    owner: 'Acong Wijaya',
    location: 'Jl. Mangga Besar No. 7',
    city: 'Jakarta Pusat',
    rating: 4.9,
    reviewCount: 890,
    verified: true,
    description: 'Martabak manis tebal legit dengan berbagai pilihan topping premium. Favorit keluarga sejak 1988.',
    category: 'Kue & Snack',
    whatsapp: 'https://wa.me/6281234567892',
    gofood: 'https://gofood.co.id',
    grabfood: 'https://food.grab.com',
    shopeefood: 'https://shopee.co.id/food',
    mapsLink: 'https://maps.google.com/?q=Martabak+Manis+Koh+Acong+Jakarta',
    avatar: 'https://ui-avatars.com/api/?name=Koh+Acong&background=FF6B35&color=fff',
  },
  {
    id: 'u4',
    name: 'Ayam Geprek Mbak Rina',
    owner: 'Rina Kusuma',
    location: 'Jl. Gejayan No. 23',
    city: 'Yogyakarta',
    rating: 4.6,
    reviewCount: 420,
    verified: true,
    description: 'Ayam geprek crispy dengan sambal bawang super pedas. Level kepedasan bisa disesuaikan.',
    category: 'Ayam & Bebek',
    whatsapp: 'https://wa.me/6281234567893',
    gofood: 'https://gofood.co.id',
    grabfood: 'https://food.grab.com',
    shopeefood: 'https://shopee.co.id/food',
    mapsLink: 'https://maps.google.com/?q=Ayam+Geprek+Mbak+Rina+Yogyakarta',
    avatar: 'https://ui-avatars.com/api/?name=Mbak+Rina&background=E63946&color=fff',
  },
  {
    id: 'u5',
    name: 'Mie Aceh Bang Udin',
    owner: 'Udin Harahap',
    location: 'Jl. Benhil No. 88',
    city: 'Jakarta Selatan',
    rating: 4.7,
    reviewCount: 275,
    verified: false,
    description: 'Mie Aceh otentik dengan cita rasa rempah Aceh yang kaya. Tersedia pilihan goreng, tumis, dan kuah.',
    category: 'Mie & Pasta',
    whatsapp: 'https://wa.me/6281234567894',
    gofood: 'https://gofood.co.id',
    grabfood: 'https://food.grab.com',
    shopeefood: 'https://shopee.co.id/food',
    mapsLink: 'https://maps.google.com/?q=Mie+Aceh+Bang+Udin+Jakarta',
    avatar: 'https://ui-avatars.com/api/?name=Bang+Udin&background=FF6B35&color=fff',
  },
  {
    id: 'u6',
    name: 'Soto Lamongan Cak Har',
    owner: 'Hartono',
    location: 'Jl. Rajawali No. 5',
    city: 'Surabaya',
    rating: 4.8,
    reviewCount: 615,
    verified: false,
    description: 'Soto Lamongan kuning dengan kuah bening segar, dilengkapi koya dan telur. Resep turun-temurun dari Lamongan.',
    category: 'Soto & Sup',
    whatsapp: 'https://wa.me/6281234567895',
    gofood: 'https://gofood.co.id',
    grabfood: 'https://food.grab.com',
    shopeefood: 'https://shopee.co.id/food',
    mapsLink: 'https://maps.google.com/?q=Soto+Lamongan+Cak+Har+Surabaya',
    avatar: 'https://ui-avatars.com/api/?name=Cak+Har&background=FF8C42&color=fff',
  },
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    umkmId: 'u1',
    name: 'Nasi Uduk Komplit',
    description: 'Nasi uduk harum dengan lauk ayam goreng, tempe orek, tahu balado, telur, dan sambal kacang. Disajikan hangat dengan kerupuk.',
    price: 25000,
    originalPrice: 30000,
    category: 'Nasi & Lauk',
    rating: 4.9,
    reviewCount: 156,
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600',
    tags: ['nasi', 'betawi', 'sarapan', 'komplit'],
    isPopular: true,
  },
  {
    id: 'p2',
    umkmId: 'u1',
    name: 'Nasi Uduk + Ayam Bakar',
    description: 'Nasi uduk dengan ayam bakar bumbu kecap, lalapan segar, dan sambal terasi. Cocok untuk makan siang.',
    price: 32000,
    category: 'Nasi & Lauk',
    rating: 4.8,
    reviewCount: 98,
    image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600',
    tags: ['nasi', 'ayam bakar', 'betawi'],
  },
  {
    id: 'p3',
    umkmId: 'u2',
    name: 'Bakso Urat Super',
    description: 'Bakso urat besar dengan isian daging sapi cincang, kuah kaldu gurih, mie, bihun, dan pelengkap. Porsi jumbo!',
    price: 28000,
    category: 'Bakso & Mie',
    rating: 4.8,
    reviewCount: 234,
    image: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600',
    tags: ['bakso', 'urat', 'kuah', 'sapi'],
    isPopular: true,
  },
  {
    id: 'p4',
    umkmId: 'u2',
    name: 'Bakso Keju Mozarella',
    description: 'Inovasi bakso dengan isian keju mozarella yang meleleh. Perpaduan unik bakso Malang dan keju premium.',
    price: 35000,
    originalPrice: 40000,
    category: 'Bakso & Mie',
    rating: 4.7,
    reviewCount: 189,
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600',
    tags: ['bakso', 'keju', 'mozzarella', 'fusion'],
    isPopular: true,
  },
  {
    id: 'p5',
    umkmId: 'u3',
    name: 'Martabak Nutella Keju',
    description: 'Martabak manis tebal dengan topping Nutella, keju parut melimpah, dan meses coklat. Ukuran besar cukup untuk 4 orang.',
    price: 55000,
    category: 'Kue & Snack',
    rating: 4.9,
    reviewCount: 412,
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600',
    tags: ['martabak', 'nutella', 'keju', 'manis'],
    isPopular: true,
  },
  {
    id: 'p6',
    umkmId: 'u3',
    name: 'Martabak Telur Spesial',
    description: 'Martabak telur gurih dengan isian daging sapi cincang, telur, daun bawang, dan bumbu rempah. Dilengkapi acar.',
    price: 45000,
    category: 'Kue & Snack',
    rating: 4.8,
    reviewCount: 287,
    image: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=600',
    tags: ['martabak', 'telur', 'daging', 'gurih'],
  },
  {
    id: 'p7',
    umkmId: 'u4',
    name: 'Ayam Geprek Level 10',
    description: 'Ayam crispy digeprek dengan sambal bawang 10 cabai rawit. Untuk pecinta pedas sejati! Tersedia pilihan dada atau paha.',
    price: 22000,
    category: 'Ayam & Bebek',
    rating: 4.6,
    reviewCount: 178,
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600',
    tags: ['ayam', 'geprek', 'pedas', 'crispy'],
    isPopular: true,
  },
  {
    id: 'p8',
    umkmId: 'u4',
    name: 'Ayam Geprek Keju',
    description: 'Ayam geprek crispy dengan tambahan lelehan keju cheddar yang gurih. Kombinasi pedas dan asin yang sempurna.',
    price: 27000,
    originalPrice: 30000,
    category: 'Ayam & Bebek',
    rating: 4.7,
    reviewCount: 145,
    image: 'https://images.unsplash.com/photo-1614777986387-015c2a89c577?w=600',
    tags: ['ayam', 'geprek', 'keju', 'crispy'],
  },
  {
    id: 'p9',
    umkmId: 'u5',
    name: 'Mie Aceh Goreng Seafood',
    description: 'Mie Aceh goreng dengan campuran udang, cumi, dan kepiting. Bumbu rempah khas Aceh yang kaya aroma.',
    price: 45000,
    category: 'Mie & Pasta',
    rating: 4.7,
    reviewCount: 132,
    image: 'https://images.unsplash.com/photo-1618449840665-9ed506d73a34?w=600',
    tags: ['mie', 'aceh', 'seafood', 'goreng'],
    isPopular: true,
  },
  {
    id: 'p10',
    umkmId: 'u5',
    name: 'Mie Aceh Kuah Daging',
    description: 'Mie Aceh kuah dengan daging sapi empuk dalam kuah rempah kental. Disajikan dengan emping dan acar bawang.',
    price: 42000,
    category: 'Mie & Pasta',
    rating: 4.8,
    reviewCount: 98,
    image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=600',
    tags: ['mie', 'aceh', 'daging', 'kuah'],
  },
  {
    id: 'p11',
    umkmId: 'u6',
    name: 'Soto Lamongan Spesial',
    description: 'Soto Lamongan dengan kuah bening kuning, ayam suwir, koya khas, telur rebus, dan kerupuk udang. Segar dan lezat.',
    price: 20000,
    category: 'Soto & Sup',
    rating: 4.9,
    reviewCount: 305,
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600',
    tags: ['soto', 'lamongan', 'kuah', 'ayam'],
    isPopular: true,
  },
  {
    id: 'p12',
    umkmId: 'u6',
    name: 'Soto Lamongan + Sate Kerang',
    description: 'Paket lengkap soto Lamongan dengan sate kerang bumbu kacang. Kombinasi laut dan daratan yang sempurna.',
    price: 32000,
    category: 'Soto & Sup',
    rating: 4.8,
    reviewCount: 198,
    image: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600',
    tags: ['soto', 'lamongan', 'sate', 'kerang'],
  },
];

export const VIDEO_FEEDS: VideoFeed[] = [
  { id: 'v1', productId: 'p1', umkmId: 'u1', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=1200&fit=crop', caption: 'Nasi uduk pagi hari, bikin semangat! Rempah Betawi asli 🍚✨', likes: 2341, comments: 87, saves: 156 },
  { id: 'v2', productId: 'p3', umkmId: 'u2', image: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&h=1200&fit=crop', caption: 'Bakso urat jumbo, satu gigitan langsung nagih! 🥩🍜', likes: 5621, comments: 234, saves: 389 },
  { id: 'v3', productId: 'p5', umkmId: 'u3', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=1200&fit=crop', caption: 'Martabak Nutella keju meleleh... surga di mulut! 🧀🍫', likes: 8923, comments: 412, saves: 677 },
  { id: 'v4', productId: 'p7', umkmId: 'u4', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=800&h=1200&fit=crop', caption: 'Level 10 buat yang berani! Siapa mau tantangan? 🔥🌶️', likes: 4521, comments: 178, saves: 234 },
  { id: 'v5', productId: 'p9', umkmId: 'u5', image: 'https://images.unsplash.com/photo-1618449840665-9ed506d73a34?w=800&h=1200&fit=crop', caption: 'Mie Aceh seafood, rempah Aceh yang bikin ketagihan 🦐🍜', likes: 3210, comments: 95, saves: 198 },
  { id: 'v6', productId: 'p11', umkmId: 'u6', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=1200&fit=crop', caption: 'Soto Lamongan sejuk dan segar, sarapan terbaik! ☀️🍲', likes: 6782, comments: 289, saves: 445 },
  { id: 'v7', productId: 'p4', umkmId: 'u2', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&h=1200&fit=crop', caption: 'Bakso keju mozarella, pecah saat digigit! 🧀💥', likes: 7345, comments: 312, saves: 521 },
  { id: 'v8', productId: 'p2', umkmId: 'u1', image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&h=1200&fit=crop', caption: 'Ayam bakar Bu Sari, resep rahasia sejak 1995 🍗🔥', likes: 3456, comments: 123, saves: 267 },
  { id: 'v9', productId: 'p8', umkmId: 'u4', image: 'https://images.unsplash.com/photo-1614777986387-015c2a89c577?w=800&h=1200&fit=crop', caption: 'Ayam geprek keju, combo juara! Mau? 🍗🧀', likes: 4123, comments: 167, saves: 298 },
  { id: 'v10', productId: 'p12', umkmId: 'u6', image: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=800&h=1200&fit=crop', caption: 'Paket soto + sate kerang, kenyang dan happy! 🍲🦀', likes: 2987, comments: 112, saves: 198 },
  { id: 'v11', productId: 'p6', umkmId: 'u3', image: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800&h=1200&fit=crop', caption: 'Martabak telur spesial, isi daging penuh! 🥚🥩', likes: 5234, comments: 198, saves: 356 },
  { id: 'v12', productId: 'p10', umkmId: 'u5', image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&h=1200&fit=crop', caption: 'Kuah rempah Mie Aceh bikin hangat seharian 🌿🍜', likes: 3890, comments: 145, saves: 287 },
];

export const CATEGORIES = ['Semua', 'Nasi & Lauk', 'Bakso & Mie', 'Kue & Snack', 'Ayam & Bebek', 'Mie & Pasta', 'Soto & Sup'];
