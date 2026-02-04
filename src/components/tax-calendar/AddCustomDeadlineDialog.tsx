/**
 * AddCustomDeadlineDialog
 * 
 * Dialog for creating custom deadline events.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { validateCustomDeadline } from '@/lib/tax-calendar';

interface AddCustomDeadlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  onSubmit: (params: {
    title: string;
    description: string;
    dueDate: Date;
    financialYear: number;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function AddCustomDeadlineDialog({
  open,
  onOpenChange,
  initialDate,
  onSubmit,
  isLoading = false,
}: AddCustomDeadlineDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [errors, setErrors] = useState<string[]>([]);
  
  // Reset form when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTitle('');
      setDescription('');
      setDate(initialDate);
      setErrors([]);
    }
    onOpenChange(open);
  };
  
  const handleSubmit = async () => {
    setErrors([]);
    
    if (!date) {
      setErrors(['Please select a due date']);
      return;
    }
    
    // Calculate financial year from date
    const month = date.getMonth();
    const year = date.getFullYear();
    const financialYear = month >= 6 ? year : year - 1;
    
    const validation = validateCustomDeadline(title, date, financialYear);
    
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    
    try {
      await onSubmit({
        title,
        description,
        dueDate: date,
        financialYear,
      });
      handleOpenChange(false);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to create deadline']);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Deadline</DialogTitle>
          <DialogDescription>
            Create a custom deadline reminder for your tax calendar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Accountant Meeting, Document Submission"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add any additional details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* Due Date */}
          <div className="space-y-2">
            <Label>
              Due Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Select a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside text-sm">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !title.trim() || !date}
          >
            {isLoading ? 'Creating...' : 'Add Deadline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
