import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ResetPointsDialog({ open, onCancel, onConfirm, label }:{ open:boolean; onCancel:()=>void; onConfirm:()=>void; label:string }) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset Points</DialogTitle></DialogHeader>
        <p>Reset points for {label}?</p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Reset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}