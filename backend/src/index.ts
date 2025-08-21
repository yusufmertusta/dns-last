import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import domainRoutes from './routes/domains';
import dnsRecordRoutes from './routes/records';
import dnsLoadBalancerRoutes from './routes/dnsLoadBalancer';
import usersRoutes from './routes/users';
import { DNSLoadBalancerService } from './services/dnsLoadBalancer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/domains', domainRoutes);
app.use('/dns-records', dnsRecordRoutes);
app.use('/dns-loadbalancer', dnsLoadBalancerRoutes);
app.use('/users', usersRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'connected',
      bind9: 'operational',
      dnsLoadBalancer: 'active'
    }
  });
});

// DNS Load Balancer Service'i başlat
const dnsLoadBalancerService = new DNSLoadBalancerService();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await dnsLoadBalancerService.stopHealthChecks();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await dnsLoadBalancerService.stopHealthChecks();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('DNS Load Balancer Service starting...');
  
  // Health check service'i başlat
  dnsLoadBalancerService.startHealthChecks()
    .then(() => console.log('DNS Load Balancer Service started successfully'))
    .catch(err => console.error('Failed to start DNS Load Balancer Service:', err));
});
