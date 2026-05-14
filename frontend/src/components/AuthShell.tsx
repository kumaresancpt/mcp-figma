import type { ReactNode } from 'react';

const heroImageUrl =
  'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80';

function BrandMark() {
  return (
    <div className="flex items-center gap-3" aria-label="Visitor by Changepond">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-sm ring-1 ring-violet-200">
        <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" aria-hidden="true">
          <path d="M24 4 38 10v12c0 8.6-5.6 16.4-14 19-8.4-2.6-14-10.4-14-19V10L24 4Z" fill="currentColor" opacity=".16" />
          <path d="M24 7.5 35 12v9.8c0 6.7-4.2 12.8-11 15-6.8-2.2-11-8.3-11-15V12l11-4.5Z" stroke="currentColor" strokeWidth="2.5" />
          <path d="M24 15v13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M18 21h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M31.5 30.5 38 37" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="39.5" cy="38.5" r="4" fill="currentColor" />
        </svg>
      </div>
      <div>
        <div className="text-[2rem] font-black uppercase leading-none tracking-tight text-violet-700">
          Visitor
        </div>
        <div className="flex items-end gap-1 text-[0.72rem] leading-none text-slate-900">
          <span>Powered by</span>
          <span className="text-[1rem] font-semibold uppercase tracking-[0.2em] text-slate-700">
            Changepond
          </span>
        </div>
      </div>
    </div>
  );
}

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerAction?: ReactNode;
}

export default function AuthShell({ title, subtitle, children, footerAction }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f3ee] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col overflow-hidden lg:flex-row">
        <section className="relative hidden min-h-[420px] flex-1 lg:block">
          <img
            src={heroImageUrl}
            alt="Visitors arriving at a residential entrance"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2d1b0d]/20 via-transparent to-transparent" />
        </section>

        <section className="flex w-full items-center justify-center bg-white px-6 py-8 sm:px-10 lg:w-[596px] lg:rounded-l-[56px] lg:px-14 lg:py-12">
          <div className="flex w-full max-w-[400px] flex-col justify-between gap-10 lg:min-h-[760px] lg:py-8">
            <BrandMark />

            <div className="flex flex-1 items-center justify-center">
              <div className="w-full">
                <div className="mb-8 text-center">
                  <h1 className="text-[2.0625rem] font-semibold tracking-[0.01em] text-violet-700">
                    {title}
                  </h1>
                  <p className="mt-1 text-xl text-slate-600">{subtitle}</p>
                </div>

                {children}

                {footerAction && <div className="mt-6 text-center">{footerAction}</div>}
              </div>
            </div>

            <p className="text-center text-sm text-slate-700">
              Copyright 2026 Changepond. All Rights Reserved.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}