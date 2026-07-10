//=============================================
// PLANEJAMENTO DE ROTA
// NOME:
// DESCRIÇÃO:
// AUTOR: SILVANO MORAES DE SOUZA
// VERSÃO: 
//=============================================
const axios = require('axios');

const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY || '';
const APP_BASE_ADDRESS = "RUA EXEMPLO, 100, CENTRO, Sorocaba - SP - 18000-000";
let APP_BASE_COORDS = { lat: -23.5015, lon: -47.4526 }; 

const AVERAGE_SPEED_KMH = 50;
const STOP_TIME_MINUTES = 10;
const GAS_COST_PER_KM = 0.60;
const DAILY_START_HOUR = 8;
const DAILY_END_HOUR = 16;
const DAILY_LIMIT_MINUTES = (DAILY_END_HOUR - DAILY_START_HOUR) * 60;
const HOURLY_OVERTIME_RATE = 50.00;

// Mapa de Estados para normalização Sigla <=> Nome
const STATE_MAP = {
    'AC': 'ACRE', 'AL': 'ALAGOAS', 'AP': 'AMAPA', 'AM': 'AMAZONAS', 'BA': 'BAHIA',
    'CE': 'CEARA', 'DF': 'DISTRITO FEDERAL', 'ES': 'ESPIRITO SANTO', 'GO': 'GOIAS',
    'MA': 'MARANHAO', 'MT': 'MATO GROSSO', 'MS': 'MATO GROSSO DO SUL', 'MG': 'MINAS GERAIS',
    'PA': 'PARA', 'PB': 'PARAIBA', 'PR': 'PARANA', 'PE': 'PERNAMBUCO', 'PI': 'PIAUI',
    'RJ': 'RIO DE JANEIRO', 'RN': 'RIO GRANDE DO NORTE', 'RS': 'RIO GRANDE DO SUL',
    'RO': 'RONDONIA', 'RR': 'RORAIMA', 'SC': 'SANTA CATARINA', 'SP': 'SAO PAULO',
    'SE': 'SERGIPE', 'TO': 'TOCANTINS'
};

