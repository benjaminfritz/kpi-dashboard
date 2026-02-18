import React, { useEffect, useState } from 'react';
import { fetchDashboardData } from './services/api';
import { DashboardData } from './types';
import { KpiCard } from './components/KpiCard';
import { ProgressBar } from './components/ProgressBar';
import { Layout, FileImage, GitPullRequest, Database, Moon, Sun } from 'lucide-react';

type Pillar = 'design' | 'code' | 'content';

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
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
        const result = await fetchDashboardData();
        if (isMounted) {
          setData(result);
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
        <div className="h-spacing-40 w-spacing-40 rounded-tokenFull bg-brand-vodafone"></div>
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
  const maxContentTypeEntries = Math.max(...data.contentful.contentTypeDistribution.map((item) => item.entries), 1);
  const pillarOrder: Pillar[] = ['design', 'code', 'content'];
  const isFiltered = activePillars.length !== pillarOrder.length;

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
          <div className="rounded-sm border border-semantic-borderSubtle bg-semantic-backgroundNeutral px-spacing-12 py-spacing-8 text-xs font-mono text-neutral-60 dark:border-neutral-50/70 dark:bg-neutral-85 dark:text-neutral-25">
            Last update: {data.lastUpdated}
          </div>
        </header>

        <div className="mb-spacing-32 flex flex-wrap items-center gap-spacing-8">
          <span className="text-sm font-medium text-neutral-60 dark:text-neutral-25">Filter View by</span>
          <button
            type="button"
            onClick={() => togglePillar('design')}
            className={`rounded-tokenFull border px-spacing-16 py-spacing-8 text-sm font-semibold transition ${
              activePillars.includes('design')
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
              activePillars.includes('code')
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
              activePillars.includes('content')
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
        <div className="grid grid-cols-1 gap-spacing-32 md:grid-cols-2 lg:grid-cols-3">
          
          {/* 1. FIGMA */}
          {activePillars.includes('design') && (
          <KpiCard title="Design" icon={<FileImage size={24} />} hideOutline>
             <div className="mb-spacing-8 flex items-baseline justify-between">
               <span className="text-sm text-neutral-60 dark:text-neutral-25">Figma Files with Components in use</span>
               <span className="text-4xl font-light text-brand-vodafone">{data.figma.filesCount}</span>
             </div>
             <div className="my-spacing-16 h-px bg-semantic-borderSubtle/50 dark:bg-neutral-50/50"></div>
             <ProgressBar 
               label="Design System Coverage in %" 
               value={data.figma.designSystemUsage} 
               max={100} 
               color="bg-brand-vodafone dark:bg-brand-redTint" 
             />
             <div className="mt-spacing-24 flex items-center gap-spacing-8 rounded-sm border border-brand-redTint/40 bg-brand-redTint/10 p-spacing-12 text-xs text-brand-red dark:bg-brand-redTint/20 dark:text-neutral-5">
               <div className="h-spacing-8 w-spacing-8 animate-pulse rounded-tokenFull bg-brand-vodafone"></div>
               {data.figma.recentComments} Comments in Review
             </div>
             <div className="grid grid-cols-2 gap-spacing-12">
               <div className="rounded-sm border border-brand-redTint/30 bg-brand-redTint/10 p-spacing-12 dark:bg-brand-redTint/20">
                 <div className="text-xs uppercase tracking-wide text-brand-red dark:text-neutral-5">Published (30d)</div>
                 <div className="mt-spacing-4 text-xl font-light text-brand-vodafone dark:text-brand-redTint">{data.figma.componentsPublishedLast30Days}</div>
               </div>
               <div className="rounded-sm border border-secondary-aquaBlue/30 bg-secondary-aquaBlue/10 p-spacing-12 dark:bg-secondary-aquaBlue/20">
                 <div className="text-xs uppercase tracking-wide text-secondary-aquaBlue dark:text-neutral-5">Review Latency</div>
                 <div className="mt-spacing-4 text-xl font-light text-secondary-turquoise dark:text-secondary-aquaBlue">{data.figma.reviewLatencyHours}h</div>
               </div>
             </div>
             <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-60 dark:text-neutral-25">Library Adoption</h4>
             <ul className="space-y-spacing-12">
               {data.figma.libraryAdoption.map((item) => (
                 <li key={item.library}>
                   <ProgressBar label={item.library} value={item.adoption} max={100} color="bg-secondary-aquaBlue dark:bg-secondary-aquaBlueTint" />
                 </li>
               ))}
             </ul>
          </KpiCard>
          )}

          {/* 2. GITHUB / REACT COMPONENTS */}
          {activePillars.includes('code') && (
          <KpiCard title="Code" icon={<GitPullRequest size={24} />} hideOutline>
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
          {activePillars.includes('content') && (
          <KpiCard title="Content" icon={<Database size={24} />}>
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
      </div>
    </div>
  );
};

export default App;
