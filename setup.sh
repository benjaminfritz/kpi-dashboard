#!/bin/bash

echo "🚀 Starte Setup für KPI Dashboard..."

# 1. Dateien und Ordner erstellen
mkdir -p src/components src/services src/types

# 2. package.json erstellen
cat << 'EOF' > package.json
{
  "name": "kpi-dashboard",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.263.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
EOF

# 3. tsconfig.json
cat << 'EOF' > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

cat << 'EOF' > tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

# 4. Vite Config
cat << 'EOF' > vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
EOF

# 5. Tailwind Setup
cat << 'EOF' > tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

cat << 'EOF' > postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# 6. HTML Entry Point
cat << 'EOF' > index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KPI Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# 7. Source Code - CSS
cat << 'EOF' > src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #f8fafc;
}
EOF

# 8. Source Code - Types
cat << 'EOF' > src/types/index.ts
export interface FigmaData {
  teamName: string;
  filesCount: number;
  recentComments: number;
  designSystemUsage: number;
}

export interface ContentfulData {
  totalEntries: number;
  publishedEntries: number;
  draftEntries: number;
  recentAssetUploads: number;
}

export interface GithubData {
  repoName: string;
  openPRs: number;
  componentUsageCount: {
    componentName: string;
    count: number;
  }[];
}

export interface DashboardData {
  figma: FigmaData;
  contentful: ContentfulData;
  github: GithubData;
  lastUpdated: string;
}
EOF

# 9. Source Code - Mock Service
cat << 'EOF' > src/services/api.ts
import { DashboardData } from '../types';

export const fetchDashboardData = async (): Promise<DashboardData> => {
  // Simuliert API Delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    figma: {
      teamName: "Marketing Design",
      filesCount: 42,
      recentComments: 12,
      designSystemUsage: 78,
    },
    contentful: {
      totalEntries: 1250,
      publishedEntries: 1100,
      draftEntries: 150,
      recentAssetUploads: 5,
    },
    github: {
      repoName: "frontend-monorepo",
      openPRs: 3,
      componentUsageCount: [
        { componentName: "<Button />", count: 342 },
        { componentName: "<Card />", count: 120 },
        { componentName: "<Hero />", count: 45 },
      ],
    },
    lastUpdated: new Date().toLocaleTimeString(),
  };
};
EOF

# 10. Source Code - Components
cat << 'EOF' > src/components/KpiCard.tsx
import React from 'react';

interface KpiCardProps {
  title: string;
  icon: React.ReactNode;
  sourceColor: string;
  children: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, icon, sourceColor, children }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 border-t-4 ${sourceColor} hover:shadow-md transition-shadow duration-300 border border-gray-100`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <div className="p-2 bg-gray-50 rounded-lg text-gray-600">{icon}</div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};
EOF

cat << 'EOF' > src/components/ProgressBar.tsx
import React from 'react';

export const ProgressBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-medium mb-1.5">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-900">{value}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
EOF

# 11. Source Code - App & Main
cat << 'EOF' > src/App.tsx
import React, { useEffect, useState } from 'react';
import { fetchDashboardData } from './services/api';
import { DashboardData } from './types';
import { KpiCard } from './components/KpiCard';
import { ProgressBar } from './components/ProgressBar';
import { Layout, FileImage, GitPullRequest, Database } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchDashboardData();
        setData(result);
      } catch (error) {
        console.error("Fehler beim Laden", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-blue-500 rounded-full mb-4"></div>
        <div className="text-gray-400 font-medium">Lade Dashboard...</div>
      </div>
    </div>
  );

  if (!data) return <div>Keine Daten verfügbar</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Layout size={20} />
              <span className="font-bold uppercase tracking-wider text-xs">Internal Tools</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Design System Health</h1>
            <p className="text-slate-500 mt-2">Echtzeit-Metriken aus Figma, Contentful & GitHub</p>
          </div>
          <div className="text-xs font-mono bg-white px-3 py-1 rounded border border-slate-200 text-slate-400">
            Last sync: {data.lastUpdated}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* FIGMA */}
          <KpiCard title="Figma Design" icon={<FileImage size={24} />} sourceColor="border-purple-500">
             <div className="flex items-baseline justify-between mb-2">
               <span className="text-slate-600 text-sm">Aktive Files</span>
               <span className="text-4xl font-extrabold text-purple-600">{data.figma.filesCount}</span>
             </div>
             <div className="h-px bg-slate-100 my-4"></div>
             <ProgressBar 
               label="System Coverage" 
               value={data.figma.designSystemUsage} 
               max={100} 
               color="bg-purple-500" 
             />
             <div className="mt-6 flex items-center gap-2 text-xs text-purple-700 bg-purple-50 p-3 rounded border border-purple-100">
               <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
               {data.figma.recentComments} Kommentare in Review
             </div>
          </KpiCard>

          {/* CONTENTFUL */}
          <KpiCard title="Content Scale" icon={<Database size={24} />} sourceColor="border-blue-500">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">{data.contentful.publishedEntries}</div>
                <div className="text-[10px] text-blue-400 uppercase font-bold tracking-wider mt-1">Published</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                <div className="text-2xl font-bold text-orange-500">{data.contentful.draftEntries}</div>
                <div className="text-[10px] text-orange-400 uppercase font-bold tracking-wider mt-1">Drafts</div>
              </div>
            </div>
            <ProgressBar 
               label="Total Capacity Usage" 
               value={data.contentful.totalEntries} 
               max={2000} 
               color="bg-blue-500" 
             />
          </KpiCard>

          {/* GITHUB */}
          <KpiCard title="React Components" icon={<GitPullRequest size={24} />} sourceColor="border-slate-800">
            <div className="flex items-center justify-between mb-6 bg-slate-50 p-3 rounded border border-slate-100">
               <span className="text-slate-600 text-sm font-medium">Offene PRs</span>
               <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold border border-green-200">
                 {data.github.openPRs} Active
               </span>
            </div>
            
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Top Components</h4>
            <ul className="space-y-4">
              {data.github.componentUsageCount.map((comp) => (
                <li key={comp.componentName}>
                   <ProgressBar 
                     label={comp.componentName} 
                     value={comp.count} 
                     max={500} 
                     color="bg-slate-800" 
                   />
                </li>
              ))}
            </ul>
          </KpiCard>

        </div>
      </div>
    </div>
  );
};

export default App;
EOF

cat << 'EOF' > src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

echo "✅ Setup abgeschlossen! Führe jetzt folgende Befehle aus:"
echo "👉 npm install"
echo "👉 npm run dev"