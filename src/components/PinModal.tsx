"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/useSession";
import { LogIn, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePin: (data: { pinName: string; comment: string }) => void;
}

export default function PinModal({
  isOpen,
  onClose,
  onCreatePin,
}: PinModalProps) {
  const [pinName, setPinName] = useState("");
  const [comment, setComment] = useState("");
  const { user } = useSession();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return; // Shouldn't happen due to UI, but safety check

    if (pinName.trim() && comment.trim()) {
      onCreatePin({
        pinName: pinName.trim(),
        comment: comment.trim(),
      });
      setPinName("");
      setComment("");
    }
  };

  const handleClose = () => {
    setPinName("");
    setComment("");
    onClose();
  };

  // Non-authenticated user UI
  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Sign In Required
            </DialogTitle>
            <DialogDescription>
              Create an account or sign in to share your thoughts about
              locations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <div className="text-4xl mb-2">📍</div>
              <p className="text-sm text-muted-foreground">
                Join the community to create pins, leave comments, and vote on
                others&apos; opinions!
              </p>
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button asChild className="flex-1">
                <Link href="/auth">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Authenticated user UI
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            What is your oPINion?
          </DialogTitle>
          <DialogDescription>
            Share your thoughts about this location
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pinName">Pin Name</Label>
            <Input
              id="pinName"
              type="text"
              value={pinName}
              onChange={(e) => setPinName(e.target.value)}
              placeholder="Give your pin a name..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Your Comment</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What do you think about this location?"
              rows={4}
              required
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Pin
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
