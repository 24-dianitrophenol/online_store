// Fixed data for promotions and adverts (not stored in database)
import { Promotion, Advert } from '../types';

// Fixed Promotions (not in database)
export const PROMOTIONS: Promotion[] = [
  {
    id: '1',
    title: 'Bulk Buy Discount',
    description: 'Get 20% off on purchases above 50kg of any single product',
    discount: 20,
    image: '/images/3.jpg',
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2024-08-31T23:59:59Z',
    code: 'BULK20',
    applicable: 'all',
    minimumPurchase: 50000,
  },
  {
    id: '2',
    title: 'Rice Special',
    description: 'Buy any 2 varieties of rice and get 15% off',
    discount: 15,
    image: '/images/4.jpg',
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    code: 'RICE15',
    applicable: 'category',
    applicableId: 'rice',
    minimumPurchase: 24000,
  },
  {
    id: '3',
    title: 'Premium Basmati Deal',
    description: 'Get 25% off on Premium Basmati Rice - Limited time offer',
    discount: 25,
    image: '/images/5.jpg',
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2024-04-30T23:59:59Z',
    code: 'BASMATI25',
    applicable: 'product',
    applicableId: '1',
    minimumPurchase: 12000,
  },
  {
    id: '4',
    title: 'Flour Bundle',
    description: 'Buy any 3 types of flour and get 20% off',
    discount: 20,
    image: '/images/6.jpg',
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    code: 'FLOUR20',
    applicable: 'category',
    applicableId: 'flour',
    minimumPurchase: 30000,
  },
  {
    id: '5',
    title: 'Soya Products Special',
    description: 'Get 15% off on all soya products',
    discount: 15,
    image: '/images/7.jpg',
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2024-06-30T23:59:59Z',
    code: 'SOYA15',
    applicable: 'category',
    applicableId: 'soya',
    minimumPurchase: 15000,
  },
  {
    id: '6',
    title: 'Grains Combo',
    description: 'Buy any 2 types of grains and get 18% off',
    discount: 18,
    image: '/images/8.jpg',
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    code: 'GRAINS18',
    applicable: 'category',
    applicableId: 'grains',
    minimumPurchase: 20000,
  }
];

// Fixed Adverts (not in database)
export const ADVERTS: Advert[] = [
  {
    id: '1',
    title: 'New Premium Rice Collection',
    description: 'Discover our exclusive range of premium rice varieties',
    image: '/images/3.jpg',
    link: '/category/rice',
    position: 'banner',
    active: true,
  },
  {
    id: '2',
    title: 'Wholesale Prices',
    description: 'Get the best prices with our wholesale program',
    image: '/images/4.jpg',
    link: '/wholesale',
    position: 'banner',
    active: true,
  }
];

// FAQs
export const FAQS = [
  {
    id: '1',
    question: 'What are your minimum order quantities?',
    answer: 'Our minimum order quantities vary by product. For retail customers, you can order as little as 1kg. For wholesale orders, minimum quantities start at 50kg.',
  },
  {
    id: '2',
    question: 'Do you offer delivery services?',
    answer: 'Yes, we offer free delivery for orders above UGX 500,000. For smaller orders, delivery charges are calculated based on your location and order weight.',
  },
  {
    id: '3',
    question: 'How can I track my order?',
    answer: 'Once your order is confirmed, you will receive a tracking link via email and SMS. You can click on this link to see the real-time status of your order.',
  },
  {
    id: '4',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, bank transfers, and digital wallets. For wholesale orders, we also offer net-30 terms for approved customers.',
  }
];