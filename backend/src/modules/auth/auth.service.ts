import bcrypt from 'bcrypt';
import { prisma } from '../../config/db.js';
import { RegisterInput } from './auth.schema.js';

export const registerUser = async (input: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    const error = new Error('Email is already registered') as Error & { statusCode?: number };
    error.statusCode = 409;
    throw error;
  }

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(input.password, saltRounds);

  const newUser = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      timezone: input.timezone,
    },
  });

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    timezone: newUser.timezone,
    createdAt: newUser.createdAt,
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const error = new Error('Invalid email or password') as Error & { statusCode?: number };
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const error = new Error('Invalid email or password') as Error & { statusCode?: number };
    error.statusCode = 401;
    throw error;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    createdAt: user.createdAt,
  };
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    const error = new Error('User not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    createdAt: user.createdAt,
  };
};
