import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Building,
  CheckCircle,
  FileText,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Plane,
  Send,
  Shield,
  Users,
  X,
} from 'lucide-react';

const navItems = [
  { label: 'Home', href: '#top' },
  { label: 'Services', href: '#services' },
  { label: 'Jobs', href: '#jobs' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Contact', href: '#contact' },
];

const trustBadges = ['Office in Nansana', 'Qatar & Dubai Jobs', 'Fast Application Support'];

const services = [
  {
    title: 'Job Application Support',
    description: 'We guide clients through the full application process for Gulf job opportunities.',
    icon: Briefcase,
  },
  {
    title: 'Visa Application',
    description: 'Get help preparing and submitting the right documents for your visa process.',
    icon: FileText,
  },
  {
    title: 'Travel Insurance',
    description: 'Protect your trip with insurance support for safer international travel.',
    icon: Shield,
  },
  {
    title: 'Hotel Booking',
    description: 'We assist with simple and reliable accommodation booking arrangements.',
    icon: Building,
  },
  {
    title: 'Ticketing',
    description: 'Get support with flight ticket planning and travel arrangements.',
    icon: Plane,
  },
  {
    title: 'Free Visa Guidance',
    description: 'Speak to our team for practical advice before you begin your application.',
    icon: CheckCircle,
  },
];

const jobCategories = [
  'House Maids',
  'House Cleaners',
  'Female Drivers',
  'Nurses',
  'Home Teachers',
  'Female Baristas',
];

const processSteps = [
  'Fill in your online application',
  'Submit your personal and passport details',
  'Gulf Consultant reviews your application',
  'Our team contacts you for the next steps',
];

const whyChooseUs = [
  'Trusted travel and job application support',
  'Physical office in Nansana',
  'Support for Qatar and Dubai opportunities',
  'Simple online application process',
  'Direct phone support',
];

const quickServices = [
  'Gulf job application support',
  'Visa application support',
  'Travel insurance',
  'Hotel booking',
  'Ticketing',
];

const ugPhoneDisplay = '+256 756 527 240';
const ugPhoneHref = 'tel:+256756527240';
const qatarPhoneDisplay = '+974 504 40431';
const qatarPhoneHref = 'tel:+97450440431';
const whatsappHref =
  'https://wa.me/256756527240?text=Hello%20Gulf%20Consultant%2C%20I%20need%20help%20with%20my%20job%20application.';
const mapsHref = 'https://www.google.com/maps/search/?api=1&query=Nansana%2C%20Uganda';
const applyRoute = '/apply';

const buttonBaseClass =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

function SectionHeading({ eyebrow, title, description, center = false, theme = 'light' }) {
  const isDark = theme === 'dark';

  return (
    <div className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      {eyebrow && (
        <p
          className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] ${
            isDark ? 'text-cyan-100' : 'text-[var(--gc-cyan-strong)]'
          }`}
        >
          {eyebrow}
        </p>
      )}
      <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${isDark ? 'text-white' : 'text-slate-950'}`}>
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-base leading-7 sm:text-lg ${isDark ? 'text-slate-100' : 'text-slate-600'}`}>
          {description}
        </p>
      )}
    </div>
  );
}

function ServiceCard({ title, description, icon: Icon }) {
  return (
    <article className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-42px_rgba(14,116,144,0.35)]">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gc-sky-soft)] text-[var(--gc-blue)]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}

function JobCard({ title }) {
  return (
    <div className="rounded-[24px] border border-cyan-100 bg-white p-5 shadow-[0_16px_45px_-35px_rgba(14,116,144,0.5)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--gc-blue)]/10 text-[var(--gc-blue)]">
          <Briefcase className="h-5 w-5" />
        </div>
        <p className="text-base font-semibold text-slate-900">{title}</p>
      </div>
    </div>
  );
}

function WhyChooseCard({ text }) {
  return (
    <div className="flex items-start gap-4 rounded-[24px] border border-white/10 bg-white/8 p-5 backdrop-blur">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-cyan-200">
        <CheckCircle className="h-5 w-5" />
      </div>
      <p className="text-sm leading-6 text-slate-100">{text}</p>
    </div>
  );
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formState, setFormState] = useState({
    fullName: '',
    phoneNumber: '',
    interestedJob: '',
    message: '',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Gulf Consultant | Start Your Gulf Job Application Online';

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Apply online with Gulf Consultant in Nansana for Gulf jobs, visa support, travel insurance, hotel booking, and ticketing services.'
      );
    }
  }, []);

  const contactMailto = useMemo(() => {
    const subject = formState.interestedJob
      ? `Gulf Consultant enquiry about ${formState.interestedJob}`
      : 'Gulf Consultant enquiry';

    const body = [
      `Full Name: ${formState.fullName}`,
      `Phone Number: ${formState.phoneNumber}`,
      `Interested Job: ${formState.interestedJob || 'Not specified'}`,
      '',
      formState.message || 'Hello Gulf Consultant, I would like support with my application.',
    ].join('\n');

    return `mailto:gulfconsultant@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [formState]);

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
    setFormSubmitted(false);
  };

  const handleContactSubmit = (event) => {
    event.preventDefault();
    window.location.href = contactMailto;
    setFormSubmitted(true);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div id="top" className="bg-[var(--gc-page)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="Gulf Consultant home">
            <img
              src="/gulf.png"
              alt="Gulf Consultant logo"
              className="h-11 w-11 rounded-2xl border border-slate-200 bg-white object-contain p-1"
            />
            <div>
              <p className="text-base font-bold tracking-tight text-[var(--gc-blue)]">Gulf Consultant</p>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Your Travel Partner</p>
            </div>
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition hover:text-[var(--gc-blue)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:block">
            <Link
              to={applyRoute}
              className={`${buttonBaseClass} bg-[var(--gc-blue)] text-white shadow-[0_16px_35px_-20px_rgba(0,87,183,0.9)] hover:bg-[var(--gc-blue-dark)] focus-visible:ring-[var(--gc-blue)]`}
            >
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-[var(--gc-blue)] hover:text-[var(--gc-blue)] lg:hidden"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className="text-sm font-semibold text-slate-700"
                >
                  {item.label}
                </a>
              ))}
              <Link
                to={applyRoute}
                onClick={closeMobileMenu}
                className={`${buttonBaseClass} bg-[var(--gc-blue)] text-white focus-visible:ring-[var(--gc-blue)]`}
              >
                Apply Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(0,87,183,0.12),_transparent_30%)]" />
          <div className="mx-auto grid max-w-7xl gap-14 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-8">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gc-cyan-strong)]">
                <Plane className="h-4 w-4" />
                Digital Gulf Applications
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Start Your Gulf Job Application Online
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Apply for trusted job opportunities in Qatar, Dubai, and other Gulf countries through Gulf Consultant,
                your reliable travel partner in Nansana.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  to={applyRoute}
                  className={`${buttonBaseClass} bg-[var(--gc-blue)] text-white shadow-[0_20px_40px_-24px_rgba(0,87,183,0.95)] hover:bg-[var(--gc-blue-dark)] focus-visible:ring-[var(--gc-blue)]`}
                >
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={ugPhoneHref}
                  className={`${buttonBaseClass} border border-slate-300 bg-white text-slate-800 hover:border-[var(--gc-cyan-strong)] hover:text-[var(--gc-blue)] focus-visible:ring-[var(--gc-cyan-strong)]`}
                >
                  <Phone className="h-4 w-4" />
                  Call Us
                </a>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className={`${buttonBaseClass} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 focus-visible:ring-emerald-300`}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Us
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {trustBadges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.55)] ring-1 ring-slate-200"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-x-10 -top-10 h-36 rounded-full bg-cyan-300/35 blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(145deg,_#032a55,_#0057b7_58%,_#16b8dc)] p-6 text-white shadow-[0_34px_120px_-48px_rgba(0,57,122,0.95)] sm:p-8">
                <div className="absolute inset-0 bg-[linear-gradient(transparent_0,transparent_27px,rgba(255,255,255,0.08)_28px),linear-gradient(90deg,transparent_0,transparent_27px,rgba(255,255,255,0.08)_28px)] bg-[size:28px_28px] opacity-25" />
                <div className="relative space-y-5">
                  <div className="flex items-center justify-between rounded-[24px] bg-white/12 p-4 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-white p-2">
                        <img src="/gulf.png" alt="Gulf Consultant mark" className="h-10 w-10 object-contain" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-cyan-100">Trusted Gulf Consultant Support</p>
                        <p className="text-xs text-slate-200">Digital application help for clients in Uganda</p>
                      </div>
                    </div>
                    <div className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                      Open Now
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[26px] bg-white p-5 text-slate-900 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.9)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gc-cyan-strong)]">
                        Online Application
                      </p>
                      <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">From paper form to simple digital process</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Submit personal details, passport information, contacts, next of kin details, and job interest in one guided online flow.
                      </p>
                      <div className="mt-5 space-y-3">
                        {['Personal details', 'Passport and NIN', 'Contacts and next of kin'].map((item) => (
                          <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                            <CheckCircle className="h-5 w-5 text-[var(--gc-blue)]" />
                            <span className="text-sm font-medium text-slate-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[26px] bg-white/14 p-5 backdrop-blur">
                        <p className="text-sm font-semibold text-cyan-100">Popular destinations</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {['Qatar', 'Dubai', 'Gulf Jobs'].map((item) => (
                            <span key={item} className="rounded-full bg-white/18 px-3 py-2 text-xs font-semibold text-white">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[26px] bg-slate-950/28 p-5 backdrop-blur">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-cyan-100">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">Client-friendly support</p>
                            <p className="text-xs text-slate-200">Call, WhatsApp, or visit our office in Nansana.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Our Services"
            title="Professional support for every step of your travel and job process"
            description="We help clients move from interest to application with practical support, clear communication, and trusted office guidance."
            center
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.title} {...service} />
            ))}
          </div>
        </section>

        <section id="jobs" className="bg-[var(--gc-section-blue)] py-16 text-white sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Current Job Categories"
              title="Popular opportunities our clients ask about most"
              description="We support applications for a range of Gulf job categories based on current employer demand."
              theme="dark"
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {jobCategories.map((job) => (
                <JobCard key={job} title={job} />
              ))}
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/8 p-5 text-sm leading-7 text-slate-200 backdrop-blur">
              Available positions may change depending on employer demand. Contact our office for the latest updates.
            </div>

            <div className="mt-8">
              <Link
                to={applyRoute}
                className={`${buttonBaseClass} bg-white text-[var(--gc-blue)] hover:bg-cyan-50 focus-visible:ring-white`}
              >
                Start Application
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="How It Works"
            title="How the Application Process Works"
            description="The digital process is designed to stay simple, clear, and easy to follow on a mobile phone."
            center
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {processSteps.map((step, index) => (
              <div
                key={step}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.45)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gc-blue)] text-lg font-bold text-white">
                  {index + 1}
                </div>
                <p className="mt-5 text-lg font-semibold text-slate-950">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[linear-gradient(135deg,_#032a55,_#0057b7_58%,_#0ea5c6)] py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
            <div>
              <SectionHeading
                eyebrow="Why Choose Gulf Consultant?"
                title="A serious, supportive partner for clients preparing to travel"
                description="We focus on practical support, clear communication, and a process that feels approachable for first-time applicants."
                theme="dark"
              />

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-cyan-100">
                  Nansana Office
                </span>
                <span className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-cyan-100">
                  Mobile-friendly process
                </span>
                <span className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-cyan-100">
                  Direct client support
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {whyChooseUs.map((item) => (
                <WhyChooseCard key={item} text={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="overflow-hidden rounded-[36px] bg-[linear-gradient(120deg,_#0057b7,_#0ea5c6)] p-8 text-white shadow-[0_34px_110px_-50px_rgba(0,87,183,1)] sm:p-10 lg:p-14">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">Application Support</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Ready to begin your Gulf job application?
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg">
                  Fill in your application online or contact our team for guidance.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  to={applyRoute}
                  className={`${buttonBaseClass} bg-white text-[var(--gc-blue)] hover:bg-cyan-50 focus-visible:ring-white`}
                >
                  Apply Now
                </Link>
                <a
                  href={ugPhoneHref}
                  className={`${buttonBaseClass} border border-white/30 bg-white/8 text-white hover:bg-white/14 focus-visible:ring-white`}
                >
                  Call {ugPhoneDisplay}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="border-t border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
            <div>
              <SectionHeading
                eyebrow="Contact Gulf Consultant"
                title="Speak to our team or visit our office in Nansana"
                description="Use the contact details below if you want guidance before you apply or if you need help choosing the right job category."
              />

              <div className="mt-8 space-y-4">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start gap-4">
                    <MapPin className="mt-1 h-5 w-5 text-[var(--gc-blue)]" />
                    <div>
                      <p className="font-semibold text-slate-950">Location</p>
                      <p className="mt-1 text-sm text-slate-600">Nansana, Uganda</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start gap-4">
                    <Phone className="mt-1 h-5 w-5 text-[var(--gc-blue)]" />
                    <div>
                      <p className="font-semibold text-slate-950">Phone</p>
                      <div className="mt-1 space-y-1 text-sm text-slate-600">
                        <p>{ugPhoneDisplay}</p>
                        <p>Phone / WhatsApp: {qatarPhoneDisplay}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start gap-4">
                    <Mail className="mt-1 h-5 w-5 text-[var(--gc-blue)]" />
                    <div>
                      <p className="font-semibold text-slate-950">Email</p>
                      <p className="mt-1 text-sm text-slate-600">gulfconsultant@gmail.com</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href={ugPhoneHref}
                  className={`${buttonBaseClass} bg-[var(--gc-blue)] text-white hover:bg-[var(--gc-blue-dark)] focus-visible:ring-[var(--gc-blue)]`}
                >
                  Call Now
                </a>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className={`${buttonBaseClass} border border-slate-300 bg-white text-slate-800 hover:border-[var(--gc-cyan-strong)] hover:text-[var(--gc-blue)] focus-visible:ring-[var(--gc-cyan-strong)]`}
                >
                  WhatsApp Us
                </a>
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  className={`${buttonBaseClass} border border-slate-300 bg-white text-slate-800 hover:border-[var(--gc-cyan-strong)] hover:text-[var(--gc-blue)] focus-visible:ring-[var(--gc-cyan-strong)]`}
                >
                  Get Directions
                </a>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.45)] sm:p-8">
              <h3 className="text-2xl font-bold tracking-tight text-slate-950">Send us a message</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Tell us the job you are interested in and our team will know how to guide you.
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleContactSubmit}>
                <div>
                  <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-slate-700">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formState.fullName}
                    onChange={handleContactChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--gc-cyan-strong)] focus:ring-2 focus:ring-cyan-100"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="mb-2 block text-sm font-semibold text-slate-700">
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    required
                    value={formState.phoneNumber}
                    onChange={handleContactChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--gc-cyan-strong)] focus:ring-2 focus:ring-cyan-100"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label htmlFor="interestedJob" className="mb-2 block text-sm font-semibold text-slate-700">
                    Interested Job
                  </label>
                  <select
                    id="interestedJob"
                    name="interestedJob"
                    value={formState.interestedJob}
                    onChange={handleContactChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--gc-cyan-strong)] focus:ring-2 focus:ring-cyan-100"
                  >
                    <option value="">Select a job category</option>
                    {jobCategories.map((job) => (
                      <option key={job} value={job}>
                        {job}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="mb-2 block text-sm font-semibold text-slate-700">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    value={formState.message}
                    onChange={handleContactChange}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--gc-cyan-strong)] focus:ring-2 focus:ring-cyan-100"
                    placeholder="Tell us how we can help you."
                  />
                </div>

                <button
                  type="submit"
                  className={`${buttonBaseClass} w-full bg-[var(--gc-blue)] text-white hover:bg-[var(--gc-blue-dark)] focus-visible:ring-[var(--gc-blue)]`}
                >
                  Submit Message
                  <Send className="h-4 w-4" />
                </button>

                {formSubmitted && (
                  <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Your email app should open with your message details. If it does not, call or WhatsApp our office directly.
                  </p>
                )}
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 py-12 text-slate-200">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.8fr_0.8fr_1fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <img src="/gulf.png" alt="Gulf Consultant logo" className="h-12 w-12 rounded-2xl bg-white p-1" />
              <div>
                <p className="text-lg font-bold text-white">Gulf Consultant</p>
                <p className="text-sm text-cyan-200">Your Travel Partner</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Professional support for Gulf job applications, visa guidance, and travel arrangements from our office in Nansana.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">Quick Links</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              {navItems.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="transition hover:text-white">
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <Link to={applyRoute} className="transition hover:text-white">
                  Apply Now
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">Services</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              {quickServices.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">Contact</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li>Nansana, Uganda</li>
              <li>
                <a href={ugPhoneHref} className="transition hover:text-white">
                  {ugPhoneDisplay}
                </a>
              </li>
              <li>
                <a href={qatarPhoneHref} className="transition hover:text-white">
                  {qatarPhoneDisplay}
                </a>
              </li>
              <li>
                <a href="mailto:gulfconsultant@gmail.com" className="transition hover:text-white">
                  gulfconsultant@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-4 pt-6 text-sm text-slate-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Gulf Consultant. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
