import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Tag, Info, Shield, User } from "lucide-react";
import {
  getAllCategoriesWithSettings,
  setCategoryEnabled,
  updateCategorySettings,
  type CategoryWithSettings,
} from "@/lib/ato-categories-db";
import {
  getCustomCategories,
  createCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
  type CustomCategory,
} from "@/lib/custom-categories";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CombinedCategory {
  id: string;
  code?: string;
  name: string;
  description: string;
  isDefault: boolean;
  isEnabled: boolean;
  atoCode?: string;
  original: CategoryWithSettings | CustomCategory;
}

export function TaxCategoriesManager() {
  const [categories, setCategories] = useState<CombinedCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CombinedCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<CombinedCategory | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [atoCode, setAtoCode] = useState("");

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const [atoCategories, customCats] = await Promise.all([
        getAllCategoriesWithSettings(),
        getCustomCategories(),
      ]);

      const combined: CombinedCategory[] = [
        ...atoCategories.map((cat) => ({
          id: cat.code,
          code: cat.code,
          name: cat.name,
          description: cat.shortDescription,
          isDefault: true,
          isEnabled: cat.isEnabled,
          atoCode: cat.code,
          original: cat,
        })),
        ...customCats.map((cat) => ({
          id: `custom-${cat.id}`,
          name: cat.name,
          description: cat.description || "",
          isDefault: false,
          isEnabled: true,
          atoCode: cat.ato_code || undefined,
          original: cat,
        })),
      ];

      setCategories(combined);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setAtoCode("");
    setEditingCategory(null);
  };

  const handleEdit = (category: CombinedCategory) => {
    if (category.isDefault) return; // Cannot edit default categories
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description);
    setAtoCode(category.atoCode || "");
    setDialogOpen(true);
  };

  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!name.trim()) {
        toast.error("Category name is required");
        return;
      }

      if (editingCategory) {
        // Update existing custom category
        const customCat = editingCategory.original as CustomCategory;
        await updateCustomCategory(customCat.id!, {
          name: name.trim(),
          description: description.trim() || null,
          ato_code: atoCode.trim() || null,
        });
        toast.success("Category updated successfully");
      } else {
        // Create new custom category
        await createCustomCategory({
          name: name.trim(),
          description: description.trim() || null,
          ato_code: atoCode.trim() || null,
        });
        toast.success("Category created successfully");
      }

      setDialogOpen(false);
      resetForm();
      await loadCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    }
  };

  const handleToggleEnabled = async (category: CombinedCategory) => {
    try {
      if (category.isDefault && category.code) {
        await setCategoryEnabled(category.code as any, !category.isEnabled);
        toast.success(`${category.name} ${category.isEnabled ? "disabled" : "enabled"}`);
        await loadCategories();
      }
    } catch (error) {
      console.error("Error toggling category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleDeleteClick = (category: CombinedCategory) => {
    if (category.isDefault) return;
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;

    try {
      const customCat = deletingCategory.original as CustomCategory;
      await deleteCustomCategory(customCat.id!);
      toast.success("Category deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      await loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tax Categories</h1>
          <p className="text-muted-foreground">
            Manage ATO deduction categories and custom categories
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Custom Category
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            About Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <Shield className="inline h-3 w-3 mr-1" />
            <strong>ATO Categories:</strong> Default D1-D15 categories cannot be edited or deleted,
            but you can enable/disable them to customize your view.
          </p>
          <p>
            <User className="inline h-3 w-3 mr-1" />
            <strong>Custom Categories:</strong> Create your own categories for organization. These
            can be edited, deleted, and optionally linked to an ATO category code.
          </p>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            {categories.filter((c) => c.isDefault).length} ATO categories,{" "}
            {categories.filter((c) => !c.isDefault).length} custom
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">ATO Code</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading categories...
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        {category.isDefault ? (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            ATO
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            Custom
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {category.description}
                      </TableCell>
                      <TableCell>
                        {category.atoCode ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {category.atoCode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={category.isEnabled}
                            onCheckedChange={() => handleToggleEnabled(category)}
                            disabled={!category.isDefault}
                          />
                          <span className="text-xs text-muted-foreground">
                            {category.isEnabled ? "On" : "Off"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!category.isDefault && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(category)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClick(category)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Custom Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update your custom category details"
                : "Create a new custom category for organizing your deductions"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Home Office Equipment"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this category includes"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="atoCode">ATO Category Code (Optional)</Label>
              <Input
                id="atoCode"
                value={atoCode}
                onChange={(e) => setAtoCode(e.target.value)}
                placeholder="e.g., D5"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Link this custom category to an official ATO category for reporting purposes
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingCategory ? "Save Changes" : "Create Category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? This action cannot be
              undone. Receipts using this category will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCategory(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
