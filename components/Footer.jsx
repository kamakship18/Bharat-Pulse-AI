import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function Footer() {
  return (
    <footer
      id="contact"
      className="tricolor-line relative border-t border-rose-100/50 bg-gradient-to-b from-rose-50/30 via-white/70 to-violet-50/20 py-14"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-4 text-center sm:flex-row sm:text-left sm:px-6">
        <div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <BrandLogo size="lg" />
            <span className="font-heading text-lg font-bold">BharatPulse AI</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Silent leakage ends here. AI-powered decisions built for India&apos;s 60M+ MSMEs.
          </p>
        </div>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            Questions?{" "}
            <a
              href="mailto:hello@bharatpulse.ai"
              className="font-semibold text-primary transition-colors hover:text-primary/80 hover:underline"
            >
              hello@bharatpulse.ai
            </a>
          </p>
          <p>
            <Link href="/onboarding" className="font-medium transition-colors hover:text-foreground">
              Start onboarding →
            </Link>
          </p>
          <p className="text-xs text-muted-foreground/60 pt-2">
            © {new Date().getFullYear()} BharatPulse AI. Built with ❤️ for Bharat.
          </p>
        </div>
      </div>
    </footer>
  );
}
