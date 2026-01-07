import React, { useState, useEffect } from 'react';
import { Sun, Moon, Clock, TrendingUp, Target, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

const tramoTimes = [
  '10:00 AM - 12:00 PM',
  '12:00 PM - 02:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
  '06:00 PM - 08:00 PM',
  '08:00 PM - 10:00 PM',
];

const formatCLP = (amount) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const parseTime = (timeStr) => {
  const parts = timeStr.split(' ');
  const [hourMin, period] = parts.length === 2 ? parts : [parts[0], null];
  let [hours, minutes] = hourMin.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  else if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const getChileanCurrentMinutes = () => {
  const now = new Date();
  const chileanTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  return chileanTime.getHours() * 60 + chileanTime.getMinutes();
};

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [tramoTargets, setTramoTargets] = useState(Array(tramoTimes.length).fill(''));
  const [tramoSales, setTramoSales] = useState(tramoTimes.map(() => []));
  const [newSaleInput, setNewSaleInput] = useState(Array(tramoTimes.length).fill(''));
  const [currentActiveTramoIndex, setCurrentActiveTramoIndex] = useState(-1);

  useEffect(() => {
    const savedData = localStorage.getItem('bennySalesData_v6');
    const today = new Date().toISOString().split('T')[0];
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (parsedData.date === today) {
          setTramoTargets(parsedData.targets || Array(tramoTimes.length).fill(''));
          setTramoSales(parsedData.sales || tramoTimes.map(() => []));
        }
      } catch (e) {
        localStorage.removeItem('bennySalesData_v6');
      }
    }
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('bennySalesData_v6', JSON.stringify({ 
      date: today, 
      targets: tramoTargets, 
      sales: tramoSales 
    }));
  }, [tramoTargets, tramoSales]);

  useEffect(() => {
    const updateActiveTramo = () => {
      const currentMinutes = getChileanCurrentMinutes();
      let activeIndex = -1;
      for (let i = 0; i < tramoTimes.length; i++) {
        const startMinutes = parseTime(tramoTimes[i].split(' - ')[0]);
        if (currentMinutes >= startMinutes) {
          if (i === tramoTimes.length - 1 || currentMinutes < parseTime(tramoTimes[i + 1].split(' - ')[0])) {
            activeIndex = i;
            break;
          }
        }
      }
      setCurrentActiveTramoIndex(activeIndex);
    };
    updateActiveTramo();
    const interval = setInterval(updateActiveTramo, 60000);
    return () => clearInterval(interval);
  }, []);

  const getTramoTarget = (index) => parseInt(tramoTargets[index]) || 0;
  const getTramoTotalSales = (index) => tramoSales[index].reduce((acc, sale) => acc + (parseFloat(sale.value) || 0), 0);

  const getAnalysis = () => {
    let globalSurplus = 0;
    tramoTimes.forEach((_, i) => {
      const target = getTramoTarget(i);
      const sales = getTramoTotalSales(i);
      if (sales > target) globalSurplus += (sales - target);
    });

    let totalDebtBeforeActive = 0;
    tramoTimes.forEach((_, i) => {
      if (i < currentActiveTramoIndex) {
        const target = getTramoTarget(i);
        const sales = getTramoTotalSales(i);
        if (sales < target) totalDebtBeforeActive += (target - sales);
      }
    });

    const remainingDebtToRecover = Math.max(0, totalDebtBeforeActive - globalSurplus);

    let poolTemporal = globalSurplus;
    return tramoTimes.map((_, i) => {
      const target = getTramoTarget(i);
      const sales = getTramoTotalSales(i);
      const deficit = Math.max(0, target - sales);
      const isReachedDirectly = target > 0 && sales >= target;
      
      let isRecovered = false;
      if (!isReachedDirectly && target > 0 && poolTemporal >= deficit) {
        isRecovered = true;
        poolTemporal -= deficit;
      }

      return {
        target,
        sales,
        deficit,
        isReachedDirectly,
        isRecovered,
        percent: target > 0 ? (sales / target) * 100 : 0,
        remainingDebtToRecover
      };
    });
  };

  const analysis = getAnalysis();
  const totalSales = analysis.reduce((acc, t) => acc + t.sales, 0);
  const totalBaseTarget = analysis.reduce((acc, t) => acc + t.target, 0);
  const progressGlobal = totalBaseTarget > 0 ? (totalSales / totalBaseTarget) * 100 : 0;

  const handleTargetChange = (index, val) => {
    const cleanVal = val.replace(/\D/g, ''); 
    const newTargets = [...tramoTargets];
    newTargets[index] = cleanVal;
    setTramoTargets(newTargets);
  };

  const addSale = (index) => {
    const val = parseFloat(newSaleInput[index]);
    if (val > 0) {
      const newSales = [...tramoSales];
      newSales[index] = [...newSales[index], { id: Date.now(), value: val }];
      setTramoSales(newSales);
      const newInputs = [...newSaleInput];
      newInputs[index] = '';
      setNewSaleInput(newInputs);
    }
  };

  const removeSale = (tIdx, sId) => {
    const newSales = [...tramoSales];
    newSales[tIdx] = newSales[tIdx].filter(s => s.id !== sId);
    setTramoSales(newSales);
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-lg ${darkMode ? 'bg-indigo-600' : 'bg-indigo-500 text-white'}`}>
              <TrendingUp size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">BENNY SALES</h1>
              <p className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Tracker de Objetivos</p>
            </div>
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-4 rounded-2xl transition-all duration-300 shadow-md hover:scale-110 ${darkMode ? 'bg-slate-800 text-yellow-400' : 'bg-white text-indigo-600'}`}
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </header>

        {/* Dashboard de Totales Invertido */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className={`lg:col-span-2 rounded-[2.5rem] p-8 shadow-xl border ${darkMode ? 'bg-slate-900 border-slate-800 shadow-indigo-500/5' : 'bg-white border-slate-100 shadow-indigo-200/50'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <p className={`text-xs font-black uppercase tracking-widest mb-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}>Venta Acumulada Hoy</p>
                <p className="text-5xl font-black tracking-tighter">{formatCLP(totalSales)}</p>
              </div>
              <div className="flex-1 w-full max-w-sm">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-bold">Progreso Diario</span>
                  <span className={`text-sm font-black ${progressGlobal >= 100 ? 'text-emerald-500' : 'text-indigo-500'}`}>{progressGlobal.toFixed(1)}%</span>
                </div>
                <div className={`w-full h-4 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-emerald-400 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(progressGlobal, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-500/20 flex flex-col justify-between">
            <div>
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Meta Base Total</p>
              <p className="text-4xl font-black">{formatCLP(totalBaseTarget)}</p>
            </div>
            <div className="mt-4 bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
              <p className="text-[10px] font-black uppercase text-indigo-200 tracking-tighter mb-1">Meta Real (140%)</p>
              <p className="text-xl font-bold">{formatCLP(totalBaseTarget * 1.4)}</p>
            </div>
          </div>
        </div>

        {/* Grid de Tramos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tramoTimes.map((time, i) => {
            const { target, sales, deficit, isReachedDirectly, isRecovered, percent, remainingDebtToRecover } = analysis[i];
            const isActive = i === currentActiveTramoIndex;
            const isAnterior = i < currentActiveTramoIndex;

            return (
              <div 
                key={i} 
                className={`relative rounded-[2.5rem] p-7 transition-all duration-300 border-2 
                ${darkMode 
                  ? (isActive ? 'bg-slate-900 border-indigo-500 ring-8 ring-indigo-500/5' : 'bg-slate-900 border-slate-800') 
                  : (isActive ? 'bg-white border-indigo-500 ring-8 ring-indigo-500/5' : 'bg-white border-slate-100')} 
                shadow-lg hover:shadow-2xl`}
              >
                <div className="flex justify-between items-center mb-6">
                  <div className={`p-2 rounded-xl ${darkMode ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-500'}`}>
                    <Clock size={20} />
                  </div>
                  {isActive && <span className="bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg animate-pulse">EN CURSO</span>}
                  <h3 className={`text-sm font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{time}</h3>
                </div>

                {/* Meta Input */}
                <div className="mb-6">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-indigo-500">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Meta del tramo"
                      className={`w-full border-none rounded-2xl py-4 pl-10 pr-4 text-2xl font-black transition-all
                        ${darkMode ? 'bg-slate-950 text-white focus:ring-2 focus:ring-indigo-500' : 'bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500'}`}
                      value={tramoTargets[i]}
                      onChange={(e) => handleTargetChange(i, e.target.value)}
                    />
                  </div>
                </div>

                {/* Progress Local */}
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <span className={`text-[10px] font-black uppercase ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cumplimiento</span>
                    <span className={`text-xs font-black ${percent >= 100 ? 'text-emerald-500' : 'text-indigo-500'}`}>{formatCLP(sales)} / {formatCLP(target)}</span>
                  </div>
                  <div className={`w-full h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div 
                      className={`h-full transition-all duration-1000 ${percent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Estados */}
                <div className="min-h-[85px] mb-6 space-y-3">
                  {isAnterior && isRecovered && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 p-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black animate-in fade-in zoom-in duration-500">
                      <CheckCircle size={16} /> ¡TRAMO RECUPERADO!
                    </div>
                  )}

                  {isActive && isReachedDirectly && (
                    <div className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 p-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black">
                      <Target size={16} /> ¡TRAMO COMPLETADO!
                    </div>
                  )}

                  {isActive && remainingDebtToRecover > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/30 text-orange-500 p-4 rounded-2xl flex flex-col items-center shadow-inner">
                      <span className="text-[10px] font-black uppercase mb-1">Falta para recuperar anterior:</span>
                      <span className="text-xl font-black">{formatCLP(remainingDebtToRecover)}</span>
                    </div>
                  )}

                  {!isReachedDirectly && !isRecovered && target > 0 && (
                    <div className={`p-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black ${darkMode ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                      <AlertCircle size={16} /> Faltan: {formatCLP(deficit)}
                    </div>
                  )}
                </div>

                {/* Venta Adder */}
                <div className={`p-4 rounded-3xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="number"
                      placeholder="Nueva venta"
                      className={`flex-1 border-none rounded-xl p-3 text-sm font-bold transition-all
                        ${darkMode ? 'bg-slate-800 text-white focus:ring-1 focus:ring-indigo-500' : 'bg-white text-slate-900 focus:ring-1 focus:ring-indigo-500'}`}
                      value={newSaleInput[i]}
                      onChange={(e) => {
                        const n = [...newSaleInput];
                        n[i] = e.target.value;
                        setNewSaleInput(n);
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && addSale(i)}
                    />
                    <button 
                      onClick={() => addSale(i)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                    {tramoSales[i].map(s => (
                      <div 
                        key={s.id} 
                        className={`text-[10px] font-bold py-1.5 px-3 rounded-lg border flex items-center gap-2
                          ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                      >
                        {formatCLP(s.value)}
                        <button onClick={() => removeSale(i, s.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <footer className={`mt-16 text-center pb-10 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Benny Sales OS v6.0 • © 2026 High Performance</p>
        </footer>
      </div>
    </div>
  );
}

