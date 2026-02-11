
export type UserRole = 'administrador' | 'operador';

export interface UserCredential {
  username: string;
  password: string;
  role: UserRole;
}

export const VALID_CREDENTIALS: UserCredential[] = [
  {
    username: "admin",
    password: "password123",
    role: "administrador"
  },
  {
    username: "carbatk",
    password: "login2025",
    role: "administrador"
  },
  {
    username: "user1",
    password: "user123",
    role: "operador"
  }
];
