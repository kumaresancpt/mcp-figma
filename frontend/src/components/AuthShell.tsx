import type { ReactNode } from 'react';

const heroImageUrl =
  'https://www.figma.com/api/mcp/asset/da0fc139-61de-4259-946b-9d199739779b';
const figmaLogoIcon =
  'https://www.figma.com/api/mcp/asset/0f7ac10e-4c34-44d2-a8c1-ddabce7bda50';
const figmaCptLogo =
  'https://www.figma.com/api/mcp/asset/b65305a4-f07b-417a-9ada-c011a0fc2a8f';

function BrandMark() {
  return (
    <div className="flex items-center gap-3" aria-label="Visitor by Changepond">
      <img src={figmaLogoIcon} alt="" className="h-[67px] w-[56px] object-contain" aria-hidden="true" />
      <div>
        <div className="text-[2rem] font-black uppercase leading-none tracking-tight text-violet-700">
          Visitor
        </div>
        <div className="flex items-end gap-2 text-[0.72rem] leading-none text-slate-900">
          <span>Powered by</span>
          <img src={figmaCptLogo} alt="Changepond" className="h-[18px] object-contain" />
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