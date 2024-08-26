import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const UsageGraph = ({ data }) => {
    const parsedData = Object.entries(data).map(([time, mem]) => ({
        time: parseFloat(time.split(' ')[0]),
        mem: parseInt((mem as string).split(' ')[0])
    })).sort((a, b) => a.time - b.time);

    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" aspect={3}>
                <LineChart data={parsedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="time"
                        label={{ value: 'Time (Seconds)', position: 'insideBottomLeft', offset: 0 }}
                        tick={{ fontSize: 12 }}
                        interval={'preserveStartEnd'}
                    />
                    <YAxis
                        label={{ value: 'MiB', angle: -90, position: 'insideLeft', offset: 10 }}
                        tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                        formatter={(value) => `${value} MiB`}
                        labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Line type="monotone" dataKey="mem" stroke="#8884d8" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default UsageGraph;
