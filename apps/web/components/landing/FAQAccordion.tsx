"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How is billing handled?",
    answer:
      "Open Settings → Billing to see subscription options and manage your subscription. You can review the price before confirming payment.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "Download CapTuto for Mac and connect your account. Record your workflow in the desktop app, then choose your screens and edit your guide in the browser.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Guides are private by default. You decide whether to share a link or make a guide public. AI generation analyzes the captures you choose; review screens for sensitive information before generating or sharing.",
  },
  {
    question: "What tools does it work with?",
    answer:
      "The Mac recorder captures workflows in desktop apps and browsers. Some protected content and system windows may not allow capture.",
  },
  {
    question: "Can I cancel at any time?",
    answer:
      "Yes. Subscription changes and cancellation are handled from the billing portal in your account settings.",
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-stone-50 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-brand-300" />
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-600">
              FAQ
            </p>
            <span className="h-px w-8 bg-brand-300" />
          </div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Frequently asked{" "}
            <span
              className="font-serif italic font-normal bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--brand-gradient)" }}
            >
              questions.
            </span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full cursor-pointer items-center justify-between px-6 py-5 text-left transition-colors hover:bg-stone-50"
              >
                <span className="font-medium text-stone-900">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 text-stone-400 transition-transform duration-200 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-stone-500 leading-relaxed">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
