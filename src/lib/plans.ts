// Initial plan catalogue. Will move to admin-editable settings in the SaaS/admin phase.
export const PLANS = [
  {
    id: "free", name: "Free", price: 0, featured: false, cta: "Get started free",
    blurb: "Organise your academic workload without paying.",
    features: ["Personal academic dashboard", "Manual assignments & readings", "Subject-wise organisation", "Task completion tracking", "Basic calendar view"],
  },
  {
    id: "pro", name: "Pro", price: 149, featured: true, cta: "Choose Pro",
    blurb: "Automate your academic workflow.",
    features: ["Everything in Free", "Slack & Google Calendar integration", "Subject-wise channel mapping", "AI assignment & reading extraction", "Automatic deadline identification", "Daily AI priorities & weekly overview", "Links to original Slack messages"],
  },
  {
    id: "premium", name: "Premium", price: 249, featured: false, cta: "Choose Premium",
    blurb: "A more intelligent academic assistant.",
    features: ["Everything in Pro", "AI document summaries", "Advanced workload planning", "Personal AI academic assistant", "Advanced weekly insights & analytics", "Higher AI usage limits"],
  },
] as const;
