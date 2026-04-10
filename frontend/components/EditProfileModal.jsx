"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { updateProfile } from "@/lib/api";
import {
  Building2,
  MapPin,
  Save,
  Loader2,
  Truck,
  Phone,
  CheckCircle2,
  X,
  Plus,
} from "lucide-react";

export function EditProfileModal({ open, onOpenChange, user, onSaved }) {
  const biz = user?.businessData || {};

  const [form, setForm] = useState({
    businessName: "",
    location: "",
    businessType: "",
    branches: [],
    distributorName: "",
    distributorPhone: "",
  });
  const [newBranch, setNewBranch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && user) {
      setForm({
        businessName: biz.name || "",
        location: biz.location || "",
        businessType: biz.type || "",
        branches: biz.branches || [],
        distributorName: biz.distributorName || "",
        distributorPhone: biz.distributorPhone || "",
      });
      setSaved(false);
      setError("");
    }
  }, [open, user]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addBranch = () => {
    const trimmed = newBranch.trim();
    if (trimmed && !form.branches.includes(trimmed)) {
      setForm((prev) => ({ ...prev, branches: [...prev.branches, trimmed] }));
      setNewBranch("");
    }
  };

  const removeBranch = (b) => {
    setForm((prev) => ({ ...prev, branches: prev.branches.filter((x) => x !== b) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await updateProfile(form);
      if (res.success) {
        setSaved(true);
        onSaved?.(res.businessData);
        setTimeout(() => onOpenChange(false), 800);
      } else {
        setError(res.error || "Failed to save.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl border-white/50 bg-white/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-lg">
        <DialogHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-white/80 to-violet-500/5 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Building2 className="size-5 text-primary" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>Update your business details. Changes save to your account instantly.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-6">
          {/* Business Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Business Name</label>
            <Input
              value={form.businessName}
              onChange={(e) => handleChange("businessName", e.target.value)}
              placeholder="Your Business Name"
              className="rounded-xl bg-white/80 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3" /> Location
              </label>
              <Input
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="City, State"
                className="rounded-xl bg-white/80 shadow-sm"
              />
            </div>

            {/* Business Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Business Type</label>
              <Input
                value={form.businessType}
                onChange={(e) => handleChange("businessType", e.target.value)}
                placeholder="e.g. MSME, Kirana"
                className="rounded-xl bg-white/80 shadow-sm"
              />
            </div>
          </div>

          {/* Distributor (NEW) */}
          <div className="rounded-xl border border-violet-200/60 bg-violet-50/30 p-4 space-y-3">
            <p className="text-xs font-bold text-violet-700 flex items-center gap-1.5">
              <Truck className="size-3.5" /> Distributor Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground">Distributor Name</label>
                <Input
                  value={form.distributorName}
                  onChange={(e) => handleChange("distributorName", e.target.value)}
                  placeholder="ABC Distributors Pvt Ltd"
                  className="rounded-lg bg-white/80 shadow-sm text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                  <Phone className="size-2.5" /> Phone (WhatsApp)
                </label>
                <Input
                  value={form.distributorPhone}
                  onChange={(e) => handleChange("distributorPhone", e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                  className="rounded-lg bg-white/80 shadow-sm text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* Branches */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Branches</label>
            <div className="flex flex-wrap gap-1.5">
              {form.branches.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
                >
                  <MapPin className="size-2.5" /> {b}
                  <button onClick={() => removeBranch(b)} className="ml-0.5 hover:text-red-500 cursor-pointer">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBranch())}
                placeholder="Add branch..."
                className="rounded-lg bg-white/80 shadow-sm text-xs h-8 flex-1"
              />
              <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={addBranch} disabled={!newBranch.trim()}>
                <Plus className="size-3 mr-1" /> Add
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" className="rounded-full flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-full btn-glow flex-1"
              onClick={handleSave}
              disabled={saving || saved}
            >
              {saving ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
              ) : saved ? (
                <><CheckCircle2 className="mr-2 size-4" /> Saved!</>
              ) : (
                <><Save className="mr-2 size-4" /> Save Changes</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
