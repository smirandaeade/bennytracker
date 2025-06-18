import React, { useState, useEffect } from 'react';
import bennyLogo from './assets/benny-logo.jpeg';

// Define los tramos horarios fijos con AM/PM explícito en todos los horarios
const tramoTimes = [
  '10:00 AM - 12:00 PM',
  '12:00 PM - 02:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
  '06:00 PM - 08:00 PM',
  '08:00 PM - 10:00 PM', // Nuevo tramo añadido
];

// Función para formatear el monto a CLP (Peso Chileno)
const formatCLP = (amount) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper para convertir la hora de string (ej. "10:00 AM") a minutos desde la medianoche (24h)
const parseTime = (timeStr) => {
  const parts = timeStr.split(' ');
  const [hourMin, period] = parts.length === 2 ? parts : [parts[0], null]; 
  let [hours, minutes] = hourMin.split(':').map(Number);

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0; // Midnight (12:00 AM)
  }
  return hours * 60 + minutes; // Total minutes from midnight
};

// Helper para obtener la hora actual en minutos desde la zona horaria de Chile
const getChileanCurrentMinutes = () => {
  const now = new Date();
  // Aseguramos que la hora sea la de Chile (America/Santiago) para una detección precisa del segmento actual
  const chileanTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  return chileanTime.getHours() * 60 + chileanTime.getMinutes();
};

