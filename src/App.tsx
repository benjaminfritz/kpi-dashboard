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
      className="fixed right-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-900"
      aria-label="Toggle dark mode"
    >
      {darkMode ? <Sun size={16} /> : <Moon size={16} />}
      <span>{darkMode ? 'Light' : 'Dark'}</span>
    </button>
  );

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-slate-950">
      {themeToggleButton}
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-blue-500 rounded-full mb-4"></div>
        <div className="text-gray-400 dark:text-slate-400 font-medium">Loading brix/react Dashboard...</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-slate-950 px-6">
      {themeToggleButton}
      <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 px-6">
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 font-sans text-slate-900 dark:text-slate-100">
      {themeToggleButton}
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-300 mb-1">
              <Layout size={20} />
              <span className="font-bold uppercase tracking-wider text-xs">brix/react Dashboard</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Design System Metrics</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Real-time Metrics from Figma, Github and Contentful.</p>
          </div>
          <div className="text-xs font-mono bg-white dark:bg-slate-900 px-3 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
            Last update: {data.lastUpdated}
          </div>
        </header>

        <div className="mb-8 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => togglePillar('design')}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              activePillars.includes('design')
                ? 'border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            Design
          </button>
          <button
            type="button"
            onClick={() => togglePillar('code')}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              activePillars.includes('code')
                ? 'border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => togglePillar('content')}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              activePillars.includes('content')
                ? 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            Content
          </button>
          {isFiltered && (
            <button
              type="button"
              onClick={() => setActivePillars(pillarOrder)}
              className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Show All
            </button>
          )}
        </div>

        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* 1. FIGMA */}
          {activePillars.includes('design') && (
          <KpiCard title="Design" icon={<FileImage size={24} />} hideOutline>
             <div className="flex items-baseline justify-between mb-2">
               <span className="text-slate-600 dark:text-slate-300 text-sm">Figma Files with Components in use</span>
               <span className="text-4xl font-extrabold text-purple-600">{data.figma.filesCount}</span>
             </div>
             <div className="h-px bg-slate-100 dark:bg-slate-800 my-4"></div>
             <ProgressBar 
               label="Design System Coverage in %" 
               value={data.figma.designSystemUsage} 
               max={100} 
               color="bg-purple-500" 
             />
             <div className="mt-6 flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 p-3 rounded border border-purple-100 dark:border-purple-900">
               <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
               {data.figma.recentComments} Comments in Review
             </div>
             <div className="grid grid-cols-2 gap-3">
               <div className="rounded border border-purple-100 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30 p-3">
                 <div className="text-xs uppercase tracking-wide text-purple-500 dark:text-purple-300">Published (30d)</div>
                 <div className="mt-1 text-xl font-bold text-purple-700 dark:text-purple-200">{data.figma.componentsPublishedLast30Days}</div>
               </div>
               <div className="rounded border border-violet-100 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30 p-3">
                 <div className="text-xs uppercase tracking-wide text-violet-500 dark:text-violet-300">Review Latency</div>
                 <div className="mt-1 text-xl font-bold text-violet-700 dark:text-violet-200">{data.figma.reviewLatencyHours}h</div>
               </div>
             </div>
             <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Library Adoption</h4>
             <ul className="space-y-3">
               {data.figma.libraryAdoption.map((item) => (
                 <li key={item.library}>
                   <ProgressBar label={item.library} value={item.adoption} max={100} color="bg-purple-400" />
                 </li>
               ))}
             </ul>
          </KpiCard>
          )}

          {/* 2. GITHUB / REACT COMPONENTS */}
          {activePillars.includes('code') && (
          <KpiCard title="Code" icon={<GitPullRequest size={24} />} hideOutline>
            <div className="flex items-center justify-between mb-6 bg-slate-50 dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700">
               <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">Open Pull Requests</span>
               <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold border border-green-200">
                 {data.github.openPRs} Active
               </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Merged PRs (7d)</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{data.github.mergedPRs7d}</div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Avg Review</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{data.github.avgReviewTimeHours}h</div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Open Issues</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{data.github.openIssues}</div>
              </div>
            </div>
            <ProgressBar
              label="Build Success Rate"
              value={data.github.buildSuccessRate}
              max={100}
              color="bg-emerald-500"
            />
            <div className="text-xs text-slate-500 dark:text-slate-400">Commits (7d): {data.github.commitVolume7d}</div>
            
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 tracking-wider">Top Components in React</h4>
            <ul className="space-y-4">
              {data.github.componentUsageCount.map((comp) => (
                <li key={comp.componentName}>
                   <ProgressBar 
                     label={comp.componentName} 
                     value={comp.count} 
                     max={maxComponentUsage}
                     color="bg-slate-800" 
                   />
                </li>
              ))}
            </ul>
          </KpiCard>
          )}

          {/* 3. CONTENTFUL */}
          {activePillars.includes('content') && (
          <KpiCard title="Content" icon={<Database size={24} />}>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
                <div className="text-2xl font-bold text-blue-600">{data.contentful.publishedEntries}</div>
                <div className="text-[10px] text-blue-400 dark:text-blue-300 uppercase font-bold tracking-wider mt-1">Published</div>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-100 dark:border-orange-900">
                <div className="text-2xl font-bold text-orange-500">{data.contentful.draftEntries}</div>
                <div className="text-[10px] text-orange-400 dark:text-orange-300 uppercase font-bold tracking-wider mt-1">Drafts</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-3">
                <div className="text-[10px] uppercase tracking-wide text-blue-500 dark:text-blue-300">Locales</div>
                <div className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-200">{data.contentful.locales}</div>
              </div>
              <div className="rounded border border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3">
                <div className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-300">Scheduled</div>
                <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-200">{data.contentful.scheduledEntries}</div>
              </div>
              <div className="rounded border border-cyan-100 dark:border-cyan-900 bg-cyan-50 dark:bg-cyan-950/30 p-3">
                <div className="text-[10px] uppercase tracking-wide text-cyan-600 dark:text-cyan-300">Assets (24h)</div>
                <div className="mt-1 text-lg font-bold text-cyan-700 dark:text-cyan-200">{data.contentful.recentAssetUploads}</div>
              </div>
            </div>
            <ProgressBar 
               label="Total Enabled Components in Contentful" 
               value={data.contentful.totalEntries} 
               max={2000} 
               color="bg-blue-500" 
             />
            <ProgressBar
              label="Weekly Publish Rate"
              value={data.contentful.weeklyPublishRate}
              max={200}
              color="bg-cyan-500"
            />
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Content Type Distribution</h4>
            <ul className="space-y-3">
              {data.contentful.contentTypeDistribution.map((item) => (
                <li key={item.contentType}>
                  <ProgressBar
                    label={item.contentType}
                    value={item.entries}
                    max={maxContentTypeEntries}
                    color="bg-blue-400"
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
