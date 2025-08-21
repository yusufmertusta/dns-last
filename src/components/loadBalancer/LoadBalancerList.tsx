import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Server, 
  Settings, 
  Trash2, 
  RefreshCw, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Globe
} from "lucide-react";
import { AddServerDialog } from "./AddServerDialog";
import { deleteLoadBalancer, deleteServer } from "@/lib/api";

interface LoadBalancer {
  id: string;
  name: string;
  algorithm: string;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxRetries: number;
  isActive: boolean;
  servers: Server[];
  createdAt: string;
}

interface Server {
  id: string;
  name: string;
  ip: string;
  port: number;
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

interface LoadBalancerListProps {
  loadBalancers: LoadBalancer[];
  onRefresh: () => void;
  onHealthCheck: (id: string) => void;
  refreshing: boolean;
}

export const LoadBalancerList = ({ 
  loadBalancers, 
  onRefresh, 
  onHealthCheck, 
  refreshing 
}: LoadBalancerListProps) => {
  const [showAddServerDialog, setShowAddServerDialog] = useState(false);
  const [selectedLoadBalancer, setSelectedLoadBalancer] = useState<LoadBalancer | null>(null);
  const { toast } = useToast();

  const handleDeleteLoadBalancer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this load balancer? This will also delete all associated servers.")) {
      return;
    }
    
    try {
      await deleteLoadBalancer(id);
      toast({
        title: "Success",
        description: "Load balancer deleted successfully",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete load balancer: " + error.message,
      });
    }
  };

  const handleDeleteServer = async (loadBalancerId: string, serverId: string) => {
    if (!confirm("Are you sure you want to delete this server?")) {
      return;
    }
    
    try {
      await deleteServer(loadBalancerId, serverId);
      toast({
        title: "Success",
        description: "Server deleted successfully",
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

  const getAlgorithmDisplay = (algorithm: string) => {
    const algorithms: Record<string, string> = {
      'round-robin': 'Round Robin',
      'least-connections': 'Least Connections',
      'weighted': 'Weighted',
      'ip-hash': 'IP Hash'
    };
    return algorithms[algorithm] || algorithm;
  };

  if (loadBalancers.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No load balancers yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first load balancer
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {loadBalancers.map((loadBalancer) => (
        <Card key={loadBalancer.id} className="overflow-hidden">
          <CardHeader className="bg-muted/50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  {loadBalancer.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  Algorithm: {getAlgorithmDisplay(loadBalancer.algorithm)} • 
                  Health Check: {loadBalancer.healthCheckInterval / 1000}s • 
                  Max Retries: {loadBalancer.maxRetries}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={loadBalancer.isActive ? "default" : "secondary"}>
                  {loadBalancer.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onHealthCheck(loadBalancer.id)}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteLoadBalancer(loadBalancer.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Servers ({loadBalancer.servers.length})</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedLoadBalancer(loadBalancer);
                  setShowAddServerDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </div>

            {loadBalancer.servers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No servers configured yet
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loadBalancer.servers.map((server) => (
                  <Card key={server.id} className="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            {server.name}
                          </CardTitle>
                          <CardDescription className="text-sm font-mono">
                            {server.ip}:{server.port}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(server.health?.status || 'unknown')}
                          <Badge 
                            className={`${getStatusColor(server.health?.status || 'unknown')} text-white`}
                          >
                            {server.health?.status || 'unknown'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {server.health && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Response Time:</span>
                            <span className="font-mono">
                              {server.health.responseTime > 0 ? `${server.health.responseTime}ms` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Uptime:</span>
                            <span className="font-mono">{server.health.uptime.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Load:</span>
                            <span className="font-mono">{server.health.load.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Memory:</span>
                            <span className="font-mono">{server.health.memoryUsage.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Disk:</span>
                            <span className="font-mono">{server.health.diskUsage.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Last Check:</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(server.health.lastCheck).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        <Badge variant={server.isActive ? "default" : "secondary"}>
                          {server.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteServer(loadBalancer.id, server.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <AddServerDialog
        open={showAddServerDialog}
        onOpenChange={setShowAddServerDialog}
        loadBalancer={selectedLoadBalancer}
        onServerAdded={() => {
          onRefresh();
          setShowAddServerDialog(false);
          setSelectedLoadBalancer(null);
        }}
      />
    </div>
  );
};

