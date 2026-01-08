import React, { useState, useEffect } from 'react';
import { 
  Sun, Moon, Clock, TrendingUp, Plus, 
  Trash2, CheckCircle, Zap, Rocket, TrendingDown,
  Target, ArrowUpRight, ArrowDownLeft, Activity
} from 'lucide-react';

const TRAMOS_HORARIOS = [
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
  '20:00 - 22:00',
];

// Formateador visual para etiquetas
const formatMoney = (val) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(val || 0);
};

// Formateador para Inputs
const formatInputCurrency = (val) => {
  const onlyNums = String(val).replace(/\D/g, '');
  if (!onlyNums) return '';
  return '$ ' + new Intl.NumberFormat('es-CL').format(onlyNums);
};

// Parser para obtener el número limpio
const parseInputCurrency = (val) => {
  return parseFloat(String(val).replace(/\D/g, '')) || 0;
};

export default function App() {
  // Inicialización de estados desde localStorage para evitar el reset en el primer render
  const getInitialState = () => {
    // Verificamos si estamos en el navegador para evitar errores en SSR (Server Side Rendering)
    if (typeof window === 'undefined') return {
      targets: Array(TRAMOS_HORARIOS.length).fill(''),
      salesData: TRAMOS_HORARIOS.map(() => [])
    };

    const savedData = localStorage.getItem('benny_tracker_storage');
    const today = new Date().toDateString();
    
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.date === today) {
        return {
          targets: parsed.targets || Array(TRAMOS_HORARIOS.length).fill(''),
          salesData: parsed.salesData || TRAMOS_HORARIOS.map(() => [])
        };
      }
    }
    return {
      targets: Array(TRAMOS_HORARIOS.length).fill(''),
      salesData: TRAMOS_HORARIOS.map(() => [])
    };
  };

  const initialState = getInitialState();
  const [darkMode, setDarkMode] = useState(true);
  const [targets, setTargets] = useState(initialState.targets);
  const [salesData, setSalesData] = useState(initialState.salesData);
  const [inputs, setInputs] = useState(Array(TRAMOS_HORARIOS.length).fill(''));
  const [activeIndex, setActiveIndex] = useState(-1);

  // Efecto para el control del tiempo y tramo actual
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const idx = TRAMOS_HORARIOS.findIndex(t => {
        const [start, end] = t.split(' - ');
        const [hStart, mStart] = start.split(':').map(Number);
        const [hEnd, mEnd] = end.split(':').map(Number);
        const startMin = hStart * 60 + mStart;
        const endMin = hEnd * 60 + mEnd;
        return currentMin >= startMin && currentMin < endMin;
      });
      setActiveIndex(idx);
    };

    checkTime();
    const timer = setInterval(checkTime, 30000);
    return () => clearInterval(timer);
  }, []);

  // Guardar datos en localStorage cada vez que cambien los targets o las ventas
  useEffect(() => {
    const dataToSave = {
      date: new Date().toDateString(),
      targets,
      salesData
    };
    localStorage.setItem('benny_tracker_storage', JSON.stringify(dataToSave));
  }, [targets, salesData]);

  const calculateMetrics = () => {
    let tramos = TRAMOS_HORARIOS.map((time, i) => {
      const targetVal = parseInputCurrency(targets[i]);
      const salesVal = salesData[i].reduce((acc, s) => acc + s.amount, 0);
      return {
        id: i,
        time,
        target: targetVal,
        sales: salesVal,
        pendingTarget: Math.max(0, targetVal - salesVal),
        surplus: Math.max(0, salesVal - targetVal),
        debtRecovered: 0,
        recoveredFrom: [], 
        helpedTramos: []   
      };
    });

    for (let i = 0; i < tramos.length; i++) {
      let currentSurplus = tramos[i].surplus;
      if (currentSurplus > 0) {
        for (let j = i - 1; j >= 0; j--) { 
          if (tramos[j].pendingTarget > 0) {
            const recovery = Math.min(currentSurplus, tramos[j].pendingTarget);
            tramos[j].pendingTarget -= recovery;
            tramos[j].debtRecovered += recovery;
            tramos[j].recoveredFrom.push({ time: tramos[i].time, amount: recovery });
            tramos[i].helpedTramos.push({ time: tramos[j].time, amount: recovery });
            currentSurplus -= recovery;
          }
          if (currentSurplus <= 0) break;
        }
      }
    }
    return tramos;
  };

  const tramosCalculados = calculateMetrics();
  const totalSales = tramosCalculados.reduce((acc, t) => acc + t.sales, 0);
  const totalTarget100 = tramosCalculados.reduce((acc, t) => acc + t.target, 0);
  const target140 = totalTarget100 * 1.40;

  const pct100 = totalTarget100 > 0 ? Math.min(100, (totalSales / totalTarget100) * 100) : 0;
  const pct140 = target140 > 0 ? Math.min(100, (totalSales / target140) * 100) : 0;

  const getGradientStyle = (percent) => {
    if (percent < 40) return 'from-rose-500 to-orange-500';
    if (percent < 80) return 'from-orange-500 to-amber-500';
    if (percent < 100) return 'from-amber-500 to-emerald-500';
    return 'from-emerald-500 to-cyan-500';
  };

  const handleTargetChange = (idx, value) => {
    const newT = [...targets];
    newT[idx] = formatInputCurrency(value);
    setTargets(newT);
  };

  const handleInputChange = (idx, value) => {
    const newI = [...inputs];
    newI[idx] = formatInputCurrency(value);
    setInputs(newI);
  };

  const addSale = (idx) => {
    const val = parseInputCurrency(inputs[idx]);
    if (!val || val <= 0) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const newSales = [...salesData];
    newSales[idx] = [...newSales[idx], { id: Date.now(), amount: val, timestamp: timeString }];
    setSalesData(newSales);
    setInputs(prev => {
        const next = [...prev];
        next[idx] = '';
        return next;
    });
  };

  const deleteSale = (tIdx, sId) => {
    const newSales = [...salesData];
    newSales[tIdx] = newSales[tIdx].filter(s => s.id !== sId);
    setSalesData(newSales);
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${darkMode ? 'bg-[#020408] text-slate-100' : 'bg-slate-200 text-slate-900'} font-sans pb-12`}>
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-all ${darkMode ? 'bg-[#020408]/80 border-white/5 shadow-2xl shadow-black/50' : 'bg-white/90 border-slate-300 shadow-md'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Rocket className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tight italic uppercase">
              Benny <span className="text-indigo-500">Tracker</span> 
              <span className="ml-2 text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full not-italic tracking-normal">V.2</span>
            </h1>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 rounded-xl border-2 transition-all ${darkMode ? 'bg-slate-900 border-white/10 text-yellow-400 hover:border-white/20' : 'bg-white border-slate-400 text-indigo-700 shadow-sm hover:shadow-md active:scale-95'}`}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* KPI Cards */}
        <section className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-6 rounded-3xl border-2 transition-all ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300 shadow-xl'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 text-indigo-600">Ventas Totales</p>
            <h2 className="text-3xl font-black tabular-nums tracking-tighter italic">{formatMoney(totalSales)}</h2>
          </div>

          <div className={`p-6 rounded-3xl border-2 transition-all ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300 shadow-xl'}`}>
            <div className="flex justify-between items-start mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Meta Base (100%)</p>
              <span className="text-[11px] font-black italic">{pct100.toFixed(0)}%</span>
            </div>
            <h2 className="text-3xl font-black tabular-nums tracking-tighter italic mb-3">{formatMoney(totalTarget100)}</h2>
            <div className={`h-2 w-full rounded-full overflow-hidden ${darkMode ? 'bg-black/40 shadow-inner' : 'bg-slate-200 border border-slate-300'}`}>
              <div className={`h-full transition-all duration-700 bg-gradient-to-r ${getGradientStyle(pct100)}`} style={{ width: `${pct100}%` }} />
            </div>
          </div>

          <div className={`p-6 rounded-3xl border-2 transition-all ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300 shadow-xl'}`}>
            <div className="flex justify-between items-start mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Meta Real (140%)</p>
              <span className="text-[11px] font-black italic">{pct140.toFixed(0)}%</span>
            </div>
            <h2 className="text-3xl font-black tabular-nums tracking-tighter italic mb-3">{formatMoney(target140)}</h2>
            <div className={`h-2 w-full rounded-full overflow-hidden ${darkMode ? 'bg-black/40 shadow-inner' : 'bg-slate-200 border border-slate-300'}`}>
              <div className={`h-full transition-all duration-700 bg-gradient-to-r ${getGradientStyle(pct140)}`} style={{ width: `${pct140}%` }} />
            </div>
          </div>
        </section>

        {/* Tramos Horarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tramosCalculados.map((tramo, idx) => {
            const isCurrent = idx === activeIndex;
            const hasTargetSet = targets[idx] !== '' && parseInputCurrency(targets[idx]) > 0;
            const isFullyCovered = hasTargetSet && tramo.pendingTarget === 0;
            const isRecoveredByOthers = isFullyCovered && tramo.sales < tramo.target;
            
            const totalRecursosTramo = tramo.sales + tramo.debtRecovered;
            const tramoPercent = hasTargetSet ? Math.min(100, (totalRecursosTramo / tramo.target) * 100) : 0;

            const cardBaseClass = darkMode 
              ? (isCurrent ? "bg-[#0d1117] border-indigo-500 shadow-2xl shadow-indigo-500/40 scale-[1.04] z-10 ring-1 ring-indigo-500/50" : "bg-[#0a0c12] border-white/5 opacity-80")
              : (isCurrent ? "bg-white border-indigo-600 shadow-[0_30px_70px_-15px_rgba(79,70,229,0.3)] scale-[1.04] z-10 ring-4 ring-indigo-500/20" : "bg-white border-slate-400 shadow-lg hover:border-indigo-300 transition-colors");

            return (
              <div key={idx} className={`relative flex flex-col rounded-[2.5rem] p-7 transition-all duration-500 border-2 ${cardBaseClass}`}>
                
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 transition-colors ${
                      isCurrent 
                        ? (darkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-indigo-600 text-white border-indigo-800 shadow-md') 
                        : (darkMode ? 'bg-white/5 border-transparent' : 'bg-slate-100 border-slate-300 text-slate-700 shadow-inner')
                    }`}>
                      <Clock size={15} className={isCurrent ? "animate-spin-slow" : "opacity-40"} />
                      <span className="text-[11px] font-black tracking-widest uppercase">{tramo.time}</span>
                    </div>

                    {/* Label ACTUAL integrado */}
                    {isCurrent && (
                      <div className="flex items-center gap-1.5 bg-indigo-600/10 border-2 border-indigo-500/30 text-indigo-500 px-3 py-1.5 rounded-xl animate-pulse">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider">Actual</span>
                      </div>
                    )}
                  </div>

                  {isFullyCovered && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 shadow-sm ${
                      isRecoveredByOthers 
                        ? 'text-amber-600 border-amber-500/40 bg-amber-50' 
                        : 'text-emerald-700 border-emerald-500/40 bg-emerald-50'
                    }`}>
                      {isRecoveredByOthers ? <ArrowUpRight size={14} /> : <CheckCircle size={14} />}
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {isRecoveredByOthers ? 'Recuperado' : 'Logrado'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mb-5 space-y-4">
                  <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    darkMode 
                      ? (isCurrent ? 'bg-black border-indigo-500/50' : 'bg-black/40 border-white/5') 
                      : (isCurrent ? 'bg-slate-50 border-indigo-600 shadow-inner' : 'bg-slate-50 border-slate-300 shadow-inner focus-within:border-indigo-400')
                  }`}>
                    <Target size={18} className={`italic ${isCurrent ? 'text-indigo-600 animate-pulse' : 'opacity-20'}`} />
                    <input 
                      type="text" 
                      inputMode="numeric"
                      placeholder="Fijar meta"
                      className="w-full bg-transparent border-none p-0 text-2xl font-black tabular-nums focus:outline-none placeholder:opacity-30 italic"
                      value={targets[idx]}
                      onChange={(e) => handleTargetChange(idx, e.target.value)}
                    />
                  </div>

                  {hasTargetSet && (
                    <div className="px-1">
                      <div className="flex justify-between items-center mb-1 text-[10px] font-black uppercase tracking-widest opacity-60">
                        <span className={darkMode ? "" : "text-slate-700"}>Progreso Tramo</span>
                        <span className={darkMode ? "" : "text-slate-900"}>{tramoPercent.toFixed(0)}%</span>
                      </div>
                      <div className={`h-2 w-full rounded-full overflow-hidden ${darkMode ? 'bg-black/40 shadow-inner' : 'bg-slate-200 border border-slate-300'}`}>
                        <div className={`h-full transition-all duration-700 bg-gradient-to-r ${getGradientStyle(tramoPercent)}`} style={{ width: `${tramoPercent}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {hasTargetSet && (
                  <div className={`mb-5 p-5 rounded-2xl border-2 transition-all duration-300 shadow-sm ${
                    isFullyCovered 
                      ? (darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-500/40')
                      : (darkMode ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-500/40')
                  }`}>
                    <div className="w-full">
                      <div className="flex justify-between items-start mb-1">
                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isFullyCovered ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {isFullyCovered ? (tramo.helpedTramos.length > 0 ? 'Excedente de Gestión' : 'Excedente') : 'Faltante para tramo'}
                        </p>
                        {isFullyCovered ? <TrendingUp size={16} className="text-emerald-600 opacity-50" /> : <TrendingDown size={16} className="text-rose-600 opacity-50" />}
                      </div>
                      
                      <h4 className={`text-xl font-black tabular-nums tracking-tighter ${isFullyCovered ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatMoney(isFullyCovered ? tramo.surplus : tramo.pendingTarget)}
                      </h4>

                      {tramo.helpedTramos.length > 0 && (
                        <div className="mt-3 pt-3 border-t-2 border-emerald-500/20">
                          <p className="text-[8px] uppercase font-black tracking-[0.1em] text-emerald-800/60 mb-1.5">Distribución de excedente:</p>
                          {tramo.helpedTramos.map((dest, i) => (
                            <div key={i} className="flex justify-between items-center text-[10px] font-black text-emerald-700 italic leading-tight mb-1">
                              <span className="flex items-center gap-1">
                                <ArrowDownLeft size={11} className="text-indigo-600" />
                                Para {dest.time}
                              </span>
                              <span>-{formatMoney(dest.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className={`p-5 rounded-2xl mb-5 flex justify-between items-center border-2 transition-all ${
                  isCurrent 
                    ? 'bg-indigo-600 text-white shadow-xl ring-4 ring-indigo-500/10 border-indigo-700' 
                    : (darkMode ? 'bg-white/5 border-transparent' : 'bg-slate-100 border-slate-300 shadow-inner')
                }`}>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? 'text-indigo-100' : 'opacity-70'}`}>Ventas del Tramo</span>
                    <span className="block font-black text-2xl tabular-nums italic leading-none mt-1">{formatMoney(tramo.sales)}</span>
                  </div>
                  <Zap size={22} className={isCurrent ? "text-white fill-white/20 animate-pulse" : "text-indigo-600 opacity-50"} />
                </div>

                <div className="mt-auto space-y-5">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      inputMode="numeric"
                      disabled={!hasTargetSet}
                      placeholder={hasTargetSet ? "Venta realizada..." : "Fije meta primero"}
                      className={`flex-1 px-4 py-3 rounded-xl border-2 bg-transparent font-black text-base focus:outline-none transition-all ${
                        darkMode 
                          ? (isCurrent ? 'border-indigo-500/50 focus:border-indigo-500 bg-black/40' : 'border-white/10 focus:border-blue-500') 
                          : (isCurrent ? 'border-indigo-600 focus:border-black bg-white shadow-lg' : 'border-slate-400 bg-white focus:border-indigo-600 shadow-md text-slate-900 placeholder:text-slate-400')
                      } ${!hasTargetSet ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
                      value={inputs[idx]}
                      onChange={(e) => handleInputChange(idx, e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSale(idx)}
                    />
                    <button 
                      onClick={() => addSale(idx)} 
                      disabled={!hasTargetSet}
                      className={`w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center transition-all shadow-lg border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 ${
                        !hasTargetSet ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-indigo-500 hover:shadow-indigo-500/40'
                      }`}
                    >
                      <Plus size={26} />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                    {salesData[idx].length > 0 && [...salesData[idx]].reverse().map(sale => (
                      <div key={sale.id} className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold border-2 transition-all ${
                        darkMode ? 'bg-white/5 border-transparent' : 'bg-white border-slate-200 shadow-md text-slate-900'
                      } hover:border-indigo-400 hover:translate-x-1 group`}>
                        <span>{formatMoney(sale.amount)} <span className="opacity-40 ml-2 text-[10px] font-normal italic">{sale.timestamp}</span></span>
                        <button onClick={() => deleteSale(idx, sale.id)} className="text-rose-600 opacity-0 group-hover:opacity-100 px-2 transition-opacity">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}