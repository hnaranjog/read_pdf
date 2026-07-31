export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export type NewUser = Omit<User, 'id' | 'createdAt'>;
