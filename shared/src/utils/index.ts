// Utility functions and helpers

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const sanitizeInput = (input: unknown): string => {
  return typeof input === 'string' ? input.trim() : String(input || '');
};

export const formatError = (error: Error): { message: string; code: string; timestamp: string } => {
  return {
    message: error.message,
    code: (error as any).code || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString()
  };
};

// Object utilities
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
};

// Array utilities
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Promise utilities
export const promiseWithTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    )
  ]);
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await delay(delayMs * attempt);
    }
  }
  throw new Error('Max retries exceeded');
};

// Coordinate utilities for hex grid
export const getDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

export const getNeighbors = (x: number, y: number): Array<{ x: number; y: number }> => {
  // Hex grid neighbors
  const evenRowOffsets = [
    [-1, -1], [0, -1], [-1, 0], [1, 0], [-1, 1], [0, 1]
  ];
  const oddRowOffsets = [
    [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1], [1, 1]
  ];
  
  const offsets = y % 2 === 0 ? evenRowOffsets : oddRowOffsets;
  return offsets.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, with uppercase, lowercase, and number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Game utilities
export const calculateScore = (resources: any, cities: any[], units: any[]): number => {
  const resourceScore = Object.values(resources).reduce((sum: number, value: any) => sum + Number(value), 0);
  const cityScore = cities.length * 100;
  const unitScore = units.length * 10;
  return resourceScore + cityScore + unitScore;
};

export const getTurnTimeRemaining = (turnStartTime: Date, turnTimeLimit: number): number => {
  const elapsed = Date.now() - turnStartTime.getTime();
  const remaining = Math.max(0, (turnTimeLimit * 1000) - elapsed);
  return Math.floor(remaining / 1000); // Return seconds
};