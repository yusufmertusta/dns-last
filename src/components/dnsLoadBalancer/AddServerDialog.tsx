import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { addServerToDNSLoadBalancer } from "@/lib/api";

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadBalancerId: string;
  onServerAdded: () => void;
}

export const AddServerDialog = ({
  open,
  onOpenChange,
  loadBalancerId,
  onServerAdded,
}: AddServerDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    ip: "",
    port: 80,
    weight: 100,
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.ip) {
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

    // Weight validation
    if (formData.weight < 1 || formData.weight > 1000) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Weight must be between 1 and 1000",
      });
      return;
    }

    setLoading(true);
    try {
      await addServerToDNSLoadBalancer(loadBalancerId, {
        name: formData.name,
        ip: formData.ip,
        port: formData.port,
        weight: formData.weight,
      });

      toast({
        title: "Success",
        description: "Server added successfully",
      });

      // Reset form
      setFormData({
        name: "",
        ip: "",
        port: 80,
        weight: 100,
      });

      onServerAdded();
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

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Server to Load Balancer</DialogTitle>
          <DialogDescription>
            Add a new server to distribute traffic across.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Server Name *</Label>
            <Input
              id="name"
              placeholder="web-server-01"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip">IP Address *</Label>
            <Input
              id="ip"
              placeholder="192.168.1.100"
              value={formData.ip}
              onChange={(e) => handleInputChange("ip", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                min="1"
                max="65535"
                value={formData.port}
                onChange={(e) => handleInputChange("port", parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                type="number"
                min="1"
                max="1000"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", parseInt(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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

