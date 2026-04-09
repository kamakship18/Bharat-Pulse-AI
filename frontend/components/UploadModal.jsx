"use client";

import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, ImageIcon, Upload, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadModal({ open, onOpenChange, onComplete }) {
  const [dragLeft, setDragLeft] = useState(false);
  const [dragRight, setDragRight] = useState(false);

  const handleDrop = useCallback(
    (side) => (e) => {
      e.preventDefault();
      if (side === "left") setDragLeft(false);
      else setDragRight(false);
      onComplete?.();
    },
    [onComplete]
  );

  const prevent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-3xl gap-0 overflow-hidden rounded-2xl border-white/50 bg-white/90 p-0 shadow-2xl backdrop-blur-xl ring-1 ring-border/20 sm:max-w-3xl"
      >
        <DialogHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-white/80 to-violet-500/5 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Upload className="size-5 text-primary" />
            Upload data
          </DialogTitle>
          <DialogDescription>
            Drop a spreadsheet or ledger images — demo will load static insights.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-0 sm:grid-cols-2">
          {/* Excel / CSV side */}
          <div
            role="button"
            tabIndex={0}
            onDragEnter={() => setDragLeft(true)}
            onDragLeave={() => setDragLeft(false)}
            onDragOver={prevent}
            onDrop={handleDrop("left")}
            className={cn(
              "group relative flex min-h-[240px] flex-col items-center justify-center gap-4 border-b border-border/40 p-8 transition-all duration-300 sm:border-b-0 sm:border-r",
              dragLeft
                ? "bg-primary/8 ring-2 ring-inset ring-primary/30"
                : "bg-white/60 hover:bg-primary/3"
            )}
          >
            {/* Dashed border */}
            <div className="pointer-events-none absolute inset-4 rounded-2xl border-2 border-dashed border-primary/20 transition-colors duration-300 group-hover:border-primary/40" />

            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-indigo-500/15 text-primary shadow-sm transition-transform duration-300 group-hover:scale-110">
              <FileSpreadsheet className="size-8" strokeWidth={1.5} />
            </span>
            <div className="text-center">
              <p className="text-base font-bold">Excel / CSV</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Drag & drop or click to browse
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
              onClick={() => onComplete?.()}
            >
              <Upload className="mr-2 size-4" />
              Choose file
            </Button>
          </div>

          {/* Image side */}
          <div
            role="button"
            tabIndex={0}
            onDragEnter={() => setDragRight(true)}
            onDragLeave={() => setDragRight(false)}
            onDragOver={prevent}
            onDrop={handleDrop("right")}
            className={cn(
              "group relative flex min-h-[240px] flex-col items-center justify-center gap-4 p-8 transition-all duration-300",
              dragRight
                ? "bg-violet-500/8 ring-2 ring-inset ring-violet-500/30"
                : "bg-white/60 hover:bg-violet-500/3"
            )}
          >
            {/* Dashed border */}
            <div className="pointer-events-none absolute inset-4 rounded-2xl border-2 border-dashed border-violet-400/20 transition-colors duration-300 group-hover:border-violet-500/40" />

            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 text-violet-700 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <ImageIcon className="size-8" strokeWidth={1.5} />
            </span>
            <div className="text-center">
              <p className="text-base font-bold">Images</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bahi-khata photos, invoices
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md"
              onClick={() => onComplete?.()}
            >
              <Upload className="mr-2 size-4" />
              Choose images
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
