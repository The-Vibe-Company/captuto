"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
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
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-indigo-500">
            Launch offer
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Join the early adopters
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-lg"
        >
          <div className="relative">
            {/* Radial glow */}
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-indigo-500/10 blur-[80px]" />

            <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-500 bg-white p-8 shadow-xl shadow-indigo-100">
              {/* Badge */}
              <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-indigo-600 to-violet-600 px-12 py-1 text-xs font-semibold text-white">
                Popular
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-5xl font-bold text-stone-900">
                    $15
                  </span>
                  <span className="text-lg text-stone-400">/month</span>
                  <span className="text-lg text-stone-400 line-through">
                    $29/month
                  </span>
                </div>
                <p className="mt-2 text-sm text-stone-500">
                  50% off while in Beta. Unlimited usage.
                </p>
              </div>

              <ul className="mb-8 space-y-3">
                {features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-stone-600"
                  >
                    <Check className="h-5 w-5 flex-shrink-0 text-indigo-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href="/login" className="block">
                <Button
                  size="lg"
                  className="group cursor-pointer w-full h-12 bg-indigo-600 text-base font-medium text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500"
                >
                  Join the free beta
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-stone-400">
            Premium plans coming Q2 2026
          </p>
        </motion.div>
      </div>
    </section>
  );
}
