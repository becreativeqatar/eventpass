'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface ScanDay {
  date: string;
  label: string;
  scans: number;
}

interface FunnelItem {
  name: string;
  value: number;
  color: string;
}

interface DashboardData {
  scanActivity: ScanDay[];
  funnel: FunnelItem[];
}

const FUNNEL_COLORS = ['#737373', '#ca8a04', '#16a34a', '#dc2626'];

export function DashboardCharts({ initialData }: { initialData?: DashboardData | null }) {
  const [data, setData] = useState<DashboardData | null>(initialData || null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const json = await res.json();
          setData({ scanActivity: json.scanActivity, funnel: json.funnel });
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      }
    };

    if (!initialData) fetchStats();

    intervalRef.current = setInterval(fetchStats, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [initialData]);

  if (!data) return null;

  const hasScanData = data.scanActivity.some((d) => d.scans > 0);
  const hasFunnelData = data.funnel.some((d) => d.value > 0);

  if (!hasScanData && !hasFunnelData) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Scan Activity Chart */}
      <Card className="border-t-2 border-t-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Scan Activity (7 days)</CardTitle>
        </CardHeader>
        <div className="px-4 pb-4 h-[200px]">
          {hasScanData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.scanActivity}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="scans" fill="#e0251c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No scan data yet
            </div>
          )}
        </div>
      </Card>

      {/* Approval Funnel */}
      <Card className="border-t-2 border-t-chart-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Accreditation Status</CardTitle>
        </CardHeader>
        <div className="px-4 pb-4 h-[200px]">
          {hasFunnelData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.funnel.filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.funnel.filter((d) => d.value > 0).map((entry, index) => (
                    <Cell key={entry.name} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No accreditation data yet
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
