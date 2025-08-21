import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { addServerToLoadBalancer } from "@/lib/api";

interface LoadBalancer {
  id: string;
  name: string;
}

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadBalancer: LoadBalancer | null;
  onServerAdded: () => void;
}

export const AddServerDialog = ({ 
  open, 
  onOpenChange, 
  loadBalancer, 
  onServerAdded 
}: AddServerDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    port: 80
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loadBalancer) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No load balancer selected",
      });
      return;
    }

    if (!formData.name.trim() || !formData.ip.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(formData.ip)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid IP address",
      });
      return;
    }

    // Port validation
    if (formData.port < 1 || formData.port > 65535) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Port must be between 1 and 65535",
      });
      return;
    }

    setLoading(true);
    
    try {
      await addServerToLoadBalancer(loadBalancer.id, {
        name: formData.name.trim(),
        ip: formData.ip.trim(),
        port: formData.port
      });
      
      toast({
        title: "Success",
        description: "Server added successfully",
      });
      
      onServerAdded();
      resetForm();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add server: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      ip: '',
      port: 80
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  if (!loadBalancer) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Server to {loadBalancer.name}</DialogTitle>
          <DialogDescription>
            Add a new server to your load balancer. The server will be automatically monitored for health.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Server Name</Label>
              <Input
                id="name"
                placeholder="e.g., Web Server 1"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">A descriptive name for the server</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ip">IP Address</Label>
              <Input
                id="ip"
                placeholder="192.168.1.100"
                value={formData.ip}
                onChange={(e) => setFormData(prev => ({ ...prev, ip: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">The server's IP address</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                min="1"
                max="65535"
                placeholder="80"
                value={formData.port}
                onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 80 }))}
                required
              />
              <p className="text-xs text-muted-foreground">The server's port (default: 80 for HTTP)</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Server"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

