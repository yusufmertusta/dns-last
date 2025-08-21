import express from 'express';
import { DNSLoadBalancerService } from '../services/dnsLoadBalancer';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT } from '../middlewares/auth';

const router = express.Router();
const prisma = new PrismaClient();
const dnsLoadBalancerService = new DNSLoadBalancerService();

// DNS Load balancer oluştur
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { name, domainId, algorithm, healthCheckInterval, healthCheckTimeout, maxRetries } = req.body;
    
    const loadBalancer = await dnsLoadBalancerService.createLoadBalancer({
      name,
      domainId,
      algorithm: algorithm || 'round-robin',
      healthCheckInterval: healthCheckInterval || 30000,
      healthCheckTimeout: healthCheckTimeout || 5000,
      maxRetries: maxRetries || 3
    });
    
    res.status(201).json(loadBalancer);
  } catch (error: any) {
    console.error('Error creating DNS load balancer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tüm DNS load balancer'ları getir
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const loadBalancers = await dnsLoadBalancerService.getAllLoadBalancers();
    res.json(loadBalancers);
  } catch (error: any) {
    console.error('Error fetching DNS load balancers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Domain'e göre DNS load balancer'ları getir
router.get('/domain/:domainId', authenticateJWT, async (req, res) => {
  try {
    const { domainId } = req.params;
    
    // @ts-ignore
    const loadBalancers = await prisma.dNSLoadBalancer.findMany({
      where: { domainId },
      include: {
        domain: true,
        servers: {
          include: {
            health: true
          }
        }
      }
    });
    
    res.json(loadBalancers);
  } catch (error: any) {
    console.error('Error fetching DNS load balancers for domain:', error);
    res.status(500).json({ error: error.message });
  }
});

// DNS load balancer sil
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Önce tüm sunucuları sil
    // @ts-ignore
    await prisma.dNSServer.deleteMany({
      where: { loadBalancerId: id }
    });
    
    // Sonra load balancer'ı sil
    // @ts-ignore
    await prisma.dNSLoadBalancer.delete({
      where: { id }
    });
    
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting DNS load balancer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sunucu ekle
router.post('/:id/servers', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ip, port, weight } = req.body;
    
    // @ts-ignore
    const server = await prisma.dNSServer.create({
      data: {
        name,
        ip,
        port: port || 80,
        weight: weight || 100,
        loadBalancerId: id
      }
    });
    
    res.status(201).json(server);
  } catch (error: any) {
    console.error('Error adding server to DNS load balancer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sunucu sil
router.delete('/:id/servers/:serverId', authenticateJWT, async (req, res) => {
  try {
    const { serverId } = req.params;
    
    // Önce health kaydını sil, sonra sunucuyu sil
    // @ts-ignore
    await prisma.dNSServerHealth.deleteMany({
      where: { serverId }
    });
    
    // @ts-ignore
    await prisma.dNSServer.delete({
      where: { id: serverId }
    });
    
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting server from DNS load balancer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Load balancer durumunu getir
router.get('/:id/status', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const status = await dnsLoadBalancerService.getLoadBalancerStatus(id);
    res.json(status);
  } catch (error: any) {
    console.error('Error getting DNS load balancer status:', error);
    res.status(500).json({ error: error.message });
  }
});

// DNS kayıtlarını güncelle (manuel trigger)
router.post('/:id/update-dns', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // @ts-ignore
    const loadBalancer = await prisma.dNSLoadBalancer.findUnique({
      where: { id },
      include: {
        domain: true,
        servers: {
          include: {
            health: true
          }
        }
      }
    });
    
    if (!loadBalancer) {
      return res.status(404).json({ error: 'Load balancer not found' });
    }
    
    // Health check yap ve DNS kayıtlarını güncelle
    for (const server of loadBalancer.servers) {
      const healthStatus = await dnsLoadBalancerService['checkServerHealth'](server.ip, server.port);
      await dnsLoadBalancerService['updateServerHealth'](server.id, healthStatus);
    }
    
    await dnsLoadBalancerService['updateDNSRecords'](loadBalancer);
    
    res.json({ message: 'DNS records updated successfully' });
  } catch (error: any) {
    console.error('Error updating DNS records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manuel health check trigger
router.post('/:id/health-check', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // @ts-ignore
    const loadBalancer = await prisma.dNSLoadBalancer.findUnique({
      where: { id },
      include: {
        domain: true,
        servers: {
          include: {
            health: true
          }
        }
      }
    });
    
    if (!loadBalancer) {
      return res.status(404).json({ error: 'Load balancer not found' });
    }
    
    // Manuel health check yap
    for (const server of loadBalancer.servers) {
      const healthStatus = await dnsLoadBalancerService['checkServerHealth'](server.ip, server.port);
      await dnsLoadBalancerService['updateServerHealth'](server.id, healthStatus);
    }
    
    res.json({ message: 'Manual health check completed successfully' });
  } catch (error: any) {
    console.error('Error during manual health check:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DNS Load Balancer',
    timestamp: new Date().toISOString()
  });
});

export default router;
