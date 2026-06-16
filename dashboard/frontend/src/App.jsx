import { useState, useEffect } from 'react'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://192.168.200.2:8080/api/stats')
        const json = await res.json()
        setData(json)
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

  if (loading) return <div className="flex h-screen items-center justify-center text-2xl font-bold text-blue-400">Loading Dashboard...</div>

  const activeStudentsCount = data?.moodle?.active_count || 0
  const activeDevices = data?.devices?.filter(d => d.active_on_moodle) || []
  const rxMb = ((data?.mikrotik?.wan_rx || 0) / 1024 / 1024).toFixed(2)
  const txMb = ((data?.mikrotik?.wan_tx || 0) / 1024 / 1024).toFixed(2)
  const rxSpeedMbps = ((data?.mikrotik?.speed_rx_bps || 0) / 1024 / 1024).toFixed(2)
  const txSpeedMbps = ((data?.mikrotik?.speed_tx_bps || 0) / 1024 / 1024).toFixed(2)

  return (
    <div className="min-h-screen p-8 bg-slate-900 text-slate-100">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Hệ Thống Giám Sát Phòng Thi SEB
        </h1>
        <p className="mt-2 text-slate-400">Real-time MikroTik & Moodle Telemetry</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          </div>
          <h2 className="text-lg font-medium text-slate-400 relative z-10">Lưu Lượng (WAN)</h2>
          <div className="mt-4 flex flex-col gap-3 relative z-10">
            <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-lg">
              <span className="text-sm text-slate-500 font-semibold w-16">Download</span>
              <span className="text-xl font-bold text-emerald-400">{rxMb} MB</span>
              <span className="text-sm font-mono text-emerald-300 bg-emerald-900/30 px-2 py-1 rounded">{rxSpeedMbps} Mbps</span>
            </div>
            <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-lg">
              <span className="text-sm text-slate-500 font-semibold w-16">Upload</span>
              <span className="text-xl font-bold text-blue-400">{txMb} MB</span>
              <span className="text-sm font-mono text-blue-300 bg-blue-900/30 px-2 py-1 rounded">{txSpeedMbps} Mbps</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-xl">
          <h2 className="text-lg font-medium text-slate-400">Thiết bị đang kết nối</h2>
          <p className="mt-4 text-5xl font-black text-white">{data?.devices?.length || 0}</p>
          <p className="mt-2 text-sm text-emerald-400">Đang nhận IP từ MikroTik</p>
        </div>

        <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-xl">
          <h2 className="text-lg font-medium text-slate-400">Sinh viên đang thi</h2>
          <p className="mt-4 text-5xl font-black text-rose-400">{activeStudentsCount}</p>
          <p className="mt-2 text-sm text-slate-500">Dữ liệu từ Moodle Database</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
            <h3 className="text-xl font-bold">Danh sách Sinh Viên (Moodle)</h3>
          </div>
          <div className="p-6 overflow-y-auto max-h-96">
            {data?.moodle?.students?.length > 0 ? (
              <ul className="space-y-3">
                {data.moodle.students.map((s, i) => (
                  <li key={i} className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                    <div>
                      <p className="font-semibold text-white">{s.name}</p>
                      <p className="text-sm text-slate-400">{s.username}</p>
                    </div>
                    <span className="px-3 py-1 text-xs font-bold text-rose-400 bg-rose-400/10 rounded-full">
                      Đang làm bài
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-center py-8">Không có sinh viên nào đang thi.</p>
            )}
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
            <h3 className="text-xl font-bold flex justify-between">
              <span>Thiết Bị Cụ Thể (MikroTik)</span>
              <span className="text-emerald-400 text-sm font-normal">{activeDevices.length} đang truyền dữ liệu</span>
            </h3>
          </div>
          <div className="p-6 overflow-y-auto max-h-96">
            {data?.devices?.length > 0 ? (
              <ul className="space-y-3">
                {data.devices.map((d, i) => (
                  <li key={i} className={`flex justify-between items-center p-3 rounded-lg border ${d.active_on_moodle ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-slate-700/30 border-transparent'}`}>
                    <div>
                      <p className="font-semibold text-white">{d.hostname}</p>
                      <p className="text-sm text-slate-400">{d.ip} <span className="mx-2">|</span> {d.mac}</p>
                    </div>
                    {d.active_on_moodle ? (
                      <span className="px-3 py-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 rounded-full animate-pulse">
                        Active Moodle Traffic
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-bold text-slate-500 bg-slate-500/10 rounded-full">
                        Idle
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-center py-8">Không có thiết bị nào kết nối.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
