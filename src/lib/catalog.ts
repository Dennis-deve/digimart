export type CatalogProduct = { id: string; name: string; network?: string; category: string; basePrice: number; type: 'DIGITAL'|'PHYSICAL'|'SERVICE'; provider: 'BUNDLESHOPGH'|'MUVIIN'|'ADMIN'; inStock: boolean; description: string };

export const catalog: CatalogProduct[] = [
  { id:'bs-mtn-10gb', name:'MTN 10GB Data Bundle', network:'MTN', category:'Data & Airtime', basePrice:43, type:'DIGITAL', provider:'BUNDLESHOPGH', inStock:true, description:'Non-expiry data bundle delivered to a Ghanaian MTN number.' },
  { id:'mu-netflix-premium', name:'Netflix Premium', category:'Streaming & Subscriptions', basePrice:55, type:'DIGITAL', provider:'MUVIIN', inStock:true, description:'Subscription package fulfilled after confirmed payment.' },
  { id:'admin-earbuds', name:'Oraimo Wireless Earbuds', category:'Electronics', basePrice:180, type:'PHYSICAL', provider:'ADMIN', inStock:true, description:'Fulfilled by a verified Kumasi seller.' },
  { id:'mu-airtime-10', name:'MTN Airtime GH₵10', network:'MTN', category:'Data & Airtime', basePrice:10, type:'DIGITAL', provider:'MUVIIN', inStock:true, description:'Airtime is submitted to Muviin and tracked until confirmation.' },
];
