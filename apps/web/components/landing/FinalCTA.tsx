"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Shield, Zap, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: Zap, text: "10x faster" },
  { icon: Check, text: "Editable steps" },
  { icon: Clock, text: "Instant sharing" },
];

const badges = [
  "Stripe billing",
  "Public links",
  "Embeddable guides",
];

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-500 to-indigo-600 py-24">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0)_35%,rgba(255,255,255,0.12))]" />
        <div className="absolute -left-12 top-12 h-32 w-[120%] rotate-[-6deg] bg-white/5" />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-6 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            Ready to publish
            <br />
            clearer tutorials?
          </h2>

          <p className="mx-auto mb-10 max-w-lg text-lg text-white/70">
            Capture the workflow, finish the guide, and share a link that looks
            polished wherever your team works.
          </p>

          {/* Benefits */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-6">
            {benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 text-white/90"
              >
                <div className="rounded-full bg-white/20 p-1.5">
                  <benefit.icon className="h-4 w-4" />
                </div>
                <span className="font-medium">{benefit.text}</span>
              </motion.div>
            ))}
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
          >
            <Link href="/login">
              <Button
                size="lg"
                className="group cursor-pointer h-14 bg-white px-10 text-lg font-semibold text-indigo-600 shadow-2xl hover:bg-stone-50 transition-all duration-200"
              >
                Open Captuto
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            {badges.map((badge, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90"
              >
                <Shield className="h-4 w-4" />
                {badge}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
