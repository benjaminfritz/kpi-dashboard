import React, { useEffect, useState } from 'react';
import { fetchDashboardData, fetchFigmaConfigStatus } from './services/api';
import { DashboardData, FigmaConfigStatus } from './types';
import { KpiCard } from './components/KpiCard';
import { ProgressBar } from './components/ProgressBar';
import { Layout, Moon, Sun } from 'lucide-react';

type Pillar = 'design' | 'code' | 'content';
const MONO_ICON_STROKE_WIDTH = 1;

const FigmaMonochromeIcon: React.FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="4 2 12 18"
    fill="none"
    stroke="currentColor"
    strokeWidth={MONO_ICON_STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H10v5H7.5A2.5 2.5 0 0 1 5 5.5z" />
    <path d="M10 3h2.5a2.5 2.5 0 1 1 0 5H10V3z" />
    <path d="M10 8h2.5a2.5 2.5 0 1 1 0 5H10V8z" />
    <path d="M5 10.5A2.5 2.5 0 0 1 7.5 8H10v5H7.5A2.5 2.5 0 0 1 5 10.5z" />
    <path d="M5 15.5A2.5 2.5 0 0 1 7.5 13H10v2.5A2.5 2.5 0 1 1 5 15.5z" />
  </svg>
);

const ReactMonochromeIcon: React.FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={MONO_ICON_STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <ellipse cx="12" cy="12" rx="10" ry="4.25" />
    <ellipse cx="12" cy="12" rx="10" ry="4.25" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4.25" transform="rotate(120 12 12)" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
  </svg>
);

