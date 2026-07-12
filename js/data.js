/**
 * THE GEMNASIUM — Data Module
 * Cleaned up inventory with eBay-style items.
 * Rarities removed.
 */

export let allItems = [];
export let tcgItems = [];
export let comicItems = [];

export const gameInfo = {
  'Pokemon': {
    description: 'The world\'s most popular trading card game, featuring iconic characters like Charizard and Pikachu.',
    sets: ['Base Set', 'Jungle', 'Fossil', 'Team Rocket', 'Neo Genesis']
  },
  'Magic: The Gathering': {
    description: 'The original trading card game with complex mechanics and rich lore.',
    sets: ['Alpha', 'Beta', 'Unlimited', 'Arabian Nights', 'Antiquities']
  },
  'Yu-Gi-Oh!': {
    description: 'Duel Monsters card game based on the legendary anime series.',
    sets: ['Legend of Blue Eyes', 'Metal Raiders', 'Magic Ruler', 'Pharaoh\'s Servant']
  }
};

export const publisherInfo = {
  'Marvel': {
    description: 'Home to Spider-Man, X-Men, Avengers, and the Marvel Cinematic Universe source material.',
    eras: ['Golden Age', 'Silver Age', 'Bronze Age', 'Modern Age']
  },
  'DC': {
    description: 'The legendary publisher of Batman, Superman, Wonder Woman, and the Justice League.',
    eras: ['Golden Age', 'Silver Age', 'Bronze Age', 'Modern Age']
  },
  'Image': {
    description: 'Creator-owned powerhouse featuring Spawn, The Walking Dead, and Saga.',
    eras: ['1990s', 'Modern Age']
  }
};

export async function fetchInventory() {
  if (typeof supabase === 'undefined') return [];
  try {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn("Error fetching products:", error);
      return [];
    }
    
    // Convert SQL rows to expected item format
    allItems = data.map(row => ({
      ...row,
      gradingCompany: row.grading_company,
      certNumber: row.cert_number
    }));
    
    tcgItems = allItems.filter(i => i.category === 'tcg');
    comicItems = allItems.filter(i => i.category === 'comic');
    return allItems;
  } catch(e) {
    console.warn("Failed to fetch products:", e);
    return [];
  }
}

export const dashboardMetrics = [
  { id: 'revenue', title: 'Total Revenue', value: '...', trend: '+0%', status: 'positive' },
  { id: 'orders', title: 'Total Orders', value: '...', trend: '+0%', status: 'positive' },
  { id: 'portfolio', title: 'Portfolio Value', value: '...', trend: '+0%', status: 'positive' },
  { id: 'users', title: 'Total Users', value: '...', trend: '+0%', status: 'neutral' },
];

export function getPlaceholderStyle(item) {
  const hash = item.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    { bg: '#1a1a2e', accent: '#4a4e69' },
    { bg: '#221f1f', accent: '#e50914' },
    { bg: '#1c1c1c', accent: '#fca311' },
    { bg: '#0d1b2a', accent: '#415a77' }
  ];
  return colors[hash % colors.length];
}
