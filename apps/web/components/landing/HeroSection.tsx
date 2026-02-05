"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, MousePointer2, Sparkles, Star } from "lucide-react";

const customEase = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: customEase as unknown as [number, number, number, number] },
  },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
      {/* Glow orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute top-1/2 -left-20 h-[400px] w-[400px] rounded-full bg-violet-500/15 blur-[100px]" />
        <div className="absolute top-1/3 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-purple-400/10 blur-[80px]" />
      </div>

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Pill badge */}
          <motion.div variants={fadeUp} className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200/50">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by AI
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="mb-6 font-heading text-5xl font-bold leading-[1.08] tracking-tight text-stone-900 sm:text-6xl lg:text-7xl"
          >
            Stop writing tutorials.
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-500 bg-clip-text text-transparent">
              Record them.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mb-10 max-w-xl text-lg text-stone-500 leading-relaxed sm:text-xl"
          >
            Record your screen. Click through your workflow. AI writes every
            step for you.
          </motion.p>

          {/* Dual CTA */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/login">
              <Button
                size="lg"
                className="group cursor-pointer h-12 bg-indigo-600 px-8 text-base font-medium text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500"
              >
                Start for free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                variant="ghost"
                size="lg"
                className="group cursor-pointer h-12 px-8 text-base text-stone-600 hover:text-stone-900"
              >
                <Play className="mr-2 h-4 w-4" />
                See how it works
              </Button>
            </a>
          </motion.div>

          {/* Social proof strip */}
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-stone-400"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-stone-600">+500</span>
              <span>tutorials created</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-stone-200" />
            <div className="flex items-center gap-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <span className="ml-1 font-semibold text-stone-600">4.9/5</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-stone-200" />
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-stone-600">50+</span>
              <span>active teams</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Browser mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.6,
            ease: customEase as unknown as [number, number, number, number],
          }}
          className="relative mt-16 sm:mt-20"
        >
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-indigo-500/5 blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-2xl shadow-indigo-500/10">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50/80 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-stone-300" />
                  <div className="h-3 w-3 rounded-full bg-stone-300" />
                  <div className="h-3 w-3 rounded-full bg-stone-300" />
                </div>
                <div className="ml-4 flex-1 rounded-lg bg-stone-100 px-4 py-1.5">
                  <span className="text-xs text-stone-400">
                    app.captuto.com/editor
                  </span>
                </div>
              </div>

              {/* Preview content */}
              <div className="aspect-[16/9] bg-gradient-to-br from-stone-50 to-stone-100/50 p-6 sm:p-8">
                <div className="flex h-full gap-4 sm:gap-6">
                  {/* Sidebar */}
                  <div className="hidden sm:block w-48 space-y-3 rounded-xl border border-stone-200/60 bg-white p-4">
                    <div className="h-3 w-20 rounded bg-stone-200" />
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg bg-stone-50 p-2"
                        >
                          <div className="h-8 w-8 rounded-lg bg-indigo-100" />
                          <div className="h-2 w-16 rounded bg-stone-200" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 space-y-4 rounded-xl border border-stone-200/60 bg-white p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-medium text-white">
                        1
                      </div>
                      <div className="h-3 w-48 rounded bg-stone-200" />
                    </div>
                    <div className="aspect-video rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
                      <div className="relative h-full rounded-lg bg-white/60">
                        <div className="absolute left-1/3 top-1/2 flex h-8 w-8 items-center justify-center">
                          <div className="absolute h-8 w-8 animate-ping rounded-full bg-indigo-400/30" />
                          <MousePointer2 className="h-5 w-5 text-indigo-500" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full rounded bg-stone-100" />
                      <div className="h-2 w-3/4 rounded bg-stone-100" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
