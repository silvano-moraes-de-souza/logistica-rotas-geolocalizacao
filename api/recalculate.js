const axios = require('axios');

const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY || '';

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
        console.error('Erro ao buscar dados reais da rota reordenada:', error.response ? error.response.data : error.message);
        return null;
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { coordinates } = req.body;
        
        if (!coordinates || coordinates.length < 2) {
            return res.status(400).json({ error: 'Coordenadas insuficientes para recalcular.' });
        }

        if (!ORS_API_KEY) {
            return res.status(200).json({ 
                success: true, 
                mock: true,
                message: "Sem chave da API, simulando recálculo sem atualizar distância." 
            });
        }

        const data = await getRealRouteData(coordinates);
        
        if (data && data.routes && data.routes.length > 0) {
            const segments = data.routes[0].segments;
            // Retorna os segmentos que contêm { distance, duration }
            return res.status(200).json({ success: true, segments: segments });
        } else {
            return res.status(500).json({ error: 'Falha ao recalcular a rota pela API.' });
        }

    } catch (error) {
        console.error('Erro no endpoint de recálculo:', error);
        res.status(500).json({ error: 'Erro interno ao recalcular a rota', details: error.message });
    }
};