// Auxiliar para normalizar strings (remover acentos e colocar em maiúsculo)
function normalizeString(str) {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

// Auxiliar para formatar segundos em HHh MMmin
function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}min`;
}

// Geocodificação usando OpenRouteService com Validação de Estado e Fronteira
async function geocode(address, expectedState = null) {
    if (!ORS_API_KEY) return null;
    try {
        const response = await axios.get('https://api.openrouteservice.org/geocode/search', {
            params: { 
                api_key: ORS_API_KEY, 
                text: address, 
                size: 3, 
                'boundary.country': 'BRA'
            },
            headers: { 'Accept': 'application/json, application/geo+json, application/gpx+xml, text/csv; charset=utf-8' }
        });

        if (response.data && response.data.features && response.data.features.length > 0) {
            let feature = response.data.features[0];

            if (expectedState) {
                const normExpected = normalizeString(expectedState);
                const expectedFullName = STATE_MAP[normExpected] || normExpected;

                const match = response.data.features.find(f => {
                    const props = f.properties || {};
                    const region = normalizeString(props.region || props.region_a || '');
                    const coords = f.geometry?.coordinates || [0, 0];
                    const lon = coords[0];
                    
                    const isCorrectState = region === normExpected || 
                                         region === expectedFullName ||
                                         region.includes(expectedFullName) ||
                                         expectedFullName.includes(region);
                    
                    if (normExpected === 'SP' && lon < -48.0) return false;

                    return isCorrectState;
                });

                if (match) {
                    feature = match;
                } else {
                    const regionFound = feature.properties?.region || 'Desconhecido';
                    console.warn(`[Geocode] REJEITADO: Esperado ${expectedState} (${expectedFullName}), Encontrado ${regionFound}.`);
                    return null;
                }
            }

            const coords = feature.geometry?.coordinates;
            if (!coords || (coords[0] === 0 && coords[1] === 0)) return null;
            
            console.log(`[Geocode] Sucesso: ${address} -> [${coords[1]}, ${coords[0]}]`);
            return { lon: coords[0], lat: coords[1] };
        }
    } catch (error) {
        console.error(`Erro ao geocodificar ${address}:`, error.message);
    }
    return null;
}

// Calcular matriz de distâncias usando OpenRouteService
async function getDistanceMatrix(origin, destinations) {
    if (!ORS_API_KEY) {
        return destinations.map(dest => ({
            distance: { value: (10 + Math.random() * 90) * 1000 },
            duration: { value: (10 + Math.random() * 90) * 60 }
        }));
    }

    try {
        const locations = [
            [origin.lon, origin.lat],
            ...destinations.map(d => [d.lon, d.lat])
        ];
        
        const response = await axios.post(
            'https://api.openrouteservice.org/ors/v2/matrix/driving-car',
            {
                locations: locations,
                metrics: ['distance', 'duration'],
                units: 'km'
            },
            {
                headers: {
                    'Authorization': ORS_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        const distances = response.data.distances[0].slice(1);
        const durations = response.data.durations[0].slice(1);
        
        return destinations.map((dest, i) => ({
            distance: { value: distances[i] * 1000, text: `${distances[i].toFixed(1)} km` },
            duration: { value: durations[i] * 60, text: `${Math.round(durations[i])} min` }
        }));
    } catch (error) {
        console.error('Erro na API ORS:', error.message);
        return destinations.map(dest => ({
            distance: { value: (10 + Math.random() * 90) * 1000 },
            duration: { value: (10 + Math.random() * 90) * 60 }
        }));
    }
}

async function getRealRouteData(coordinates) {
    if (!coordinates || coordinates.length < 2) return null;
    
    try {
        const response = await axios.post('https://api.openrouteservice.org/v2/directions/driving-car/json', {
            coordinates: coordinates
        }, {
            headers: {
                'Authorization': ORS_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar dados reais da rota:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function optimizeRoute(base, stops, vehicleCount = 1) {
    if (!ORS_API_KEY || stops.length === 0) {
        return null;
    }

    try {
        const jobs = stops.map((s, i) => ({
            id: i + 1,
            location: [s.lon, s.lat],
            service: STOP_TIME_MINUTES * 60,
            amount: [Math.round(s.weight || 0)]
        }));

        const vehicles = [];
        for (let i = 1; i <= vehicleCount; i++) {
            vehicles.push({
                id: i,
                profile: 'driving-car',
                start: [base.lon, base.lat],
                end: [base.lon, base.lat],
                capacity: [650]
            });
        }

        const response = await axios.post(
            'https://api.openrouteservice.org/optimization',
            { jobs, vehicles },
            {
                headers: {
                    'Authorization': ORS_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Erro na otimização ORS:', error.message);
        if (error.response) {
            console.error('Detalhes do erro ORS:', JSON.stringify(error.response.data, null, 2));
        }
    }
    return null;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { addresses, startDate: customStartDate, vehicleCount = 1 } = req.body;
        
        if (!addresses || addresses.length === 0) {
            return res.status(400).json({ error: 'Nenhum endereço fornecido' });
        }

        const baseDate = customStartDate ? new Date(customStartDate) : new Date();
        const startDate = new Date(baseDate);
        if (!customStartDate) startDate.setDate(startDate.getDate() + 1);
        
        if (ORS_API_KEY) {
            const baseResult = await geocode(APP_BASE_ADDRESS);
            if (baseResult) APP_BASE_COORDS = baseResult;
        }

        const stops = [];
        if (addresses.some(a => !a.lat || !a.lon)) {
            const promises = addresses.map(async (addr) => {
                const searchStr = addr.fullAddress || addr.address;
                const coords = await geocode(searchStr, addr.uf);
                return { ...addr, lat: coords?.lat, lon: coords?.lon };
            });
            const results = await Promise.all(promises);
            stops.push(...results);
        } else {
            stops.push(...addresses);
        }

        const validStops = stops.filter(s => s.lat && s.lon);
        const invalidStopsCount = stops.length - validStops.length;
        
        let optimizedResult = null;
        if (ORS_API_KEY && validStops.length > 0) {
            optimizedResult = await optimizeRoute(APP_BASE_COORDS, validStops, parseInt(vehicleCount));
        }

        const routes = [];
        let totalDistanceMeters = 0;
        let totalDurationSeconds = 0;

        if (optimizedResult && optimizedResult.routes) {
            for (const orsRoute of optimizedResult.routes) {
                const orsSteps = orsRoute.steps;
                const orderedCoords = orsSteps.map(s => s.location);
                const realRouteData = await getRealRouteData(orderedCoords);
                const segments = realRouteData?.routes?.[0]?.segments || [];

                let dayStops = [];
                let routeKm = 0;
                let lastDepartureDate = new Date(startDate);
                lastDepartureDate.setHours(DAILY_START_HOUR, 0, 0, 0);

                for (let i = 0; i < orsSteps.length; i++) {
                    const step = orsSteps[i];
                    if (step.type === 'job') {
                        const originalStop = validStops[step.job - 1];
                        const segment = segments[i - 1];
                        const travelSeconds = segment ? segment.duration : (step.duration - (orsSteps[i-1]?.duration || 0));
                        const travelMeters = segment ? segment.distance : (step.distance - (orsSteps[i-1]?.distance || 0));
                        const distKm = travelMeters / 1000;
                        
                        const arrivalDate = new Date(lastDepartureDate.getTime() + (travelSeconds * 1000));
                        const serviceSeconds = step.service || (STOP_TIME_MINUTES * 60);
                        const departureDate = new Date(arrivalDate.getTime() + (serviceSeconds * 1000));

                        lastDepartureDate = departureDate;
                        routeKm += distKm;
                        totalDistanceMeters += travelMeters;
                        totalDurationSeconds += (travelSeconds + serviceSeconds);

                        dayStops.push({
                            parada: dayStops.length + 1,
                            vehicleId: orsRoute.vehicle,
                            address: originalStop.address,
                            arrival: arrivalDate.toISOString(),
                            departure: departureDate.toISOString(),
                            travelTime: Math.round(travelSeconds / 60),
                            km: parseFloat(distKm.toFixed(1)),
                            date: lastDepartureDate.toLocaleDateString('pt-BR'),
                            tipo: 'entrega',
                            nf: originalStop.nf,
                            weight: originalStop.weight,
                            volume: originalStop.volume,
                            coords: { lat: originalStop.lat, lon: originalStop.lon }
                        });
                    } else if (step.type === 'end') {
                        const travelMeters = step.distance - (orsSteps[i-1] ? orsSteps[i-1].distance : 0);
                        totalDistanceMeters += travelMeters;
                    }
                }

                routes.push({
                    day: 1,
                    vehicleId: orsRoute.vehicle,
                    stops: dayStops,
                    totalKm: Math.round(routeKm * 10) / 10
                });
            }
        } else if (validStops.length > 0) {
            // FALLBACK: Simulação caso ORS falhe ou não haja chave
            console.log('[Backend] Usando fallback de simulação');
            const stopsPerVehicle = Math.ceil(validStops.length / parseInt(vehicleCount));
            for (let v = 0; v < parseInt(vehicleCount); v++) {
                const vehicleStops = validStops.slice(v * stopsPerVehicle, (v + 1) * stopsPerVehicle);
                if (vehicleStops.length === 0) continue;
                
                let dayStops = [];
                let routeKm = 0;
                let lastDate = new Date(startDate);
                lastDate.setHours(DAILY_START_HOUR, 0, 0, 0);

                vehicleStops.forEach((stop, i) => {
                    const travelMeters = 5000 + (Math.random() * 3000); 
                    const travelSeconds = Math.round((travelMeters / 1000 / 40) * 3600); 
                    const arrival = new Date(lastDate.getTime() + (travelSeconds * 1000));
                    const departure = new Date(arrival.getTime() + (STOP_TIME_MINUTES * 60 * 1000));
                    
                    lastDate = departure;
                    routeKm += (travelMeters / 1000);
                    totalDistanceMeters += travelMeters;
                    totalDurationSeconds += (travelSeconds + (STOP_TIME_MINUTES * 60));

                    dayStops.push({
                        parada: i + 1,
                        vehicleId: v + 1,
                        address: stop.address,
                        arrival: arrival.toISOString(),
                        departure: departure.toISOString(),
                        travelTime: Math.round(travelSeconds / 60),
                        km: parseFloat((travelMeters / 1000).toFixed(1)),
                        date: lastDate.toLocaleDateString('pt-BR'),
                        tipo: 'entrega',
                        nf: stop.nf,
                        weight: stop.weight,
                        volume: stop.volume
                    });
                });

                routes.push({
                    day: 1,
                    vehicleId: v + 1,
                    stops: dayStops,
                    totalKm: Math.round(routeKm * 10) / 10
                });
            }
        }

        const totalKm = totalDistanceMeters / 1000;
        const fuelPrice = req.body.fuelPrice || 6.14;
        const fuelCost = (totalKm / 10) * fuelPrice;

        res.status(200).json({
            success: true,
            routes,
            summary: {
                totalKm: parseFloat(totalKm.toFixed(1)),
                distance: totalKm,
                fuelCost: fuelCost,
                totalStops: validStops.length,
                totalRoutes: routes.length,
                totalDurationFormatted: formatDuration(totalDurationSeconds),
                invalidStops: invalidStopsCount,
                isMock: !optimizedResult
            }
        });

    } catch (error) {
        console.error('Erro na otimização:', error);
        res.status(500).json({ error: 'Erro interno na otimização', details: error.message });
    }
};
