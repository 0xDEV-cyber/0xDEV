import React from 'react';
import { motion } from 'motion/react';
import { Compass, MapPin, Phone, Shield, Target, Users } from 'lucide-react';
import { COMPANY_CONTACT, PageRoute, TEAM_MEMBERS } from '../data/siteData';
import { EASE_OUT_EXPO, Reveal, StaggerGrid, StaggerItem } from './MotionPrimitives';
import { PageHeader } from './PageHeader';
import { SharedCtaBanner } from './SharedCtaBanner';

interface AboutPageProps {
  onNavigate: (page: PageRoute) => void;
}

const CORE_VALUES = [
  {
    icon: Target,
    title: 'Radical Ownership',
    description: 'One team owns design, code, cloud, and uptime—never passing blame across contracts.',
  },
  {
    icon: Compass,
    title: 'Architectural Clarity',
    description: 'We engineer clean, modular systems your internal staff can read, test, and grow.',
  },
  {
    icon: Shield,
    title: 'Security by Default',
    description: 'Threat modeling, least-privilege IAM, and encrypted pipelines start on sprint one.',
  },
  {
    icon: Users,
    title: 'Partnership Over Tickets',
    description: 'Direct access to senior engineers and designers who understand your business model.',
  },
];

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <>
      <PageHeader
        eyebrow="About 0xDEV"
        title="Rooted in Kabale, Uganda. Engineering for teams everywhere."
        description="Founded to end fragmented software delivery, 0xDEV brings design, full-stack engineering, cloud infrastructure, and 24/7 maintenance together under one accountable roof."
        currentLabel="About"
        onNavigate={onNavigate}
      />

      {/* Studio Story, Mission & Vision */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">
            <Reveal direction="right" distance={18} className="lg:col-span-5">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A1464]">
                Physical studio in Kabale. Ready for freelance &amp; global contracts.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#4A4F63]">
                Led by Founder &amp; Principal Architect{' '}
                <strong className="text-[#1A1464]">{COMPANY_CONTACT.leadName}</strong>, our team
                operates from{' '}
                <strong className="text-[#1A1464]">{COMPANY_CONTACT.location}</strong> while
                collaborating with founders, NGOs, and enterprises worldwide on both full-lifecycle
                platforms and focused freelance engagements.
              </p>
              <div className="mt-6 space-y-3 rounded-2xl border border-[#E5E7F0] bg-[#F6F7FB] p-5 text-sm">
                <div className="flex items-center gap-3 text-[#1A1464] font-semibold">
                  <MapPin className="h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                  <span>{COMPANY_CONTACT.location}</span>
                </div>
                <div className="flex items-center gap-3 text-[#1A1464] font-semibold">
                  <Phone className="h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                  <a href={`tel:${COMPANY_CONTACT.phoneRaw}`} className="hover:text-[#EE1119]">
                    {COMPANY_CONTACT.phoneDisplay}
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal direction="left" distance={18} delay={0.08} className="lg:col-span-7 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E5E7F0] bg-[#F6F7FB] p-6 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                  Our Mission
                </p>
                <p className="mt-3 font-display text-lg font-bold text-[#1A1464] leading-snug">
                  Give ambitious organizations one accountable engineering partner for every layer
                  of their stack.
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-[#4A4F63]">
                  From initial UX discovery through 24/7 cloud operations, we align software craft
                  with measurable business reliability.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5E7F0] bg-[#F6F7FB] p-6 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1A1464]">
                  Our Vision
                </p>
                <p className="mt-3 font-display text-lg font-bold text-[#1A1464] leading-snug">
                  Prove that world-class software and cloud engineering from Western Uganda sets
                  the benchmark for reliability.
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-[#4A4F63]">
                  Clean architecture, transparent communication, and long-term ownership—without
                  the bureaucracy of five separate agencies.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Core Values */}
          <StaggerGrid className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CORE_VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <StaggerItem key={value.title} className="h-full">
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                    className="h-full rounded-2xl border border-[#E5E7F0] bg-white p-6"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6F7FB] text-[#1A1464]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 font-display text-base font-bold text-[#1A1464]">
                      {value.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#4A4F63]">
                      {value.description}
                    </p>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      {/* Leadership & Team */}
      <section className="bg-[#F6F7FB] py-16 sm:py-20 border-t border-[#E5E7F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
              Leadership &amp; Practice Leads
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-[#1A1464]">
              Real people accountable for every commit.
            </h2>
          </Reveal>

          <StaggerGrid className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM_MEMBERS.map((member, index) => (
              <StaggerItem key={member.id} className="h-full">
                <motion.article
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                  className="h-full rounded-2xl border border-[#E5E7F0] bg-white p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#1A1464] font-display text-lg font-extrabold text-white"
                      aria-label={`${member.name} monogram`}
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
                      <h3 className="font-display text-base font-bold text-[#1A1464] truncate">
                        {member.name}
                      </h3>
                      <p className="text-xs font-semibold text-[#EE1119] truncate">
                        {member.location}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs font-bold text-[#1A1464]">{member.role}</p>
                  <p className="mt-1 text-xs font-medium text-[#6B7188]">{member.specialty}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[#4A4F63]">{member.bio}</p>
                </motion.article>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      <SharedCtaBanner onNavigate={onNavigate} />
    </>
  );
};
