/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, Expense } from './types';

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-1001',
    customerName: 'John Doe',
    date: '2026-05-12',
    product: '3D Printed Prototype V2',
    amount: 450,
    status: 'Completed',
  },
  {
    id: 'ORD-1002',
    customerName: 'Alice Smith',
    date: '2026-05-15',
    product: 'Laser Engraved Walnut Sign',
    amount: 180,
    status: 'Completed',
  },
  {
    id: 'ORD-1003',
    customerName: 'Bob Johnson',
    date: '2026-05-20',
    product: 'Batch of Acrylic Coasters',
    amount: 120,
    status: 'Pending',
  },
  {
    id: 'ORD-1004',
    customerName: 'Clara Oswald',
    date: '2026-05-22',
    product: 'Custom Stainless Tumblers (x20)',
    amount: 600,
    status: 'Completed',
  },
  {
    id: 'ORD-1005',
    customerName: 'David Tennant',
    date: '2026-05-25',
    product: 'PLA Filament Spoils & Box',
    amount: 85,
    status: 'Cancelled',
  },
  {
    id: 'ORD-1006',
    customerName: 'Emma Watson',
    date: '2026-05-27',
    product: 'Engraved Leather Journal',
    amount: 95,
    status: 'Completed',
  },
  {
    id: 'ORD-1007',
    customerName: 'Frank Castle',
    date: '2026-05-28',
    product: 'Custom Steel Tactical Plate',
    amount: 320,
    status: 'Pending',
  },
  {
    id: 'ORD-1008',
    customerName: 'Sarah Connor',
    date: '2026-04-18',
    product: 'Custom Aluminum Case',
    amount: 850,
    status: 'Completed',
  },
  {
    id: 'ORD-1009',
    customerName: 'Tony Stark',
    date: '2026-04-24',
    product: 'Anodized Titanium Parts',
    amount: 1500,
    status: 'Completed',
  },
  {
    id: 'ORD-1010',
    customerName: 'Bruce Wayne',
    date: '2026-03-10',
    product: 'Carbon Fiber Shells',
    amount: 2200,
    status: 'Completed',
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'EXP-1001',
    date: '2026-05-02',
    category: 'Uncategorized',
    description: 'Bulk PLA & PETG Filament',
    amount: 240,
  },
  {
    id: 'EXP-1002',
    date: '2026-05-05',
    category: 'Uncategorized',
    description: 'Instagram Local Ads',
    amount: 150,
  },
  {
    id: 'EXP-1003',
    date: '2026-05-10',
    category: 'Uncategorized',
    description: 'Fusion 360 & LightBurn Licenses',
    amount: 90,
  },
  {
    id: 'EXP-1004',
    date: '2026-05-14',
    category: 'Uncategorized',
    description: 'Electricity & Fiber Internet',
    amount: 180,
  },
  {
    id: 'EXP-1005',
    date: '2026-05-20',
    category: 'Uncategorized',
    description: 'Laser Honeycomb Bed Cleaner',
    amount: 45,
  },
  {
    id: 'EXP-1006',
    date: '2026-05-25',
    category: 'Uncategorized',
    description: 'Business Cards & Flyers',
    amount: 75,
  },
  {
    id: 'EXP-1007',
    date: '2026-04-12',
    category: 'Uncategorized',
    description: 'Walnut & Cherry Wood Blanks',
    amount: 400,
  },
  {
    id: 'EXP-1008',
    date: '2026-04-20',
    category: 'Uncategorized',
    description: 'Shopify Store Monthly Fee',
    amount: 39,
  },
  {
    id: 'EXP-1009',
    date: '2026-03-05',
    category: 'Uncategorized',
    description: 'Laser Replacement Lens V2',
    amount: 210,
  }
];
