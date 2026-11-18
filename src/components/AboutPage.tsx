import React from 'react';
import { Compass, MapPin, Phone, Shield, Target, Users } from 'lucide-react';
import { COMPANY_CONTACT, PageRoute, TEAM_MEMBERS } from '../data/siteData';
import {
  InteractiveCard,
  Reveal,
  StaggerGrid,
  StaggerItem,
} from './MotionPrimitives';
import { PageHeader } from './PageHeader';
import { SharedCtaBanner } from './SharedCtaBanner';

interface AboutPageProps {
  onNavigate: (page: PageRoute) => void;
}

const CORE_VALUES = [
  {
    icon: Target,
    title: 'Clear Ownership',
    description: 'One studio handles design, code, cloud setup, and fixes without passing blame.',
  },
  {
    icon: Compass,
    title: 'Readable Code',
    description: 'We write clean, modular code that any future engineer on your team can pick up quickly.',
  },
  {
    icon: Shield,
    title: 'Security First',
    description: 'Strict access rules, encrypted storage, and automated checks start on week one.',
  },
  {
    icon: Users,
    title: 'Direct Access',
    description: 'Talk directly to the engineer writing your software instead of going through ticket layers.',
  },
];

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <>
      <PageHeader
        eyebrow="About 0xDEV"
        title="Based in Kabale, Uganda. Shipping software everywhere."
        description="We started 0xDEV to replace fragmented contractor handoffs with one engineering studio that owns design, software, cloud hosting, and support together."
        currentLabel="About"
        onNavigate={onNavigate}
      />

      {/* Studio Story, Mission & Vision */}
      <section className="bg-white dark:bg-[#090D1F] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">
            <Reveal direction="right" distance={20} className="lg:col-span-5">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC]">
                Physical studio in Kabale. Open for freelance &amp; remote builds.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                Led by Founder &amp; Principal Architect{' '}
                <strong className="text-[#1A1464] dark:text-white">{COMPANY_CONTACT.leadName}</strong>, our team
                works out of{' '}
                <strong className="text-[#1A1464] dark:text-white">{COMPANY_CONTACT.location}</strong> while
                building software for local businesses, NGOs, and remote founders around the world.
              </p>
              <div className="mt-6 space-y-3 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-5 text-sm">
                <div className="flex items-center gap-3 text-[#1A1464] dark:text-[#F4F6FC] font-semibold">
                  <MapPin className="h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                  <span>{COMPANY_CONTACT.location}</span>
                </div>
                <div className="flex items-center gap-3 text-[#1A1464] dark:text-[#F4F6FC] font-semibold">
                  <Phone className="h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                  <a href={`tel:${COMPANY_CONTACT.phoneRaw}`} className="hover:text-[#EE1119]">
                    {COMPANY_CONTACT.phoneDisplay}
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal direction="left" distance={20} delay={0.08} className="lg:col-span-7 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InteractiveCard hoverY={-4} className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-6 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                  Our Mission
                </p>
                <p className="mt-3 font-display text-lg font-bold text-[#1A1464] dark:text-[#F4F6FC] leading-snug">
                  Give teams one reliable partner for every layer of their software stack.
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                  From early wireframes through 24/7 cloud uptime, we keep engineering practical,
                  transparent, and steady.
                </p>
              </InteractiveCard>

              <InteractiveCard hoverY={-4} className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] p-6 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1A1464] dark:text-[#9AA5FF]">
                  Our Standard
                </p>
                <p className="mt-3 font-display text-lg font-bold text-[#1A1464] dark:text-[#F4F6FC] leading-snug">
                  Dependable software built in Western Uganda for teams anywhere.
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                  Clean architecture, honest estimates, and full code ownership without the overhead
                  of managing five vendors.
                </p>
              </InteractiveCard>
            </Reveal>
          </div>

          {/* Core Values */}
          <StaggerGrid staggerDelay={0.06} className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CORE_VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <StaggerItem key={value.title} className="h-full">
                  <InteractiveCard
                    hoverY={-5}
                    className="h-full rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 transition-shadow hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6F7FB] dark:bg-[#101530] text-[#1A1464] dark:text-[#F4F6FC]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 font-display text-base font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                      {value.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                      {value.description}
                    </p>
                  </InteractiveCard>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      {/* Studio Leadership & Practices (No Demo Personas) */}
      <section className="bg-[#F6F7FB] dark:bg-[#101530] py-16 sm:py-20 border-t border-[#E5E7F0] dark:border-[#242C54]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
              Studio Lead &amp; Engineering Practices
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
              How the Kabale studio is structured.
            </h2>
          </Reveal>

          <StaggerGrid staggerDelay={0.07} className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM_MEMBERS.map((member, index) => (
              <StaggerItem key={member.id} className="h-full">
                <InteractiveCard
                  hoverY={-5}
                  className="h-full rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#1A1464] dark:bg-[#232B6E] font-display text-sm font-extrabold text-white"
                      aria-label={`${member.name} badge`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute -bottom-2 -right-2 h-7 w-7 -skew-x-12 ${
                          index % 2 === 0 ? 'bg-[#EE1119]' : 'bg-[#282080]'
                        }`}
                      />
                      <span className="relative z-10">{member.initials}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-bold text-[#1A1464] dark:text-[#F4F6FC] truncate">
                        {member.name}
                      </h3>
                      <p className="text-xs font-semibold text-[#EE1119] truncate">
                        {member.location}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]">{member.role}</p>
                  <p className="mt-1 text-xs font-medium text-[#6B7188] dark:text-[#8E97B8]">{member.specialty}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">{member.bio}</p>
                </InteractiveCard>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      <SharedCtaBanner onNavigate={onNavigate} />
    </>
  );
};
