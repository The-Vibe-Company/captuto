"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  "Unlimited tutorials",
  "AI-generated instructions",
  "HD screenshots",
  "1-click sharing",
  "PDF & Notion export",
  "Priority support",
];

export function PricingCard() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-brand-300" />
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-600">
              Pricing
            </p>
            <span className="h-px w-8 bg-brand-300" />
          </div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Simple plans.{" "}
            <span
              className="font-serif italic font-normal bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--brand-gradient)" }}
            >
              Generous limits.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-stone-500">
            One plan, everything included. No surprises.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-lg"
        >
          <div className="relative">
            {/* Radial glow */}
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-brand-500/10 blur-[80px]" />

            <div className="relative overflow-hidden rounded-3xl border border-stone-200/60 bg-white p-8 shadow-xl shadow-stone-200/30">
              {/* Top accent gradient */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-teal-500 to-cyan-500" />

              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-50 to-teal-50 px-3 py-1 text-xs font-semibold text-brand-700 border border-brand-200/50">
                <Sparkles className="h-3 w-3" />
                All-in-one
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-5xl font-bold text-stone-900">
                    $8
                  </span>
                  <span className="text-lg text-stone-400">/month</span>
                </div>
                <p className="mt-2 text-sm text-stone-500">
                  Unlimited usage. No hidden fees.
                </p>
              </div>

              <div className="mb-8 h-px bg-stone-100" />

              <ul className="mb-8 space-y-3.5">
                {features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-stone-600"
                  >
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-50">
                      <Check className="h-3 w-3 text-brand-600" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href="/login" className="block">
                <Button
                  size="lg"
                  className="group cursor-pointer w-full h-12 bg-brand-600 text-base font-medium text-white shadow-brand hover:bg-brand-500 hover:shadow-brand-lg transition-all duration-200"
                >
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <p className="mt-4 text-center text-xs text-stone-400">
                No credit card required
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
