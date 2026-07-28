import Link from "next/link";

export default function PrivacyPolicyPage() {
  const lastUpdated = "July 28, 2025";

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
            Legal
          </p>
          <h1 className="font-cinzel text-4xl sm:text-5xl font-bold text-gold-gradient mb-4">
            Privacy Policy
          </h1>
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-antique-gold to-transparent mx-auto mb-4" />
          <p className="font-inter text-text-secondary text-sm">
            Last updated: {lastUpdated}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pb-20">
        <div className="bg-white rounded-2xl border border-border-light shadow-sm p-6 sm:p-10 md:p-14 space-y-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>

          {/* Introduction */}
          <section>
            <p className="font-inter text-text-secondary leading-relaxed text-[15px]">
              Galaxia (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Galaxia mobile application and the website{" "}
              <a href="https://galaxiaresorts.com" className="text-antique-gold hover:text-dark-gold transition-colors underline underline-offset-2">
                galaxiaresorts.com
              </a>{" "}
              (collectively, the &quot;Service&quot;). We are committed to protecting the privacy
              of our users. This Privacy Policy explains what information we collect, why
              we collect it, how we use and protect it, and your rights regarding your
              personal data.
            </p>
          </section>

          <hr className="border-border-light" />

          {/* 1. Information We Collect */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">1</span>
              Information We Collect
            </h2>
            <div className="space-y-5 pl-11">
              <div>
                <h3 className="font-inter font-semibold text-text-primary text-[15px] mb-1">
                  a) Information You Provide
                </h3>
                <ul className="font-inter text-text-secondary text-[15px] leading-relaxed space-y-1.5 list-disc list-inside">
                  <li><strong>Account details:</strong> Name, email address, phone number provided during sign-up via Google OAuth or phone verification.</li>
                  <li><strong>Booking information:</strong> Property selections, stay dates, guest count, special requests, and celebration preferences.</li>
                  <li><strong>Payment information:</strong> We do not store full payment card details. Transactions are processed securely through third-party payment gateways (e.g., Razorpay).</li>
                  <li><strong>Communications:</strong> Messages you send via our chatbot, WhatsApp integration, or customer support channels.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-inter font-semibold text-text-primary text-[15px] mb-1">
                  b) Information Collected Automatically
                </h3>
                <ul className="font-inter text-text-secondary text-[15px] leading-relaxed space-y-1.5 list-disc list-inside">
                  <li><strong>Device information:</strong> Device type, operating system, app version, and unique device identifiers.</li>
                  <li><strong>Usage data:</strong> Pages visited, features used, time spent on the app/website, and interaction patterns.</li>
                  <li><strong>Analytics:</strong> We use Vercel Analytics and Speed Insights to measure website performance and improve user experience. These tools collect anonymized, aggregated data.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-inter font-semibold text-text-primary text-[15px] mb-1">
                  c) Information from Third Parties
                </h3>
                <ul className="font-inter text-text-secondary text-[15px] leading-relaxed space-y-1.5 list-disc list-inside">
                  <li><strong>Google OAuth:</strong> When you sign in with Google, we receive your name, email address, and profile picture from Google.</li>
                  <li><strong>Phone verification:</strong> When you sign in with your phone number, we receive a verified phone number via AWS Cognito.</li>
                </ul>
              </div>
            </div>
          </section>

          <hr className="border-border-light" />

          {/* 2. How We Use Your Information */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">2</span>
              How We Use Your Information
            </h2>
            <ul className="font-inter text-text-secondary text-[15px] leading-relaxed space-y-2 list-disc list-inside pl-11">
              <li><strong>Service delivery:</strong> To process bookings, manage reservations, send confirmation vouchers, and provide customer support.</li>
              <li><strong>Communication:</strong> To send booking confirmations, updates, check-in instructions, and respond to your inquiries.</li>
              <li><strong>Personalization:</strong> To remember your preferences and improve your experience on future visits.</li>
              <li><strong>Safety &amp; security:</strong> To detect and prevent fraud, abuse, and unauthorized access to accounts.</li>
              <li><strong>Analytics &amp; improvement:</strong> To understand how our Service is used and to make improvements to features, performance, and reliability.</li>
              <li><strong>Legal compliance:</strong> To comply with applicable laws, regulations, and legal processes.</li>
            </ul>
          </section>

          <hr className="border-border-light" />

          {/* 3. Data Sharing */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">3</span>
              Data Sharing &amp; Third Parties
            </h2>
            <div className="space-y-3 pl-11">
              <p className="font-inter text-text-secondary text-[15px] leading-relaxed">
                We <strong>do not sell</strong> your personal data to third parties. We may share
                limited information with trusted service providers solely to operate our Service:
              </p>
              <ul className="font-inter text-text-secondary text-[15px] leading-relaxed space-y-1.5 list-disc list-inside">
                <li><strong>Cloud infrastructure:</strong> Amazon Web Services (AWS) for hosting, authentication (Cognito), and data storage.</li>
                <li><strong>Payment processing:</strong> Razorpay for secure payment handling.</li>
                <li><strong>Analytics:</strong> Vercel for performance monitoring.</li>
                <li><strong>Communication:</strong> WhatsApp Business API for chatbot and booking notifications.</li>
              </ul>
              <p className="font-inter text-text-secondary text-[15px] leading-relaxed">
                All third-party providers are contractually obligated to protect your data and
                use it only for the purposes specified by us.
              </p>
            </div>
          </section>

          <hr className="border-border-light" />

          {/* 4. Data Security */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">4</span>
              How We Protect Your Data
            </h2>
            <ul className="font-inter text-text-secondary text-[15px] leading-relaxed space-y-2 list-disc list-inside pl-11">
              <li>All data transmitted between your device and our servers is encrypted using <strong>HTTPS/TLS</strong>.</li>
              <li>User passwords and authentication tokens are managed through <strong>AWS Cognito</strong> with industry-standard hashing and encryption.</li>
              <li>Admin access to backend systems is protected by <strong>role-based access controls</strong> and JWT-based authentication.</li>
              <li>We perform regular security reviews and follow industry best practices for data protection.</li>
              <li>Payment data is handled exclusively by PCI-DSS compliant payment processors — we never store card numbers on our servers.</li>
            </ul>
          </section>

          <hr className="border-border-light" />

          {/* 5. Data Retention */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">5</span>
              Data Retention
            </h2>
            <div className="space-y-3 pl-11">
              <p className="font-inter text-text-secondary text-[15px] leading-relaxed">
                We retain your personal data only for as long as necessary to provide our services
                and fulfill the purposes described in this policy. Specifically:
              </p>
              <ul className="font-inter text-text-secondary text-[15px] leading-relaxed space-y-1.5 list-disc list-inside">
                <li><strong>Account data:</strong> Retained while your account is active. Deleted within 30 days of an account deletion request.</li>
                <li><strong>Booking records:</strong> Retained for up to 7 years for tax, legal, and business compliance purposes.</li>
                <li><strong>Payment transaction records:</strong> Retained as required by applicable financial regulations.</li>
                <li><strong>Analytics data:</strong> Aggregated and anonymized; not linked to individual users.</li>
              </ul>
            </div>
          </section>

          <hr className="border-border-light" />

          {/* 6. Your Rights */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">6</span>
              Your Rights
            </h2>
            <div className="space-y-3 pl-11">
              <p className="font-inter text-text-secondary text-[15px] leading-relaxed">
                You have the following rights regarding your personal data:
              </p>
              <ul className="font-inter text-text-secondary text-[15px] leading-relaxed space-y-1.5 list-disc list-inside">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong>Correction:</strong> Request correction of any inaccurate or incomplete data.</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated personal data. See our{" "}
                  <Link href="/delete-account" className="text-antique-gold hover:text-dark-gold transition-colors underline underline-offset-2">
                    Account Deletion page
                  </Link>{" "}
                  for details.
                </li>
                <li><strong>Portability:</strong> Request an export of your data in a commonly used format.</li>
                <li><strong>Withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time.</li>
              </ul>
              <p className="font-inter text-text-secondary text-[15px] leading-relaxed">
                To exercise any of these rights, please contact us at{" "}
                <a href="mailto:admin@galaxiaresorts.com" className="text-antique-gold hover:text-dark-gold transition-colors underline underline-offset-2">
                  admin@galaxiaresorts.com
                </a>.
              </p>
            </div>
          </section>

          <hr className="border-border-light" />

          {/* 7. Children's Privacy */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">7</span>
              Children&apos;s Privacy
            </h2>
            <p className="font-inter text-text-secondary text-[15px] leading-relaxed pl-11">
              Our Service is not directed to children under the age of 13. We do not
              knowingly collect personal data from children. If you believe a child has
              provided us with personal information, please contact us immediately at{" "}
              <a href="mailto:admin@galaxiaresorts.com" className="text-antique-gold hover:text-dark-gold transition-colors underline underline-offset-2">
                admin@galaxiaresorts.com
              </a>{" "}
              and we will promptly delete the information.
            </p>
          </section>

          <hr className="border-border-light" />

          {/* 8. Changes to This Policy */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">8</span>
              Changes to This Policy
            </h2>
            <p className="font-inter text-text-secondary text-[15px] leading-relaxed pl-11">
              We may update this Privacy Policy from time to time to reflect changes in our
              practices or applicable laws. When we make material changes, we will update the
              &quot;Last updated&quot; date at the top of this page. We encourage you to review this
              policy periodically.
            </p>
          </section>

          <hr className="border-border-light" />

          {/* 9. Contact Us */}
          <section>
            <h2 className="font-cinzel text-xl sm:text-2xl font-semibold text-text-primary mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold flex items-center justify-center text-sm font-bold font-inter">9</span>
              Contact Us
            </h2>
            <div className="pl-11 space-y-3">
              <p className="font-inter text-text-secondary text-[15px] leading-relaxed">
                If you have any questions, concerns, or requests regarding this Privacy Policy
                or your personal data, please contact us:
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
            </div>
          </section>
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
