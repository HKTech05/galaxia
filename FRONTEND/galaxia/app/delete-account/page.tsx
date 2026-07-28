import Link from "next/link";

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-cream-white flex flex-col">
      {/* Minimal Branded Header */}
      <nav className="sticky top-0 z-50 glass-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-antique-gold to-dark-gold flex items-center justify-center">
              <span className="text-white font-cinzel font-bold text-lg">G</span>
            </div>
            <span className="font-cinzel text-xl sm:text-2xl font-semibold text-gold-gradient">
              GALAXIA
            </span>
          </Link>
          <Link
            href="/"
            className="font-inter text-sm text-text-secondary hover:text-antique-gold transition-colors duration-300"
          >
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-16 pb-10 text-center px-4">
        <div className="animate-fade-in-up">
          <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-4">
            Account Management
          </p>
          <h1 className="font-cinzel text-4xl sm:text-5xl font-bold text-gold-gradient mb-4">
            Delete Account
          </h1>
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-antique-gold to-transparent mx-auto mb-4" />
          <p className="font-inter text-text-secondary text-sm max-w-lg mx-auto">
            We respect your right to control your data. Here&apos;s everything you need to know
            about requesting account deletion from Galaxia.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pb-20">
        <div className="bg-white rounded-2xl border border-border-light shadow-sm p-6 sm:p-10 md:p-14 space-y-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>

          {/* 1. How to Request Account Deletion */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">1</span>
              How to Request Account Deletion
            </h2>
            <div className="space-y-4 pl-11">
              <p className="font-inter text-text-secondary text-[15px] leading-relaxed">
                You can request complete deletion of your Galaxia account and associated
                personal data by sending an email request to our support team:
              </p>

              {/* Email Method */}
              <div className="bg-soft-gray rounded-xl p-5 border border-border-light">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-antique-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-antique-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-inter font-semibold text-text-primary text-[15px] mb-1">
                      Email Request Procedure
                    </h3>
                    <p className="font-inter text-text-secondary text-[15px] leading-relaxed">
                      Send an email to{" "}
                      <a href="mailto:admin@galaxiaresorts.com?subject=Account%20Deletion%20Request" className="text-antique-gold hover:text-dark-gold transition-colors underline underline-offset-2 font-medium">
                        admin@galaxiaresorts.com
                      </a>{" "}
                      with the subject line <strong>&quot;Account Deletion Request&quot;</strong>.
                      Please include the phone number or email address associated with your account
                      so we can locate your account and verify your identity.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-border-light" />

          {/* 2. What Data Will Be Deleted */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">2</span>
              What Data Will Be Deleted
            </h2>
            <div className="space-y-3 pl-11">
              <p className="font-inter text-text-secondary text-[15px] leading-relaxed">
                Upon processing your deletion request, the following data will be <strong>permanently removed</strong> from our systems:
              </p>
              <div className="grid gap-2">
                {[
                  "Your account profile (name, email address, phone number, profile picture)",
                  "Authentication credentials and login tokens",
                  "Saved preferences and personalisation settings",
                  "Chat history and chatbot conversation logs",
                  "Cart items and any incomplete (unpaid) booking drafts",
                  "Device tokens and push notification registrations",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="font-inter text-text-secondary text-[15px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <hr className="border-border-light" />

          {/* 3. What Data May Be Retained */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">3</span>
              What Data May Be Retained
            </h2>
            <div className="space-y-3 pl-11">
              <p className="font-inter text-text-secondary text-[15px] leading-relaxed">
                In accordance with applicable Indian laws and business regulations, we may
                retain certain data even after your account is deleted. This data is kept in
                anonymised or minimal form and is <strong>not used for marketing or profiling</strong>:
              </p>
              <div className="grid gap-2">
                {[
                  { text: "Completed booking and transaction records", reason: "Required for tax, accounting, and legal compliance (up to 7 years)" },
                  { text: "Payment transaction IDs and invoices", reason: "Required by financial regulations and for dispute resolution" },
                  { text: "Anonymised, aggregated analytics data", reason: "Not linked to your identity; used for service improvement" },
                  { text: "Records required by law enforcement requests", reason: "Retained only when mandated by legal order or government directive" },
                ].map((item, i) => (
                  <div key={i} className="bg-amber-50/60 rounded-lg p-3 border border-amber-200/40">
                    <div className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-antique-gold flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <div>
                        <span className="font-inter text-text-primary text-[15px] font-medium">{item.text}</span>
                        <br />
                        <span className="font-inter text-text-muted text-[13px]">{item.reason}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <hr className="border-border-light" />

          {/* 4. How Long the Process Takes */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">4</span>
              How Long the Process Takes
            </h2>
            <div className="pl-11 space-y-4">
              <div className="flex items-center gap-4">
                {/* Timeline visual */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-antique-gold" />
                  <div className="w-0.5 h-12 bg-gradient-to-b from-antique-gold to-border-light" />
                  <div className="w-3 h-3 rounded-full bg-antique-gold/50" />
                  <div className="w-0.5 h-12 bg-gradient-to-b from-border-light to-border-light" />
                  <div className="w-3 h-3 rounded-full bg-success" />
                </div>
                <div className="space-y-5">
                  <div>
                    <p className="font-inter text-text-primary text-[15px] font-semibold">Request Received</p>
                    <p className="font-inter text-text-muted text-[13px]">We acknowledge your request within 48 hours</p>
                  </div>
                  <div>
                    <p className="font-inter text-text-primary text-[15px] font-semibold">Identity Verification</p>
                    <p className="font-inter text-text-muted text-[13px]">We verify your identity to prevent unauthorized deletions</p>
                  </div>
                  <div>
                    <p className="font-inter text-text-primary text-[15px] font-semibold">Deletion Complete</p>
                    <p className="font-inter text-text-muted text-[13px]">Account and personal data permanently deleted within <strong className="text-text-primary">30 days</strong></p>
                  </div>
                </div>
              </div>
              <div className="bg-soft-gray rounded-xl p-4 border border-border-light">
                <p className="font-inter text-text-secondary text-[14px] leading-relaxed">
                  <strong>Note:</strong> If you have an active or upcoming booking at the time of
                  your request, we may need to process the deletion after the booking period
                  ends or after any pending refunds are settled. We will notify you of any
                  delays via your registered email or phone number.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-border-light" />

          {/* 5. What Happens After Deletion */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">5</span>
              What Happens After Deletion
            </h2>
            <ul className="font-inter text-text-secondary text-[15px] leading-relaxed space-y-2 list-disc list-inside pl-11">
              <li>You will be logged out of all devices and sessions immediately.</li>
              <li>You will no longer be able to sign in using your previous credentials.</li>
              <li>Any future bookings associated with your account will be cancelled.</li>
              <li>If you wish to use Galaxia again in the future, you will need to create a new account.</li>
              <li>Deletion is <strong>permanent and irreversible</strong> — we cannot recover your data once the process is complete.</li>
            </ul>
          </section>

          <hr className="border-border-light" />

          {/* 6. Contact Us */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">6</span>
              Contact Us
            </h2>
            <div className="pl-11 space-y-3">
              <p className="font-inter text-text-secondary text-[15px] leading-relaxed">
                If you have any questions about account deletion or need assistance with the
                process, please reach out to us:
              </p>
              <div className="bg-soft-gray rounded-xl p-5 border border-border-light">
                <div className="space-y-2 font-inter text-[15px]">
                  <div className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </span>
                    <div>
                      <span className="text-text-muted text-xs uppercase tracking-wider">Email</span>
                      <br />
                      <a href="mailto:admin@galaxiaresorts.com" className="text-text-primary hover:text-antique-gold transition-colors">
                        admin@galaxiaresorts.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-antique-gold mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                    </span>
                    <div>
                      <span className="text-text-muted text-xs uppercase tracking-wider">Website</span>
                      <br />
                      <a href="https://galaxiaresorts.com" className="text-text-primary hover:text-antique-gold transition-colors">
                        galaxiaresorts.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <p className="font-inter text-text-muted text-[13px]">
                We aim to respond to all inquiries within 2 business days.
              </p>
            </div>
          </section>

          {/* Related Link */}
          <div className="pt-4">
            <div className="bg-gradient-to-r from-antique-gold/5 via-antique-gold/10 to-antique-gold/5 rounded-xl p-5 border border-antique-gold/20 text-center">
              <p className="font-inter text-text-secondary text-[14px]">
                For information about how we collect and use your data, please read our{" "}
                <Link href="/privacy-policy" className="text-antique-gold hover:text-dark-gold transition-colors underline underline-offset-2 font-medium">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-light py-8 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <p className="font-inter text-text-muted text-xs tracking-wider">
            © {new Date().getFullYear()} Galaxia. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-6 mt-3">
            <Link href="/privacy-policy" className="font-inter text-text-secondary text-xs hover:text-antique-gold transition-colors">
              Privacy Policy
            </Link>
            <span className="text-border-medium">·</span>
            <Link href="/delete-account" className="font-inter text-text-secondary text-xs hover:text-antique-gold transition-colors">
              Delete Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
