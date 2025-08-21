import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticateJWT } from '../middlewares/auth';
import { syncBind9 } from '../services/bind9';

const router = express.Router();
const prisma = new PrismaClient();

// Add DNS record
router.post('/:domainId', authenticateJWT, async (req: AuthRequest, res) => {
  const { type, name, value, ttl } = req.body;
  const domain = await prisma.domain.findUnique({ where: { id: req.params.domainId } });
  if (!domain) return res.sendStatus(404);
  if (!req.user.isAdmin && domain.userId !== req.user.id) return res.sendStatus(403);
  const record = await prisma.dNSRecord.create({ data: { domainId: req.params.domainId, type, name, value, ttl } });
  await syncBind9();
  res.json(record);
});

// Update DNS record
router.put('/:id', authenticateJWT, async (req: AuthRequest, res) => {
  const record = await prisma.dNSRecord.findUnique({ where: { id: req.params.id }, include: { domain: true } });
  if (!record) return res.sendStatus(404);
  if (!req.user.isAdmin && record.domain.userId !== req.user.id) return res.sendStatus(403);
  const { type, name, value, ttl } = req.body;
  const updated = await prisma.dNSRecord.update({ where: { id: req.params.id }, data: { type, name, value, ttl } });
  await syncBind9();
  res.json(updated);
});

// Delete DNS record
router.delete('/:id', authenticateJWT, async (req: AuthRequest, res) => {
  const record = await prisma.dNSRecord.findUnique({ where: { id: req.params.id }, include: { domain: true } });
  if (!record) return res.sendStatus(404);
  if (!req.user.isAdmin && record.domain.userId !== req.user.id) return res.sendStatus(403);
  await prisma.dNSRecord.delete({ where: { id: req.params.id } });
  await syncBind9();
  res.sendStatus(204);
});

export default router;
