const axios = require('axios');

module.exports = async (req, res) => {
    const FALLBACK_PRICE = 6.14;
    try {
        // Tentativa de buscar preço em Sorocaba via scraping discreto (regex)
        const response = await axios.get('https://www.precodecombustivel.com.br/cidade/sorocaba-sp', {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        // Regex para capturar o preço médio (ex: "Preço médio: R$ 6,14")
        const match = response.data.match(/Preço Médio de Gasolina em Sorocaba é de R\$\s*(\d+,\d+)/);
        if (match && match[1]) {
            const price = parseFloat(match[1].replace(',', '.'));
            return res.json({ price: price, city: 'Sorocaba', status: 'live' });
        }
        
        res.json({ price: FALLBACK_PRICE, city: 'Sorocaba', status: 'fallback' });
    } catch (error) {
        res.json({ price: FALLBACK_PRICE, city: 'Sorocaba', status: 'error' });
    }
};
