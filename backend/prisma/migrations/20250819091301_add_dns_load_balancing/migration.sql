/*
  Warnings:

  - You are about to drop the `LoadBalancer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Server` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServerHealth` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Server" DROP CONSTRAINT "Server_loadBalancerId_fkey";

-- DropForeignKey
ALTER TABLE "ServerHealth" DROP CONSTRAINT "ServerHealth_serverId_fkey";

-- AlterTable
ALTER TABLE "DNSRecord" ADD COLUMN     "isLoadBalanced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loadBalancerId" TEXT;

-- DropTable
DROP TABLE "LoadBalancer";

-- DropTable
DROP TABLE "Server";

-- DropTable
DROP TABLE "ServerHealth";

-- CreateTable
CREATE TABLE "DNSLoadBalancer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'round-robin',
    "healthCheckInterval" INTEGER NOT NULL DEFAULT 30000,
    "healthCheckTimeout" INTEGER NOT NULL DEFAULT 5000,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DNSLoadBalancer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DNSServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 80,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "loadBalancerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DNSServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DNSServerHealth" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "lastCheck" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseTime" INTEGER NOT NULL DEFAULT -1,
    "uptime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "load" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memoryUsage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diskUsage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DNSServerHealth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DNSServerHealth_serverId_key" ON "DNSServerHealth"("serverId");

-- AddForeignKey
ALTER TABLE "DNSRecord" ADD CONSTRAINT "DNSRecord_loadBalancerId_fkey" FOREIGN KEY ("loadBalancerId") REFERENCES "DNSLoadBalancer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DNSLoadBalancer" ADD CONSTRAINT "DNSLoadBalancer_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DNSServer" ADD CONSTRAINT "DNSServer_loadBalancerId_fkey" FOREIGN KEY ("loadBalancerId") REFERENCES "DNSLoadBalancer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DNSServerHealth" ADD CONSTRAINT "DNSServerHealth_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "DNSServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
