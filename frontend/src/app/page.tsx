'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarClock,
  CircleCheckBig,
  Compass,
  CreditCard,
  MapPinned,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { BRAND_MARK, BRAND_NAME, BRAND_SHORT_PITCH, BRAND_TAGLINE } from '@/lib/brand';

const featuredPulse = [
  {
    title: 'Midtown Podcast Booth',
    detail: '8:00 PM · Instant checkout',
    price: '$45',
    tone: 'from-[rgba(197,138,73,0.28)] to-transparent',
  },
  {
    title: 'Clay Court Session',
    detail: 'Tomorrow · 6:30 AM',
    price: '$62',
    tone: 'from-[rgba(20,108,107,0.24)] to-transparent',
  },
  {
    title: 'Strategy Room for 6',
    detail: 'Friday · 2 hours left',
    price: '$110',
    tone: 'from-[rgba(255,255,255,0.16)] to-transparent',
  },
];

const proofPoints = [
  {
    icon: Compass,
    title: 'Discovery with taste',
    description: 'Browse high-intent slots across studios, courts, desks, and boutique experiences without digging through generic inventory.',
  },
  {
    icon: CalendarClock,
    title: 'Live availability windows',
    description: 'Every listing is built for decisive scheduling — compare open windows, group sizing, and rates in one flow.',
  },
  {
    icon: CreditCard,
    title: 'Quote to payment in minutes',
    description: 'Transparent totals, promo support, and direct checkout keep momentum high once the right hour appears.',
  },
];

const venueMosaic = [
  {
    eyebrow: 'DAWN',
    title: 'Courts that open before the city does.',
    description: 'Training sessions, leagues, and private drills with a booking surface that feels closer to hospitality than spreadsheets.',
  },
  {
    eyebrow: 'MIDDAY',
    title: 'Workspaces for teams who move fast.',
    description: 'Hold focus rooms, desks, and breakout pods on the exact cadence your calendar needs.',
  },
  {
    eyebrow: 'GOLDEN HOUR',
    title: 'Studios with creative energy built in.',
    description: 'Photo sets, podcast booths, rehearsal rooms, and creator suites with clear pricing and polished checkout.',
  },
  {
    eyebrow: 'LATE',
    title: 'Wellness, recovery, and intimate event rooms.',
    description: 'Turn empty hours into revenue with premium merchandising, provider-level controls, and memorable discovery.',
  },
];

