"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MessageCircle, AlertTriangle, Package, Clock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNotifications, markNotificationsRead } from "@/lib/api";

export function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const data = await getNotifications({ limit: 20 });
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn("[Notifications] Fetch failed:", err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead("all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn("[Notifications] Mark read failed:", err.message);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "expiry_alert": return <Clock className="size-4 text-red-500" />;
      case "low_stock_alert": return <Package className="size-4 text-amber-500" />;
      case "recommendation": return <AlertTriangle className="size-4 text-primary" />;
      default: return <Bell className="size-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "border-red-200 bg-red-50/50";
      case "warning": return "border-amber-200 bg-amber-50/50";
      default: return "border-border/30 bg-white/50";
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5"
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications(); }}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-[420px] overflow-hidden rounded-2xl border border-white/50 bg-white/95 shadow-2xl backdrop-blur-xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-primary" />
                <span className="text-sm font-bold">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-medium text-primary hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-[340px] overflow-y-auto divide-y divide-border/20">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell className="size-8 text-muted-foreground/20 mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    className={`px-4 py-3 transition-all hover:bg-white ${
                      !n.read ? "bg-primary/3" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${getSeverityColor(n.severity)}`}>
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug ${!n.read ? "font-bold" : "font-medium"}`}>
                          {n.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          {n.channels?.includes("whatsapp") && (
                            <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                              <MessageCircle className="size-2.5" />
                              WhatsApp
                            </span>
                          )}
                        </div>
                      </div>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
