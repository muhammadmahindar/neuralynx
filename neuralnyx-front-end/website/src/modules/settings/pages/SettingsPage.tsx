import { useState } from "react";
import { useDomain } from "@/contexts/DomainContext";
import { api, API_ENDPOINTS } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle, Calendar, Globe, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ModuleHeader from "@/components/module-header";

export default function SettingsPage() {
  const { currentDomain, setCurrentDomain, refreshDomains, domains, addDomain } = useDomain();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [domainToDelete, setDomainToDelete] = useState<{
    id: string;
    domain: string;
  } | null>(null);

  const openDeleteDialog = (domainId: string, domainName: string) => {
    setDomainToDelete({ id: domainId, domain: domainName });
    setDeleteDialogOpen(true);
  };

  const handleAddDomain = async () => {
    const _newDomain = newDomain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    if (!_newDomain.trim()) {
      toast.error("Please enter a domain name");
      return;
    }

    try {
      setIsAdding(true);
      await addDomain(_newDomain);

      toast.success("Domain added successfully");
      setAddDialogOpen(false);
      setNewDomain("");
    } catch (error) {
      console.error("Error adding domain:", error);
      toast.error("Failed to add domain. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteDomain = async () => {
    if (!domainToDelete) return;

    try {
      setIsDeleting(domainToDelete.id);

      await api.delete(API_ENDPOINTS.DOMAINS.DELETE(domainToDelete.domain));

      // Refresh domains list
      await refreshDomains();

      // If we deleted the current domain, clear it
      if (currentDomain?.id === domainToDelete.id) {
        setCurrentDomain(null);
      }

      toast.success(
        `Domain ${domainToDelete.domain} has been deleted successfully`
      );
      setDeleteDialogOpen(false);
      setDomainToDelete(null);
    } catch (error) {
      console.error("Error deleting domain:", error);
      toast.error("Failed to delete domain. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <ModuleHeader
        title="Settings"
        description="Manage your domains and account settings"
      />

      {/* Add Domain Button */}
      <div className="flex justify-end">
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Domain
        </Button>
      </div>

      {/* Domains Section */}
      {!currentDomain ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No current domain selected. Complete the onboarding process to add
            your first domain.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{currentDomain.domain}</span>
                  <Badge variant="default" className="text-xs">
                    Current
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Added {formatDate(new Date().toISOString())}
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                openDeleteDialog(currentDomain.id, currentDomain.domain)
              }
              disabled={isDeleting === currentDomain.id}
            >
              {isDeleting === currentDomain.id ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Delete Domain Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Domain
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the domain{" "}
              <span className="font-semibold">{domainToDelete?.domain}</span>?
              <br />
              <br />
              This action cannot be undone. All data associated with this domain
              will be permanently removed, including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Content and articles</li>
                <li>Analytics data</li>
                <li>Settings and configurations</li>
                <li>Generated insights and topics</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDomain}
              disabled={isDeleting !== null}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Domain
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Domain Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Add New Domain
            </DialogTitle>
            <DialogDescription>
              Enter the domain name you want to add to your account. This will be used to organize your content and analytics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddDomain();
                  }
                }}
                disabled={isAdding}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setNewDomain("");
              }}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDomain}
              disabled={isAdding || !newDomain.trim()}
            >
              {isAdding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Domain
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
