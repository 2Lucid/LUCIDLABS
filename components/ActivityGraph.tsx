
"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
    { name: 'Mon', json: 4000, tokens: 2400 },
    { name: 'Tue', json: 3000, tokens: 1398 },
    { name: 'Wed', json: 2000, tokens: 9800 },
    { name: 'Thu', json: 2780, tokens: 3908 },
    { name: 'Fri', json: 1890, tokens: 4800 },
    { name: 'Sat', json: 2390, tokens: 3800 },
    { name: 'Sun', json: 3490, tokens: 4300 },
];

export function ActivityGraph() {
    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">Production Activity</h3>
                <p className="text-sm text-muted-foreground">JSON Lines generated over the last 7 days</p>
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorJson" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#52525b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#52525b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f0f11', borderColor: '#27272a', color: '#ededed' }}
                            itemStyle={{ color: '#ededed' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="json"
                            stroke="#7C3AED"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorJson)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
