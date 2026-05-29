"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Player } from "@/lib/seahawks-depth-chart";

interface PlayerCardProps {
  player: Player | null;
  onClose: () => void;
}

const statusLabel: Record<string, string> = {
  starter: "STARTER",
  backup: "BACKUP",
  rookie: "ROOKIE",
  injured: "INJURED",
};

const statusColor: Record<string, string> = {
  starter: "#69BE28",
  backup: "#A5ACAF",
  rookie: "#4fc3f7",
  injured: "#ef5350",
};

export default function PlayerCard({ player, onClose }: PlayerCardProps) {
  // Lock scroll when open
  useEffect(() => {
    if (player) {
      document.body.classList.add("card-open");
    } else {
      document.body.classList.remove("card-open");
    }
    return () => document.body.classList.remove("card-open");
  }, [player]);

  return (
    <AnimatePresence>
      {player && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Card — slides up from bottom */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #0f1a2e 0%, #0a0e1a 100%)",
              borderTop: "1px solid rgba(105,190,40,0.3)",
              maxHeight: "82vh",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 38 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="rounded-full"
                style={{ width: 36, height: 4, background: "rgba(255,255,255,0.2)" }}
              />
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "calc(82vh - 32px)" }}>
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-4 pb-2">
                <div>
                  {/* Jersey number */}
                  <div
                    className="text-6xl font-black leading-none"
                    style={{ color: "rgba(105,190,40,0.15)", letterSpacing: "-0.03em" }}
                  >
                    #{player.number}
                  </div>
                  <div
                    className="text-2xl font-black leading-tight -mt-4"
                    style={{ color: "#f0f4ff", letterSpacing: "-0.01em" }}
                  >
                    {player.name}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(0,34,68,0.8)",
                        color: "#69BE28",
                        border: "1px solid rgba(105,190,40,0.4)",
                      }}
                    >
                      {player.position}
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: statusColor[player.status] }}
                    >
                      {statusLabel[player.status]}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-full p-2 mt-1"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <X size={18} color="#A5ACAF" />
                </button>
              </div>

              {/* Quick stats row */}
              <div
                className="mx-6 my-4 rounded-2xl grid grid-cols-4 divide-x"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {[
                  { label: "AGE", value: player.age },
                  { label: "EXP", value: `${player.experience}Y` },
                  { label: "HT", value: player.height },
                  { label: "WT", value: `${player.weight}` },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center py-3">
                    <div
                      className="text-[10px] font-semibold"
                      style={{ color: "#A5ACAF", letterSpacing: "0.08em" }}
                    >
                      {stat.label}
                    </div>
                    <div
                      className="text-base font-black mt-0.5"
                      style={{ color: "#f0f4ff" }}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* College */}
              <div className="px-6 mb-3">
                <span
                  className="text-xs font-semibold"
                  style={{ color: "#A5ACAF", letterSpacing: "0.06em" }}
                >
                  COLLEGE
                </span>
                <span
                  className="ml-2 text-sm font-bold"
                  style={{ color: "#f0f4ff" }}
                >
                  {player.college}
                </span>
              </div>

              {/* Bio */}
              <div className="px-6 mb-4">
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "rgba(240,244,255,0.75)" }}
                >
                  {player.bio}
                </p>
              </div>

              {/* Season Stats */}
              {player.stats && Object.keys(player.stats).length > 0 && (
                <div className="px-6 mb-8">
                  <div
                    className="text-[10px] font-semibold mb-3"
                    style={{ color: "#A5ACAF", letterSpacing: "0.1em" }}
                  >
                    2024 SEASON
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(player.stats).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex flex-col items-center rounded-xl px-4 py-2"
                        style={{
                          background: "rgba(0,34,68,0.5)",
                          border: "1px solid rgba(105,190,40,0.2)",
                          minWidth: 64,
                        }}
                      >
                        <div
                          className="text-xl font-black"
                          style={{ color: "#69BE28" }}
                        >
                          {val}
                        </div>
                        <div
                          className="text-[9px] font-semibold mt-0.5"
                          style={{ color: "#A5ACAF", letterSpacing: "0.06em" }}
                        >
                          {key.toUpperCase()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
