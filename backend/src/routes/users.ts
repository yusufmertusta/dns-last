import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth';
import bcrypt from 'bcrypt';

const router = express.Router();
const prisma = new PrismaClient();

// List all users (admin only)
router.get('/', async (req: AuthRequest, res) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: {
            domains: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data to include domain count
    const usersWithDomainCount = users.map(user => ({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      domainCount: user._count.domains
    }));

    res.json(usersWithDomainCount);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID (admin or self)
router.get('/:id', async (req: AuthRequest, res) => {
  const userId = req.params.id;
  
  if (!req.user?.isAdmin && req.user?.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        domains: {
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user (admin only)
router.post('/', async (req: AuthRequest, res) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { email, password, isAdmin = false } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        isAdmin
      },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin or self)
router.put('/:id', async (req: AuthRequest, res) => {
  const userId = req.params.id;
  
  if (!req.user?.isAdmin && req.user?.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { email, isAdmin, password } = req.body;

  try {
    const updateData: any = {};
    
    if (email) updateData.email = email;
    if (req.user?.isAdmin && typeof isAdmin === 'boolean') updateData.isAdmin = isAdmin;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        isAdmin: true,
        createdAt: true
      }
    });

    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', async (req: AuthRequest, res) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const userId = req.params.id;

  if (req.user.id === userId) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  try {
    await prisma.user.delete({
      where: { id: userId }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
