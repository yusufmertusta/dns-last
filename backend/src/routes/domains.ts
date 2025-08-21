import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticateJWT } from '../middlewares/auth';
import { syncBind9 } from '../services/bind9';

const router = express.Router();
const prisma = new PrismaClient();

// List domains (admin: all, user: own) with DNS records
router.get('/', authenticateJWT, async (req: AuthRequest, res) => {
  const where = req.user?.isAdmin ? {} : { userId: req.user.id };
  const domains = await prisma.domain.findMany({ 
    where,
    include: {
      records: true
    }
  });
  res.json(domains);
});

// Create domain
router.post('/', authenticateJWT, async (req: AuthRequest, res) => {
  const { name } = req.body;
  const userId = req.user.isAdmin && req.body.userId ? req.body.userId : req.user.id;
  try {
    const domain = await prisma.domain.create({ data: { name, userId } });
    await syncBind9();
    res.json(domain);
  } catch (e) {
    res.status(400).json({ error: 'Domain already exists' });
  }
});

// Update domain (admin or owner)
router.put('/:id', authenticateJWT, async (req: AuthRequest, res) => {
  const domain = await prisma.domain.findUnique({ where: { id: req.params.id } });
  if (!domain) return res.sendStatus(404);
  if (!req.user.isAdmin && domain.userId !== req.user.id) return res.sendStatus(403);
  const { name } = req.body;
  const updated = await prisma.domain.update({ where: { id: req.params.id }, data: { name } });
  await syncBind9();
  res.json(updated);
});

// Delete domain (admin or owner)
router.delete('/:id', authenticateJWT, async (req: AuthRequest, res) => {
  const domain = await prisma.domain.findUnique({ where: { id: req.params.id } });
  if (!domain) return res.sendStatus(404);
  if (!req.user.isAdmin && domain.userId !== req.user.id) return res.sendStatus(403);
  await prisma.domain.delete({ where: { id: req.params.id } });
  await syncBind9();
  res.sendStatus(204);
});

// List DNS records for a domain
router.get('/:id/records', authenticateJWT, async (req: AuthRequest, res) => {
  const domain = await prisma.domain.findUnique({ where: { id: req.params.id } });
  if (!domain) return res.sendStatus(404);
  if (!req.user.isAdmin && domain.userId !== req.user.id) return res.sendStatus(403);
  const records = await prisma.dNSRecord.findMany({ where: { domainId: req.params.id } });
  res.json(records);
});

export default router;
