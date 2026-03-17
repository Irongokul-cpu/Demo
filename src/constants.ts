import { EmissionFactor } from './types';

export const TRAVEL_FACTORS: Record<string, EmissionFactor> = {
  car: { category: 'travel', label: 'Car', factor: 0.17, unit: 'km' },
  bus: { category: 'travel', label: 'Bus', factor: 0.10, unit: 'km' },
  train: { category: 'travel', label: 'Train', factor: 0.04, unit: 'km' },
  bike: { category: 'travel', label: 'Bike', factor: 0, unit: 'km' },
  walk: { category: 'travel', label: 'Walk', factor: 0, unit: 'km' },
};

export const ELECTRICITY_FACTOR: EmissionFactor = {
  category: 'electricity',
  label: 'Electricity',
  factor: 0.4,
  unit: 'kWh',
};

export const FOOD_FACTORS: Record<string, EmissionFactor> = {
  beef: { category: 'food', label: 'Beef', factor: 6.75, unit: 'serving' },
  chicken: { category: 'food', label: 'Chicken', factor: 1.7, unit: 'serving' },
  pork: { category: 'food', label: 'Pork', factor: 3.0, unit: 'serving' },
  fish: { category: 'food', label: 'Fish', factor: 1.5, unit: 'serving' },
  vegetables: { category: 'food', label: 'Vegetables', factor: 0.5, unit: 'serving' },
  rice: { category: 'food', label: 'Rice', factor: 1.0, unit: 'serving' },
  dairy: { category: 'food', label: 'Dairy', factor: 2.0, unit: 'serving' },
};

export const BADGES = [
  { id: 'eco_hero', name: 'Eco Hero', description: 'Reach 1000 points', threshold: 1000 },
  { id: 'energy_saver', name: 'Energy Saver', description: 'Log 5 low-electricity days', threshold: 5 },
  { id: 'green_eater', name: 'Green Eater', description: 'Log 10 vegetarian meals', threshold: 10 },
  { id: 'streak_3', name: 'Consistent', description: '3-day streak', threshold: 3 },
  { id: 'streak_7', name: 'Dedicated', description: '7-day streak', threshold: 7 },
];
