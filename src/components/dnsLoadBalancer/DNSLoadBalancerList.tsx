import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Server, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Settings,
  Loader2
} from "lucide-react";
import { AddServerDialog } from "./AddServerDialog";
import { deleteDNSLoadBalancer, deleteServerFromDNSLoadBalancer } from "@/lib/api";

interface DNSLoadBalancer {
  id: string;
  name: string;
  domain: {
    name: string;
  };
  algorithm: string;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxRetries: number;
  isActive: boolean;
  servers: DNSServer[];
  createdAt: string;
}

interface DNSServer {
  id: string;
  name: string;
  ip: string;
  port: number;
  weight: number;
  isActive: boolean;
  health?: {
    status: string;
    lastCheck: string;
    responseTime: number;
    uptime: number;
    load: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

interface DNSLoadBalancerListProps {
  loadBalancers: DNSLoadBalancer[];
  onRefresh: () => void;
  onHealthCheck: (id: string) => void;
  refreshing: boolean;
}

export const DNSLoadBalancerList = ({ 
  loadBalancers, 
  onRefresh, 
  onHealthCheck, 
  refreshing 
}: DNSLoadBalancerListProps) => {
  const [showAddServerDialog, setShowAddServerDialog] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDeleteLoadBalancer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the DNS load balancer "${name}"?`)) {
      return;
    }

    try {
      await deleteDNSLoadBalancer(id);
      toast({
        title: "Success",
        description: `DNS load balancer "${name}" deleted successfully`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete DNS load balancer: " + error.message,
      });
    }
  };

  const handleDeleteServer = async (loadBalancerId: string, serverId: string, serverName: string) => {
    if (!confirm(`Are you sure you want to delete the server "${serverName}"?`)) {
      return;
    }

    try {
      await deleteServerFromDNSLoadBalancer(loadBalancerId, serverId);
      toast({
        title: "Success",
        description: `Server "${serverName}" deleted successfully`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete server: " + error.message,
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'unknown':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'unhealthy':
        return 'bg-red-500';
      case 'unknown':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatAlgorithm = (algorithm: string) => {
    return algorithm.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loadBalancers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Server className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No DNS Load Balancers</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first DNS load balancer to start distributing traffic across multiple servers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {loadBalancers.map((lb) => (
        <Card key={lb.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  {lb.name}
                </CardTitle>
                <CardDescription>
                  Domain: {lb.domain.name} • Algorithm: {formatAlgorithm(lb.algorithm)}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={lb.isActive ? "default" : "secondary"}>
                  {lb.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onHealthCheck(lb.id)}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddServerDialog(lb.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteLoadBalancer(lb.id, lb.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Health Check Interval:</span>
                  <br />
                  <span className="text-muted-foreground">
                    {Math.round(lb.healthCheckInterval / 1000)}s
                  </span>
                </div>
                <div>
                  <span className="font-medium">Health Check Timeout:</span>
                  <br />
                  <span className="text-muted-foreground">
                    {Math.round(lb.healthCheckTimeout / 1000)}s
                  </span>
                </div>
                <div>
                  <span className="font-medium">Max Retries:</span>
                  <br />
                  <span className="text-muted-foreground">{lb.maxRetries}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Servers ({lb.servers.length})</h4>
                {lb.servers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No servers configured. Add servers to start load balancing.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {lb.servers.map((server) => (
                      <div key={server.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{server.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {server.ip}:{server.port}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Weight: {server.weight}
                          </div>
                          {server.health && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Response: {server.health.responseTime}ms
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(server.health?.status || 'unknown')}
                          <Badge 
                            className={`${getStatusColor(server.health?.status || 'unknown')} text-white`}
                          >
                            {server.health?.status || 'unknown'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteServer(lb.id, server.id, server.name)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {showAddServerDialog && (
        <AddServerDialog
          open={!!showAddServerDialog}
          onOpenChange={() => setShowAddServerDialog(null)}
          loadBalancerId={showAddServerDialog}
          onServerAdded={() => {
            setShowAddServerDialog(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

