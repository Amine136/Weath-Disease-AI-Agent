export default function WeatherStrip({ weather }) {
  const tiles = [
    {
      label: "Temperature",
      value: `${weather.temp_c}°C`,
      icon: (
        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m0 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-9a1.5 1.5 0 0 0-1.5 1.5v7.816a3.001 3.001 0 1 0 3 0V1.5A1.5 1.5 0 0 0 12 0z" />
        </svg>
      ),
    },
    {
      label: "Wind",
      value: `${weather.wind_kmh} km/h`,
      icon: (
        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h8.5a2.5 2.5 0 1 0-2.5-2.5M6 16h5.5a2.5 2.5 0 1 1-2.5 2.5M6 8h3.5a2.5 2.5 0 1 0-2.5-2.5" />
        </svg>
      ),
    },
    {
      label: "Rain",
      value: `${weather.rain_mm} mm`,
      icon: (
        <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-3.3 0-6 2.7-6 6 0 4.5 6 12 6 12s6-7.5 6-12c0-3.3-2.7-6-6-6z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Weather Conditions</p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="flex justify-center mb-1">{tile.icon}</div>
            <p className="text-xs font-semibold text-gray-800">{tile.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{tile.label}</p>
          </div>
        ))}
      </div>

      {/* Spray badge */}
      {weather.spray_safe ? (
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span className="text-xs font-medium text-green-700">Safe to spray</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span className="text-xs font-medium text-red-700">Do not spray</span>
        </div>
      )}
    </div>
  );
}
