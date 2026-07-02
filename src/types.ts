/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OrderStatus = 'Pending' | 'Completed' | 'Cancelled';

export interface Order {
  id: string;
  customerName: string;
  date: string;
  product: string;
  amount: number;
  status: OrderStatus;
  category?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export interface TransactionActivity {
  id: string;
  type: 'order' | 'expense';
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  statusColor: string;
  status?: OrderStatus;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  color?: string; // e.g. blue, green, amber, red, purple, slate
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}