const launchStats = [
  { label: 'Live booking windows merchandised daily', value: '300+' },
  { label: 'Payment rails ready for checkout redirect', value: '4' },
  { label: 'Average quote-to-booking handoff', value: '<10 min' },
];

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-[var(--brand-night)] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[rgba(15,20,36,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/8 font-display text-lg text-[var(--brand-copper)]">
              {BRAND_MARK}
            </span>
            <div>
              <p className="font-display text-2xl leading-none text-white">{BRAND_NAME}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-white/48">Slot booking marketplace</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-[var(--brand-copper)] text-[var(--brand-night)] hover:bg-[rgba(229,196,160,0.95)]">
                Start booking
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="brand-shell relative overflow-hidden pt-28">
          <div className="night-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="pointer-events-none absolute inset-x-0 top-16 h-px brand-divider" />
          <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/72">
                <Sparkles className="h-3.5 w-3.5 text-[var(--brand-copper)]" />
                Live slot marketplace
              </div>
              <h1 className="mt-8 max-w-4xl font-display text-5xl leading-[0.94] text-white sm:text-6xl lg:text-7xl">
                Book the city <span className="text-[var(--brand-copper)]">one flawless hour</span> at a time.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/74">
                {BRAND_SHORT_PITCH} From sunrise courts to late-night podcast booths, {BRAND_NAME} turns every open slot into a polished storefront.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="w-full bg-[var(--brand-copper)] text-[var(--brand-night)] hover:bg-[rgba(229,196,160,0.95)] sm:w-auto"
                  >
                    Create an account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 sm:w-auto"
                  >
                    Explore your dashboard
                  </Button>
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {launchStats.map((item) => (
                  <div key={item.label} className="rounded-[26px] border border-white/10 bg-white/7 p-4 backdrop-blur-sm">
                    <p className="text-2xl font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-white/60">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="brand-panel relative overflow-hidden rounded-[36px] p-5 shadow-[0_28px_80px_rgba(6,10,22,0.28)]">
                <div className="night-grid absolute inset-0 opacity-25" />
                <div className="relative rounded-[30px] border border-white/10 bg-[rgba(8,11,20,0.52)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">Featured now</p>
                      <h2 className="mt-2 font-display text-3xl text-white">Tonight&apos;s market pulse</h2>
                    </div>
                    <span className="rounded-full border border-[rgba(197,138,73,0.28)] bg-[rgba(197,138,73,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-copper)]">
                      Live
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    {featuredPulse.map((item) => (
                      <div
                        key={item.title}
                        className="relative overflow-hidden rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.05)] p-4"
                      >
                        <div className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r ${item.tone}`} />
                        <div className="relative flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">{item.title}</p>
                            <p className="mt-1 text-sm text-white/58">{item.detail}</p>
                          </div>
                          <p className="font-display text-2xl text-[var(--brand-copper)]">{item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-4 rounded-[24px] border border-white/8 bg-white/5 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Marketplace signal</p>
                      <p className="mt-3 text-4xl font-semibold text-white">97%</p>
                      <p className="mt-2 text-sm text-white/58">of featured spaces resolve from quote to booking with one continuous flow.</p>
                    </div>
                    <div className="rounded-[22px] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/52">
                        <Star className="h-3.5 w-3.5 text-[var(--brand-copper)]" />
                        What hosts love
                      </div>
                      <ul className="mt-4 space-y-3 text-sm text-white/72">
                        <li className="flex gap-2">
                          <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-copper)]" />
                          Smart provider and resource management for admins.
                        </li>
                        <li className="flex gap-2">
                          <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-copper)]" />
                          Quote breakdowns that explain every surcharge or promo.
                        </li>
                        <li className="flex gap-2">
                          <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-copper)]" />
                          Checkout redirects that keep the customer moving.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--brand-mist)] px-4 py-20 text-[var(--brand-night)] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Why {BRAND_NAME} sticks</p>
              <h2 className="mt-4 font-display text-4xl text-[var(--brand-night)] sm:text-5xl">
                Not a template. A marketplace that feels designed for real demand.
              </h2>
              <p className="mt-4 text-lg leading-8 text-[rgba(15,20,36,0.68)]">
                {BRAND_TAGLINE} Every surface is tuned for discovery, quick comparisons, and confident payment handoffs.
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {proofPoints.map((point) => (
                <article
                  key={point.title}
                  className="rounded-[30px] border border-[rgba(15,20,36,0.08)] bg-white/88 p-6 shadow-[0_18px_50px_rgba(15,20,36,0.06)]"
                >
                  <div className="inline-flex rounded-[20px] border border-[rgba(20,108,107,0.14)] bg-[rgba(20,108,107,0.08)] p-3 text-[var(--accent)]">
                    <point.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 font-display text-3xl text-gray-900">{point.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-gray-600">{point.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--surface)] px-4 py-20 text-[var(--brand-night)] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Mapped to the day</p>
                <h2 className="mt-4 font-display text-4xl text-gray-900 sm:text-5xl">
                  Velvet Hour merchandises supply like a concierge, not a spreadsheet.
                </h2>
              </div>
              <div className="max-w-xl text-sm leading-7 text-gray-600">
                Customers see polished discovery and clear pricing. Providers and admins get the controls they need to keep the marketplace fresh.
              </div>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {venueMosaic.map((item, index) => (
                <article
                  key={item.title}
                  className={`relative overflow-hidden rounded-[34px] border border-[rgba(15,20,36,0.08)] p-7 shadow-[0_18px_44px_rgba(15,20,36,0.05)] ${
                    index % 2 === 0
                      ? 'bg-[linear-gradient(180deg,rgba(255,246,234,0.96),rgba(252,250,245,0.92))]'
                      : 'bg-[linear-gradient(180deg,rgba(215,236,235,0.4),rgba(252,250,245,0.96))]'
                  }`}
                >
                  <div className="schedule-grid absolute inset-0 opacity-55" />
                  <div className="relative">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">{item.eyebrow}</p>
                    <h3 className="mt-4 font-display text-3xl text-gray-900">{item.title}</h3>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[40px] border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-6 py-14 text-center shadow-[0_28px_70px_rgba(4,8,20,0.22)] backdrop-blur-xl sm:px-10">
            <MapPinned className="mx-auto h-8 w-8 text-[var(--brand-copper)]" />
            <h2 className="mt-6 font-display text-4xl text-white sm:text-5xl">
              Give your best hours a marketplace worthy of them.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-white/72">
              Launch polished discovery, instant quoting, provider management, and checkout redirects without settling for generic template copy.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full bg-[var(--brand-copper)] text-[var(--brand-night)] hover:bg-[rgba(229,196,160,0.95)] sm:w-auto">
                  Create your marketplace account
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 sm:w-auto">
                  Sign in to continue
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 px-4 py-8 text-sm text-white/50 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>{BRAND_NAME} — slot-booking marketplace surfaces with live discovery and checkout flow.</p>
          <p>Designed for providers, admins, and customers who book on momentum.</p>
        </div>
      </footer>
    </div>
  );
}
