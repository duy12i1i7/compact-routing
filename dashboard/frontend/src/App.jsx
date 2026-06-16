import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Activity, Download, Upload, Users, MonitorSmartphone, Wifi, ShieldCheck, Power } from 'lucide-react'

function App() {
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/stats')
        const json = await res.json()
        setData(json)
        
        // Add to history for line chart
        const now = new Date()
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
        
        const rxMbps = parseFloat(((json?.mikrotik?.speed_rx_bps || 0) / 1024 / 1024).toFixed(2))
        const txMbps = parseFloat(((json?.mikrotik?.speed_tx_bps || 0) / 1024 / 1024).toFixed(2))
        
        setHistory(prev => {
          const newHistory = [...prev, { time: timeStr, download: rxMbps, upload: txMbps }]
          // Keep last 30 data points
          if (newHistory.length > 30) return newHistory.slice(newHistory.length - 30)
          return newHistory
        })
        
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [])

  const shutdown = async () => {
    if (confirm("CẢNH BÁO: Bạn có chắc chắn muốn TẮT MÁY SEB không?")) {
      try {
        await fetch('/shutdown', { method: 'POST' })
        alert("Đã gửi lệnh tắt máy thành công!")
      } catch (err) {
        alert("Lỗi khi gửi lệnh tắt máy.")
      }
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-2xl font-bold text-blue-400 bg-slate-950">Khởi động Hệ Thống...</div>

  const activeStudentsCount = data?.moodle?.active_count || 0
  const activeDevices = data?.devices?.filter(d => d.active_on_moodle) || []
  const totalDevices = data?.devices?.length || 0
  const idleDevices = totalDevices - activeDevices.length
  
  const rxMb = ((data?.mikrotik?.wan_rx || 0) / 1024 / 1024).toFixed(2)
  const txMb = ((data?.mikrotik?.wan_tx || 0) / 1024 / 1024).toFixed(2)
  const rxSpeedMbps = ((data?.mikrotik?.speed_rx_bps || 0) / 1024 / 1024).toFixed(2)
  const txSpeedMbps = ((data?.mikrotik?.speed_tx_bps || 0) / 1024 / 1024).toFixed(2)

  const pieData = [
    { name: 'Đang Thi (Active)', value: activeDevices.length, color: '#34d399' },
    { name: 'Kết Nối Ảo (Idle)', value: idleDevices, color: '#64748b' },
  ]

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
              SEB Command Center
            </span>
          </h1>
          <p className="mt-1 text-slate-400 text-sm flex items-center gap-2">
            <Wifi className="w-4 h-4 text-slate-500" /> Live MikroTik Telemetry & Moodle Integration
          </p>
        </div>
        <button 
          onClick={shutdown}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-red-500/20 active:scale-95"
        >
          <Power className="w-5 h-5" /> TẮT MÁY SEB
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
            <Download className="w-32 h-32" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Download Speed</p>
          <h2 className="text-4xl font-black text-emerald-400 mb-2">{rxSpeedMbps} <span className="text-lg font-bold text-emerald-400/50">Mbps</span></h2>
          <p className="text-xs text-slate-500 bg-slate-950/50 inline-block px-2 py-1 rounded">Total: {rxMb} MB</p>
        </div>

        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
            <Upload className="w-32 h-32" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Upload Speed</p>
          <h2 className="text-4xl font-black text-cyan-400 mb-2">{txSpeedMbps} <span className="text-lg font-bold text-cyan-400/50">Mbps</span></h2>
          <p className="text-xs text-slate-500 bg-slate-950/50 inline-block px-2 py-1 rounded">Total: {txMb} MB</p>
        </div>

        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
            <MonitorSmartphone className="w-32 h-32" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Thiết bị trong mạng</p>
          <h2 className="text-4xl font-black text-white mb-2">{totalDevices}</h2>
          <p className="text-xs text-slate-500 bg-slate-950/50 inline-block px-2 py-1 rounded">MikroTik DHCP Leases</p>
        </div>

        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
            <Users className="w-32 h-32" />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">Sinh viên mở đề</p>
          <h2 className="text-4xl font-black text-rose-400 mb-2">{activeStudentsCount}</h2>
          <p className="text-xs text-slate-500 bg-slate-950/50 inline-block px-2 py-1 rounded">Moodle Database</p>
        </div>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-emerald-400" /> Băng Thông Thời Gian Thực (Mbps)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" fontSize={12} tickMargin={10} minTickGap={30} />
                <YAxis stroke="#475569" fontSize={12} tickFormatter={(val) => `${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" name="Download" dataKey="download" stroke="#34d399" strokeWidth={3} dot={false} activeDot={{ r: 6 }} animationDuration={300} />
                <Line type="monotone" name="Upload" dataKey="upload" stroke="#22d3ee" strokeWidth={3} dot={false} activeDot={{ r: 6 }} animationDuration={300} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <MonitorSmartphone className="w-5 h-5 text-blue-400" /> Tỷ lệ Thiết Bị
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2">
            <p className="text-sm text-slate-400">Thiết bị đang thi: <span className="font-bold text-white">{activeDevices.length}</span> / {totalDevices}</p>
          </div>
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-96">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
            <h3 className="font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-400" /> Sinh Viên Moodle
            </h3>
            <span className="text-xs font-bold px-2 py-1 bg-slate-800 rounded-md text-slate-400">{data?.moodle?.students?.length || 0} active</span>
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            {data?.moodle?.students?.length > 0 ? (
              <ul className="space-y-2">
                {data.moodle.students.map((s, i) => (
                  <li key={i} className="flex justify-between items-center p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors">
                    <div>
                      <p className="font-bold text-slate-100">{s.name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{s.username}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                      </span>
                      <span className="text-xs font-semibold text-rose-400">In Progress</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Users className="w-12 h-12 mb-3 opacity-20" />
                <p>Không có sinh viên nào đang thi</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-96">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
            <h3 className="font-bold flex items-center gap-2">
              <Wifi className="w-5 h-5 text-emerald-400" /> Thiết Bị Mạng (MikroTik)
            </h3>
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            {data?.devices?.length > 0 ? (
              <ul className="space-y-2">
                {data.devices.map((d, i) => (
                  <li key={i} className={`flex justify-between items-center p-3 rounded-xl transition-colors border ${d.active_on_moodle ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-slate-800/30 border-transparent hover:bg-slate-800/50'}`}>
                    <div>
                      <p className="font-bold text-slate-100">{d.hostname}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 flex gap-2">
                        <span>{d.ip}</span> <span className="opacity-30">|</span> <span>{d.mac}</span>
                      </p>
                    </div>
                    {d.active_on_moodle ? (
                      <span className="px-3 py-1 text-[10px] uppercase font-black text-emerald-400 bg-emerald-400/10 rounded-lg tracking-wider border border-emerald-400/20">
                        Test Data
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-[10px] uppercase font-black text-slate-500 bg-slate-500/10 rounded-lg tracking-wider">
                        Idle
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Wifi className="w-12 h-12 mb-3 opacity-20" />
                <p>Không tìm thấy thiết bị mạng</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