export default function App() {
  const [tramoTargets, setTramoTargets] = useState(Array(tramoTimes.length).fill(''));
  const [tramoSales, setTramoSales] = useState(tramoTimes.map(() => []));
  const [newSaleInput, setNewSaleInput] = useState(Array(tramoTimes.length).fill(''));
  const [currentActiveTramoIndex, setCurrentActiveTramoIndex] = useState(-1);

  // useEffect para determinar el tramo activo basado en la hora actual
  useEffect(() => {
    const updateActiveTramo = () => {
      const currentMinutes = getChileanCurrentMinutes(); // Obtener la hora actual en minutos para Chile
      let activeIndex = -1;

      for (let i = 0; i < tramoTimes.length; i++) {
        const [startTimeStr] = tramoTimes[i].split(' - ');
        const startMinutes = parseTime(startTimeStr);
        
        // Determinar el tramo activo: la hora actual es después de la hora de inicio Y antes de la hora de inicio del próximo tramo
        if (currentMinutes >= startMinutes) {
          if (i === tramoTimes.length - 1 || currentMinutes < parseTime(tramoTimes[i+1].split(' - ')[0])) {
            activeIndex = i;
            break; // Se encontró el tramo activo, salir del bucle
          }
        }
      }
      setCurrentActiveTramoIndex(activeIndex); // Actualizar el índice del tramo activo
    };

    updateActiveTramo(); // Llamar una vez inmediatamente al montar el componente
    // Establecer un intervalo para actualizar el tramo activo cada minuto
    const interval = setInterval(updateActiveTramo, 60 * 1000); // 60 segundos * 1000 ms/seg

    // Limpiar el intervalo al desmontar el componente
    return () => clearInterval(interval);
  }, []); // El array de dependencia vacío asegura que esto se ejecute solo una vez al montar

  // Función auxiliar para obtener de forma segura el valor de la meta de un tramo
  const getTramoTarget = (index) => {
    const target = parseFloat(tramoTargets[index]);
    return isNaN(target) ? 0 : target; // Devolver 0 si es NaN
  };

  // Función auxiliar para calcular las ventas totales de un tramo específico
  const calculateTramoTotalSales = (index) => {
    return tramoSales[index].reduce((acc, sale) => acc + (parseFloat(sale.value) || 0), 0);
  };

  // Función auxiliar para calcular las ventas restantes necesarias para un tramo
  const calculateRemainingForCurrentTramo = (index) => {
    const currentTramoTarget = getTramoTarget(index);
    const totalSalesForTramo = calculateTramoTotalSales(index);
    return Math.max(0, currentTramoTarget - totalSalesForTramo); // Asegurar que no sea negativo
  };

  // Función auxiliar para calcular el superávit de ventas para un tramo
  const calculateSurplusForCurrentTramo = (index) => {
    const currentTramoTarget = getTramoTarget(index);
    const totalSalesForTramo = calculateTramoTotalSales(index);
    return Math.max(0, totalSalesForTramo - currentTramoTarget); // Asegurar que no sea negativo
  };

  // Función auxiliar para calcular el déficit total de tramos anteriores
  const calculateTramoDeficit = () => {
    let totalDeficit = 0;
    // Iterar a través de los tramos pasados (hasta el tramo activo actual)
    for (let i = 0; i < tramoTimes.length; i++) {
      if (i < currentActiveTramoIndex) {
          totalDeficit += calculateRemainingForCurrentTramo(i); // Sumar lo que falta de tramos anteriores
      }
    }
    return totalDeficit;
  };

  // Función auxiliar para calcular las ventas totales generales
  const calculateTotalSales = () => {
    return tramoSales.reduce((acc, tramoSaleArray, index) => acc + calculateTramoTotalSales(index), 0);
  };

  // Función auxiliar para calcular la meta diaria derivada (suma de todas las metas de tramos)
  const calculateDerivedDailyTarget = () => {
    return tramoTargets.reduce((acc, target) => acc + (parseFloat(target) || 0), 0);
  };

  // Función auxiliar para calcular la meta diaria real (140% de la derivada)
  const calculateRealDailyTarget = () => {
    const derivedTarget = calculateDerivedDailyTarget();
    return derivedTarget * 1.40;
  };

  // Función auxiliar para calcular las ventas restantes para la meta diaria general
  const calculateRemainingForDailyTarget = () => {
    const derivedDailyTarget = calculateDerivedDailyTarget();
    const currentTotalSales = calculateTotalSales();
    return Math.max(0, derivedDailyTarget - currentTotalSales);
  };

  // Función auxiliar para calcular el porcentaje de progreso general
  const calculateProgressPercentage = () => {
    const totalSales = calculateTotalSales();
    const derivedTarget = calculateDerivedDailyTarget();
    if (derivedTarget === 0) {
      return 0; // Evitar división por cero
    }
    return (totalSales / derivedTarget) * 100;
  };

  // Manejador de eventos para cambios en la meta del tramo
  const handleTramoTargetChange = (index, e) => {
    const value = e.target.value;
    // Permitir solo números y un único punto decimal
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      const newTramoTargets = [...tramoTargets];
      newTramoTargets[index] = value;
      setTramoTargets(newTramoTargets);
    }
  };

  // Manejador de eventos para cambios en la entrada de nueva venta
  const handleNewSaleInputChange = (index, e) => {
    const value = e.target.value;
    // Permitir solo números y un único punto decimal
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      const newInputs = [...newSaleInput];
      newInputs[index] = value;
      setNewSaleInput(newInputs);
    }
  };

  // Manejador de eventos para añadir una nueva venta
  const handleAddSale = (index) => {
    const saleValue = parseFloat(newSaleInput[index]);
    if (!isNaN(saleValue) && saleValue > 0) {
      const newTramoSales = [...tramoSales];
      // Añadir un nuevo objeto de venta con un ID único y valor
      newTramoSales[index] = [...newTramoSales[index], { id: Date.now(), value: saleValue }];
      setTramoSales(newTramoSales);
      const newInputs = [...newSaleInput];
      newInputs[index] = ''; // Limpiar el campo de entrada después de añadir
      setNewSaleInput(newInputs);
    }
  };

  // Manejador de eventos para eliminar una venta
  const handleDeleteSale = (tramoIndex, saleIdToDelete) => {
    const newTramoSales = [...tramoSales];
    // Filtrar la venta a eliminar
    newTramoSales[tramoIndex] = newTramoSales[tramoIndex].filter(
      (sale) => sale.id !== saleIdToDelete
    );
    setTramoSales(newTramoSales);
  };

  // Calcular valores derivados para la renderización
  const derivedDailyTarget = calculateDerivedDailyTarget();
  const realDailyTarget = calculateRealDailyTarget();
  const totalSales = calculateTotalSales();
  const remainingForDailyTarget = calculateRemainingForDailyTarget();
  const totalTramoDeficit = calculateTramoDeficit();
  const progressPercentage = calculateProgressPercentage();

  // Verificar si se ha alcanzado la meta real (140% de la meta derivada)
  const achievedRealGoal = progressPercentage >= 140;

  // Interfaz de usuario principal de la aplicación
  return (
    <div
      className="min-h-screen bg-gray-900 p-4 font-sans text-gray-100"
      style={{ textSizeAdjust: '100%' }} // Añadido para mejor compatibilidad con navegadores móviles
    >
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-6 md:p-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-800 text-center mb-6 flex items-center justify-center">
          {/* Icono de gráfico de líneas para el título principal - Colorido */}
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" className="inline-block mr-2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></polyline>
            <circle cx="15" cy="21" r="2" fill="#22C55E"></circle> {/* Punto verde */}
            <circle cx="9" cy="3" r="2" fill="#EF4444"></circle> {/* Punto rojo */}
            <circle cx="22" cy="12" r="2" fill="#FBBF24"></circle> {/* Punto amarillo */}
          </svg>
          Calculadora de Tramos BENNY
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Ingresa las metas asignadas por tramo y tus ventas para obtener cálculos en tiempo real.
        </p>

        {/* Resumen de la Meta Diaria */}
        <div className="mb-8 p-4 bg-gray-100 border-l-4 border-gray-400 rounded-lg shadow-sm text-center">
          <label className="block text-xl font-semibold text-blue-700 mb-2">
            {/* Icono de objetivo/diamante - Colorido (Meta Diaria Calculada) */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="inline-block mr-1">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#93C5FD" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> {/* Azul claro */}
              <path d="M2 17l10 5 10-5" fill="#60A5FA" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> {/* Azul más oscuro */}
              <path d="M2 12l10 5 10-5" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> {/* Azul más oscuro aún */}
            </svg>
            Meta Diaria Total Calculada (Suma de Tramos):
          </label>
          <p className="text-3xl font-extrabold text-blue-800 mb-4">
            {formatCLP(derivedDailyTarget)}
          </p>
          <label className="block text-xl font-semibold text-blue-700 mb-2">
            {/* Icono de objetivo/diamante - Colorido (Meta Real) */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="inline-block mr-1">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#C4B5FD" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> {/* Púrpura claro */}
              <path d="M2 17l10 5 10-5" fill="#A78BFA" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> {/* Púrpura más oscuro */}
              <path d="M2 12l10 5 10-5" fill="#8B5CF6" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> {/* Púrpura más oscuro aún */}
            </svg>
            Meta Real (140% de la Meta Diaria):
          </label>
          <p className="text-3xl font-extrabold text-purple-700">
            {formatCLP(realDailyTarget)}
          </p>
        </div>

        {/* Sección de Tramos (Segments) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {tramoTimes.map((time, index) => {
            const deficitCurrentTramo = calculateRemainingForCurrentTramo(index);
            const surplusCurrentTramo = calculateSurplusForCurrentTramo(index);
            const currentTramoTarget = getTramoTarget(index);
            const totalSalesForTramo = calculateTramoTotalSales(index);
            const percentageAchievedForTramo = currentTramoTarget === 0 ? 0 : (totalSalesForTramo / currentTramoTarget) * 100;

            let deficitPreviousTramo = 0;
            if (index > 0) {
              // Si no hay un tramo activo aún, o si el tramo actual es el primero, no hay déficit de tramos anteriores
              // El déficit acumulado solo se calcula si el tramo anterior no cumplió su meta
              deficitPreviousTramo = calculateRemainingForCurrentTramo(index - 1);
            }
            
            // Verificar si el déficit del tramo anterior es recuperado por el superávit del tramo actual
            const previousTramoRecovered = index > 0 && deficitPreviousTramo > 0 && surplusCurrentTramo >= deficitPreviousTramo;
            
            // Calcular el déficit restante del tramo anterior después de considerar el superávit del tramo actual
            const remainingDeficitFromPreviousAfterCurrentSurplus = Math.max(0, deficitPreviousTramo - surplusCurrentTramo);
            
            // Monto total a reportar para el tramo actual (déficit actual + déficit restante del anterior)
            const totalToReport = deficitCurrentTramo + remainingDeficitFromPreviousAfterCurrentSurplus;

            // Lógica para mostrar la línea de déficit combinado
            let shouldShowCombinedDeficitLine = index > 0 && remainingDeficitFromPreviousAfterCurrentSurplus > 0;
            let combinedDeficitLabel = "";
            if (remainingDeficitFromPreviousAfterCurrentSurplus > 0 && deficitCurrentTramo > 0) {
              combinedDeficitLabel = "Falta para recuperar Anterior + Actual:";
            } else if (remainingDeficitFromPreviousAfterCurrentSurplus > 0 && deficitCurrentTramo === 0) {
              combinedDeficitLabel = "Falta para recuperar Anterior:";
            }

            // Clases condicionales para el fondo y el anillo del segmento
            let tramoBgColorClass = 'bg-gray-100 border-gray-200'; // Predeterminado para todos los casos
            let tramoRingClass = '';

            if (index === currentActiveTramoIndex) {
              // Segmento activo: Verde
              tramoBgColorClass = 'bg-green-100 border-green-500'; 
              tramoRingClass = 'ring-4 ring-green-400 shadow-xl'; 
            }
            // Los segmentos pasados y futuros permanecen con el color predeterminado (gris).
            
            return (
              <div
                key={index}
                className={`p-5 rounded-lg shadow-md border ${tramoBgColorClass} ${tramoRingClass}`}
              >
                <h2 className="text-xl font-bold text-gray-700 mb-3 flex items-center">
                  {/* Icono de reloj - Colorido */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="inline-block mr-2">
                    <circle cx="12" cy="12" r="10" fill="#BFDBFE" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></circle> {/* Azul claro para el reloj */}
                    <polyline points="12 6 12 12 16 14" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></polyline> {/* Manecillas azules */}
                  </svg>
                  {time}
                </h2>

                {/* Input de Meta Asignada para el Segmento */}
                <div className="mb-4">
                  <label htmlFor={`target-${index}`} className="block text-sm font-medium text-gray-600 mb-1">
                    Meta Asignada (CLP):
                  </label>
                  <input
                    type="text" // Cambiado de 'number' a 'text'
                    id={`target-${index}`}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-300 text-md bg-white text-gray-900"
                    placeholder="Ej: 200000"
                    value={tramoTargets[index]}
                    onChange={(e) => handleTramoTargetChange(index, e)}
                    min="0"
                  />
                </div>

                {/* Input para añadir ventas individuales */}
                <div className="mb-4">
                  <label htmlFor={`new-sale-${index}`} className="block text-sm font-medium text-gray-600 mb-1">
                    Agregar Venta (CLP):
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text" // Cambiado de 'number' a 'text'
                      id={`new-sale-${index}`}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-300 text-md bg-white text-gray-900"
                      placeholder="Ej: 10000"
                      value={newSaleInput[index]}
                      onChange={(e) => handleNewSaleInputChange(index, e)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSale(index);
                        }
                      }}
                      min="0"
                    />
                    <button
                      onClick={() => handleAddSale(index)}
                      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                {/* Lista de ventas añadidas para este segmento */}
                {tramoSales[index].length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">Ventas registradas:</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 bg-gray-100 p-2 rounded-md max-h-20 overflow-y-auto">
                      {tramoSales[index].map((sale) => (
                        <li key={sale.id} className="flex justify-between items-center pr-2">
                          {formatCLP(sale.value)}
                          {/* Botón de eliminar más grande y fácil de tocar */}
                          <button
                            onClick={() => handleDeleteSale(index, sale.id)}
                            className="text-red-500 hover:text-red-700 ml-2 p-1 text-lg font-bold w-6 h-6 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-150 ease-in-out"
                            title="Eliminar esta venta"
                          >
                            &times;
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ventas totales para el segmento */}
                <p className="text-md text-gray-700 mb-1">
                  <span className="font-semibold">Total de Ventas del Tramo:</span>{' '}
                  <span className="text-blue-600 font-bold">
                    {formatCLP(totalSalesForTramo)}
                  </span>
                </p>

                {/* Porcentaje alcanzado para el segmento */}
                <p className="text-md text-gray-700 mb-1">
                  <span className="font-semibold">Cumplimiento del Tramo:</span>{' '}
                  <span className={`font-bold ${percentageAchievedForTramo >= 100 ? 'text-green-600' : 'text-orange-500'}`}>
                    {percentageAchievedForTramo.toFixed(2)}%
                  </span>
                </p>

                {/* Cálculos del Segmento */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-md text-gray-700 mb-1 flex items-center">
                    <span className="font-semibold">Meta del Tramo:</span>{' '}
                    <span className="text-blue-600 font-bold ml-1">
                      {formatCLP(currentTramoTarget)}
                    </span>
                  </p>
                  <p className="text-md text-gray-700 mb-1 flex items-center">
                    <span className="font-semibold">Falta para este Tramo:</span>{' '}
                    <span className={`font-bold ml-1 ${deficitCurrentTramo > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {formatCLP(deficitCurrentTramo)}
                    </span>
                    {deficitCurrentTramo > 0 && 
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="inline-block ml-1">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#FCD34D" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> {/* Amarillo con borde naranja */}
                        <line x1="12" y1="9" x2="12" y2="13" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></line>
                      </svg>
                    }
                  </p>
                  {surplusCurrentTramo > 0 && (
                    <p className="text-md text-gray-700 mb-1 flex items-center">
                      <span className="font-semibold">Superávit de este Tramo:</span>{' '}
                      <span className="font-bold ml-1 text-green-500">
                        {formatCLP(surplusCurrentTramo)}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="inline-block ml-1">
                        <polyline points="20 6 9 17 4 12" fill="#D1FAE5" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></polyline> {/* Verde claro con borde verde */}
                      </svg>
                    </p>
                  )}
                  {previousTramoRecovered && (
                    <p className="text-md text-green-700 font-bold mt-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="inline-block mr-1">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#FCD34D" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></polygon> {/* Dorado con borde naranja */}
                      </svg>
                      ¡Tramo anterior recuperado! 
                    </p>
                  )}
                  {shouldShowCombinedDeficitLine && (
                    <p className="text-md text-gray-700 flex items-center">
                      <span className="font-semibold">{combinedDeficitLabel}</span>{' '}
                      <span className={`font-bold ml-1 ${totalToReport > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCLP(totalToReport)}
                      </span>
                      {totalToReport > 0 && 
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="inline-block ml-1">
                          <line x1="12" y1="5" x2="12" y2="19" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></line>
                          <polyline points="19 12 12 19 5 12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></polyline>
                          <path d="M12 5L12 19M19 12L12 19L5 12" fill="#FEE2E2"></path> {/* Flecha roja con fondo claro */}
                        </svg>
                      }
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen Total */}
        <div className={`p-6 rounded-lg shadow-inner border-l-4
          ${achievedRealGoal ? 'bg-yellow-200 border-yellow-600 shadow-xl' : 'bg-purple-100 border-purple-600'}`}>
          <h2 className="text-2xl font-bold text-center mb-3 flex items-center justify-center">
            {/* Emoji condicional para el logro de la meta */}
            {achievedRealGoal && <span className="mr-2 text-3xl text-yellow-400">🏆</span>}
            <span className={achievedRealGoal ? 'text-yellow-800' : 'text-purple-800'}>Resumen General</span>
            {/* Icono de gráfico de barras colorido */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="inline-block ml-2">
              <rect x="2" y="10" width="4" height="12" fill="#3B82F6" rx="1"></rect> {/* Blue bar */}
              <rect x="8" y="6" width="4" height="16" fill="#8B5CF6" rx="1"></rect> {/* Purple bar */}
              <rect x="14" y="2" width="4" height="20" fill="#22C55E" rx="1"></rect> {/* Green bar */}
              <path d="M2 22h20" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> {/* X-axis */}
            </svg>
            {achievedRealGoal && <span className="ml-2 text-3xl text-yellow-400">🏆</span>}
          </h2>
          <p className={`text-xl text-center font-semibold mb-2 text-purple-700`}>
            Total de Ventas Acumuladas:
            <br />
            <span className={`text-3xl font-extrabold text-blue-700`}>
              {formatCLP(totalSales)}
            </span>
          </p>
          <p className={`text-xl text-center font-semibold mb-2 text-purple-700`}>
            Porcentaje de Meta Diaria Alcanzado:
            <br />
            <span className={`text-3xl font-extrabold ${progressPercentage >= 100 ? 'text-green-600' : 'text-blue-700'}`}>
              {progressPercentage.toFixed(2)}%
            </span>
          </p>
          <p className={`text-xl text-center font-semibold mb-2 text-purple-700 flex items-center justify-center`}>
            Total Faltante (Meta Diaria Calculada):
            <br />
            <span className={`text-3xl font-extrabold ml-1 ${remainingForDailyTarget > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCLP(remainingForDailyTarget)}
            </span>
            {remainingForDailyTarget > 0 && 
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block ml-1">
                <path d="M12 5v14m7-7l-7 7-7-7"/>
              </svg>
            }
          </p>
          <p className={`text-xl text-center font-semibold text-purple-700 flex items-center justify-center`}>
            Déficit Total de Tramos Anteriores (acumulado hasta el último tramo):
            <br />
            <span className={`font-bold ml-1 ${totalTramoDeficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCLP(totalTramoDeficit)}
            </span>
            {totalTramoDeficit > 0 && 
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="inline-block ml-1">
                <line x1="12" y1="5" x2="12" y2="19" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></line>
                <polyline points="19 12 12 19 5 12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></polyline>
                <path d="M12 5L12 19M19 12L12 19L5 12" fill="#FEE2E2"></path> {/* Flecha roja con fondo claro */}
              </svg>
            }
          </p>
        </div>

        <footer className="mt-10 text-center text-gray-500 text-sm">
          <p>Desarrollado para simplificar la gestión de metas de venta.</p>
          {/* Logo de la empresa */}
          <img
            src={bennyLogo}
            alt="Benny Logo"
            className="mx-auto mt-4 rounded-full shadow-lg" // Elimina w-20 h-20
            style={{ width: 'auto', height: 'auto', maxWidth: '100px', maxHeight: '100px' }} // Permite dimensiones intrínsecas, con un max-size opcional
            onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/100x100/cccccc/333333?text=Logo' }} // Ajusta placeholder al mismo tamaño asumido
          />
        </footer>
      </div>
    </div>
  );
}
