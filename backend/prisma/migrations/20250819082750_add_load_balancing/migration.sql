-- AlterTable
ALTER TABLE "DNSRecord" ADD COLUMN     "port" INTEGER,
ADD COLUMN     "priority" INTEGER,
ADD COLUMN     "weight" INTEGER;

-- CreateTable
CREATE TABLE "LoadBalancer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'round-robin',
    "healthCheckInterval" INTEGER NOT NULL DEFAULT 30000,
    "healthCheckTimeout" INTEGER NOT NULL DEFAULT 5000,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadBalancer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 80,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "loadBalancerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerHealth" (
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

    CONSTRAINT "ServerHealth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServerHealth_serverId_key" ON "ServerHealth"("serverId");

-- AddForeignKey
ALTER TABLE "Server" ADD CONSTRAINT "Server_loadBalancerId_fkey" FOREIGN KEY ("loadBalancerId") REFERENCES "LoadBalancer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerHealth" ADD CONSTRAINT "ServerHealth_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