const ContentfulMonochromeIcon: React.FC = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M21.875 16.361c-.043-.048-1.067-1.18-2.365-1.19-.68 0-1.288.283-1.815.858-.773.842-2.35 1.85-4.25 1.921-1.598.059-3.085-.548-4.423-1.805-1.644-1.544-2.155-4.016-1.302-6.297.834-2.23 2.752-3.616 5.131-3.707l.044-.004c.024-.003 2.302-.258 4.325 1.548.17.185 1.154 1.197 2.475 1.228.823.018 1.586-.336 2.27-1.055.602-.632.87-1.342.797-2.112-.154-1.61-1.806-2.876-2.03-3.04-.212-.184-1.878-1.578-4.476-2.294-2.52-.695-6.42-.853-10.685 2.349a7.31 7.31 0 0 0-.557.49c-.28.208-.523.462-.716.753a12.469 12.469 0 0 0-3.064 8.677c.207 6.283 5.265 9.293 5.646 9.51.262.17 2.906 1.81 6.495 1.809 2.106 0 4.538-.565 7.005-2.322.248-.138 1.714-1.012 2.103-2.52.23-.894.042-1.815-.562-2.737l-.046-.06zm-16.932 1.97c0-1.09.887-1.977 1.977-1.977s1.977.886 1.977 1.977c0 1.09-.887 1.977-1.977 1.977s-1.977-.887-1.977-1.977zm.139-13.657c.236-.275.451-.498.628-.67a1.965 1.965 0 0 1 1.088-.329c1.09 0 1.977.887 1.977 1.977S7.888 7.63 6.798 7.63s-1.977-.887-1.977-1.977c0-.356.096-.69.261-.978zM13.249.999c3.954 0 6.657 2.336 6.826 2.486l.043.034c.42.3 1.532 1.301 1.63 2.324.044.469-.126.898-.52 1.313-.477.5-.983.752-1.504.738-.964-.019-1.743-.887-1.76-.905l-.042-.044c-2.292-2.063-4.83-1.855-5.13-1.822a6.82 6.82 0 0 0-3.012.818 3 3 0 0 0-2.34-3.214C9.543 1.45 11.516.999 13.248.999zM3.884 6.34a3 3 0 0 0 2.914 2.31c.122 0 .24-.01.358-.024a7.336 7.336 0 0 0-.39.866c-.75 2.003-.59 4.14.359 5.854-.068-.005-.136-.01-.205-.01a2.999 2.999 0 0 0-2.967 2.6 10.075 10.075 0 0 1-1.7-5.288 11.43 11.43 0 0 1 1.63-6.309zM21.497 18.9c-.3 1.174-1.615 1.89-1.627 1.896l-.058.036c-6.287 4.499-12.137.667-12.382.502l-.036-.022a2.848 2.848 0 0 1-.034-.02 2.998 2.998 0 0 0 2.543-3.228c1.124.64 2.336.951 3.58.906 2.214-.083 4.057-1.264 4.962-2.25.327-.356.67-.53 1.048-.53h.005c.762.004 1.46.688 1.593.826.421.658.558 1.291.406 1.884z" />
    </svg>
  );
};

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [figmaStatus, setFigmaStatus] = useState<FigmaConfigStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePillars, setActivePillars] = useState<Pillar[]>(['design', 'code', 'content']);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    window.localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [result, configStatus] = await Promise.all([
          fetchDashboardData(),
          fetchFigmaConfigStatus().catch((configError) => {
            console.warn("Unable to load Figma config status", configError);
            return null;
          }),
        ]);
        if (isMounted) {
          setData(result);
          setFigmaStatus(configStatus);
          setError(null);
        }
      } catch (error) {
        console.error("Error while loading dashboard data", error);
        if (isMounted) {
          setError("Unable to load dashboard data. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const themeToggleButton = (
    <button
      type="button"
      onClick={() => setDarkMode((current) => !current)}
      className="fixed right-spacing-24 top-spacing-24 z-50 inline-flex items-center rounded-tokenFull border border-semantic-borderSubtle bg-semantic-backgroundNeutral p-spacing-8 text-semantic-textNeutral shadow-tokenShadow28 backdrop-blur transition hover:bg-neutral-5 dark:border-neutral-50/70 dark:bg-neutral-85 dark:text-neutral-5 dark:hover:bg-neutral-95"
      aria-label="Toggle dark mode"
    >
      {darkMode ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-semantic-backgroundSubtle dark:bg-neutral-95">
      {themeToggleButton}
      <div className="animate-pulse flex flex-col items-center gap-spacing-16 rounded-md border border-semantic-borderSubtle bg-semantic-backgroundNeutral p-spacing-24 shadow-tokenShadow28 dark:border-neutral-50/70 dark:bg-neutral-85">
        <img
          src="https://www.vodafone.de/media/img/icons/mid-render/New_VF_Icon_RGB_RED.svg"
          alt=""
          aria-hidden="true"
          className="h-spacing-40 w-spacing-40 object-contain"
        />
        <div className="font-vodafone text-body-md text-neutral-60 dark:text-neutral-25">Loading brix/react Dashboard...</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex h-screen w-full items-center justify-center bg-semantic-backgroundSubtle px-spacing-24 dark:bg-neutral-95">
      {themeToggleButton}
      <div className="max-w-md rounded-md border border-brand-red bg-brand-redTint/10 p-spacing-20 text-brand-red shadow-tokenShadow28 dark:bg-brand-redTint/20 dark:text-neutral-5">
        {error}
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex h-screen w-full items-center justify-center bg-semantic-backgroundSubtle px-spacing-24 text-semantic-textNeutral dark:bg-neutral-95 dark:text-neutral-5">
      {themeToggleButton}
      <div>Unfortunately there is no data available at the moment.</div>
    </div>
  );

  const maxComponentUsage = Math.max(...data.github.componentUsageCount.map((comp) => comp.count), 1);
  const maxFigmaComponentUsage = Math.max(...(data.figma?.topComponentUsage.map((item) => item.usages) ?? [1]), 1);
  const maxFigmaTeamUsage = Math.max(...(data.figma?.topLibraryConsumingTeams.map((item) => item.usages) ?? [1]), 1);
  const figmaInsertions = data.figma?.componentInsertionsLast30Days ?? 0;
  const figmaDetachments = data.figma?.componentDetachmentsLast30Days ?? 0;
  const figmaAdoptionTotal = figmaInsertions + figmaDetachments;
  const figmaInsertionsPercentage = figmaAdoptionTotal > 0
    ? Math.round((figmaInsertions / figmaAdoptionTotal) * 100)
    : 0;
  const figmaDetachmentsPercentage = figmaAdoptionTotal > 0
    ? 100 - figmaInsertionsPercentage
    : 0;
  const maxContentTypeEntries = Math.max(...data.contentful.contentTypeDistribution.map((item) => item.entries), 1);
  const pillarOrder: Pillar[] = ['design', 'code', 'content'];
  const areAllPillarsVisible = activePillars.length === 0;
  const isFiltered = !areAllPillarsVisible && activePillars.length < pillarOrder.length;
  const isPillarActive = (pillar: Pillar) => areAllPillarsVisible || activePillars.includes(pillar);
  const sectionTitleClass = 'mb-spacing-8 text-xs font-bold uppercase tracking-wider text-neutral-60 dark:text-neutral-25';

  const figmaStatusLabel = figmaStatus?.ready
    ? 'Figma: Ready'
    : figmaStatus?.configured === false
      ? 'Figma: Not Configured'
      : figmaStatus?.configured === true
        ? 'Figma: Access Error'
        : 'Figma: Status Unknown';

  const figmaStatusClassName = figmaStatus?.ready
    ? 'border-secondary-springGreen/40 bg-secondary-springGreen/10 text-secondary-springGreen dark:border-secondary-springGreen/50 dark:bg-secondary-springGreen/20'
    : 'border-brand-redTint/40 bg-brand-redTint/10 text-brand-red dark:border-brand-redTint/60 dark:bg-brand-redTint/20 dark:text-neutral-5';
  const unavailableStatusClassName = 'border-brand-redTint/40 bg-brand-redTint/10 text-brand-red dark:border-brand-redTint/60 dark:bg-brand-redTint/20 dark:text-neutral-5';
  const githubStatusLabel = 'GitHub: Not Connected';
  const contentfulStatusLabel = 'Contentful: Not Connected';

  const togglePillar = (pillar: Pillar) => {
    setActivePillars((current) => {
      if (current.includes(pillar)) {
        if (current.length === 1) return current;
        return current.filter((entry) => entry !== pillar);
      }
      return pillarOrder.filter((entry) => current.includes(entry) || entry === pillar);
    });
  };

  return (
    <div className="min-h-screen bg-semantic-backgroundSubtle p-spacing-24 text-semantic-textNeutral dark:bg-neutral-95 dark:text-neutral-5 md:p-spacing-40">
      {themeToggleButton}
      <div className="mx-auto max-w-7xl">
        <header className="mb-spacing-40 flex flex-col gap-spacing-16 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-spacing-4 flex items-center gap-spacing-8 text-brand-vodafone">
              <Layout size={20} />
              <span className="font-vodafone text-xs font-light uppercase tracking-wider">brix/react Dashboard</span>
            </div>
            <h1 className="font-vodafone text-heading-md font-light tracking-tight">Design System Metrics</h1>
            <p className="mt-spacing-8 text-body-md text-neutral-60 dark:text-neutral-25">Real-time Metrics from Figma, Github and Contentful.</p>
          </div>
          <div className="flex flex-col items-start gap-spacing-8 md:items-end">
            <div className="flex flex-wrap items-center gap-spacing-8 md:justify-end">
              <div className={`rounded-tokenFull border px-spacing-12 py-spacing-4 text-[11px] font-semibold uppercase tracking-wide ${figmaStatusClassName}`}>
                {figmaStatusLabel}
              </div>
              <div className={`rounded-tokenFull border px-spacing-12 py-spacing-4 text-[11px] font-semibold uppercase tracking-wide ${unavailableStatusClassName}`}>
                {githubStatusLabel}
              </div>
              <div className={`rounded-tokenFull border px-spacing-12 py-spacing-4 text-[11px] font-semibold uppercase tracking-wide ${unavailableStatusClassName}`}>
                {contentfulStatusLabel}
              </div>
            </div>
            <div className="rounded-sm border border-semantic-borderSubtle bg-semantic-backgroundNeutral px-spacing-12 py-spacing-8 text-xs font-mono text-neutral-60 dark:border-neutral-50/70 dark:bg-neutral-85 dark:text-neutral-25">
              Last update: {data.lastUpdated}
            </div>
          </div>
        </header>

        <div className="mb-spacing-32 flex flex-wrap items-center gap-spacing-8">
          <span className="text-sm font-medium text-neutral-60 dark:text-neutral-25">Filter View by</span>
          <button
            type="button"
            onClick={() => togglePillar('design')}
            className={`rounded-tokenFull border px-spacing-16 py-spacing-8 text-sm font-semibold transition ${
              isPillarActive('design')
                ? 'border-brand-vodafone bg-brand-vodafone text-neutral-white dark:border-brand-redTint dark:bg-brand-redTint dark:text-neutral-95'
                : 'border-semantic-borderSubtle bg-semantic-backgroundNeutral text-neutral-60 dark:border-neutral-50/70 dark:bg-neutral-85 dark:text-neutral-25'
            }`}
          >
            Design
          </button>
          <button
            type="button"
            onClick={() => togglePillar('code')}
            className={`rounded-tokenFull border px-spacing-16 py-spacing-8 text-sm font-semibold transition ${
              isPillarActive('code')
                ? 'border-neutral-95 bg-neutral-95 text-neutral-white dark:border-neutral-25 dark:bg-neutral-25 dark:text-neutral-95'
                : 'border-semantic-borderSubtle bg-semantic-backgroundNeutral text-neutral-60 dark:border-neutral-50/70 dark:bg-neutral-85 dark:text-neutral-25'
            }`}
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => togglePillar('content')}
            className={`rounded-tokenFull border px-spacing-16 py-spacing-8 text-sm font-semibold transition ${
              isPillarActive('content')
                ? 'border-secondary-aquaBlue bg-secondary-aquaBlue text-neutral-white dark:border-secondary-blue dark:bg-secondary-blue dark:text-neutral-white'
                : 'border-semantic-borderSubtle bg-semantic-backgroundNeutral text-neutral-60 dark:border-neutral-50/70 dark:bg-neutral-85 dark:text-neutral-25'
            }`}
          >
            Content
          </button>
          {isFiltered && (
            <button
              type="button"
              onClick={() => setActivePillars(pillarOrder)}
              className="rounded-tokenFull border border-semantic-borderSubtle bg-semantic-backgroundNeutral px-spacing-16 py-spacing-8 text-sm font-semibold text-semantic-textNeutral transition hover:bg-neutral-5 dark:border-neutral-50/70 dark:bg-neutral-85 dark:text-neutral-5 dark:hover:bg-neutral-95"
            >
              Show All
            </button>
          )}
        </div>

        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 items-start gap-spacing-32 md:grid-cols-2 lg:grid-cols-3">
          
          {/* 1. FIGMA */}
          {isPillarActive('design') && (
          <KpiCard title="Design" icon={<FigmaMonochromeIcon />} hideOutline>
             {data.figma ? (
               <>
                 <h4 className={sectionTitleClass}>Library Footprint</h4>
                 <div className="overflow-hidden rounded-sm border border-semantic-borderSubtle dark:border-neutral-50/70">
                   <div className="bg-neutral-5 p-spacing-12 text-left dark:bg-neutral-95">
                     <div className="text-4xl font-light text-neutral-95 dark:text-neutral-5">
                       {data.figma.filesCount.toLocaleString()}
                     </div>
                     <div className="mt-spacing-4 text-[10px] font-bold uppercase tracking-wider text-semantic-textNeutral dark:text-neutral-25">
                       Figma Files Using brix/react Components
                     </div>
                   </div>
                   <div className="border-t border-brand-redTint/40 bg-brand-redTint/10 p-spacing-12 text-left dark:border-brand-redTint/50 dark:bg-brand-redTint/20">
                     <div className="text-4xl font-light text-brand-red dark:text-neutral-5">
                       {data.figma.totalComponentUsages.toLocaleString()}
                     </div>
                     <div className="mt-spacing-4 text-[10px] font-bold uppercase tracking-wider text-brand-red dark:text-neutral-5">
                       Total Component Usages
                     </div>
                   </div>
                   <div className="border-t border-secondary-aquaBlue/30 bg-secondary-aquaBlue/10 p-spacing-12 text-left dark:border-secondary-aquaBlue/40 dark:bg-secondary-aquaBlue/20">
                     <div className="text-4xl font-light text-secondary-turquoise dark:text-secondary-aquaBlue">
                       {data.figma.teamsUsingLibrary.toLocaleString()}
                     </div>
                     <div className="mt-spacing-4 text-[10px] font-bold uppercase tracking-wider text-secondary-aquaBlue dark:text-neutral-5">
                       Teams Using This Library
                     </div>
                   </div>
                 </div>
                 <div className="my-spacing-16 h-px bg-semantic-borderSubtle/50 dark:bg-neutral-50/50"></div>
                 <h4 className={sectionTitleClass}>Adoption Health</h4>
                 <div className="space-y-spacing-8">
                   <div className="flex justify-between text-xs font-medium">
                     <span className="text-neutral-60 dark:text-neutral-25">Adoption Health (Insertions vs Detachments)</span>
                     <span className="font-light text-semantic-textNeutral dark:text-neutral-5">{figmaInsertionsPercentage}% Insertions</span>
                   </div>
                   <div className="h-spacing-8 w-full overflow-hidden rounded-tokenFull bg-neutral-25 dark:bg-neutral-85">
                     <div className="flex h-full w-full">
                       <div
                         className="h-full bg-brand-vodafone transition-all duration-1000 ease-out dark:bg-brand-redTint"
                         style={{ width: `${figmaInsertionsPercentage}%` }}
                       />
                       <div
                         className="h-full bg-secondary-aquaBlue transition-all duration-1000 ease-out dark:bg-secondary-aquaBlueTint"
                         style={{ width: `${figmaDetachmentsPercentage}%` }}
                       />
                     </div>
                   </div>
                   <div className="flex flex-wrap items-center justify-between gap-spacing-8 text-[11px] font-medium">
                     <span className="text-brand-vodafone dark:text-brand-redTint">
                       Insertions: {figmaInsertions.toLocaleString()} ({figmaInsertionsPercentage}%)
                     </span>
                     <span className="text-secondary-aquaBlue dark:text-secondary-aquaBlueTint">
                       Detachments: {figmaDetachments.toLocaleString()} ({figmaDetachmentsPercentage}%)
                     </span>
                   </div>
                 </div>
                 <h4 className={sectionTitleClass}>Activity (30d)</h4>
                 <div className="grid grid-cols-2 gap-spacing-12">
                   <div className="rounded-sm border border-brand-redTint/30 bg-brand-redTint/10 p-spacing-12 dark:bg-brand-redTint/20">
                     <div className="text-xs uppercase tracking-wide text-brand-red dark:text-neutral-5">Insertions (30d)</div>
                     <div className="mt-spacing-4 text-xl font-light text-brand-vodafone dark:text-brand-redTint">{data.figma.componentInsertionsLast30Days.toLocaleString()}</div>
                   </div>
                   <div className="rounded-sm border border-secondary-aquaBlue/30 bg-secondary-aquaBlue/10 p-spacing-12 dark:bg-secondary-aquaBlue/20">
                     <div className="text-xs uppercase tracking-wide text-secondary-aquaBlue dark:text-neutral-5">Detachments (30d)</div>
                     <div className="mt-spacing-4 text-xl font-light text-secondary-turquoise dark:text-secondary-aquaBlue">{data.figma.componentDetachmentsLast30Days.toLocaleString()}</div>
                   </div>
                 </div>
                 <div className="my-spacing-16 h-px bg-semantic-borderSubtle/50 dark:bg-neutral-50/50"></div>
                 <h4 className={sectionTitleClass}>Top library consuming teams</h4>
                 {data.figma.topLibraryConsumingTeams.length > 0 ? (
                   <ul className="space-y-spacing-12">
                     {data.figma.topLibraryConsumingTeams.map((item) => (
                       <li key={item.teamName}>
                         <ProgressBar
                           label={item.teamName}
                           value={item.usages}
                           max={maxFigmaTeamUsage}
                           color="bg-secondary-turquoise dark:bg-secondary-turquoiseTint"
                         />
                       </li>
                     ))}
                   </ul>
                 ) : (
                   <div className="text-xs text-neutral-60 dark:text-neutral-25">No team usage data available for the selected period.</div>
                 )}
                 <h4 className={`${sectionTitleClass} mt-spacing-4`}>Top Components by Usage</h4>
                 {data.figma.topComponentUsage.length > 0 ? (
                   <ul className="space-y-spacing-12">
                     {data.figma.topComponentUsage.map((item) => (
                       <li key={item.componentName}>
                         <ProgressBar
                           label={item.componentName}
                           value={item.usages}
                           max={maxFigmaComponentUsage}
                           color="bg-secondary-aquaBlue dark:bg-secondary-aquaBlueTint"
                         />
                       </li>
                     ))}
                   </ul>
                 ) : (
                   <div className="text-xs text-neutral-60 dark:text-neutral-25">No usage data available for the selected period.</div>
                 )}
               </>
             ) : (
               <div className="rounded-sm border border-semantic-borderSubtle bg-neutral-5 p-spacing-16 text-sm text-neutral-60 dark:border-neutral-50/70 dark:bg-neutral-95 dark:text-neutral-25">
                 <p className="mb-spacing-8 font-medium text-semantic-textNeutral dark:text-neutral-5">No live Figma analytics available.</p>
                 <p>Set `FIGMA_ACCESS_TOKEN` and `FIGMA_LIBRARY_FILE_KEY`, then verify `/api/figma-config-check`.</p>
                 {figmaStatus?.validation?.detail && (
                   <p className="mt-spacing-8 text-xs">Error: {figmaStatus.validation.detail}</p>
                 )}
               </div>
             )}
          </KpiCard>
          )}

          {/* 2. GITHUB / REACT COMPONENTS */}
          {isPillarActive('code') && (
          <KpiCard title="Code" icon={<ReactMonochromeIcon />} hideOutline>
            <div className="mb-spacing-24 flex items-center justify-between rounded-sm border border-semantic-borderSubtle bg-neutral-5 p-spacing-12 dark:border-neutral-50/70 dark:bg-neutral-95">
               <span className="text-sm font-medium text-neutral-60 dark:text-neutral-25">Open Pull Requests</span>
               <span className="rounded-tokenFull border border-secondary-springGreen/30 bg-secondary-springGreen/10 px-spacing-12 py-spacing-4 text-xs font-bold text-secondary-springGreen dark:border-secondary-springGreen/50 dark:bg-secondary-springGreen/20">
                 {data.github.openPRs} Active
               </span>
            </div>
            <div className="grid grid-cols-3 gap-spacing-12">
              <div className="rounded-sm border border-semantic-borderSubtle bg-neutral-5 p-spacing-12 dark:border-neutral-50/70 dark:bg-neutral-95">
                <div className="text-[10px] uppercase tracking-wide text-neutral-60 dark:text-neutral-25">Merged PRs (7d)</div>
                <div className="mt-spacing-4 text-lg font-light text-semantic-textNeutral dark:text-neutral-5">{data.github.mergedPRs7d}</div>
              </div>
              <div className="rounded-sm border border-semantic-borderSubtle bg-neutral-5 p-spacing-12 dark:border-neutral-50/70 dark:bg-neutral-95">
                <div className="text-[10px] uppercase tracking-wide text-neutral-60 dark:text-neutral-25">Avg Review</div>
                <div className="mt-spacing-4 text-lg font-light text-semantic-textNeutral dark:text-neutral-5">{data.github.avgReviewTimeHours}h</div>
              </div>
              <div className="rounded-sm border border-semantic-borderSubtle bg-neutral-5 p-spacing-12 dark:border-neutral-50/70 dark:bg-neutral-95">
                <div className="text-[10px] uppercase tracking-wide text-neutral-60 dark:text-neutral-25">Open Issues</div>
                <div className="mt-spacing-4 text-lg font-light text-semantic-textNeutral dark:text-neutral-5">{data.github.openIssues}</div>
              </div>
            </div>
            <ProgressBar
              label="Build Success Rate"
              value={data.github.buildSuccessRate}
              max={100}
              color="bg-secondary-springGreen dark:bg-secondary-springGreenTint"
            />
            <div className="text-xs text-neutral-60 dark:text-neutral-25">Commits (7d): {data.github.commitVolume7d}</div>
            
            <h4 className="mb-spacing-12 text-xs font-bold uppercase tracking-wider text-neutral-60 dark:text-neutral-25">Top Components in React</h4>
            <ul className="space-y-spacing-16">
              {data.github.componentUsageCount.map((comp) => (
                <li key={comp.componentName}>
                   <ProgressBar 
                     label={comp.componentName} 
                     value={comp.count} 
                     max={maxComponentUsage}
                     color="bg-neutral-95 dark:bg-neutral-5" 
                   />
                </li>
              ))}
            </ul>
          </KpiCard>
          )}

          {/* 3. CONTENTFUL */}
          {isPillarActive('content') && (
          <KpiCard title="Content" icon={<ContentfulMonochromeIcon />}>
            <div className="grid grid-cols-2 gap-spacing-16">
              <div className="rounded-sm border border-secondary-aquaBlue/30 bg-secondary-aquaBlue/10 p-spacing-12 text-center dark:bg-secondary-aquaBlue/20">
                <div className="text-2xl font-light text-secondary-blue dark:text-secondary-aquaBlue">{data.contentful.publishedEntries}</div>
                <div className="mt-spacing-4 text-[10px] font-bold uppercase tracking-wider text-secondary-aquaBlue dark:text-neutral-5">Published</div>
              </div>
              <div className="rounded-sm border border-secondary-freshOrange/30 bg-secondary-freshOrange/10 p-spacing-12 text-center dark:bg-secondary-freshOrange/20">
                <div className="text-2xl font-light text-secondary-freshOrange dark:text-secondary-freshOrange">{data.contentful.draftEntries}</div>
                <div className="mt-spacing-4 text-[10px] font-bold uppercase tracking-wider text-secondary-freshOrange dark:text-neutral-5">Drafts</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-spacing-12">
              <div className="rounded-sm border border-secondary-blue/30 bg-secondary-blue/10 p-spacing-12 dark:bg-secondary-blue/20">
                <div className="text-[10px] uppercase tracking-wide text-secondary-blue dark:text-neutral-5">Locales</div>
                <div className="mt-spacing-4 text-lg font-light text-secondary-blue dark:text-secondary-aquaBlue">{data.contentful.locales}</div>
              </div>
              <div className="rounded-sm border border-secondary-lemonYellow/40 bg-secondary-lemonYellow/20 p-spacing-12 dark:bg-secondary-lemonYellow/30">
                <div className="text-[10px] uppercase tracking-wide text-semantic-textNeutral dark:text-neutral-95">Scheduled</div>
                <div className="mt-spacing-4 text-lg font-light text-semantic-textNeutral dark:text-neutral-95">{data.contentful.scheduledEntries}</div>
              </div>
              <div className="rounded-sm border border-secondary-aquaBlue/30 bg-secondary-aquaBlue/10 p-spacing-12 dark:bg-secondary-aquaBlue/20">
                <div className="text-[10px] uppercase tracking-wide text-secondary-aquaBlue dark:text-neutral-5">Assets (24h)</div>
                <div className="mt-spacing-4 text-lg font-light text-secondary-aquaBlue dark:text-secondary-aquaBlue">{data.contentful.recentAssetUploads}</div>
              </div>
            </div>
            <ProgressBar 
               label="Total Enabled Components in Contentful" 
               value={data.contentful.totalEntries} 
               max={2000} 
               color="bg-secondary-blue dark:bg-secondary-blueTint" 
             />
            <ProgressBar
              label="Weekly Publish Rate"
              value={data.contentful.weeklyPublishRate}
              max={200}
              color="bg-secondary-aquaBlue dark:bg-secondary-aquaBlueTint"
            />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-60 dark:text-neutral-25">Content Type Distribution</h4>
            <ul className="space-y-spacing-12">
              {data.contentful.contentTypeDistribution.map((item) => (
                <li key={item.contentType}>
                  <ProgressBar
                    label={item.contentType}
                    value={item.entries}
                    max={maxContentTypeEntries}
                    color="bg-secondary-turquoise dark:bg-secondary-turquoiseTint"
                  />
                </li>
              ))}
            </ul>
          </KpiCard>
          )}

        </div>
        <footer className="mt-spacing-24 flex h-spacing-40 items-center justify-center text-s font-medium text-neutral-60 dark:text-neutral-25">
          Made with 💚 by Tetris
        </footer>
      </div>
    </div>
  );
};

export default App;
