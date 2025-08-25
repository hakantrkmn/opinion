"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin } from "lucide-react";
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
