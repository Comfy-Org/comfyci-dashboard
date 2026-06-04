import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const UsageGraph = ({ data }) => {

    const parsedData = Object.entries(data)
        .filter(([key]) => key !== "total")
        .map(([time, data]) => {
            const [vram, gpu_usage, ram, cpu_usage] = (data as string).split(',').map(val => parseInt(val.trim().split(' ')[0]) || 0);
            return {
                time: parseFloat(time.split(' ')[0]),
                vram: vram || 0,
                gpu_usage: gpu_usage || 0,
                ram: ram || 0,
                cpu_usage: cpu_usage || 0
            };
        })
        .sort((a, b) => a.time - b.time);

    let maxVRAM = 0
    let maxRAM = 0
    if (data["total"]) {
        const total = data["total"].split(',')
        maxVRAM = parseInt(total[0].split(' ')[0])
        maxRAM = parseInt(total[1].split(' ')[0])
    }
    else {
        maxVRAM = Math.max(...parsedData.map(item => item.vram));
        maxRAM = Math.max(...parsedData.map(item => item.ram));
    }

    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" aspect={3}>
                <LineChart data={parsedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3c3d42" strokeOpacity={0.5} />
                    <XAxis
                        dataKey="time"
                        label={{ value: 'Time (Seconds)', position: 'insideBottomRight', offset: 0, fill: '#8a8a8a' }}
                        tick={{ fontSize: 12, fill: '#8a8a8a' }}
                        stroke="#55565e"
                        interval={1}
                        tickFormatter={(value) => Number.isInteger(value) ? value : ''}
                    />
                    <YAxis
                        yAxisId="left"
                        label={{ value: 'Memory (GiB)', angle: -90, position: 'insideLeft', offset: 10, fill: '#8a8a8a' }}
                        tick={{ fontSize: 12, fill: '#8a8a8a' }}
                        stroke="#55565e"
                        tickFormatter={(value) => (value / 1024).toFixed(1)}
                        domain={[0, Math.max(maxVRAM, maxRAM)]}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{ value: 'Usage (%)', angle: 90, position: 'insideRight', offset: 10, fill: '#8a8a8a' }}
                        tick={{ fontSize: 12, fill: '#8a8a8a' }}
                        stroke="#55565e"
                        domain={[0, 100]}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#19161a',
                            border: '1px solid #3c3d42',
                            borderRadius: 8,
                            color: '#f3f3f3',
                        }}
                        formatter={(value: number, name: string) => {
                            if (name === 'VRAM' || name === 'System RAM') {
                                return [`${value} MiB (${(value / 1024).toFixed(1)} GiB)`, name];
                            }
                            return [`${value}%`, name];
                        }}
                        labelFormatter={(label) => `Time: ${label} seconds`}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="vram" name="VRAM" stroke="#8d7fc5" strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="ram" name="System RAM" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="gpu_usage" name="GPU Usage" stroke="#f0ff41" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="cpu_usage" name="CPU Usage" stroke="#5b9bd5" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default UsageGraph;
