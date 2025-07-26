'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureUserFeedback } from "@/lib/monitoring/sentry";
import { useToast } from "@/hooks/use-toast";

interface ErrorFeedbackDialogProps {
  children: React.ReactNode;
  error?: Error;
}

export function ErrorFeedbackDialog({ children, error }: ErrorFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comments.trim()) {
      toast({
        title: "Please describe the issue",
        description: "We need some details about what went wrong to help you better.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Include error details in comments if available
      const fullComments = error 
        ? `${comments}\n\nError Details: ${error.message}\nTimestamp: ${new Date().toISOString()}`
        : comments;
      
      captureUserFeedback(email || 'anonymous@user.com', name || 'Anonymous User', fullComments);
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback. Our team will look into this issue.",
      });
      
      setOpen(false);
      setEmail('');
      setName('');
      setComments('');
    } catch (error) {
      toast({
        title: "Failed to submit feedback",
        description: "Please try again or contact support directly.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="comments">What went wrong? *</Label>
            <Textarea
              id="comments"
              placeholder="Please describe what you were trying to do and what happened..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              required
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
              <p className="font-medium text-red-800">Error detected:</p>
              <p className="text-red-600 mt-1">{error.message}</p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 